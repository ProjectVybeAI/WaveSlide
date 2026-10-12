"""The trained model on disk: data/models/pose_rf.joblib plus its model_card.json.

A model is loaded only if its feature_version matches the code's, because a forest trained on
different numbers would silently give nonsense.
"""

import json
import logging
from collections.abc import Callable
from pathlib import Path

import joblib
from sklearn.ensemble import RandomForestClassifier

from app.contract.evaluation import ModelCard
from app.core.features import FEATURE_VERSION
from app.core.pipeline import ClassifierFactory
from app.ml.forest import MLPoseClassifier

log = logging.getLogger("waveslide.ml")
MODEL_FILE = Path("models") / "pose_rf.joblib"
CARD_FILE = Path("models") / "model_card.json"


def save_model(data_dir: Path, model: RandomForestClassifier, card: ModelCard) -> None:
    (data_dir / MODEL_FILE).parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, data_dir / MODEL_FILE)
    (data_dir / CARD_FILE).write_text(card.model_dump_json(indent=2), encoding="utf-8")


def load_card(data_dir: Path) -> ModelCard | None:
    path = data_dir / CARD_FILE
    if not path.is_file() or not (data_dir / MODEL_FILE).is_file():
        return None
    try:
        return ModelCard.model_validate(json.loads(path.read_text(encoding="utf-8")))
    except ValueError:
        log.warning("model card %s is not valid", path)
        return None


def load_model(data_dir: Path) -> RandomForestClassifier | None:
    card = load_card(data_dir)
    if card is None or card.feature_version != FEATURE_VERSION:
        return None
    # joblib files are pickles: safe here because only this app writes this file, in the user's own
    # data folder. Never point this at a model file that came from somewhere else.
    return joblib.load(data_dir / MODEL_FILE)


def classifier_factory(data_dir: Path) -> ClassifierFactory:
    """For Pipeline(classifier_factory=...): the trained classifier, reloaded when the file changes."""
    cache: dict[str, object] = {}

    def factory() -> Callable | None:
        path = data_dir / MODEL_FILE
        if not path.is_file():
            return None
        stamp = f"{path.stat().st_mtime_ns}:{path.stat().st_size}"
        if cache.get("stamp") != stamp:
            model = load_model(data_dir)
            cache["stamp"] = stamp
            cache["classifier"] = MLPoseClassifier(model) if model else None
        return cache["classifier"]  # type: ignore[return-value]

    return factory
