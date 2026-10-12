"""One valid example per contract model.

Placeholder endpoints return these until their phase replaces them, and
scripts/export_openapi.py writes them to frontend/src/mocks/fixtures/examples.json
so the MSW mocks and the backend share one source of truth.
"""

import numpy as np

from app.contract.common import Action, EngineState, Gesture, Pose, Recogniser, SourceKind
from app.contract.engine import (
    CommandLogEntry,
    EngineFrame,
    EngineSnapshot,
    HandLandmarks,
    HoldInfo,
    OverlayResponse,
)
from app.contract.evaluation import (
    Ablation,
    AblationRow,
    ConditionRow,
    ConfusionMatrix,
    E1GestureAccuracy,
    E2FingerCount,
    E3FalseTriggers,
    E4ResponseTime,
    E5Distance,
    E6Lighting,
    E7RulesVsModel,
    E8Ratings,
    EvaluationReport,
    EvaluationSections,
    EvaluationSummary,
    GestureAccuracyRow,
    HistogramBin,
    ModelCard,
    RatingRow,
    RecogniserResult,
    Tally,
)
from app.contract.jobs import Job
from app.contract.sessions import RecordingStatus, SessionDetail, SessionLabel, SessionSummary
from app.contract.settings import Settings
from app.contract.system import CameraInfo, Health, Permissions
from app.dataset.synthetic import PARTICIPANTS, TEMPLATES, hand_points, place


def _hand(pose: str) -> HandLandmarks:
    rng = np.random.default_rng(7)
    points = hand_points(TEMPLATES[pose], PARTICIPANTS[0], rng)
    # An upright hand about 60% of the frame height, left of the presenter's face (right of centre).
    return place(points, (210.0, 348.0), 140.0, TEMPLATES[pose].roll_deg, False, rng, noise_px=0)


COMMAND = CommandLogEntry(
    id=14,
    t=1791801751.0,
    action=Action.JUMP,
    gesture=Gesture.COUNT_3,
    slide=3,
    keys=["3", "enter"],
    pipeline_ms=27.4,
    dry_run=False,
    ack_ms=None,
)

HEALTH = Health(
    status="ok",
    version="0.1.0",
    platform="darwin",
    source=SourceKind.CAMERA,
    keys_mode="pyautogui",
    permissions=Permissions(camera="granted", keyboard="granted"),
    model_loaded=False,
)

SNAPSHOT = EngineSnapshot(
    active=True,
    state=EngineState.HOLDING,
    source=SourceKind.CAMERA,
    session_id=None,
    recogniser=Recogniser.RULES,
    fps=29.8,
    pipeline_ms_p50=23.0,
    profile_id="powerpoint",
    camera_ok=True,
    last_command=COMMAND,
)

FRAME = EngineFrame(
    seq=1204,
    t=40.13,
    active=True,
    state=EngineState.HOLDING,
    source=SourceKind.CAMERA,
    hands=[_hand("COUNT_3")],
    extended=[False, True, True, True, False],
    pose=Pose.COUNT_3,
    confidence=0.94,
    recogniser=Recogniser.RULES,
    hold=HoldInfo(action=Action.JUMP, label="3", caption="Slide", progress=0.7, hold_ms=1000),
    cooldown_ms_left=0,
    fps=29.8,
)

SETTINGS = Settings()

CAMERAS = [CameraInfo(index=0, name="FaceTime HD Camera (built-in)")]

SESSION = SessionSummary(
    id="synthetic-gestures-p1",
    kind="gestures",
    source="synthetic",
    participant="p1",
    distance_m=1.0,
    lighting="normal",
    luminance_mean=None,
    n_frames=4512,
    duration_s=150.4,
    created_at="2026-10-01T00:00:00+00:00",
)

SESSION_DETAIL = SessionDetail(
    **SESSION.model_dump(),
    labels=[SessionLabel(start=1.53, end=5.53, gesture=Gesture.FIST)],
)

RECORDING = RecordingStatus(
    session_id="rec-2026-10-12-p1",
    protocol="gestures",
    step=3,
    total_steps=47,
    prompt="Hold up 3 fingers",
    started_at="2026-10-12T10:40:00+00:00",
)

POSE_LABELS = [
    "NONE",
    "FIST",
    "OPEN_PALM",
    "THUMBS_UP",
    "THUMBS_DOWN",
    "COUNT_1",
    "COUNT_2",
    "COUNT_3",
    "COUNT_4",
    "COUNT_5",
]

MODEL_CARD = ModelCard(
    trained_at="2026-10-12T14:20:00+00:00",
    classes=POSE_LABELS,
    feature_version=1,
    n_frames=41280,
    participants=["p1", "p2", "p3"],
    lopo_macro_f1=0.94,
    sklearn_version="1.9.1",
    synthetic=True,
)

JOB = Job(id="job-1", kind="evaluate", status="running", progress=0.4, message="Replaying sessions")

OVERLAY = OverlayResponse(mode="full")


def _diagonal(labels: list[str], correct: int, total: int) -> ConfusionMatrix:
    n = len(labels)
    matrix = [[(correct if i == j else (total - correct) // (n - 1)) for j in range(n)] for i in range(n)]
    return ConfusionMatrix(labels=labels, matrix=matrix)


EVALUATION_SUMMARY = EvaluationSummary(
    id="2026-10-12-1420",
    created_at="2026-10-12T14:20:00+00:00",
    synthetic=True,
    sources=["synthetic"],
    n_sessions=12,
    participants=["p1", "p2", "p3"],
)

EVALUATION_REPORT = EvaluationReport(
    **EVALUATION_SUMMARY.model_dump(),
    sections=EvaluationSections(
        e1_gestures=E1GestureAccuracy(
            rows=[
                GestureAccuracyRow(
                    gesture="SWIPE_RIGHT",
                    action="next",
                    per_participant={
                        "p1": Tally(correct=30, total=30),
                        "p2": Tally(correct=29, total=30),
                        "p3": Tally(correct=30, total=30),
                    },
                    correct=89,
                    total=90,
                    accuracy=0.989,
                ),
            ]
        ),
        e2_finger_count=E2FingerCount(
            one_hand=_diagonal(["1", "2", "3", "4", "5"], 34, 36),
            two_hand=None,
            accuracy=0.933,
        ),
        e3_false_triggers=E3FalseTriggers(
            minutes=9.0,
            active_per_min=0.33,
            paused_per_min=0.0,
            per_participant={"p1": 0.33, "p2": 0.67, "p3": 0.0},
        ),
        e4_response_time=E4ResponseTime(
            n_commands=1284,
            pipeline_p50_ms=23.0,
            pipeline_p95_ms=38.0,
            histogram=[
                HistogramBin(start_ms=12 + 4 * i, end_ms=16 + 4 * i, count=c)
                for i, c in enumerate([40, 190, 400, 320, 160, 90, 45, 25, 10, 4])
            ],
            gesture_end_to_command_p50_ms=41.0,
            key_to_render_p50_ms=31.0,
        ),
        e5_distance=E5Distance(
            rows=[
                ConditionRow(condition=f"{d} m", rules_accuracy=r, ml_accuracy=m, detection_rate=h)
                for d, r, m, h in [
                    (0.5, 0.97, 0.98, 1.0),
                    (1, 0.96, 0.97, 1.0),
                    (1.5, 0.92, 0.95, 0.98),
                    (2, 0.76, 0.81, 0.86),
                ]
            ]
        ),
        e6_lighting=E6Lighting(
            rows=[
                ConditionRow(
                    condition=c, rules_accuracy=r, ml_accuracy=m, detection_rate=h, luminance_mean=lum
                )
                for c, r, m, h, lum in [
                    ("bright", 0.96, 0.97, 1.0, 168),
                    ("normal", 0.96, 0.97, 1.0, 121),
                    ("dim", 0.87, 0.91, 0.93, 54),
                ]
            ]
        ),
        e7_rules_vs_model=E7RulesVsModel(
            rules=RecogniserResult(
                confusion=_diagonal(POSE_LABELS, 364, 400), macro_f1=0.91, ms_per_frame=0.02
            ),
            ml=RecogniserResult(confusion=_diagonal(POSE_LABELS, 376, 400), macro_f1=0.94, ms_per_frame=0.41),
        ),
        e8_ratings=E8Ratings(
            rows=[RatingRow(participant="p1", ease=5, reliability=4, comment="Swipes felt natural.")],
            ease_mean=5.0,
            reliability_mean=4.0,
        ),
        ablation=Ablation(
            minutes=9.0,
            rows=[
                AblationRow(control="all_on", false_triggers_per_min=0.33),
                AblationRow(control="no_hold", false_triggers_per_min=4.7),
                AblationRow(control="no_cooldown", false_triggers_per_min=2.3),
                AblationRow(control="no_stillness", false_triggers_per_min=1.7),
                AblationRow(control="no_rearm", false_triggers_per_min=1.3),
            ],
        ),
    ),
    charts=["e5_distance.png", "e6_lighting.png", "e7_confusion.png"],
)

ALL_EXAMPLES = {
    "health": HEALTH,
    "engineSnapshot": SNAPSHOT,
    "engineFrame": FRAME,
    "command": COMMAND,
    "settings": SETTINGS,
    "cameras": CAMERAS,
    "session": SESSION,
    "sessionDetail": SESSION_DETAIL,
    "recording": RECORDING,
    "modelCard": MODEL_CARD,
    "job": JOB,
    "overlay": OVERLAY,
    "evaluationSummary": EVALUATION_SUMMARY,
    "evaluationReport": EVALUATION_REPORT,
}
