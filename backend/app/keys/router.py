from fastapi import APIRouter

from app.contract.system import AppProfile
from app.keys.profiles import load_profiles

router = APIRouter(prefix="/api", tags=["profiles"])


@router.get("/profiles", response_model=list[AppProfile], operation_id="listProfiles")
def list_profiles() -> list[AppProfile]:
    """Every app profile with its keys for this computer's OS."""
    return list(load_profiles().values())
