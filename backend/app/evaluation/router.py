"""Evaluation runs. Placeholders until Phase 2."""

from fastapi import APIRouter

from app.contract.evaluation import EvaluationReport, EvaluationRequest, EvaluationSummary
from app.contract.examples import EVALUATION_REPORT, EVALUATION_SUMMARY, JOB
from app.contract.jobs import Job
from app.errors import error_responses

router = APIRouter(prefix="/api/evaluations", tags=["evaluation"])


@router.post(
    "",
    response_model=Job,
    status_code=202,
    operation_id="startEvaluation",
    responses=error_responses(409, 422),
)
def start_evaluation(body: EvaluationRequest) -> Job:
    return JOB


@router.get("", response_model=list[EvaluationSummary], operation_id="listEvaluations")
def list_evaluations() -> list[EvaluationSummary]:
    return [EVALUATION_SUMMARY]


@router.get(
    "/{evaluation_id}",
    response_model=EvaluationReport,
    operation_id="getEvaluation",
    responses=error_responses(404),
)
def get_evaluation(evaluation_id: str) -> EvaluationReport:
    return EVALUATION_REPORT
