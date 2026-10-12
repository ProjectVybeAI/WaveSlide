"""Settings: the single user-editable object, saved as data/settings.json.

The defaults here are the BRIEF §13 decisions recorded in ARCHITECTURE.md.
"""

from typing import Literal

from pydantic import BaseModel, Field

from app.contract.common import SCHEMA_VERSION, Gesture, Recogniser


class Mappings(BaseModel):
    """Which gesture triggers which action. Jump is always COUNT_1..5 (reserved)."""

    next: Gesture = Gesture.SWIPE_RIGHT
    previous: Gesture = Gesture.SWIPE_LEFT
    blank_toggle: Gesture = Gesture.OPEN_PALM
    toggle_active: Gesture = Gesture.THUMBS_UP
    start_show: Gesture = Gesture.FIST
    exit_show: Gesture = Gesture.THUMBS_DOWN


class Features(BaseModel):
    finger_jump: bool = True
    blank: bool = True
    two_hand: bool = False


class Sensitivity(BaseModel):
    """Distances are in hand lengths (wrist to middle-finger knuckle)."""

    swipe_min_travel: float = Field(2.0, ge=0.5, le=5.0, description="hand lengths")
    swipe_max_ms: int = Field(500, ge=200, le=1500, description="ms")
    swipe_min_speed: float = Field(4.0, ge=1.0, le=12.0, description="hand lengths per second")
    palm_spread_max: float = Field(0.45, ge=0.2, le=0.8, description="spread")
    still_max_speed: float = Field(1.0, ge=0.2, le=3.0, description="hand lengths per second")
    smoothing: float = Field(1.0, ge=0.1, le=5.0, description="One Euro min cut-off, Hz")


class Timing(BaseModel):
    hold_count_ms: int = Field(1000, ge=300, le=3000)
    hold_palm_ms: int = Field(800, ge=300, le=3000)
    hold_pose_ms: int = Field(1000, ge=300, le=3000)
    cooldown_ms: int = Field(800, ge=200, le=3000)
    activation_cooldown_ms: int = Field(1500, ge=200, le=5000)


class CameraSettings(BaseModel):
    index: int = Field(0, ge=0, le=9)
    width: int = 640
    height: int = 480


class OverlaySettings(BaseModel):
    visible: bool = True
    compact: bool = False
    show_preview: bool = True
    show_landmarks: bool = True


ProfileId = Literal["powerpoint", "google_slides", "pdf_viewer", "practice"]


class Settings(BaseModel):
    schema_version: int = SCHEMA_VERSION
    mappings: Mappings = Field(default_factory=Mappings)
    features: Features = Field(default_factory=Features)
    sensitivity: Sensitivity = Field(default_factory=Sensitivity)
    timing: Timing = Field(default_factory=Timing)
    camera: CameraSettings = Field(default_factory=CameraSettings)
    profile_id: ProfileId = "powerpoint"
    recogniser: Recogniser = Recogniser.RULES
    overlay: OverlaySettings = Field(default_factory=OverlaySettings)
    start_paused: bool = True
