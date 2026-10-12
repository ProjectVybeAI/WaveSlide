from app.contract.common import Action
from app.keys.profiles import keys_for, load_profiles


def test_every_profile_defines_keys_for_both_operating_systems():
    for os_name in ("darwin", "win32"):
        profiles = load_profiles(os_name)
        assert set(profiles) == {"powerpoint", "google_slides", "pdf_viewer", "practice"}
        for profile in profiles.values():
            for action in (Action.NEXT, Action.PREVIOUS, Action.JUMP):
                assert profile.keys[action]


def test_jump_keys_per_strategy():
    profiles = load_profiles("win32")
    assert keys_for(profiles["powerpoint"], Action.JUMP, 12) == ["1", "2", "enter"]
    assert keys_for(profiles["pdf_viewer"], Action.JUMP, 3) == ["home", "right", "right"]
