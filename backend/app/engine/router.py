import asyncio

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.contract.common import ErrorCode, SourceKind
from app.contract.engine import (
    EngineSnapshot,
    OverlayRequest,
    OverlayResponse,
    SetActiveRequest,
    SetSourceRequest,
)
from app.errors import AppError, error_responses
from app.state import StateDep

router = APIRouter(prefix="/api", tags=["engine"])


@router.get("/engine", response_model=EngineSnapshot, operation_id="getEngine")
def get_engine(state: StateDep) -> EngineSnapshot:
    return state.engine.snapshot()


@router.post("/engine/active", response_model=EngineSnapshot, operation_id="setEngineActive")
def set_active(body: SetActiveRequest, state: StateDep) -> EngineSnapshot:
    return state.engine.set_active(body.active)


@router.post(
    "/engine/source",
    response_model=EngineSnapshot,
    operation_id="setEngineSource",
    responses=error_responses(404, 503),
)
def set_source(body: SetSourceRequest, state: StateDep) -> EngineSnapshot:
    return state.engine.set_source(body.kind, body.session_id, body.loop)


@router.post("/overlay", response_model=OverlayResponse, operation_id="setOverlay")
def set_overlay(body: OverlayRequest, state: StateDep) -> OverlayResponse:
    state.overlay_mode = body.mode
    if state.overlay_controller:
        state.overlay_controller(body.mode)
    return OverlayResponse(mode=body.mode)


@router.get(
    "/preview.mjpg",
    operation_id="getPreview",
    responses=error_responses(409),
    response_class=StreamingResponse,
)
async def preview(state: StateDep) -> StreamingResponse:
    """Mirrored camera image as MJPEG (320 px wide, about 15 fps). Camera source only."""
    if state.engine.source_kind != SourceKind.CAMERA:
        raise AppError(ErrorCode.NO_CAMERA_IN_REPLAY, "Replay sessions have no camera image.", 409)

    async def frames():
        last = None
        while True:
            jpeg = state.engine.latest_jpeg()
            if jpeg and jpeg is not last:
                last = jpeg
                yield b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + jpeg + b"\r\n"
            await asyncio.sleep(1 / 15)

    return StreamingResponse(frames(), media_type="multipart/x-mixed-replace; boundary=frame")
