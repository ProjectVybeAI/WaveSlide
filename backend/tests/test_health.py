def test_health_reports_replay_and_record_mode(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["source"] == "replay"
    assert body["keys_mode"] == "record"


def test_unknown_model_returns_shared_error_shape(client):
    response = client.get("/api/model")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NO_MODEL"
