"""Each profile's key sequence per operating system, pressed through a RecordingSender."""

import pytest

from app.contract.common import Action, Gesture
from app.core.commands import make_command
from app.core.intents import Intent
from app.engine.command_log import CommandLog
from app.engine.dispatcher import Dispatcher
from app.keys.profiles import load_profiles
from app.keys.sender import RecordingSender

COMMON = {
    Action.NEXT: ["right"],
    Action.PREVIOUS: ["left"],
    Action.EXIT_SHOW: ["esc"],
}
TYPE_NUMBER = {Action.BLANK_TOGGLE: ["b"], Action.JUMP: ["3", "enter"]}

EXPECTED = {
    ("powerpoint", "darwin"): {**COMMON, **TYPE_NUMBER, Action.START_SHOW: ["shift+command+enter"]},
    ("powerpoint", "win32"): {**COMMON, **TYPE_NUMBER, Action.START_SHOW: ["shift+f5"]},
    ("google_slides", "darwin"): {**COMMON, **TYPE_NUMBER, Action.START_SHOW: ["command+enter"]},
    ("google_slides", "win32"): {**COMMON, **TYPE_NUMBER, Action.START_SHOW: ["ctrl+enter"]},
    ("pdf_viewer", "darwin"): {
        **COMMON,
        Action.START_SHOW: ["command+l"],
        Action.JUMP: ["home", "right", "right"],
    },
    ("pdf_viewer", "win32"): {
        **COMMON,
        Action.START_SHOW: ["ctrl+l"],
        Action.JUMP: ["home", "right", "right"],
    },
    ("practice", "darwin"): {**COMMON, **TYPE_NUMBER, Action.START_SHOW: ["f"]},
    ("practice", "win32"): {**COMMON, **TYPE_NUMBER, Action.START_SHOW: ["f"]},
}


def _dispatcher(sender: RecordingSender, focused=None) -> Dispatcher:
    return Dispatcher(sender, CommandLog(None), lambda: focused or [], lambda: True)


@pytest.mark.parametrize(("profile_id", "os_name"), list(EXPECTED))
def test_every_action_presses_the_profiles_keys(profile_id, os_name):
    profile = load_profiles(os_name)[profile_id]
    sender = RecordingSender()
    dispatcher = _dispatcher(sender)
    for action, keys in EXPECTED[(profile_id, os_name)].items():
        intent = Intent(action, Gesture.FIST, slide=3 if action == Action.JUMP else None)
        entry, warning = dispatcher.dispatch(make_command(profile, intent), profile_id, 0.0)
        assert entry.keys == keys, f"{profile_id}/{os_name}/{action}"
        assert entry.blocked_reason is None and warning is None
    if profile_id != "practice":  # the practice deck follows the command event, not the keyboard
        assert sender.sent == list(EXPECTED[(profile_id, os_name)].values())
    else:
        assert sender.sent == []


@pytest.mark.parametrize("os_name", ["darwin", "win32"])
def test_pdf_viewer_has_no_blank_screen_and_says_so(os_name):
    profile = load_profiles(os_name)["pdf_viewer"]
    sender = RecordingSender()
    entry, _ = _dispatcher(sender).dispatch(
        make_command(profile, Intent(Action.BLANK_TOGGLE, Gesture.OPEN_PALM)), "pdf_viewer", 0.0
    )
    assert entry.keys == [] and "no shortcut" in entry.blocked_reason
    assert sender.sent == []


def test_jump_by_typing_a_two_digit_number():
    profile = load_profiles("darwin")["powerpoint"]
    command = make_command(profile, Intent(Action.JUMP, Gesture.COUNT_5, slide=10))
    assert command.keys == ["1", "0", "enter"]


def test_pdf_jump_steps_from_the_first_page():
    profile = load_profiles("win32")["pdf_viewer"]
    assert make_command(profile, Intent(Action.JUMP, Gesture.COUNT_1, slide=1)).keys == ["home"]
    assert (
        make_command(profile, Intent(Action.JUMP, Gesture.COUNT_5, slide=5)).keys == ["home"] + ["right"] * 4
    )
    assert (
        make_command(profile, Intent(Action.JUMP, Gesture.COUNT_5, slide=10)).keys == ["home"] + ["right"] * 9
    )


def test_toggling_activation_presses_no_keys():
    profile = load_profiles("darwin")["powerpoint"]
    sender = RecordingSender()
    entry, _ = _dispatcher(sender).dispatch(
        make_command(profile, Intent(Action.TOGGLE_ACTIVE, Gesture.THUMBS_UP)), "powerpoint", 0.0
    )
    assert entry.keys == [] and entry.blocked_reason is None
    assert sender.sent == []


def test_focus_guard_blocks_keys_while_a_waveslide_window_has_focus():
    profile = load_profiles("darwin")["powerpoint"]
    command = make_command(profile, Intent(Action.NEXT, Gesture.SWIPE_RIGHT))
    for route in ("/settings", "/", "/overlay"):
        sender = RecordingSender()
        entry, warning = _dispatcher(sender, focused=[route]).dispatch(command, "powerpoint", 0.0)
        assert sender.sent == []
        assert entry.blocked_reason and "WaveSlide window has focus" in entry.blocked_reason
        assert warning is not None and warning.code == "FOCUS_BLOCKED"
        assert entry.keys == ["right"]  # the log still says what would have been sent


def test_focus_guard_lets_the_practice_deck_through():
    profile = load_profiles("darwin")["powerpoint"]
    sender = RecordingSender()
    command = make_command(profile, Intent(Action.NEXT, Gesture.SWIPE_RIGHT))
    entry, warning = _dispatcher(sender, focused=["/practice"]).dispatch(command, "powerpoint", 0.0)
    assert sender.sent == [["right"]] and entry.blocked_reason is None and warning is None


def test_keys_are_not_sent_without_accessibility_permission():
    profile = load_profiles("darwin")["powerpoint"]
    sender = RecordingSender()
    dispatcher = Dispatcher(sender, CommandLog(None), lambda: [], lambda: False)
    entry, warning = dispatcher.dispatch(
        make_command(profile, Intent(Action.NEXT, Gesture.SWIPE_RIGHT)), "powerpoint", 0.0
    )
    assert sender.sent == []
    assert "Accessibility" in entry.blocked_reason and warning.code == "KEYS_NOT_ALLOWED"


def test_a_failing_sender_is_logged_as_blocked_not_raised():
    class BrokenSender(RecordingSender):
        def send(self, keys):
            raise OSError("no display")

    profile = load_profiles("darwin")["powerpoint"]
    dispatcher = Dispatcher(BrokenSender(), CommandLog(None), lambda: [], lambda: True)
    entry, warning = dispatcher.dispatch(
        make_command(profile, Intent(Action.NEXT, Gesture.SWIPE_RIGHT)), "powerpoint", 0.0
    )
    assert entry.blocked_reason == "The keys could not be sent." and warning.code == "KEYS_NOT_ALLOWED"


def test_dispatch_records_the_latency_from_frame_capture():
    import time

    profile = load_profiles("darwin")["powerpoint"]
    captured_at = time.perf_counter() - 0.025
    entry, _ = _dispatcher(RecordingSender()).dispatch(
        make_command(profile, Intent(Action.NEXT, Gesture.SWIPE_RIGHT)), "powerpoint", captured_at
    )
    assert 25 <= entry.pipeline_ms < 200 and entry.dry_run is True
