"""The trained pose model: card, and training as a background job."""

from fastapi import APIRouter

from app.contract.common import ErrorCode
from app.contract.evaluation import ModelCard, TrainRequest
from app.contract.jobs import Job
from app.dataset.store import sessions_dirs
from app.errors import AppError, error_responses
from app.jobs import job_manager
from app.ml import training
from app.ml.store import load_card
from app.state import StateDep

router = APIRouter(prefix="/api/model", tags=["model"])


@router.get("", response_model=ModelCard, operation_id="getModel", responses=error_responses(404))
def get_model(state: StateDep) -> ModelCard:
    card = load_card(state.config.resolved_data_dir)
    if card is None:
        raise AppError(ErrorCode.NO_MODEL, "No trained model yet. Record sessions, then train.", 404)
    return card


@router.post(
    "/train",
    response_model=Job,
    status_code=202,
    operation_id="trainModel",
    responses=error_responses(409, 422),
)
def train_model(body: TrainRequest, state: StateDep) -> Job:
    data_dir = state.config.resolved_data_dir
    paths = training.training_sessions(sessions_dirs(data_dir), body.sources)  # 422 before any job exists

    def work(progress) -> str:
        training.train_model(paths, data_dir, progress)
        # Let the running engine pick the new model up (it only uses it when recogniser is "ml").
        # The engine is always built with a classifier_factory for this data folder, so re-applying
        # the current settings is enough to reload the model.
        state.engine.update_settings(state.engine.settings)
        return "pose_rf"

    return job_manager(state).start("train", work)
