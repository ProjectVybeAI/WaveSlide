"""The pose model: samples, leave-one-participant-out, training rules, and ML mode in the pipeline."""

import time

import numpy as np
import pytest

from app.contract.common import ErrorCode, Pose, Recogniser
from app.contract.settings import Settings
from app.core.features import FEATURE_VERSION
from app.core.pipeline import Pipeline
from app.dataset.store import session_paths, write_session
from app.dataset.synthetic import PARTICIPANTS, demo_session
from app.errors import AppError
from app.ml.forest import MLPoseClassifier, lopo_predict, lopo_splits, new_forest
from app.ml.samples import collect_samples, frame_label, usable_sessions
from app.ml.store import classifier_factory, load_card, load_model, save_model
from app.ml.training import train_model, training_sessions
from tests.dataset.mini import copy_mini_data, mini_data_dir, mini_gestures

pytestmark = pytest.mark.timeout(120)  # the first test builds and trains the shared mini data set

SYNTHETIC = ["synthetic"]


def mini_paths():
    return usable_sessions(session_paths([mini_data_dir() / "sessions"]), SYNTHETIC)


# ---- samples ----------------------------------------------------------------------
def test_frames_are_trimmed_0_3_s_at_each_label_edge_and_swipes_are_never_used():
    header, _ = mini_gestures(PARTICIPANTS[0], seed=7)
    fist = next(label for label in header.labels if label.gesture == "FIST")
    assert frame_label(fist.start + 0.1, header) is None  # arriving
    assert frame_label(fist.start + 0.4, header) == "FIST"
    assert frame_label(fist.end - 0.4, header) == "FIST"
    assert frame_label(fist.end - 0.1, header) is None  # leaving
    swipe = next(label for label in header.labels if label.gesture == "SWIPE_RIGHT")
    assert frame_label((swipe.start + swipe.end) / 2, header) is None
    assert frame_label(swipe.end + 0.1, header) is None  # still the swipe's edge


def test_samples_cover_every_pose_with_49_numbers_each():
    samples = collect_samples(mini_paths())
    assert set(samples.labels) == {pose.value for pose in Pose}
    assert samples.vectors.shape[1] == 49
    assert set(samples.participants) == {"p1", "p2", "p3"}


def test_only_gesture_sessions_with_pose_labels_are_usable():
    everything = session_paths([mini_data_dir() / "sessions"])
    usable = usable_sessions(everything, SYNTHETIC)
    assert all("gestures" in path.stem for path in usable) and len(usable) == 4
    assert usable_sessions(everything, ["recorded"]) == []


# ---- leave-one-participant-out ----------------------------------------------------
def test_lopo_never_puts_a_participant_in_both_train_and_test():
    people = np.array(["p1"] * 5 + ["p2"] * 4 + ["p3"] * 3)
    folds = list(lopo_splits(people))
    assert [held for held, _, _ in folds] == ["p1", "p2", "p3"]
    for held, train, test in folds:
        assert held not in set(people[train])
        assert set(people[test]) == {held}
        assert len(train) + len(test) == len(people) and not set(train) & set(test)


def test_lopo_fits_each_model_without_the_held_out_participant():
    rng = np.random.default_rng(0)
    vectors = rng.normal(size=(60, 4))
    labels = np.array(["a", "b"] * 30)
    people = np.array(["p1"] * 20 + ["p2"] * 20 + ["p3"] * 20)
    seen_train_rows: list[set[str]] = []

    class Spy:
        def fit(self, x, y):
            seen_train_rows.append({tuple(row) for row in x})
            return new_forest().fit(x, y)

    lopo_predict(vectors, labels, people, make_model=Spy)
    held_out_rows = [{tuple(r) for r in vectors[people == p]} for p in ("p1", "p2", "p3")]
    for trained_on, held in zip(seen_train_rows, held_out_rows, strict=True):
        assert not trained_on & held


# ---- training ---------------------------------------------------------------------
def test_one_participant_is_not_enough_data(tmp_path):
    header, frames = mini_gestures(PARTICIPANTS[0], seed=8)
    write_session(tmp_path / "sessions" / f"{header.id}.jsonl", header, frames)
    with pytest.raises(AppError) as error:
        training_sessions([tmp_path / "sessions"], SYNTHETIC)
    assert error.value.code == ErrorCode.NOT_ENOUGH_DATA and error.value.status == 422


def test_training_writes_a_model_and_a_card_with_lopo_macro_f1(tmp_path):
    card = load_card(mini_data_dir())
    assert card.participants == ["p1", "p2", "p3"] and card.synthetic is True
    assert 0.5 < card.lopo_macro_f1 <= 1.0
    assert card.feature_version == FEATURE_VERSION and "COUNT_3" in card.classes and "NONE" in card.classes
    assert load_model(mini_data_dir()) is not None


def test_a_model_with_a_different_feature_version_is_not_loaded(tmp_path):
    copy_mini_data(tmp_path)
    card = load_card(tmp_path).model_copy(update={"feature_version": FEATURE_VERSION + 1})
    save_model(tmp_path, load_model(tmp_path), card)
    assert load_model(tmp_path) is None
    assert classifier_factory(tmp_path)() is None


def test_the_classifier_factory_follows_the_model_file(tmp_path):
    factory = classifier_factory(tmp_path)
    assert factory() is None  # no model yet
    copy_mini_data(tmp_path)
    first = factory()
    assert isinstance(first, MLPoseClassifier) and factory() is first  # cached while unchanged
    time.sleep(0.01)
    train_model(mini_paths(), tmp_path, lambda f, m: None)
    assert factory() is not first  # retrained: reloaded


# ---- ML mode in the pipeline ------------------------------------------------------
def demo_commands(pipeline: Pipeline):
    _, frames = demo_session(42)
    from tests.core.support import commands_of, to_inputs

    return commands_of([pipeline.process(f) for f in to_inputs(frames)])


def test_replaying_synthetic_demo_in_ml_mode_gives_the_same_commands_as_rules():
    rules = demo_commands(Pipeline(Settings(), os_name="darwin"))
    ml_settings = Settings(recogniser=Recogniser.ML)
    ml = demo_commands(
        Pipeline(ml_settings, os_name="darwin", classifier_factory=classifier_factory(mini_data_dir()))
    )
    assert ml == rules and len(rules) == 8


def test_ml_mode_without_a_model_falls_back_to_the_rules(tmp_path):
    pipeline = Pipeline(
        Settings(recogniser=Recogniser.ML), os_name="darwin", classifier_factory=classifier_factory(tmp_path)
    )
    assert demo_commands(pipeline)[0] == ("toggle_active", None)


def test_switching_recogniser_in_settings_swaps_the_classifier():
    pipeline = Pipeline(Settings(), os_name="darwin", classifier_factory=classifier_factory(mini_data_dir()))
    assert not isinstance(pipeline.classifier, MLPoseClassifier)
    pipeline.update_settings(Settings(recogniser=Recogniser.ML))
    assert isinstance(pipeline.classifier, MLPoseClassifier)
    pipeline.update_settings(Settings(recogniser=Recogniser.RULES))
    assert not isinstance(pipeline.classifier, MLPoseClassifier)


# ---- the API ----------------------------------------------------------------------
def wait_for(client, job_id, timeout=60):
    deadline = time.time() + timeout
    while time.time() < deadline:
        job = client.get(f"/api/jobs/{job_id}").json()
        if job["status"] in ("done", "failed"):
            return job
        time.sleep(0.1)
    raise AssertionError("job did not finish")


def put_sessions(client, participants: int):
    data_dir = client.app.state.waveslide.config.resolved_data_dir
    for i, person in enumerate(PARTICIPANTS[:participants]):
        header, frames = mini_gestures(person, seed=50 + i)
        write_session(data_dir / "sessions" / f"{header.id}.jsonl", header, frames)


def test_no_model_is_404_until_one_is_trained(client):
    assert client.get("/api/model").json()["error"]["code"] == "NO_MODEL"


def test_training_on_one_participant_is_422_not_enough_data(client):
    put_sessions(client, 1)
    response = client.post("/api/model/train", json={"sources": ["synthetic"]})
    assert response.status_code == 422 and response.json()["error"]["code"] == "NOT_ENOUGH_DATA"


def test_training_on_three_participants_returns_a_job_then_a_model_card(client):
    put_sessions(client, 3)
    started = client.post("/api/model/train", json={"sources": ["synthetic"]})
    assert started.status_code == 202 and started.json()["kind"] == "train"
    job = wait_for(client, started.json()["id"])
    assert job["status"] == "done" and job["progress"] == 1.0 and job["result_id"] == "pose_rf"
    card = client.get("/api/model").json()
    assert len(card["participants"]) == 3 and card["lopo_macro_f1"] > 0.5 and card["synthetic"] is True


def test_after_training_settings_accept_the_ml_recogniser(client):
    put_sessions(client, 3)
    job = wait_for(client, client.post("/api/model/train", json={"sources": ["synthetic"]}).json()["id"])
    assert job["status"] == "done"
    settings = client.get("/api/settings").json()
    settings["recogniser"] = "ml"
    assert client.put("/api/settings", json=settings).status_code == 200
    assert client.get("/api/engine").json()["recogniser"] == "ml"
    pipeline = client.app.state.waveslide.engine.pipeline
    assert isinstance(pipeline.classifier, MLPoseClassifier)


def test_a_second_job_while_one_runs_is_409_job_running(client):
    put_sessions(client, 3)
    first = client.post("/api/model/train", json={"sources": ["synthetic"]})
    second = client.post("/api/model/train", json={"sources": ["synthetic"]})
    assert second.status_code == 409 and second.json()["error"]["code"] == "JOB_RUNNING"
    wait_for(client, first.json()["id"])


def test_an_unknown_job_is_404(client):
    assert client.get("/api/jobs/nope").json()["error"]["code"] == "JOB_NOT_FOUND"
