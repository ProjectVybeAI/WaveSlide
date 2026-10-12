"""Sessions (list, detail, delete) and the guided recorder."""

from fastapi import APIRouter, Response

from app.contract.common import ErrorCode, SourceKind
from app.contract.sessions import RecordingRequest, RecordingStatus, SessionDetail, SessionSummary
from app.dataset.recorder import RecordingService
from app.dataset.store import find_session, read_header, session_paths, summarise
from app.errors import AppError, error_responses
from app.state import AppState, StateDep

router = APIRouter(prefix="/api", tags=["dataset"])


@router.get("/sessions", response_model=list[SessionSummary], operation_id="listSessions")
def list_sessions(
    state: StateDep, kind: str | None = None, source: str | None = None
) -> list[SessionSummary]:
    sessions = [
        s
        for s in map(summarise, session_paths(state.engine.sessions_dirs))
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


def recorder_service(state: AppState) -> RecordingService:
    """The one RecordingService of this app, created on first use."""
    if "recorder" not in state.extras:
        sessions_dir = state.config.resolved_data_dir / "sessions"
        state.extras["recorder"] = RecordingService(state.hub, state.engine, sessions_dir)
    return state.extras["recorder"]


@router.post(
    "/recordings",
    response_model=RecordingStatus,
    operation_id="startRecording",
    responses=error_responses(409),
)
async def start_recording(body: RecordingRequest, state: StateDep) -> RecordingStatus:
    """Start a guided recording. Prompts follow as `recording_prompt` events."""
    if state.engine.source_kind != SourceKind.CAMERA:
        raise AppError(
            ErrorCode.CAMERA_REQUIRED,
            "Recording needs the webcam. Switch the source to camera first.",
            409,
        )
    service = recorder_service(state)
    if service.running:
        raise AppError(ErrorCode.RECORDING_IN_PROGRESS, "A recording is already running. Stop it first.", 409)
    return await service.start(body)


@router.post(
    "/recordings/current/stop",
    response_model=SessionSummary,
    operation_id="stopRecording",
    responses=error_responses(404),
)
async def stop_recording(state: StateDep) -> SessionSummary:
    """Stop the recording and save what was captured (also works after the protocol has ended)."""
    summary = await recorder_service(state).stop()
    if summary is None:
        raise AppError(
            ErrorCode.NO_RECORDING, "There is no recording to stop, or no frames were captured.", 404
        )
    return summary
