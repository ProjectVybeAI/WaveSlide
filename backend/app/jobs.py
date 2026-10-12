"""Background jobs (train, evaluate). Phase 2 runs them in-process, one at a time."""

from fastapi import APIRouter

from app.contract.examples import JOB
from app.contract.jobs import Job
from app.errors import error_responses

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


@router.get("/{job_id}", response_model=Job, operation_id="getJob", responses=error_responses(404))
def get_job(job_id: str) -> Job:
    return JOB.model_copy(update={"id": job_id})
