"""Train the pose model: read the labelled sessions, validate leave-one-participant-out, fit, save.

The model card's macro-F1 comes from the leave-one-participant-out run (people the model
has not seen). The model that is saved is then fitted on everybody.
"""

from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path

import sklearn

from app.contract.common import ErrorCode
from app.contract.evaluation import ModelCard
from app.contract.sessions import SessionSource
from app.core.features import FEATURE_VERSION
from app.dataset.store import read_header, session_paths
from app.errors import AppError
from app.ml.forest import lopo_predict, macro_f1, new_forest
from app.ml.samples import collect_samples, participants_of, usable_sessions
from app.ml.store import save_model

MIN_PARTICIPANTS = 2  # leave-one-participant-out needs someone to train on and someone to test on

Progress = Callable[[float, str], None]


def training_sessions(dirs: list[Path], sources: list[SessionSource]) -> list[Path]:
    """The sessions to train on. Raises NOT_ENOUGH_DATA unless two or more participants recorded them."""
    paths = usable_sessions(session_paths(dirs), sources)
    people = participants_of(paths)
    if len(people) < MIN_PARTICIPANTS:
        raise AppError(
            ErrorCode.NOT_ENOUGH_DATA,
            f"Training needs gesture sessions from at least {MIN_PARTICIPANTS} participants "
            f"(found {len(people)}). Record another participant in Dataset.",
            422,
            {"participants": people, "needed": MIN_PARTICIPANTS},
        )
    return paths


def train_model(paths: list[Path], data_dir: Path, progress: Progress) -> ModelCard:
    """Read, validate (LOPO), fit on everything and save. Progress: 0-0.4 read, 0.4-0.9 LOPO, then fit."""
    samples = collect_samples(paths, lambda f, m: progress(0.4 * f, m))
    predictions = lopo_predict(
        samples.vectors,
        samples.labels,
        samples.participants,
        progress=lambda f, m: progress(0.4 + 0.5 * f, m),
    )
    progress(0.9, "Fitting the final model on every participant")
    model = new_forest().fit(samples.vectors, samples.labels)
    card = ModelCard(
        trained_at=datetime.now(UTC).isoformat(),
        classes=[str(c) for c in model.classes_],
        feature_version=FEATURE_VERSION,
        n_frames=len(samples),
        participants=sorted({str(p) for p in samples.participants}),
        lopo_macro_f1=round(macro_f1(samples.labels, predictions), 4),
        sklearn_version=sklearn.__version__,
        synthetic=any(read_header(path).source == "synthetic" for path in paths),
    )
    save_model(data_dir, model, card)
    return card
