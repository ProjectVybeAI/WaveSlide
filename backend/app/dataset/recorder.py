"""The guided recorder: follows a protocol while the engine runs on the camera and saves landmarks.

Only landmarks are saved (never pixels). The one thing taken from the picture is its mean
brightness, a single number per session, so the evaluation can report accuracy by lighting
with a measured value instead of a guess.

`Recorder` is plain (frames in, session out) and tested directly. `RecordingService` connects it
to the engine's frame stream, in the web server's event loop, the same way a WebSocket client does.
"""

import asyncio
import contextlib
import logging
import re
import threading
from datetime import UTC, datetime
from pathlib import Path

from app.contract.engine import EngineFrame, RecordingPromptEvent
from app.contract.sessions import (
    RecordingRequest,
    RecordingStatus,
    SessionFrame,
    SessionHeader,
    SessionLabel,
    SessionSummary,
)
from app.dataset.protocols import step_at, timeline
from app.dataset.store import summarise, write_session
from app.engine.hub import Hub

log = logging.getLogger("waveslide.recorder")
LUMINANCE_EVERY_S = 0.5


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-") or "participant"


class Recorder:
    """One recording. `feed` frames in; `finish` writes the session file."""

    def __init__(
        self,
        request: RecordingRequest,
        sessions_dir: Path,
        on_prompt=None,
        read_luminance=None,
    ):
        now = datetime.now(UTC)
        self.request = request
        self.session_id = f"rec-{slug(request.participant)}-{request.protocol}-{now:%Y%m%d-%H%M%S}"
        self.created_at = now.isoformat()
        self.steps = timeline(request.protocol)
        self.total_seconds = sum(step.seconds for step in self.steps)
        self.sessions_dir = sessions_dir
        self.on_prompt = on_prompt  # called with a RecordingPromptEvent when the step changes
        self.read_luminance = read_luminance  # () -> mean brightness 0-255 of the latest picture, or None
        self.frames: list[SessionFrame] = []
        self.finished = False
        self.saved: SessionSummary | None = None
        self._t0: float | None = None
        self._step = -1
        self._luminance: list[float] = []
        self._luminance_at = -1.0
        self._lock = threading.Lock()

    def status(self) -> RecordingStatus:
        index = max(self._step, 0)
        return RecordingStatus(
            session_id=self.session_id,
            protocol=self.request.protocol,
            step=index + 1,
            total_steps=len(self.steps),
            prompt=self.steps[index].prompt,
            started_at=self.created_at,
        )

    def feed(self, frame: EngineFrame) -> None:
        """Add one engine frame. Moves to the next prompt, and finishes after the last step."""
        with self._lock:
            if self.finished:
                return
            if self._t0 is None:
                self._t0 = frame.t
            t = frame.t - self._t0
            index = step_at(self.steps, t)
            if index is None:
                self._save()
                return
            if index != self._step:
                self._step = index
                self._announce(index)
            self.frames.append(SessionFrame(t=round(t, 4), hands=frame.hands))
            if self.read_luminance and t - self._luminance_at >= LUMINANCE_EVERY_S:
                self._luminance_at = t
                value = self.read_luminance()
                if value is not None:
                    self._luminance.append(value)

    def finish(self) -> SessionSummary | None:
        """Save what was recorded so far (stopping early keeps the finished part)."""
        with self._lock:
            if not self.finished:
                self._save()
            return self.saved

    # ---- internals -------------------------------------------------------------
    def _announce(self, index: int) -> None:
        if self.on_prompt is None:
            return
        step = self.steps[index]
        self.on_prompt(
            RecordingPromptEvent(
                session_id=self.session_id,
                step=index + 1,
                total_steps=len(self.steps),
                prompt=step.prompt,
                gesture=step.gesture if step.gesture and step.gesture != "TALKING" else None,
                seconds=step.seconds,
            )
        )

    def _labels(self, recorded_s: float) -> list[SessionLabel]:
        """A label per labelled step, cut off where the recording ended."""
        labels, start = [], 0.0
        for step in self.steps:
            end = start + step.seconds
            if step.labelled and step.gesture and start < recorded_s:
                labels.append(SessionLabel(start=start, end=min(end, recorded_s), gesture=step.gesture))
            start = end
        return labels

    def _save(self) -> None:
        self.finished = True
        if not self.frames:
            return
        recorded_s = self.frames[-1].t
        luminance = round(sum(self._luminance) / len(self._luminance), 1) if self._luminance else None
        header = SessionHeader(
            id=self.session_id,
            kind=self.request.protocol,
            source="recorded",
            participant=self.request.participant,
            distance_m=self.request.distance_m,
            lighting=self.request.lighting,
            luminance_mean=luminance,
            fps=round(len(self.frames) / max(recorded_s, 1e-6), 1),
            created_at=self.created_at,
            labels=self._labels(recorded_s),
        )
        path = self.sessions_dir / f"{self.session_id}.jsonl"
        write_session(path, header, self.frames)
        self.saved = summarise(path)
        log.info("saved %s: %d frames", self.session_id, len(self.frames))


class RecordingService:
    """Runs at most one Recorder, fed from the hub in the server's event loop."""

    def __init__(self, hub: Hub, engine, sessions_dir: Path):
        self.hub = hub
        self.engine = engine
        self.sessions_dir = sessions_dir
        self.current: Recorder | None = None
        self._task: asyncio.Task | None = None
        self._real_sender = None

    @property
    def running(self) -> bool:
        return self.current is not None and not self.current.finished

    async def start(self, request: RecordingRequest) -> RecordingStatus:
        self.current = Recorder(request, self.sessions_dir, self.hub.publish_event, self._brightness)
        self._swap_sender()  # gestures made for the recorder must never press real keys
        self._task = asyncio.create_task(self._run(self.current))
        return self.current.status()

    async def stop(self) -> SessionSummary | None:
        """Stop and save. Returns None when there is no recording or nothing was captured."""
        recorder, self.current = self.current, None
        if recorder is None:
            return None
        summary = recorder.finish()
        await self._end_task()
        return summary

    async def _run(self, recorder: Recorder) -> None:
        client = self.hub.connect()
        try:
            while not recorder.finished:
                try:
                    await asyncio.wait_for(client.wake.wait(), timeout=0.5)
                except TimeoutError:
                    continue
                _, frame = self.hub.take(client)
                if frame is not None:
                    recorder.feed(frame)
        finally:
            self.hub.disconnect(client)
            self._restore_sender()

    async def _end_task(self) -> None:
        task, self._task = self._task, None
        if task is not None:
            await asyncio.wait([task], timeout=2)
            if not task.done():
                task.cancel()
                with contextlib.suppress(asyncio.CancelledError):
                    await task
        self._restore_sender()

    def _brightness(self) -> float | None:
        jpeg = self.engine.latest_jpeg()
        if not jpeg:
            return None
        try:
            import cv2
            import numpy as np

            grey = cv2.imdecode(np.frombuffer(jpeg, np.uint8), cv2.IMREAD_GRAYSCALE)
            return float(grey.mean()) if grey is not None else None
        except Exception:  # noqa: BLE001 - a missing picture only means no luminance value
            return None

    def _swap_sender(self) -> None:
        from app.keys.sender import RecordingSender

        dispatcher = self.engine.dispatcher
        if self._real_sender is None:
            self._real_sender = dispatcher.sender
            dispatcher.sender = RecordingSender()

    def _restore_sender(self) -> None:
        if self._real_sender is not None:
            self.engine.dispatcher.sender = self._real_sender
            self._real_sender = None
