"""Settings rules beyond field ranges, persistence, reset and export/import."""

import json

from fastapi.testclient import TestClient

from app.contract.settings import Settings
from app.main import create_app


def _settings(**mappings) -> dict:
    body = Settings().model_dump(mode="json")
    body["mappings"].update(mappings)
    return body


def _error(response) -> dict:
    return response.json()["error"]


def test_the_same_gesture_on_two_actions_is_a_409_mapping_conflict(client):
    response = client.put("/api/settings", json=_settings(next="FIST", start_show="FIST"))
    assert response.status_code == 409
    error = _error(response)
    assert error["code"] == "MAPPING_CONFLICT"
    assert error["details"] == {"gesture": "FIST", "actions": ["next", "start_show"]}


def test_a_conflict_with_a_default_mapping_is_found_too(client):
    # FIST is start_show's default: assigning it to blank as well is a conflict
    response = client.put("/api/settings", json=_settings(blank_toggle="FIST"))
    assert response.status_code == 409 and _error(response)["code"] == "MAPPING_CONFLICT"


def test_a_conflict_is_not_saved(client):
    client.put("/api/settings", json=_settings(next="FIST"))
    assert client.get("/api/settings").json()["mappings"]["next"] == "SWIPE_RIGHT"


def test_count_gestures_are_reserved_for_jumping(client):
    response = client.put("/api/settings", json=_settings(blank_toggle="COUNT_3"))
    assert response.status_code == 409
    error = _error(response)
    assert error["code"] == "MAPPING_CONFLICT"
    assert "jump" in error["details"]["actions"] and "COUNT_3" in error["message"]


def test_a_swipe_as_the_activation_gesture_is_a_422(client):
    response = client.put("/api/settings", json=_settings(toggle_active="SWIPE_LEFT"))
    assert response.status_code == 422
    assert _error(response)["code"] == "ACTIVATION_MUST_BE_HELD_POSE"


def test_activation_rule_is_reported_before_a_conflict(client):
    response = client.put(
        "/api/settings", json=_settings(toggle_active="SWIPE_RIGHT")
    )  # also clashes with next
    assert response.status_code == 422


def test_ml_recogniser_without_a_model_is_a_409_no_model(client):
    body = Settings().model_dump(mode="json")
    body["recogniser"] = "ml"
    response = client.put("/api/settings", json=body)
    assert response.status_code == 409
    assert _error(response)["code"] == "NO_MODEL"


def test_ml_recogniser_is_accepted_once_a_model_exists(client, config):
    model = config.resolved_data_dir / "models" / "pose_rf.joblib"
    model.parent.mkdir(parents=True)
    model.write_bytes(b"model")
    body = Settings().model_dump(mode="json")
    body["recogniser"] = "ml"
    assert client.put("/api/settings", json=body).status_code == 200
    assert client.get("/api/health").json()["model_loaded"] is True


def test_swapping_two_gestures_is_allowed(client):
    response = client.put("/api/settings", json=_settings(next="SWIPE_LEFT", previous="SWIPE_RIGHT"))
    assert response.status_code == 200


def test_a_pose_can_replace_a_swipe_for_next(client):
    response = client.put("/api/settings", json=_settings(next="THUMBS_DOWN", exit_show="SWIPE_RIGHT"))
    assert response.status_code == 200


def test_settings_survive_a_restart(config):
    body = Settings().model_dump(mode="json")
    body["timing"]["cooldown_ms"] = 1200
    body["mappings"]["blank_toggle"] = "THUMBS_DOWN"
    body["mappings"]["exit_show"] = "OPEN_PALM"
    with TestClient(create_app(config, start_engine=False)) as first:
        assert first.put("/api/settings", json=body).status_code == 200
    with TestClient(create_app(config, start_engine=False)) as second:
        saved = second.get("/api/settings").json()
    assert saved["timing"]["cooldown_ms"] == 1200
    assert saved["mappings"]["blank_toggle"] == "THUMBS_DOWN"


def test_a_broken_settings_file_falls_back_to_defaults(config):
    path = config.resolved_data_dir / "settings.json"
    path.parent.mkdir(parents=True)
    path.write_text("{ not json")
    with TestClient(create_app(config, start_engine=False)) as c:
        assert c.get("/api/settings").json()["timing"]["cooldown_ms"] == 800
    assert path.with_suffix(".broken.json").is_file()


def test_reset_restores_the_brief_defaults(client):
    body = Settings().model_dump(mode="json")
    body["timing"]["cooldown_ms"] = 2500
    body["sensitivity"]["swipe_min_travel"] = 3.0
    client.put("/api/settings", json=body)
    reset = client.post("/api/settings/reset").json()
    assert reset == Settings().model_dump(mode="json")
    assert client.get("/api/settings").json() == reset


def test_export_then_import_round_trips(client):
    body = Settings().model_dump(mode="json")
    body["profile_id"] = "pdf_viewer"
    body["sensitivity"]["still_max_speed"] = 1.4
    client.put("/api/settings", json=body)
    exported = client.get("/api/settings/export")
    assert "attachment" in exported.headers["content-disposition"]
    client.post("/api/settings/reset")
    imported = client.post(
        "/api/settings/import",
        files={"file": ("waveslide-settings.json", exported.content, "application/json")},
    )
    assert imported.status_code == 200
    assert imported.json() == body
    assert client.get("/api/settings").json() == body


def test_import_of_a_foreign_file_is_a_422(client):
    response = client.post(
        "/api/settings/import",
        files={"file": ("x.json", json.dumps({"hello": 1}).encode(), "application/json")},
    )
    assert response.status_code == 422 and _error(response)["code"] == "VALIDATION_ERROR"


def test_import_applies_the_same_rules_as_put(client):
    bad = _settings(next="FIST", start_show="FIST")
    response = client.post(
        "/api/settings/import", files={"file": ("x.json", json.dumps(bad).encode(), "application/json")}
    )
    assert response.status_code == 409 and _error(response)["code"] == "MAPPING_CONFLICT"
