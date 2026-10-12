"""Permissions, camera list and overlay presets. macOS calls are replaced by fake modules."""

import sys
import types

import pytest

from app.platform import permissions
from app.platform.cameras import list_cameras
from app.platform.overlay import OVERLAY_SIZES, overlay_geometry


def _fake_macos(monkeypatch, camera_status: int, accessibility: bool) -> None:
    monkeypatch.setattr(sys, "platform", "darwin")
    av = types.ModuleType("AVFoundation")
    av.AVMediaTypeVideo = "vide"
    av.AVCaptureDevice = types.SimpleNamespace(authorizationStatusForMediaType_=lambda _: camera_status)
    quartz = types.ModuleType("Quartz")
    quartz.CGPreflightPostEventAccess = lambda: accessibility
    monkeypatch.setitem(sys.modules, "AVFoundation", av)
    monkeypatch.setitem(sys.modules, "Quartz", quartz)


@pytest.mark.parametrize(
    ("status", "expected"), [(3, "granted"), (2, "denied"), (1, "denied"), (0, "unknown")]
)
def test_macos_camera_status_is_mapped(monkeypatch, status, expected):
    _fake_macos(monkeypatch, camera_status=status, accessibility=True)
    assert permissions.camera_permission() == expected


def test_macos_accessibility_missing_is_reported_as_denied(monkeypatch):
    _fake_macos(monkeypatch, camera_status=3, accessibility=False)
    assert permissions.check_permissions("pyautogui").keyboard == "denied"
    assert permissions.check_permissions("pyautogui").camera == "granted"


def test_record_mode_needs_no_accessibility(monkeypatch):
    _fake_macos(monkeypatch, camera_status=3, accessibility=False)
    assert permissions.check_permissions("record").keyboard == "not_required"
    assert permissions.keyboard_allowed("record") is True


def test_windows_needs_no_permissions(monkeypatch):
    monkeypatch.setattr(sys, "platform", "win32")
    result = permissions.check_permissions("pyautogui")
    assert (result.camera, result.keyboard) == ("not_required", "not_required")


def test_a_failing_os_call_means_unknown_not_a_crash(monkeypatch):
    monkeypatch.setattr(sys, "platform", "darwin")
    broken = types.ModuleType("Quartz")  # has no CGPreflightPostEventAccess
    monkeypatch.setitem(sys.modules, "Quartz", broken)
    assert permissions.keyboard_permission() == "unknown"


def test_keys_are_blocked_only_when_the_os_says_denied_and_the_answer_is_cached(monkeypatch):
    _fake_macos(monkeypatch, camera_status=3, accessibility=False)
    monkeypatch.setattr(permissions, "_keyboard_cache", (0.0, "unknown"))
    assert permissions.keyboard_allowed("pyautogui") is False
    sys.modules["Quartz"].CGPreflightPostEventAccess = lambda: True  # granted a moment later
    assert permissions.keyboard_allowed("pyautogui") is False  # still the cached answer
    monkeypatch.setattr(permissions, "_keyboard_cache", (0.0, "unknown"))
    assert permissions.keyboard_allowed("pyautogui") is True


def test_health_reports_permissions_and_model(client):
    body = client.get("/api/health").json()
    assert body["permissions"]["keyboard"] == "not_required"  # the test config records keys
    assert body["model_loaded"] is False
    assert body["keys_mode"] == "record"


def test_overlay_presets_match_the_design():
    assert OVERLAY_SIZES == {"full": (340, 280), "compact": (220, 56)}


def test_overlay_sits_top_right_sixteen_pixels_in():
    assert overlay_geometry("full", 1512) == (340, 280, 1512 - 340 - 16, 16)
    assert overlay_geometry("compact", 1512) == (220, 56, 1512 - 220 - 16, 16)
    assert overlay_geometry("full", None)[2] is None


def test_overlay_endpoint_calls_the_desktop_shell(client):
    seen: list[str] = []
    client.app.state.waveslide.overlay_controller = seen.append
    for mode in ("compact", "hidden", "full"):
        assert client.post("/api/overlay", json={"mode": mode}).json() == {"mode": mode}
    assert seen == ["compact", "hidden", "full"]


def test_overlay_endpoint_is_a_no_op_in_a_browser(client):
    assert client.post("/api/overlay", json={"mode": "compact"}).status_code == 200
    assert client.post("/api/overlay", json={"mode": "tiny"}).status_code == 422


def test_cameras_are_listed_by_name(monkeypatch):
    fake = types.ModuleType("cv2_enumerate_cameras")
    fake.enumerate_cameras = lambda backend: [
        types.SimpleNamespace(index=0, name="FaceTime HD Camera"),
        types.SimpleNamespace(index=1, name="Logitech C920"),
    ]
    monkeypatch.setitem(sys.modules, "cv2_enumerate_cameras", fake)
    assert [(c.index, c.name) for c in list_cameras()] == [(0, "FaceTime HD Camera"), (1, "Logitech C920")]


def test_camera_list_falls_back_to_the_default_camera(monkeypatch):
    fake = types.ModuleType("cv2_enumerate_cameras")

    def broken(backend):
        raise RuntimeError("no backend")

    fake.enumerate_cameras = broken
    monkeypatch.setitem(sys.modules, "cv2_enumerate_cameras", fake)
    assert [c.index for c in list_cameras()] == [0]
