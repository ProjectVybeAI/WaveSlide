import sys

from fastapi import APIRouter

from app.contract.system import CameraInfo, Health
from app.platform.cameras import list_cameras as enumerate_cameras
from app.platform.permissions import check_permissions
from app.settings.service import model_available
from app.state import StateDep

VERSION = "0.1.0"
router = APIRouter(prefix="/api", tags=["system"])


@router.get("/health", response_model=Health, operation_id="getHealth")
def get_health(state: StateDep) -> Health:
    platform = "darwin" if sys.platform == "darwin" else "win32" if sys.platform == "win32" else "other"
    return Health(
        status="ok",
        version=VERSION,
        platform=platform,
        source=state.engine.source_kind,
        keys_mode=state.config.keys,
        permissions=check_permissions(state.config.keys),
        model_loaded=model_available(state.config.resolved_data_dir),
    )


@router.get("/cameras", response_model=list[CameraInfo], operation_id="listCameras")
def list_cameras() -> list[CameraInfo]:
    """Phase 1 lists real cameras (cv2-enumerate-cameras)."""
    return enumerate_cameras()
