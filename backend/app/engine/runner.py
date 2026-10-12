"""The engine thread: read a frame, run the pipeline, send keys, publish state.

One thread owns the source and the pipeline, so the core needs no locks. The REST
and WebSocket handlers talk to it through small thread-safe methods.
"""

import logging
import statistics
import threading
import time
from collections import deque
from pathlib import Path

from app.config import BACKEND_DIR, Config
from app.contract.common import EngineState, ErrorCode, Recogniser, SourceKind
from app.contract.engine import (
    ActivationChangedEvent,
    CommandEvent,
    EngineFrame,
    EngineSnapshot,
    HandLandmarks,
    WarningEvent,
)
from app.contract.settings import Settings
from app.core.pipeline import Pipeline, PipelineOutput
from app.core.types import FrameInput
from app.dataset.store import find_session
from app.engine.command_log import CommandLog
from app.engine.dispatcher import Dispatcher
from app.engine.hub import Hub
from app.engine.sources import (
    CameraLandmarkSource,
    LandmarkSource,
    ReplayLandmarkSource,
    SourceUnavailable,
)
from app.errors import AppError
from app.keys.sender import KeySender
from app.platform.permissions import keyboard_allowed

log = logging.getLogger("waveslide.engine")

MODEL_PATH = BACKEND_DIR / "models" / "hand_landmarker.task"
FIXTURE_SESSIONS = BACKEND_DIR / "tests" / "fixtures" / "sessions"
FRAME_INTERVAL = 1 / 30  # publish at most 30 frames a second
RETRY_SECONDS = 2.0
SOURCE_WAIT_SECONDS = 3.0  # how long switching to the camera waits to learn if it opened
SLOW_PIPELINE_MS = 80.0  # the brief's budget for capture to key


class Engine:
    def __init__(self, config: Config, settings: Settings, hub: Hub, sender: KeySender):
        self.config = config
        self.hub = hub
        self.sender = sender
        self.settings = settings
        self.pipeline = Pipeline(settings)
        self.source_kind = SourceKind(config.source)
        self.session_id: str | None = config.replay_session if config.source == "replay" else None
        self.loop_replay = True
        self.command_log = CommandLog(config.resolved_data_dir / "logs")
        self.dispatcher = Dispatcher(
            sender, self.command_log, hub.focused_routes, lambda: keyboard_allowed(config.keys)
        )
        self._source: LandmarkSource | None = None
        self._source_error: str | None = None
        self._pending_source: tuple[SourceKind, str | None, bool] | None = None
        self._last: PipelineOutput = PipelineOutput(active=self.pipeline.active)
        self._announced_active = self.pipeline.active
        self._slow_warned = False
        self._source_attempted = threading.Event()
        self._fps = 0.0
        self._frame_dt = 0.0
        self._pipeline_ms: deque[float] = deque(maxlen=300)
        self._seq = 0
        self._last_publish = 0.0
        self._lock = threading.Lock()
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

    # ---- lifecycle -------------------------------------------------------------
    def start(self) -> None:
        self._thread = threading.Thread(target=self._run, name="engine", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=3)
        if self._source:
            self._source.close()

    @property
    def sessions_dirs(self) -> list[Path]:
        return [self.config.resolved_data_dir / "sessions", FIXTURE_SESSIONS]

    # ---- called from request handlers ------------------------------------------
    def snapshot(self) -> EngineSnapshot:
        with self._lock:
            last = self.command_log.last()
            p50 = statistics.median(self._pipeline_ms) if self._pipeline_ms else None
            return EngineSnapshot(
                active=self._last.active,
                state=self._last.state,
                source=self.source_kind,
                session_id=self.session_id,
                recogniser=self.settings.recogniser,
                fps=round(self._fps, 1),
                pipeline_ms_p50=round(p50, 2) if p50 else None,
                profile_id=self.settings.profile_id,
                camera_ok=self._source_error is None,
                last_command=last,
            )

    def set_active(self, active: bool) -> EngineSnapshot:
        with self._lock:
            self.pipeline.set_active(active)
            self._last.active = active
            self._last.state = EngineState.ACTIVE if active else EngineState.PAUSED
            changed = active != self._announced_active
            self._announced_active = active
        if changed:
            self.hub.publish_event(ActivationChangedEvent(active=active))
        return self.snapshot()

    def record_ack(self, command_id: int) -> None:
        """The practice deck showed the result of a command: log how long that took."""
        command = next((c for c in self.command_log.recent() if c.id == command_id), None)
        if command is None:
            return
        updated = self.command_log.set_ack(command_id, (time.time() - command.t) * 1000)
        if updated:
            self.hub.publish_event(CommandEvent(command=updated))  # same id: clients replace the row

    def set_source(self, kind: SourceKind, session_id: str | None, loop: bool) -> EngineSnapshot:
        if kind == SourceKind.REPLAY:
            session_id = session_id or self.config.replay_session
            if find_session(self.sessions_dirs, session_id) is None:
                raise AppError(ErrorCode.SESSION_NOT_FOUND, f"No session called {session_id}.", 404)
        with self._lock:
            self._pending_source = (kind, session_id, loop)
            self.source_kind = kind
            self.session_id = session_id if kind == SourceKind.REPLAY else None
            self._source_attempted.clear()
        if kind == SourceKind.CAMERA and self._thread and self._thread.is_alive():
            # Learn whether the camera opened, so the UI can say so instead of showing a blank preview.
            self._source_attempted.wait(SOURCE_WAIT_SECONDS)
            if self._source_error:
                raise AppError(ErrorCode.CAMERA_UNAVAILABLE, f"Camera unavailable: {self._source_error}", 503)
        return self.snapshot()

    def update_settings(self, settings: Settings) -> None:
        with self._lock:
            camera_changed = settings.camera != self.settings.camera
            self.settings = settings
            self.pipeline.update_settings(settings)
            if camera_changed and self.source_kind == SourceKind.CAMERA:
                self._pending_source = (SourceKind.CAMERA, None, True)

    def latest_jpeg(self) -> bytes | None:
        source = self._source
        return source.latest_jpeg() if source else None

    # ---- the loop ----------------------------------------------------------------
    def _open_source(self) -> LandmarkSource:
        if self.source_kind == SourceKind.REPLAY:
            path = find_session(self.sessions_dirs, self.session_id or "")
            if path is None:
                raise SourceUnavailable(f"No session called {self.session_id}")
            return ReplayLandmarkSource(path, realtime=True, loop=self.loop_replay)
        cam = self.settings.camera
        index = cam.index if cam.index else self.config.camera_index
        return CameraLandmarkSource(index, cam.width, cam.height, MODEL_PATH)

    def _run(self) -> None:
        last_frame_at = time.perf_counter()
        while not self._stop.is_set():
            with self._lock:
                pending, self._pending_source = self._pending_source, None
            if pending:
                if self._source:
                    self._source.close()
                self._source = None
                _, _, self.loop_replay = pending
            if self._source is None:
                try:
                    self._source = self._open_source()
                    if self._source_error:
                        self.hub.publish_event(WarningEvent(code="CAMERA_BACK", message="Camera is back."))
                    self._source_error = None
                    self._source_attempted.set()
                except Exception as exc:  # noqa: BLE001 - camera and MediaPipe fail in many ways
                    self._fail(str(exc))
                    continue
            try:
                frame = self._source.read()
            except SourceUnavailable as exc:
                self._source.close()
                self._source = None
                self._fail(str(exc))
                continue
            if frame is None:  # a replay without loop has ended
                time.sleep(0.05)
                continue
            now = time.perf_counter()
            dt = now - last_frame_at
            last_frame_at = now
            # Average the frame interval, not the rate: one late frame must not swing fps wildly.
            self._frame_dt = 0.9 * self._frame_dt + 0.1 * dt if self._frame_dt else dt
            self._fps = 1 / self._frame_dt if self._frame_dt > 0 else 0.0
            self._step(frame)

    def _fail(self, message: str) -> None:
        if self._source_error is None:
            log.warning("source unavailable: %s", message)
            self.hub.publish_event(WarningEvent(code="CAMERA_LOST", message=message))
        self._source_error = message
        self._fps = 0.0
        self._frame_dt = 0.0
        self._source_attempted.set()
        self._stop.wait(RETRY_SECONDS)

    def _step(self, frame: FrameInput) -> None:
        with self._lock:
            out = self.pipeline.process(frame)
            self._last = out
            self._pipeline_ms.append((time.perf_counter() - frame.captured_at) * 1000)
            activation_changed = out.active != self._announced_active
            self._announced_active = out.active
        for cancelled in out.cancelled:
            self.hub.publish_event(cancelled)
        for command in out.commands:
            entry, warning = self.dispatcher.dispatch(command, self.settings.profile_id, frame.captured_at)
            self.hub.publish_event(CommandEvent(command=entry))
            if warning:
                self.hub.publish_event(warning)
        if activation_changed:
            self.hub.publish_event(ActivationChangedEvent(active=out.active))
        self._warn_if_slow()
        now = time.perf_counter()
        if now - self._last_publish >= FRAME_INTERVAL - 0.002:
            self._last_publish = now
            self.hub.publish_frame(self._frame_message(frame, out))

    def _warn_if_slow(self) -> None:
        """Warn once when the slowest 5% of frames exceed the capture-to-key budget."""
        if len(self._pipeline_ms) < 60:
            return
        p95 = sorted(self._pipeline_ms)[int(len(self._pipeline_ms) * 0.95)]
        if p95 > SLOW_PIPELINE_MS and not self._slow_warned:
            self._slow_warned = True
            self.hub.publish_event(
                WarningEvent(code="SLOW_PIPELINE", message=f"Slow pipeline: {p95:.0f} ms.")
            )
        elif p95 < SLOW_PIPELINE_MS / 2:
            self._slow_warned = False

    def _frame_message(self, frame: FrameInput, out: PipelineOutput) -> EngineFrame:
        self._seq += 1
        hands = [
            HandLandmarks(
                handedness="Left" if h.handedness == "Left" else "Right",
                score=round(h.score, 3),
                landmarks=[[round(float(v), 4) for v in p] for p in h.points],
            )
            for h in frame.hands
        ]
        return EngineFrame(
            seq=self._seq,
            t=round(frame.t, 3),
            active=out.active,
            state=out.state,
            source=self.source_kind,
            hands=hands,
            extended=out.extended,
            pose=out.pose,
            confidence=out.confidence,
            recogniser=self.settings.recogniser or Recogniser.RULES,
            hold=out.hold,
            cooldown_ms_left=out.cooldown_ms_left,
            fps=round(self._fps, 1),
        )
