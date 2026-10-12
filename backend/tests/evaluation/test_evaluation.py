"""The evaluation harness: scoring rule, every section, ablation, charts, report files and the API."""

import time
from functools import cache

import pytest

from app.contract.common import ErrorCode
from app.contract.evaluation import EvaluationReport
from app.contract.sessions import SessionLabel
from app.contract.settings import Settings
from app.errors import AppError
from app.evaluation.charts import write_charts
from app.evaluation.markdown import render
from app.evaluation.ratings import read_ratings
from app.evaluation.replay import Fired, Segment, expected_command
from app.evaluation.runner import chosen_sessions, list_reports, load_report, run_evaluation, save_report
from tests.dataset.mini import mini_data_dir

pytestmark = pytest.mark.timeout(180)  # the first test runs the whole evaluation once


FEEDBACK = "participant,ease,reliability,comment\np1,5,4,Felt natural\np2,4,4,\np3,4,5,Palm was easy\n"


@cache
def synthetic_report() -> EvaluationReport:
    import tempfile
    from pathlib import Path

    feedback = Path(tempfile.mkdtemp()) / "feedback.csv"
    feedback.write_text(FEEDBACK, encoding="utf-8")
    return run_evaluation([mini_data_dir() / "sessions"], ["synthetic"], feedback_csv=feedback)


# ---- the scoring rule -------------------------------------------------------------
def segment(expected, fired_actions) -> Segment:
    label = SessionLabel(start=1.0, end=3.0, gesture="COUNT_3")
    return Segment(label, expected, [Fired(t, a, s, 0.1) for t, a, s in fired_actions])


def test_a_segment_is_correct_when_exactly_the_mapped_command_fires():
    assert segment(("jump", 3), [(2.0, "jump", 3)]).correct


def test_a_missing_command_makes_the_segment_wrong():
    assert not segment(("jump", 3), []).correct


def test_a_wrong_command_makes_the_segment_wrong():
    seg = segment(("jump", 3), [(2.0, "jump", 2)])
    assert not seg.correct and seg.recognised_slide == 2


def test_an_extra_command_makes_the_segment_wrong():
    assert not segment(("jump", 3), [(2.0, "jump", 3), (3.2, "jump", 3)]).correct


def test_expected_commands_follow_the_settings_mappings():
    settings = Settings()
    assert expected_command(settings, "SWIPE_RIGHT") == ("next", None)
    assert expected_command(settings, "THUMBS_UP") == ("toggle_active", None)
    assert expected_command(settings, "COUNT_4") == ("jump", 4)
    assert expected_command(settings, "COUNT_9") == ("jump", 9)
    assert expected_command(settings, "TALKING") is None


# ---- the report -------------------------------------------------------------------
def test_the_report_has_every_section_and_says_it_is_synthetic():
    report = synthetic_report()
    sections = report.sections
    for name in (
        "e1_gestures",
        "e2_finger_count",
        "e3_false_triggers",
        "e4_response_time",
        "e5_distance",
        "e6_lighting",
        "e7_rules_vs_model",
        "e8_ratings",
        "ablation",
    ):
        assert getattr(sections, name) is not None, name
    assert report.synthetic is True and report.sources == ["synthetic"]
    assert report.participants == ["p1", "p2", "p3"]
    assert sections.e7_rules_vs_model.ml is not None and sections.e2_finger_count.two_hand is not None


def test_e1_scores_every_gesture_per_participant_at_the_standard_condition():
    rows = {r.gesture: r for r in synthetic_report().sections.e1_gestures.rows}
    assert set(rows) >= {"FIST", "OPEN_PALM", "COUNT_3", "SWIPE_LEFT", "SWIPE_RIGHT"}
    assert (
        set(rows["FIST"].per_participant) == {"p1", "p2", "p3"} and rows["FIST"].total == 3
    )  # not the 2 m run
    assert rows["COUNT_3"].accuracy == 1.0 and rows["COUNT_3"].action == "jump"


def test_e2_two_hand_confusion_finds_slide_7():
    e2 = synthetic_report().sections.e2_finger_count
    seven = e2.two_hand.labels.index("7")
    assert e2.two_hand.matrix[seven][seven] == 1
    assert e2.one_hand.labels == ["1", "2", "3", "4", "5", "none"]


def test_e5_and_e6_compare_distances_and_lighting_with_luminance():
    sections = synthetic_report().sections
    assert [r.condition for r in sections.e5_distance.rows] == ["1 m", "2 m"]
    assert [r.condition for r in sections.e6_lighting.rows] == ["normal"]
    assert sections.e6_lighting.rows[0].luminance_mean == 121.0
    assert all(0 <= r.detection_rate <= 1 for r in sections.e5_distance.rows)


def test_e7_has_both_confusion_matrices_macro_f1_and_inference_time():
    e7 = synthetic_report().sections.e7_rules_vs_model
    assert e7.rules.confusion.labels == e7.ml.confusion.labels
    assert 0 < e7.rules.macro_f1 <= 1 and 0 < e7.ml.macro_f1 <= 1
    assert e7.ml.ms_per_frame > e7.rules.ms_per_frame > 0


def test_e8_averages_the_feedback_file():
    e8 = synthetic_report().sections.e8_ratings
    assert len(e8.rows) == 3 and e8.ease_mean == 4.33 and e8.reliability_mean == 4.33


def test_e3_finds_no_false_trigger_in_talking_with_every_control_on():
    e3 = synthetic_report().sections.e3_false_triggers
    assert e3.active_per_min == 0 and e3.paused_per_min == 0 and set(e3.per_participant) == {"p1", "p2", "p3"}


def test_the_ablation_shows_more_false_triggers_with_controls_off_than_on():
    rows = {r.control: r.false_triggers_per_min for r in synthetic_report().sections.ablation.rows}
    assert set(rows) == {"all_on", "no_hold", "no_cooldown", "no_stillness", "no_rearm"}
    assert rows["all_on"] == 0
    assert rows["no_hold"] > rows["all_on"]
    assert max(rows.values()) > rows["all_on"]


def test_e4_reports_percentiles_and_a_histogram_of_pipeline_time():
    e4 = synthetic_report().sections.e4_response_time
    assert e4.n_commands > 20 and 0 < e4.pipeline_p50_ms <= e4.pipeline_p95_ms
    assert sum(b.count for b in e4.histogram) == e4.n_commands


def test_the_markdown_has_every_section_marked_synthetic():
    text = render(synthetic_report())
    for heading in ("## E1", "## E2", "## E3", "## E4", "## E5", "## E6", "## E7", "## E8", "## Ablation"):
        assert heading in text
    assert text.count("(SYNTHETIC)") == 9 and "SYNTHETIC DATA" in text


def test_charts_are_written_as_png_files(tmp_path):
    names = write_charts(synthetic_report(), tmp_path)
    assert {"e1_gestures.png", "e2_finger_count.png", "e7_rules_vs_model.png", "ablation.png"} <= set(names)
    assert all((tmp_path / n).read_bytes()[:4] == b"\x89PNG" for n in names)


def test_without_the_model_the_ml_columns_are_empty():
    report = run_evaluation([mini_data_dir() / "sessions"], ["synthetic"], include_ml=False)
    assert report.sections.e7_rules_vs_model.ml is None
    assert all(r.ml_accuracy is None for r in report.sections.e5_distance.rows)


def test_no_sessions_of_the_chosen_source_is_not_enough_data():
    with pytest.raises(AppError) as error:
        chosen_sessions([mini_data_dir() / "sessions"], ["recorded"])
    assert error.value.code == ErrorCode.NOT_ENOUGH_DATA


def test_ratings_reject_a_score_outside_1_to_5(tmp_path):
    path = tmp_path / "feedback.csv"
    path.write_text("participant,ease,reliability,comment\np1,9,4,\n", encoding="utf-8")
    with pytest.raises(ValueError, match="line 2"):
        read_ratings(path)
    assert read_ratings(tmp_path / "missing.csv") is None


# ---- report files and the API -----------------------------------------------------
def test_reports_are_saved_listed_and_loaded(tmp_path):
    report = synthetic_report()
    save_report(tmp_path, report)
    assert [s.id for s in list_reports(tmp_path)] == [report.id]
    assert load_report(tmp_path, report.id) == report
    assert load_report(tmp_path, "../../etc/passwd") is None


def test_the_api_starts_an_evaluation_job_then_serves_the_report(client):
    from tests.dataset.mini import copy_mini_data

    copy_mini_data(client.app.state.waveslide.config.resolved_data_dir)
    started = client.post("/api/evaluations", json={"sources": ["synthetic"], "include_ml": False})
    assert started.status_code == 202 and started.json()["kind"] == "evaluate"
    deadline = time.time() + 120
    job = started.json()
    while job["status"] not in ("done", "failed") and time.time() < deadline:
        time.sleep(0.2)
        job = client.get(f"/api/jobs/{job['id']}").json()
    assert job["status"] == "done", job
    listed = client.get("/api/evaluations").json()
    assert [s["id"] for s in listed] == [job["result_id"]] and listed[0]["synthetic"] is True
    report = client.get(f"/api/evaluations/{job['result_id']}").json()
    assert report["sections"]["ablation"] is not None


def test_the_api_refuses_an_evaluation_with_no_sessions_and_unknown_ids(client):
    refused = client.post("/api/evaluations", json={"sources": ["recorded"]})
    assert refused.status_code == 422 and refused.json()["error"]["code"] == "NOT_ENOUGH_DATA"
    assert client.get("/api/evaluations/run-nope").json()["error"]["code"] == "EVALUATION_NOT_FOUND"
