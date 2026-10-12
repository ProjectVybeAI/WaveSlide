import json

import pytest
from starlette.websockets import WebSocketDisconnect


def test_socket_sends_an_engine_frame_within_one_second(live_client):
    with live_client.websocket_connect("/ws/engine") as ws:
        ws.send_text(json.dumps({"type": "hello", "role": "overlay"}))
        for _ in range(60):
            message = json.loads(ws.receive_text())
            if message["type"] == "frame":
                break
        assert message["type"] == "frame"
        assert message["source"] == "replay"
        assert {"seq", "hands", "pose", "state", "fps"} <= message.keys()


def test_foreign_origin_is_closed_with_1008(live_client):
    with (
        pytest.raises(WebSocketDisconnect) as closed,
        live_client.websocket_connect("/ws/engine", headers={"origin": "https://example.com"}) as ws,
    ):
        ws.receive_text()
    assert closed.value.code == 1008


def test_activation_change_is_delivered_as_an_event(live_client):
    with live_client.websocket_connect("/ws/engine") as ws:
        live_client.post("/api/engine/active", json={"active": True})
        for _ in range(120):
            message = json.loads(ws.receive_text())
            if message["type"] == "event":
                break
        assert message["event"] == {"kind": "activation_changed", "active": True}


def test_replay_has_no_camera_preview(client):
    assert client.get("/api/preview.mjpg").json()["error"]["code"] == "NO_CAMERA_IN_REPLAY"


def test_unknown_replay_session_is_404(client):
    response = client.post("/api/engine/source", json={"kind": "replay", "session_id": "nope"})
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "SESSION_NOT_FOUND"
