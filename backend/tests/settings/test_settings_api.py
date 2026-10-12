from app.contract.settings import Settings


def test_defaults_match_the_brief_decisions(client):
    body = client.get("/api/settings").json()
    assert body["mappings"]["next"] == "SWIPE_RIGHT"
    assert body["mappings"]["toggle_active"] == "THUMBS_UP"
    assert body["timing"]["cooldown_ms"] == 800
    assert body["features"]["two_hand"] is False
    assert body["start_paused"] is True


def test_put_round_trips_and_persists(client, config):
    settings = Settings().model_dump(mode="json")
    settings["timing"]["cooldown_ms"] = 1000
    settings["profile_id"] = "google_slides"
    assert client.put("/api/settings", json=settings).status_code == 200
    assert client.get("/api/settings").json()["timing"]["cooldown_ms"] == 1000
    saved = Settings.model_validate_json((config.resolved_data_dir / "settings.json").read_text())
    assert saved.profile_id == "google_slides"


def test_out_of_range_value_is_a_422_with_the_field(client):
    settings = Settings().model_dump(mode="json")
    settings["sensitivity"]["swipe_min_travel"] = 99
    response = client.put("/api/settings", json=settings)
    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "VALIDATION_ERROR"
    assert any("swipe_min_travel" in f["loc"] for f in error["details"]["fields"])


def test_reset_restores_defaults(client):
    settings = Settings().model_dump(mode="json")
    settings["timing"]["hold_count_ms"] = 2000
    client.put("/api/settings", json=settings)
    assert client.post("/api/settings/reset").json()["timing"]["hold_count_ms"] == 1000


def test_export_then_import_round_trips(client):
    settings = Settings().model_dump(mode="json")
    settings["features"]["two_hand"] = True
    client.put("/api/settings", json=settings)
    exported = client.get("/api/settings/export").content
    client.post("/api/settings/reset")
    files = {"file": ("waveslide-settings.json", exported, "application/json")}
    assert client.post("/api/settings/import", files=files).json()["features"]["two_hand"] is True
