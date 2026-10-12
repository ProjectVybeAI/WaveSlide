"""E7: the rules against the random forest, frame by frame, on the same labelled frames.

The forest's predictions are leave-one-participant-out: each frame is predicted by a model
trained without that frame's participant, so the comparison is fair to the rules, which have
no training. Frames are the labelled hold frames (edges trimmed) plus rest frames, never swipes.
"""

import time
from collections.abc import Callable

import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import confusion_matrix

from app.contract.common import Pose
from app.contract.evaluation import ConfusionMatrix, E7RulesVsModel, RecogniserResult
from app.contract.settings import Settings
from app.core.pipeline import rules_classifier
from app.ml.forest import MLPoseClassifier, lopo_models, macro_f1
from app.ml.samples import Samples

POSE_ORDER = [pose.value for pose in Pose]


def fit_lopo(
    samples: Samples, progress: Callable[[float, str], None] | None = None
) -> tuple[dict[str, RandomForestClassifier], np.ndarray]:
    """One model per held-out participant, and every frame's out-of-fold prediction."""
    models: dict[str, RandomForestClassifier] = {}
    predictions = np.empty(len(samples), dtype=samples.labels.dtype)
    for held_out, model, test in lopo_models(
        samples.vectors, samples.labels, samples.participants, progress=progress
    ):
        models[held_out] = model
        predictions[test] = model.predict(samples.vectors[test])
    return models, predictions


def _result(labels: np.ndarray, predictions: np.ndarray, ms_per_frame: float) -> RecogniserResult:
    names = [p for p in POSE_ORDER if p in set(labels) | set(predictions)]
    matrix = confusion_matrix(labels, predictions, labels=names)
    return RecogniserResult(
        confusion=ConfusionMatrix(labels=names, matrix=matrix.tolist()),
        macro_f1=round(macro_f1(labels, predictions), 4),
        ms_per_frame=round(ms_per_frame, 4),
    )


def _ms_per_decision(classify, features: list) -> float:
    """Average time to classify one frame, one at a time as the live pipeline does."""
    settings = Settings()
    started = time.perf_counter()
    for f in features:
        classify(f, settings)
    return (time.perf_counter() - started) * 1000 / max(len(features), 1)


def rules_vs_model(
    samples: Samples, models: dict[str, RandomForestClassifier] | None, predictions: np.ndarray | None
) -> E7RulesVsModel | None:
    if len(samples) == 0:
        return None
    rules = _result(samples.labels, samples.rules, _ms_per_decision(rules_classifier, samples.probe))
    if not models or predictions is None:
        return E7RulesVsModel(rules=rules, ml=None)
    any_model = next(iter(models.values()))
    ml_time = _ms_per_decision(MLPoseClassifier(any_model), samples.probe)
    return E7RulesVsModel(rules=rules, ml=_result(samples.labels, predictions, ml_time))
