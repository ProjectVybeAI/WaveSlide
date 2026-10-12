import json

from fastapi import APIRouter, UploadFile
from fastapi.responses import Response
from pydantic import ValidationError

from app.contract.common import ErrorCode
from app.contract.engine import SettingsChangedEvent
from app.contract.settings import Settings
from app.errors import AppError, error_responses
from app.settings.service import validate_settings
from app.settings.store import migrate
from app.state import AppState, StateDep

router = APIRouter(prefix="/api/settings", tags=["settings"])


def _apply(state: AppState, settings: Settings) -> Settings:
    saved = state.settings.save(validate_settings(settings))
    state.engine.update_settings(saved)
    state.hub.publish_event(SettingsChangedEvent(settings=saved))
    return saved


@router.get("", response_model=Settings, operation_id="getSettings")
def get_settings(state: StateDep) -> Settings:
    return state.settings.get()


@router.put("", response_model=Settings, operation_id="putSettings", responses=error_responses(409, 422))
def put_settings(body: Settings, state: StateDep) -> Settings:
    return _apply(state, body)


@router.post("/reset", response_model=Settings, operation_id="resetSettings")
def reset_settings(state: StateDep) -> Settings:
    return _apply(state, Settings())


@router.get("/export", operation_id="exportSettings", response_class=Response)
def export_settings(state: StateDep) -> Response:
    body = state.settings.get().model_dump_json(indent=2)
    headers = {"Content-Disposition": 'attachment; filename="waveslide-settings.json"'}
    return Response(body, media_type="application/json", headers=headers)


@router.post(
    "/import",
    response_model=Settings,
    operation_id="importSettings",
    responses=error_responses(409, 422),
)
async def import_settings(file: UploadFile, state: StateDep) -> Settings:
    try:
        settings = Settings.model_validate(migrate(json.loads(await file.read())))
    except (ValueError, ValidationError) as exc:
        raise AppError(
            ErrorCode.VALIDATION_ERROR, "This file is not a WaveSlide settings file.", 422
        ) from exc
    return _apply(state, settings)
