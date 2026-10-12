"""Sessions (real list in Phase 0) and the guided recorder (placeholder until Phase 2)."""

from fastapi import APIRouter, Response

from app.contract.common import ErrorCode
from app.contract.examples import RECORDING, SESSION
from app.contract.sessions import RecordingRequest, RecordingStatus, SessionDetail, SessionSummary
from app.dataset.store import find_session, read_header, summarise
from app.errors import AppError, error_responses
from app.state import StateDep

router = APIRouter(prefix="/api", tags=["dataset"])


@router.get("/sessions", response_model=list[SessionSummary], operation_id="listSessions")
def list_sessions(
    state: StateDep, kind: str | None = None, source: str | None = None
) -> list[SessionSummary]:
    seen: dict[str, SessionSummary] = {}
    for directory in state.engine.sessions_dirs:
        for path in sorted(directory.glob("*.jsonl")):
            if path.stem not in seen:
                seen[path.stem] = summarise(path)
    sessions = [
        s
        for s in seen.values()
        if (kind is None or s.kind == kind) and (source is None or s.source == source)
    ]
    return sorted(sessions, key=lambda s: s.id)


@router.get(
    "/sessions/{session_id}",
    response_model=SessionDetail,
    operation_id="getSession",
    responses=error_responses(404),
)
def get_session(session_id: str, state: StateDep) -> SessionDetail:
    path = find_session(state.engine.sessions_dirs, session_id)
    if path is None:
        raise AppError(ErrorCode.SESSION_NOT_FOUND, f"No session called {session_id}.", 404)
    return SessionDetail(**summarise(path).model_dump(), labels=read_header(path).labels)


@router.delete(
    "/sessions/{session_id}",
    status_code=204,
    operation_id="deleteSession",
    responses=error_responses(404),
)
def delete_session(session_id: str, state: StateDep) -> Response:
    path = find_session(state.engine.sessions_dirs[:1], session_id)  # never delete fixtures
    if path is None:
        raise AppError(ErrorCode.SESSION_NOT_FOUND, f"No session called {session_id}.", 404)
    path.unlink()
    return Response(status_code=204)


@router.post(
    "/recordings",
    response_model=RecordingStatus,
    operation_id="startRecording",
    responses=error_responses(409),
)
def start_recording(body: RecordingRequest) -> RecordingStatus:
    """Placeholder until Phase 2."""
    return RECORDING


@router.post(
    "/recordings/current/stop",
    response_model=SessionSummary,
    operation_id="stopRecording",
    responses=error_responses(404),
)
def stop_recording() -> SessionSummary:
    """Placeholder until Phase 2."""
    return SESSION
