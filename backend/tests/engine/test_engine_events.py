"""Engine wiring: command log, hub focus, and the engine thread end to end on a tiny replay."""

import asyncio
import json

import pytest
from fastapi.testclient import TestClient

from app.config import Config
from app.contract.common import Action, Gesture
from app.contract.engine import CommandLogEntry
from app.dataset.store import write_session
from app.dataset.synthetic import PARTICIPANTS, SessionBuilder
from app.engine.command_log import RING_SIZE, CommandLog
from app.engine.hub import Hub
from app.engine.runner import Engine
from app.engine.sources import SourceUnavailable
from app.main import create_app
from tests.core.support import park, sweep


def _entry(command_id: int) -> CommandLogEntry:
    return CommandLogEntry(
        id=command_id, t=1.0, action=Action.NEXT, gesture=Gesture.SWIPE_RIGHT, keys=["right"],
        pipeline_ms=4.2, dry_run=True,
    )  # fmt: skip


def test_command_log_keeps_the_last_200_in_memory_and_every_one_on_disk(tmp_path):
    log = CommandLog(tmp_path / "logs")
    for _ in range(RING_SIZE + 25):
        log.add(_entry(log.next_id()))
    assert len(log.recent()) == RING_SIZE
    assert log.recent()[0].id == 26 and log.last().id == RING_SIZE + 25
    (file,) = (tmp_path / "logs").glob("commands-*.jsonl")
    assert len(file.read_text().splitlines()) == RING_SIZE + 25


def test_command_log_records_the_deck_acknowledgement(tmp_path):
    log = CommandLog(tmp_path / "logs")
    log.add(_entry(log.next_id()))
    updated = log.set_ack(1, 61.234)
    assert updated.ack_ms == 61.2 and log.last().ack_ms == 61.2
    assert log.set_ack(99, 10.0) is None
    (file,) = (tmp_path / "logs").glob("commands-*.jsonl")
    last_line = json.loads(file.read_text().splitlines()[-1])
    assert last_line["id"] == 1 and last_line["ack_ms"] == 61.2


def test_hub_lists_the_routes_of_focused_windows():
    async def scenario() -> list[str]:
        hub = Hub()
        settings, overlay, deck = hub.connect(), hub.connect(), hub.connect()
        settings.has_focus, settings.route = True, "/settings"
        overlay.route = "/overlay"  # open but without focus
        deck.has_focus, deck.route = True, "/practice"
        return hub.focused_routes()

    assert sorted(asyncio.run(scenario())) == ["/practice", "/settings"]


# ---- the engine thread end to end ---------------------------------------------------------
@pytest.fixture
def swipe_app(tmp_path):
    """An app replaying a 2 second session: a steady hand, then one swipe to the right."""
    config = Config(source="replay", replay_session="quick-swipe", keys="record", data_dir=tmp_path / "data")
    builder = SessionBuilder(PARTICIPANTS[0], seed=31)
    park(builder, +1, 3.0)
    builder.hold("OPEN_PALM", 0.4)
    sweep(builder, +1, 3.0)
    builder.rest(1.0)
    header = builder.header("quick-swipe", "demo")
    write_session(config.resolved_data_dir / "sessions" / "quick-swipe.jsonl", header, builder.frames)
    return config


def _wait_for(ws, kind: str, key: str = "kind", limit: int = 400) -> dict:
    for _ in range(limit):
        message = json.loads(ws.receive_text())
        if message["type"] == "event" and message["event"][key] == kind:
            return message["event"]
    raise AssertionError(f"no {kind} event arrived")


def _go_live_and_wait_for_the_swipe(client, ws) -> dict:
    ws.send_text(json.dumps({"type": "hello", "role": "overlay"}))
    client.post("/api/engine/active", json={"active": True})
    return _wait_for(ws, "command")["command"]


def test_a_swipe_in_the_replay_sends_the_profile_keys_and_logs_the_latency(swipe_app):
    with TestClient(create_app(swipe_app)) as client, client.websocket_connect("/ws/engine") as ws:
        command = _go_live_and_wait_for_the_swipe(client, ws)
        assert command["action"] == "next" and command["keys"] == ["right"]
        assert command["blocked_reason"] is None and command["dry_run"] is True
        assert 0 <= command["pipeline_ms"] < 80
        assert client.app.state.waveslide.engine.sender.sent[0] == ["right"]
        assert client.get("/api/engine").json()["last_command"]["id"] == command["id"]


def test_focus_guard_blocks_the_keys_when_a_waveslide_window_has_focus(swipe_app):
    with TestClient(create_app(swipe_app)) as client, client.websocket_connect("/ws/engine") as ws:
        ws.send_text(json.dumps({"type": "focus", "has_focus": True, "route": "/settings"}))
        command = _go_live_and_wait_for_the_swipe(client, ws)
        assert command["blocked_reason"] and "focus" in command["blocked_reason"]
        assert command["keys"] == ["right"]
        warning = _wait_for(ws, "warning")
        assert warning["code"] == "FOCUS_BLOCKED"
        assert client.app.state.waveslide.engine.sender.sent == []


def test_practice_profile_never_presses_keys_and_the_deck_ack_adds_latency(swipe_app):
    with TestClient(create_app(swipe_app)) as client, client.websocket_connect("/ws/engine") as ws:
        settings = client.get("/api/settings").json()
        settings["profile_id"] = "practice"
        assert client.put("/api/settings", json=settings).status_code == 200
        command = _go_live_and_wait_for_the_swipe(client, ws)
        assert command["dry_run"] is True and command["keys"] == ["right"]
        assert client.app.state.waveslide.engine.sender.sent == []
        ws.send_text(json.dumps({"type": "deck_ack", "command_id": command["id"], "t": 0}))
        acked = _wait_for(ws, "command")["command"]
        assert acked["id"] == command["id"] and acked["ack_ms"] is not None and acked["ack_ms"] >= 0


def test_one_activation_event_per_change(swipe_app):
    with TestClient(create_app(swipe_app)) as client, client.websocket_connect("/ws/engine") as ws:
        client.post("/api/engine/active", json={"active": True})
        client.post("/api/engine/active", json={"active": True})  # no change, no second event
        client.post("/api/engine/active", json={"active": False})
        events = []
        while len(events) < 2:
            message = json.loads(ws.receive_text())
            if message["type"] == "event" and message["event"]["kind"] == "activation_changed":
                events.append(message["event"]["active"])
        assert events == [True, False]


def test_switching_to_an_unavailable_camera_is_a_503(swipe_app, monkeypatch):
    original = Engine._open_source

    def open_source(self):
        if self.source_kind.value == "camera":
            raise SourceUnavailable("Camera 0 could not be opened")
        return original(self)

    monkeypatch.setattr(Engine, "_open_source", open_source)
    with TestClient(create_app(swipe_app)) as client:
        response = client.post("/api/engine/source", json={"kind": "camera"})
        assert response.status_code == 503
        assert response.json()["error"]["code"] == "CAMERA_UNAVAILABLE"
        assert client.get("/api/engine").json()["camera_ok"] is False
        back = client.post("/api/engine/source", json={"kind": "replay", "session_id": "quick-swipe"})
        assert back.status_code == 200
