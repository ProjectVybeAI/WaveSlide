"""Evaluation runs: start one as a background job, list and read the saved reports."""

from fastapi import APIRouter

from app.config import PROJECT_DIR
from app.contract.common import ErrorCode
from app.contract.evaluation import EvaluationReport, EvaluationRequest, EvaluationSummary
from app.contract.jobs import Job
from app.dataset.store import sessions_dirs
from app.errors import AppError, error_responses
from app.evaluation.runner import chosen_sessions, list_reports, load_report, run_evaluation, save_report
from app.jobs import job_manager
from app.state import StateDep

router = APIRouter(prefix="/api/evaluations", tags=["evaluation"])
FEEDBACK_CSV = PROJECT_DIR / "eval" / "feedback.csv"


@router.post(
    "",
    response_model=Job,
    status_code=202,
    operation_id="startEvaluation",
    responses=error_responses(409, 422),
)
def start_evaluation(body: EvaluationRequest, state: StateDep) -> Job:
    data_dir = state.config.resolved_data_dir
    dirs = sessions_dirs(data_dir)
    chosen_sessions(dirs, body.sources)  # 422 NOT_ENOUGH_DATA before any job exists

    def work(progress) -> str:
        report = run_evaluation(
            dirs, body.sources, body.include_ml, FEEDBACK_CSV, data_dir / "logs", progress
        )
        save_report(data_dir, report)
        return report.id

    return job_manager(state).start("evaluate", work)


@router.get("", response_model=list[EvaluationSummary], operation_id="listEvaluations")
def list_evaluations(state: StateDep) -> list[EvaluationSummary]:
    return list_reports(state.config.resolved_data_dir)


@router.get(
    "/{evaluation_id}",
    response_model=EvaluationReport,
    operation_id="getEvaluation",
    responses=error_responses(404),
)
def get_evaluation(evaluation_id: str, state: StateDep) -> EvaluationReport:
    report = load_report(state.config.resolved_data_dir, evaluation_id)
    if report is None:
        raise AppError(ErrorCode.EVALUATION_NOT_FOUND, f"No evaluation called {evaluation_id}.", 404)
    return report
