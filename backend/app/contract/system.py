"""Health, profiles and cameras."""

from typing import Literal

from pydantic import BaseModel

from app.contract.common import Action, SourceKind

Permission = Literal["granted", "denied", "unknown", "not_required"]


class Permissions(BaseModel):
    camera: Permission
    keyboard: Permission


class Health(BaseModel):
    status: Literal["ok"]
    version: str
    platform: Literal["darwin", "win32", "other"]
    source: SourceKind
    keys_mode: Literal["pyautogui", "record"]
    permissions: Permissions
    model_loaded: bool


class AppProfile(BaseModel):
    """A presentation app's shortcuts, resolved for the current OS."""

    id: str
    name: str
    description: str
    keys: dict[Action, list[str]]
    jump_strategy: Literal["type_number", "step_from_home"]
    unsupported: list[Action]
    notes: str = ""


class CameraInfo(BaseModel):
    index: int
    name: str
