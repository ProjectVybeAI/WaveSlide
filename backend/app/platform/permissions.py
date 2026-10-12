"""Camera and keyboard permission status for the Live setup check.

macOS asks for two permissions: Camera (AVFoundation) and Accessibility, which lets this
app press keys (`CGPreflightPostEventAccess`). Windows needs neither. If pyobjc is missing
or a call fails, the answer is "unknown": the setup check then shows a neutral state
instead of a false alarm.
"""

import sys
import time

from app.contract.system import Permission, Permissions

# AVAuthorizationStatus: 0 not determined, 1 restricted, 2 denied, 3 authorized
_CAMERA_STATUS: dict[int, Permission] = {0: "unknown", 1: "denied", 2: "denied", 3: "granted"}
CACHE_SECONDS = 2.0  # the check runs before every key press; asking the OS that often is wasteful

_keyboard_cache: tuple[float, Permission] = (0.0, "unknown")


def camera_permission() -> Permission:
    if sys.platform != "darwin":
        return "not_required"
    try:
        from AVFoundation import AVCaptureDevice, AVMediaTypeVideo

        status = AVCaptureDevice.authorizationStatusForMediaType_(AVMediaTypeVideo)
        return _CAMERA_STATUS.get(int(status), "unknown")
    except Exception:  # noqa: BLE001 - any pyobjc failure just means "we cannot tell"
        return "unknown"


def keyboard_permission() -> Permission:
    if sys.platform != "darwin":
        return "not_required"
    try:
        from Quartz import CGPreflightPostEventAccess

        return "granted" if CGPreflightPostEventAccess() else "denied"
    except Exception:  # noqa: BLE001
        return "unknown"


def check_permissions(keys_mode: str = "pyautogui") -> Permissions:
    """`keys_mode` "record" never presses keys, so Accessibility is not needed."""
    keyboard = "not_required" if keys_mode == "record" else keyboard_permission()
    return Permissions(camera=camera_permission(), keyboard=keyboard)


def keyboard_allowed(keys_mode: str = "pyautogui") -> bool:
    """False only when the OS says no (cached briefly). Unknown counts as allowed."""
    global _keyboard_cache
    if keys_mode == "record":
        return True
    now = time.monotonic()
    if now - _keyboard_cache[0] > CACHE_SECONDS:
        _keyboard_cache = (now, keyboard_permission())
    return _keyboard_cache[1] != "denied"
