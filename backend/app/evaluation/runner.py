"""Run one evaluation over the recorded (or synthetic) sessions and keep the report.

Reports live in data/eval/<run id>/report.json. Every section is computed by replaying the
sessions through the real pipeline (evaluation/replay.py); nothing is estimated.
"""

import re
from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path

from app.contract.common import ErrorCode
from app.contract.evaluation import EvaluationReport, EvaluationSections, EvaluationSummary
from app.contract.sessions import SessionHeader, SessionSource
from app.dataset.store import read_header, session_paths
from app.errors import AppError
from app.evaluation.false_triggers import false_triggers
from app.evaluation.ratings import read_ratings
from app.evaluation.replay import SessionRun, run_session
from app.evaluation.rules_vs_model import fit_lopo, rules_vs_model
from app.evaluation.sections import (
    e1_gestures,
    e2_finger_count,
    e4_response_time,
    e5_distance,
    e6_lighting,
    standard_runs,
)
from app.ml.forest import MLPoseClassifier
from app.ml.samples import collect_samples, participants_of, usable_sessions

Progress = Callable[[float, str], None]
KINDS = ("gestures", "talking", "two_hand")


def chosen_sessions(dirs: list[Path], sources: list[SessionSource]) -> dict[str, list[Path]]:
    """Sessions of the chosen sources, by kind. Raises NOT_ENOUGH_DATA when there are none."""
    by_kind: dict[str, list[Path]] = {kind: [] for kind in KINDS}
    for path in session_paths(dirs):
        header = read_header(path)
        if header.source in sources and header.kind in by_kind:
            by_kind[header.kind].append(path)
    if not any(by_kind.values()):
        raise AppError(
            ErrorCode.NOT_ENOUGH_DATA,
            "There are no recorded sessions to evaluate. Record some in Dataset "
            "(or include synthetic sessions after `npm run seed`).",
            422,
            {"sources": sources},
        )
    return by_kind


def run_evaluation(
    dirs: list[Path],
    sources: list[SessionSource],
    include_ml: bool = True,
    feedback_csv: Path | None = None,
    logs_dir: Path | None = None,
    progress: Progress | None = None,
) -> EvaluationReport:
    say: Progress = progress or (lambda fraction, message: None)
    by_kind = chosen_sessions(dirs, sources)
    headers: list[SessionHeader] = [read_header(p) for paths in by_kind.values() for p in paths]

    gesture_paths = usable_sessions(by_kind["gestures"], sources)
    models, predictions, samples = None, None, None
    if gesture_paths:
        say(0.02, "Reading labelled frames")
        samples = collect_samples(gesture_paths)
        if include_ml and len(participants_of(gesture_paths)) >= 2:
            say(0.1, "Training leave-one-participant-out models")
            models, predictions = fit_lopo(samples, lambda f, m: say(0.1 + 0.2 * f, m))

    say(0.3, "Replaying gesture sessions")
    rules_runs = {read_header(p).id: run_session(p) for p in gesture_paths}
    ml_runs = None
    if models:
        ml_runs = {}
        for number, path in enumerate(gesture_paths):
            header = read_header(path)
            ml_runs[header.id] = run_session(path, MLPoseClassifier(models[header.participant]))
            say(0.3 + 0.3 * (number + 1) / len(gesture_paths), f"Replayed {header.id} with the model")
    say(0.6, "Replaying two-hand sessions")
    two_hand_runs: list[SessionRun] = [run_session(p) for p in by_kind["two_hand"]]
    say(0.7, "Replaying talking sessions")
    e3, ablation = false_triggers(by_kind["talking"])

    one_hand = list(rules_runs.values())
    standard = standard_runs(one_hand)
    sections = EvaluationSections(
        e1_gestures=e1_gestures(standard),
        e2_finger_count=e2_finger_count(standard, two_hand_runs),
        e3_false_triggers=e3,
        e4_response_time=e4_response_time(one_hand + two_hand_runs, logs_dir),
        e5_distance=e5_distance(rules_runs, ml_runs),
        e6_lighting=e6_lighting(rules_runs, ml_runs),
        e7_rules_vs_model=rules_vs_model(samples, models, predictions) if samples else None,
        e8_ratings=read_ratings(feedback_csv),
        ablation=ablation,
    )
    now = datetime.now(UTC)
    report = EvaluationReport(
        id=f"run-{now:%Y%m%d-%H%M%S}",
        created_at=now.isoformat(),
        synthetic=any(h.source == "synthetic" for h in headers),
        sources=sorted({h.source for h in headers}),
        n_sessions=len(headers),
        participants=sorted({h.participant for h in headers}),
        sections=sections,
    )
    say(1.0, "Done")
    return report


# ---- the report files --------------------------------------------------------------
def report_path(data_dir: Path, run_id: str) -> Path:
    return data_dir / "eval" / run_id / "report.json"


def save_report(data_dir: Path, report: EvaluationReport) -> None:
    path = report_path(data_dir, report.id)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(report.model_dump_json(indent=2), encoding="utf-8")


def load_report(data_dir: Path, run_id: str) -> EvaluationReport | None:
    if not re.fullmatch(r"[A-Za-z0-9_-]+", run_id):
        return None  # never build a path from anything but a plain id
    path = report_path(data_dir, run_id)
    if not path.is_file():
        return None
    return EvaluationReport.model_validate_json(path.read_text(encoding="utf-8"))


def list_reports(data_dir: Path) -> list[EvaluationSummary]:
    summaries = []
    for path in sorted((data_dir / "eval").glob("*/report.json")):
        report = EvaluationReport.model_validate_json(path.read_text(encoding="utf-8"))
        summaries.append(EvaluationSummary(**report.model_dump(include=set(EvaluationSummary.model_fields))))
    return sorted(summaries, key=lambda s: s.created_at, reverse=True)
