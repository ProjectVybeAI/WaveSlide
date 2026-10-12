"""The random forest and its leave-one-participant-out validation (ARCHITECTURE.md decision 9).

Neighbouring camera frames are nearly identical, so a random train/test split would put
almost the same frame on both sides and inflate the score. Instead, every participant is held
out once: the model is trained on the others and tested on the person it has never seen.
"""

from collections.abc import Callable, Iterator

import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import f1_score

from app.contract.common import Pose
from app.contract.settings import Settings
from app.core.features import HandFeatures


def new_forest() -> RandomForestClassifier:
    return RandomForestClassifier(n_estimators=200, random_state=42)


def lopo_splits(participants: np.ndarray) -> Iterator[tuple[str, np.ndarray, np.ndarray]]:
    """(held-out participant, train row indexes, test row indexes) for each participant."""
    for held_out in sorted(set(participants)):
        test = participants == held_out
        yield str(held_out), np.flatnonzero(~test), np.flatnonzero(test)


def lopo_models(
    vectors: np.ndarray,
    labels: np.ndarray,
    participants: np.ndarray,
    make_model: Callable[[], RandomForestClassifier] = new_forest,
    progress: Callable[[float, str], None] | None = None,
) -> Iterator[tuple[str, RandomForestClassifier, np.ndarray]]:
    """For each participant: (name, a model trained without them, the row indexes to test it on)."""
    folds = list(lopo_splits(participants))
    for number, (held_out, train, test) in enumerate(folds):
        yield held_out, make_model().fit(vectors[train], labels[train]), test
        if progress:
            progress((number + 1) / len(folds), f"Validated on {held_out}")


def lopo_predict(
    vectors: np.ndarray,
    labels: np.ndarray,
    participants: np.ndarray,
    make_model: Callable[[], RandomForestClassifier] = new_forest,
    progress: Callable[[float, str], None] | None = None,
) -> np.ndarray:
    """Out-of-fold predictions: every row is predicted by a model that never saw its participant."""
    predictions = np.empty(len(labels), dtype=labels.dtype)
    for _, model, test in lopo_models(vectors, labels, participants, make_model, progress):
        predictions[test] = model.predict(vectors[test])
    return predictions


def macro_f1(labels: np.ndarray, predictions: np.ndarray) -> float:
    return float(f1_score(labels, predictions, average="macro", zero_division=0))


class MLPoseClassifier:
    """Same call as the rules (`classify(features, settings) -> Pose`), so only step 4 changes."""

    def __init__(self, model: RandomForestClassifier):
        self.model = model

    def __call__(self, features: HandFeatures, settings: Settings) -> Pose:
        return Pose(self.model.predict(features.vector().reshape(1, -1))[0])
