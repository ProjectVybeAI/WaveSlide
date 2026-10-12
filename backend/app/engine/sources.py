"""Landmark sources: where hands come from. The pipeline cannot tell them apart.

- CameraLandmarkSource: webcam frames (OpenCV) -> MediaPipe HandLandmarker -> hands.
- ReplayLandmarkSource: a recorded or synthetic session file, paced in real time or
  as fast as possible (evaluation).
"""

import time
from abc import ABC, abstractmethod
from pathlib import Path

import numpy as np

from app.contract.common import SourceKind
from app.core.types import FrameInput, Hand
from app.dataset.store import iter_frames, read_header


class SourceUnavailable(Exception):
    """The camera could not be opened or stopped delivering frames."""


class LandmarkSource(ABC):
    kind: SourceKind
    session_id: str | None = None

    @abstractmethod
    def read(self) -> FrameInput | None:
        """Block until the next frame. None means the source has ended."""

    def latest_jpeg(self) -> bytes | None:
        """The last camera frame as JPEG (camera sources only)."""
        return None

    def close(self) -> None:  # noqa: B027 - optional hook
        pass


class ReplayLandmarkSource(LandmarkSource):
    kind = SourceKind.REPLAY

    def __init__(self, path: Path, realtime: bool = True, loop: bool = True):
        self.path = path
        self.session_id = read_header(path).id
        self.realtime = realtime
        self.loop = loop
        self._frames = list(iter_frames(path))
        if not self._frames:
            raise SourceUnavailable(f"Session {self.session_id} has no frames")
        self._index = 0
        self._offset = 0.0  # session time added on each loop, so t keeps increasing
        self._started = time.perf_counter()

    def read(self) -> FrameInput | None:
        if self._index >= len(self._frames):
            if not self.loop:
                return None
            self._offset += self._frames[-1].t + 1.0 / 30
            self._index = 0
        frame = self._frames[self._index]
        self._index += 1
        t = frame.t + self._offset
        if self.realtime:
            wait = self._started + t - time.perf_counter()
            if wait > 0:
                time.sleep(wait)
        hands = [Hand(h.handedness, h.score, np.asarray(h.landmarks, dtype=float)) for h in frame.hands]
        return FrameInput(t=t, captured_at=time.perf_counter(), hands=hands)


class CameraLandmarkSource(LandmarkSource):
    """Webcam + MediaPipe. Imports OpenCV and MediaPipe lazily so tests never need them."""

    kind = SourceKind.CAMERA

    def __init__(self, index: int, width: int, height: int, model_path: Path):
        import cv2

        from app.engine.detector import HandDetector

        backend = cv2.CAP_AVFOUNDATION if _is_mac() else cv2.CAP_DSHOW if _is_windows() else 0
        self._cv2 = cv2
        self._cap = cv2.VideoCapture(index, backend)
        if not self._cap.isOpened():
            raise SourceUnavailable(f"Camera {index} could not be opened")
        self._cap.set(cv2.CAP_PROP_FRAME_WIDTH, width)
        self._cap.set(cv2.CAP_PROP_FRAME_HEIGHT, height)
        self._detector = HandDetector(model_path)
        self._started = time.perf_counter()
        self._jpeg: bytes | None = None
        self._last_jpeg_at = 0.0

    def read(self) -> FrameInput | None:
        ok, bgr = self._cap.read()
        captured_at = time.perf_counter()
        if not ok:
            raise SourceUnavailable("The camera stopped sending frames")
        bgr = self._cv2.flip(bgr, 1)  # mirror: the presenter's right is image right
        rgb = self._cv2.cvtColor(bgr, self._cv2.COLOR_BGR2RGB)
        t = captured_at - self._started
        hands = self._detector.detect(rgb, int(t * 1000))
        if captured_at - self._last_jpeg_at > 1 / 15:  # preview at 15 fps is plenty
            self._jpeg = _encode_preview(self._cv2, bgr)
            self._last_jpeg_at = captured_at
        height, width = bgr.shape[:2]
        return FrameInput(t=t, captured_at=captured_at, hands=hands, aspect=width / height)

    def latest_jpeg(self) -> bytes | None:
        return self._jpeg

    def close(self) -> None:
        self._cap.release()
        self._detector.close()


def _encode_preview(cv2, bgr) -> bytes:
    height, width = bgr.shape[:2]
    small = cv2.resize(bgr, (320, int(320 * height / width)))
    ok, buffer = cv2.imencode(".jpg", small, [cv2.IMWRITE_JPEG_QUALITY, 70])
    return buffer.tobytes() if ok else b""


def _is_mac() -> bool:
    import sys

    return sys.platform == "darwin"


def _is_windows() -> bool:
    import sys

    return sys.platform == "win32"
