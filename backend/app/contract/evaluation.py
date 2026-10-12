"""The trained pose model card and the evaluation report (BRIEF §11: E1-E8 plus the ablation)."""

from typing import Literal

from pydantic import BaseModel, Field


class ModelCard(BaseModel):
    trained_at: str
    classes: list[str]
    feature_version: int
    n_frames: int
    participants: list[str]
    lopo_macro_f1: float
    sklearn_version: str
    synthetic: bool


class TrainRequest(BaseModel):
    sources: list[Literal["recorded", "synthetic"]] = Field(default_factory=lambda: ["recorded"])


class EvaluationRequest(BaseModel):
    sources: list[Literal["recorded", "synthetic"]] = Field(default_factory=lambda: ["recorded"])
    include_ml: bool = True


class Tally(BaseModel):
    correct: int
    total: int


class GestureAccuracyRow(BaseModel):
    gesture: str
    action: str
    per_participant: dict[str, Tally]
    correct: int
    total: int
    accuracy: float


class E1GestureAccuracy(BaseModel):
    rows: list[GestureAccuracyRow]


class ConfusionMatrix(BaseModel):
    """Rows: what the hand did. Columns: what was recognised. Counts, not percentages."""

    labels: list[str]
    matrix: list[list[int]]


class E2FingerCount(BaseModel):
    one_hand: ConfusionMatrix
    two_hand: ConfusionMatrix | None = None
    accuracy: float


class E3FalseTriggers(BaseModel):
    minutes: float
    active_per_min: float
    paused_per_min: float
    per_participant: dict[str, float]


class HistogramBin(BaseModel):
    start_ms: float
    end_ms: float
    count: int


class E4ResponseTime(BaseModel):
    n_commands: int
    pipeline_p50_ms: float
    pipeline_p95_ms: float
    histogram: list[HistogramBin]
    gesture_end_to_command_p50_ms: float | None = None
    key_to_render_p50_ms: float | None = None


class ConditionRow(BaseModel):
    condition: str = Field(description='e.g. "0.5 m" or "dim"')
    rules_accuracy: float
    ml_accuracy: float | None = None
    detection_rate: float
    luminance_mean: float | None = None


class E5Distance(BaseModel):
    rows: list[ConditionRow]


class E6Lighting(BaseModel):
    rows: list[ConditionRow]


class RecogniserResult(BaseModel):
    confusion: ConfusionMatrix
    macro_f1: float
    ms_per_frame: float


class E7RulesVsModel(BaseModel):
    rules: RecogniserResult
    ml: RecogniserResult | None = None


class RatingRow(BaseModel):
    participant: str
    ease: int = Field(ge=1, le=5)
    reliability: int = Field(ge=1, le=5)
    comment: str = ""


class E8Ratings(BaseModel):
    rows: list[RatingRow]
    ease_mean: float
    reliability_mean: float


class AblationRow(BaseModel):
    control: Literal["all_on", "no_hold", "no_cooldown", "no_stillness", "no_rearm"]
    false_triggers_per_min: float


class Ablation(BaseModel):
    minutes: float
    rows: list[AblationRow]


class EvaluationSections(BaseModel):
    """Each section is null when the data it needs was not recorded."""

    e1_gestures: E1GestureAccuracy | None = None
    e2_finger_count: E2FingerCount | None = None
    e3_false_triggers: E3FalseTriggers | None = None
    e4_response_time: E4ResponseTime | None = None
    e5_distance: E5Distance | None = None
    e6_lighting: E6Lighting | None = None
    e7_rules_vs_model: E7RulesVsModel | None = None
    e8_ratings: E8Ratings | None = None
    ablation: Ablation | None = None


class EvaluationSummary(BaseModel):
    id: str
    created_at: str
    synthetic: bool
    sources: list[str]
    n_sessions: int
    participants: list[str]


class EvaluationReport(EvaluationSummary):
    sections: EvaluationSections
    charts: list[str] = Field(default_factory=list, description="PNG file names in docs/eval/")
