"""Trained pose model. Placeholders until Phase 2."""

from fastapi import APIRouter

from app.contract.common import ErrorCode
from app.contract.evaluation import ModelCard, TrainRequest
from app.contract.examples import JOB
from app.contract.jobs import Job
from app.errors import AppError, error_responses

router = APIRouter(prefix="/api/model", tags=["model"])


@router.get("", response_model=ModelCard, operation_id="getModel", responses=error_responses(404))
def get_model() -> ModelCard:
    raise AppError(ErrorCode.NO_MODEL, "No trained model yet. Record sessions, then train.", 404)


@router.post(
    "/train",
    response_model=Job,
    status_code=202,
    operation_id="trainModel",
    responses=error_responses(409, 422),
)
def train_model(body: TrainRequest) -> Job:
    return JOB.model_copy(update={"kind": "train"})
