from app.keys.focus import focus_block_reason


def test_nothing_focused_means_keys_may_be_sent():
    assert focus_block_reason([]) is None


def test_settings_window_or_overlay_with_focus_blocks():
    assert focus_block_reason(["/settings"])
    assert focus_block_reason(["/overlay"])
    assert focus_block_reason(["/"])


def test_practice_deck_is_exempt_but_another_window_still_blocks():
    assert focus_block_reason(["/practice"]) is None
    assert focus_block_reason(["/practice", "/settings"])


def test_profiles_endpoint_lists_all_four_apps_with_keys(client):
    profiles = {p["id"]: p for p in client.get("/api/profiles").json()}
    assert set(profiles) == {"powerpoint", "google_slides", "pdf_viewer", "practice"}
    assert profiles["pdf_viewer"]["unsupported"] == ["blank_toggle"]
    assert profiles["pdf_viewer"]["jump_strategy"] == "step_from_home"
    assert profiles["powerpoint"]["keys"]["next"] == ["right"]
