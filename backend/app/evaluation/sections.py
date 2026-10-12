"""BRIEF §11 sections computed from scored session runs: E1, E2, E4, E5 and E6.

E1 per-gesture accuracy by participant. E2 finger-count jump confusion. E4 response time.
E5 and E6 accuracy and detection rate by distance and by lighting.
Each function takes the runs of `evaluation.replay.run_session` and returns a contract model.
"""

import json
from collections import defaultdict
from pathlib import Path

import numpy as np

from app.contract.engine import CommandLogEntry
from app.contract.evaluation import (
    ConditionRow,
    ConfusionMatrix,
    E1GestureAccuracy,
    E2FingerCount,
    E4ResponseTime,
    E5Distance,
    E6Lighting,
    GestureAccuracyRow,
    HistogramBin,
    Tally,
)
from app.contract.sessions import SessionHeader
from app.evaluation.replay import Segment, SessionRun

HISTOGRAM_BINS = 10
LIGHTING_ORDER = ["bright", "normal", "dim"]


STANDARD_DISTANCE_M = 1.0


def is_standard(header: SessionHeader) -> bool:
    """The study's standard condition: 1 m, normal light (sessions that do not say are taken as such)."""
    return header.distance_m in (None, STANDARD_DISTANCE_M) and header.lighting in (None, "normal")


def standard_runs(runs: list[SessionRun]) -> list[SessionRun]:
    """Runs in the standard condition for E1 and E2; all runs when none were recorded that way."""
    return [r for r in runs if is_standard(r.header)] or runs


def accuracy_of(segments: list[Segment]) -> float:
    return sum(s.correct for s in segments) / len(segments) if segments else 0.0


def e1_gestures(runs: list[SessionRun]) -> E1GestureAccuracy | None:
    """One row per gesture (in the order they were asked), with a tally per participant."""
    tallies: dict[str, dict[str, Tally]] = {}
    actions: dict[str, str] = {}
    for run in runs:
        for segment in run.segments:
            gesture = str(segment.label.gesture)
            actions[gesture] = segment.expected[0]
            per_person = tallies.setdefault(gesture, {})
            tally = per_person.setdefault(run.header.participant, Tally(correct=0, total=0))
            tally.total += 1
            tally.correct += segment.correct
    if not tallies:
        return None
    rows = []
    for gesture, per_person in tallies.items():
        correct = sum(t.correct for t in per_person.values())
        total = sum(t.total for t in per_person.values())
        rows.append(
            GestureAccuracyRow(
                gesture=gesture,
                action=actions[gesture],
                per_participant=per_person,
                correct=correct,
                total=total,
                accuracy=correct / total,
            )
        )
    return E1GestureAccuracy(rows=rows)


def _jump_confusion(runs: list[SessionRun], numbers: list[int]) -> tuple[ConfusionMatrix, int, int]:
    """Rows: the number shown. Columns: the slide the jump went to, or "none"."""
    labels = [str(n) for n in numbers] + ["none"]
    matrix = [[0] * len(labels) for _ in labels]
    correct = total = 0
    for run in runs:
        for segment in run.segments:
            slide = segment.expected[1]
            if segment.expected[0] != "jump" or slide not in numbers:
                continue
            got = segment.recognised_slide
            column = numbers.index(got) if got in numbers else len(numbers)
            matrix[numbers.index(slide)][column] += 1
            total += 1
            correct += segment.correct
    return ConfusionMatrix(labels=labels, matrix=matrix), correct, total


def e2_finger_count(one_hand: list[SessionRun], two_hand: list[SessionRun]) -> E2FingerCount | None:
    single, correct_one, total_one = _jump_confusion(one_hand, [1, 2, 3, 4, 5])
    double, correct_two, total_two = _jump_confusion(two_hand, [6, 7, 8, 9, 10])
    total = total_one + total_two
    if total == 0:
        return None
    return E2FingerCount(
        one_hand=single,
        two_hand=double if total_two else None,
        accuracy=(correct_one + correct_two) / total,
    )


def percentile(values: list[float], q: float) -> float:
    return float(np.percentile(values, q)) if values else 0.0


def read_ack_ms(logs_dir: Path | None) -> list[float]:
    """Key-to-practice-deck delays logged during live use (the last line of each command id wins)."""
    if logs_dir is None or not logs_dir.is_dir():
        return []
    latest: dict[tuple[str, int], CommandLogEntry] = {}
    for path in sorted(logs_dir.glob("commands-*.jsonl")):
        for line in path.read_text(encoding="utf-8").splitlines():
            if line.strip():
                entry = CommandLogEntry.model_validate(json.loads(line))
                latest[(path.name, entry.id)] = entry
    return [e.ack_ms for e in latest.values() if e.ack_ms is not None]


def e4_response_time(runs: list[SessionRun], logs_dir: Path | None) -> E4ResponseTime | None:
    """Pipeline time per command, and for swipes the time from the end of the motion to the command.

    A negative gesture-end value means the swipe fired before the arm had stopped. For recorded
    sessions the label is the prompt window, so that figure is only indicative.
    """
    times = [f.pipeline_ms for run in runs for f in run.fired]
    if not times:
        return None
    counts, edges = np.histogram(times, bins=HISTOGRAM_BINS)
    histogram = [
        HistogramBin(start_ms=float(edges[i]), end_ms=float(edges[i + 1]), count=int(counts[i]))
        for i in range(HISTOGRAM_BINS)
    ]
    after_swipe = [
        (segment.fired[0].t - segment.label.end) * 1000
        for run in runs
        for segment in run.segments
        if segment.correct and str(segment.label.gesture).startswith("SWIPE")
    ]
    acks = read_ack_ms(logs_dir)
    return E4ResponseTime(
        n_commands=len(times),
        pipeline_p50_ms=round(percentile(times, 50), 3),
        pipeline_p95_ms=round(percentile(times, 95), 3),
        histogram=histogram,
        gesture_end_to_command_p50_ms=round(percentile(after_swipe, 50), 1) if after_swipe else None,
        key_to_render_p50_ms=round(percentile(acks, 50), 1) if acks else None,
    )


def _condition_rows(
    groups: dict[str, list[str]],
    rules: dict[str, SessionRun],
    ml: dict[str, SessionRun] | None,
) -> list[ConditionRow]:
    """One row per condition: accuracy of every labelled segment in its sessions, rules and model."""
    rows = []
    for condition, session_ids in groups.items():
        rule_runs = [rules[i] for i in session_ids]
        rates = [r.detection_rate for r in rule_runs if r.detection_rate is not None]
        lights = [r.header.luminance_mean for r in rule_runs if r.header.luminance_mean is not None]
        rows.append(
            ConditionRow(
                condition=condition,
                rules_accuracy=accuracy_of([s for r in rule_runs for s in r.segments]),
                ml_accuracy=(
                    accuracy_of([s for i in session_ids for s in ml[i].segments]) if ml is not None else None
                ),
                detection_rate=float(np.mean(rates)) if rates else 0.0,
                luminance_mean=round(float(np.mean(lights)), 1) if lights else None,
            )
        )
    return rows


def e5_distance(rules: dict[str, SessionRun], ml: dict[str, SessionRun] | None) -> E5Distance | None:
    by_distance: dict[float, list[str]] = defaultdict(list)
    for session_id, run in rules.items():
        # Only normal light, so the distance is the one thing that changes between rows.
        if run.header.distance_m is not None and run.header.lighting in (None, "normal"):
            by_distance[run.header.distance_m].append(session_id)
    if not by_distance:
        return None
    groups = {f"{d:g} m": by_distance[d] for d in sorted(by_distance)}
    return E5Distance(rows=_condition_rows(groups, rules, ml))


def e6_lighting(rules: dict[str, SessionRun], ml: dict[str, SessionRun] | None) -> E6Lighting | None:
    by_light: dict[str, list[str]] = defaultdict(list)
    for session_id, run in rules.items():
        # Only the standard distance, so the lighting is the one thing that changes between rows.
        if run.header.lighting is not None and run.header.distance_m in (None, STANDARD_DISTANCE_M):
            by_light[run.header.lighting].append(session_id)
    if not by_light:
        return None
    groups = {name: by_light[name] for name in LIGHTING_ORDER if name in by_light}
    return E6Lighting(rows=_condition_rows(groups, rules, ml))
