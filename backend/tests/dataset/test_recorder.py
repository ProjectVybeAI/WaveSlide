"""The guided recorder: protocols, labels, prompts, luminance, and the API rules around it."""

import json
import time

from app.contract.common import SourceKind
from app.contract.engine import EngineFrame, HandLandmarks, RecordingPromptEvent
from app.contract.sessions import RecordingRequest
from app.dataset.protocols import step_at, timeline
from app.dataset.recorder import Recorder
from app.dataset.store import read_header, summarise
from app.dataset.synthetic import PARTICIPANTS, SessionBuilder


def one_hand() -> list[HandLandmarks]:
    builder = SessionBuilder(PARTICIPANTS[0], seed=1)
    return [builder._hand("FIST")]


def engine_frame(t: float, hands: list[HandLandmarks] | None = None) -> EngineFrame:
    return EngineFrame(
        seq=1,
        t=t,
        active=True,
        state="ACTIVE",
        source="camera",
        hands=one_hand() if hands is None else hands,
        pose="NONE",
        confidence=0.0,
        recogniser="rules",
        fps=30.0,
    )


def request(protocol="gestures", participant="Asha Rao") -> RecordingRequest:
    return RecordingRequest(protocol=protocol, participant=participant, distance_m=1.5, lighting="dim")


# ---- protocols --------------------------------------------------------------------
def test_gestures_protocol_asks_each_pose_for_4_s_three_times_and_ten_swipes_each_way():
    steps = [s for s in timeline("gestures") if s.labelled]
    poses = [s for s in steps if not s.gesture.startswith("SWIPE")]
    assert len(poses) == 27 and {s.seconds for s in poses} == {4.0}
    assert [s.gesture for s in steps].count("SWIPE_RIGHT") == 10
    assert [s.gesture for s in steps].count("SWIPE_LEFT") == 10


def test_talking_protocol_is_three_minutes_with_one_label():
    steps = timeline("talking")
    assert sum(s.seconds for s in steps) == 180 and [s.gesture for s in steps if s.labelled] == ["TALKING"]


def test_two_hand_protocol_labels_slides_6_to_10():
    labels = {s.gesture for s in timeline("two_hand") if s.labelled}
    assert {f"COUNT_{n}" for n in range(6, 11)} <= labels


def test_step_at_walks_the_timeline_and_ends():
    steps = timeline("talking")
    assert step_at(steps, 0.0) == 0 and step_at(steps, 179.9) == 0 and step_at(steps, 180.0) is None


# ---- the recorder -----------------------------------------------------------------
def record(tmp_path, protocol="gestures", seconds=20.0, luminance=lambda: 112.0):
    prompts: list[RecordingPromptEvent] = []
    recorder = Recorder(request(protocol), tmp_path, prompts.append, luminance)
    hands = one_hand()
    for i in range(int(seconds * 10)):
        recorder.feed(engine_frame(100.0 + i / 10, hands))  # the engine clock need not start at 0
    return recorder, prompts


def test_stopping_early_saves_the_frames_and_cuts_the_last_label(tmp_path):
    recorder, _ = record(tmp_path, seconds=20.0)
    summary = recorder.finish()
    header = read_header(tmp_path / f"{summary.id}.jsonl")
    assert summary.source == "recorded" and summary.n_frames == 200
    assert header.participant == "Asha Rao" and header.distance_m == 1.5 and header.lighting == "dim"
    assert header.labels and header.labels[-1].end <= 20.0
    assert header.labels[0].gesture == "FIST" and header.labels[0].start == 5.0  # after 2.5 s + 2.5 s


def test_the_session_stores_the_mean_luminance(tmp_path):
    values = iter([100.0, 110.0, 120.0] * 100)
    recorder, _ = record(tmp_path, luminance=lambda: next(values))
    header = read_header(tmp_path / f"{recorder.finish().id}.jsonl")
    assert 105 <= header.luminance_mean <= 115


def test_session_files_hold_landmarks_and_no_image_keys(tmp_path):
    recorder, _ = record(tmp_path)
    path = tmp_path / f"{recorder.finish().id}.jsonl"
    keys = set()
    for line in path.read_text(encoding="utf-8").splitlines():
        keys |= set(json.loads(line))
    forbidden = {"image", "frame", "jpeg", "pixels", "picture", "video", "data_url"}
    assert not keys & forbidden
    assert summarise(path).n_frames == 200


def test_a_prompt_event_is_sent_for_each_step_reached(tmp_path):
    _, prompts = record(tmp_path, seconds=20.0)
    assert [p.step for p in prompts] == list(range(1, len(prompts) + 1))
    assert prompts[1].gesture == "FIST" and prompts[1].seconds == 2.5
    assert prompts[2].prompt == "Make a fist" and prompts[2].total_steps == len(timeline("gestures"))


def test_the_recorder_finishes_and_saves_by_itself_after_the_last_step(tmp_path):
    recorder, _ = record(tmp_path, protocol="talking", seconds=185.0)
    assert recorder.finished and recorder.saved is not None
    assert recorder.saved.n_frames == 1800  # frames after the end are not added


def test_stopping_with_no_frames_saves_nothing(tmp_path):
    recorder = Recorder(request(), tmp_path)
    assert recorder.finish() is None and list(tmp_path.glob("*.jsonl")) == []


# ---- the API ----------------------------------------------------------------------
BODY = {"protocol": "gestures", "participant": "Asha Rao", "distance_m": 1.0, "lighting": "normal"}


def test_recording_in_replay_mode_is_refused_with_camera_required(client):
    response = client.post("/api/recordings", json=BODY)
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "CAMERA_REQUIRED"


def test_stopping_when_nothing_records_is_404_no_recording(client):
    response = client.post("/api/recordings/current/stop")
    assert response.status_code == 404 and response.json()["error"]["code"] == "NO_RECORDING"


def test_a_bad_recording_request_is_422(client):
    response = client.post("/api/recordings", json={**BODY, "participant": ""})
    assert response.status_code == 422 and response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_a_camera_recording_starts_stops_and_appears_in_the_session_list(client):
    state = client.app.state.waveslide
    state.engine.source_kind = SourceKind.CAMERA  # pretend the webcam is the source
    real_sender = state.engine.dispatcher.sender
    started = client.post("/api/recordings", json=BODY)
    assert started.status_code == 200 and started.json()["step"] == 1
    assert state.engine.dispatcher.sender is not real_sender  # recorded gestures must not press keys
    again = client.post("/api/recordings", json=BODY)
    assert again.status_code == 409 and again.json()["error"]["code"] == "RECORDING_IN_PROGRESS"

    for i in range(60):  # the recorder reads the newest frame each time it wakes
        state.hub.publish_frame(engine_frame(50.0 + i / 30))
        time.sleep(0.01)
    time.sleep(0.3)
    stopped = client.post("/api/recordings/current/stop")
    assert stopped.status_code == 200
    assert stopped.json()["source"] == "recorded" and stopped.json()["n_frames"] >= 1
    assert state.engine.dispatcher.sender is real_sender
    sessions = client.get("/api/sessions", params={"source": "recorded"}).json()
    assert [s["id"] for s in sessions] == [stopped.json()["id"]]
