"""Camera names for the camera picker (OpenCV itself only knows indexes)."""

import sys

from app.contract.system import CameraInfo


def list_cameras() -> list[CameraInfo]:
    """Cameras on this computer, using AVFoundation on macOS and DirectShow on Windows."""
    try:
        import cv2
        from cv2_enumerate_cameras import enumerate_cameras

        backend = cv2.CAP_AVFOUNDATION if sys.platform == "darwin" else cv2.CAP_DSHOW
        return [CameraInfo(index=c.index, name=c.name) for c in enumerate_cameras(backend)]
    except Exception:  # noqa: BLE001 - listing is a convenience; fall back to the default camera
        return [CameraInfo(index=0, name="Default camera")]
