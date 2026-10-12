"""Background jobs (train a model, run an evaluation). One runs at a time, in a thread.

A job reports progress as it goes; every change is published as a `job_progress` event so the
UI can show a progress bar without polling, and `GET /api/jobs/{id}` returns the latest state.
"""

import logging
import threading
import uuid
from collections.abc import Callable
from typing import Literal

from fastapi import APIRouter

from app.contract.common import ErrorCode
from app.contract.engine import JobProgressEvent
from app.contract.jobs import Job
from app.engine.hub import Hub
from app.errors import AppError, error_responses
from app.state import AppState, StateDep

log = logging.getLogger("waveslide.jobs")

# A job's work: call progress(0..1, message) now and then; return the id of what it produced.
Progress = Callable[[float, str], None]
Work = Callable[[Progress], str | None]


class JobManager:
    def __init__(self, hub: Hub):
        self.hub = hub
        self._jobs: dict[str, Job] = {}
        self._threads: dict[str, threading.Thread] = {}
        self._lock = threading.Lock()

    def start(self, kind: Literal["train", "evaluate"], work: Work) -> Job:
        with self._lock:
            if any(job.status in ("queued", "running") for job in self._jobs.values()):
                raise AppError(
                    ErrorCode.JOB_RUNNING, "Another job is still running. Wait for it to finish.", 409
                )
            job = Job(id=uuid.uuid4().hex[:12], kind=kind, status="queued", progress=0.0)
            self._jobs[job.id] = job
            thread = threading.Thread(target=self._run, args=(job.id, work), name=f"job-{kind}", daemon=True)
            self._threads[job.id] = thread
        thread.start()
        return job

    def get(self, job_id: str) -> Job | None:
        with self._lock:
            return self._jobs.get(job_id)

    def wait(self, job_id: str, timeout: float = 60) -> Job:
        """Block until the job ends (tests and the command line use this)."""
        thread = self._threads.get(job_id)
        if thread:
            thread.join(timeout)
        job = self.get(job_id)
        assert job is not None
        return job

    def _update(self, job_id: str, **changes) -> None:
        with self._lock:
            job = self._jobs[job_id].model_copy(update=changes)
            self._jobs[job_id] = job
        self.hub.publish_event(JobProgressEvent(job=job))

    def _run(self, job_id: str, work: Work) -> None:
        def progress(fraction: float, message: str = "") -> None:
            self._update(job_id, progress=min(1.0, max(0.0, fraction)), message=message)

        self._update(job_id, status="running")
        try:
            result_id = work(progress)
        except AppError as exc:
            self._update(job_id, status="failed", error=exc.message)
        except Exception as exc:  # noqa: BLE001 - a failed job is reported, never raised into a thread
            log.exception("job %s failed", job_id)
            self._update(job_id, status="failed", error=f"{type(exc).__name__}: {exc}")
        else:
            self._update(job_id, status="done", progress=1.0, result_id=result_id)


def job_manager(state: AppState) -> JobManager:
    """The one JobManager of this app, created on first use."""
    if "jobs" not in state.extras:
        state.extras["jobs"] = JobManager(state.hub)
    return state.extras["jobs"]


router = APIRouter(prefix="/api/jobs", tags=["jobs"])


@router.get("/{job_id}", response_model=Job, operation_id="getJob", responses=error_responses(404))
def get_job(job_id: str, state: StateDep) -> Job:
    job = job_manager(state).get(job_id)
    if job is None:
        raise AppError(ErrorCode.JOB_NOT_FOUND, f"No job called {job_id}.", 404)
    return job
