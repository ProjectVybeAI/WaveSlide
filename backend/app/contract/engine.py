"""Engine state as seen by the UI: REST snapshot, WebSocket frames, events and client messages."""

from typing import Annotated, Literal

from pydantic import BaseModel, Field

from app.contract.common import Action, EngineState, Gesture, Pose, Recogniser, SourceKind
from app.contract.jobs import Job
from app.contract.settings import Settings

Landmark = Annotated[list[float], Field(min_length=3, max_length=3)]


class HandLandmarks(BaseModel):
    """One detected hand: 21 (x, y, z) points, x and y in 0..1 of the mirrored image."""

    handedness: Literal["Left", "Right"]
    score: float = Field(ge=0, le=1)
    landmarks: Annotated[list[Landmark], Field(min_length=21, max_length=21)]


class HoldInfo(BaseModel):
    """A held gesture on standby: what the cue dial shows."""

    action: Action
    label: str = Field(description='Text inside the dial, e.g. "3", "Blank", "Live"')
    caption: str = Field(description='Small caption above it, e.g. "Slide", "Screen", "Go"')
    progress: float = Field(ge=0, le=1)
    hold_ms: int


class CommandLogEntry(BaseModel):
    id: int
    t: float = Field(description="Unix time in seconds")
    action: Action
    gesture: Gesture
    slide: int | None = None
    keys: list[str]
    pipeline_ms: float = Field(description="Frame capture to key sent")
    dry_run: bool
    blocked_reason: str | None = None
    ack_ms: float | None = Field(None, description="Key sent to the practice deck showing the slide")


class EngineSnapshot(BaseModel):
    active: bool
    state: EngineState
    source: SourceKind
    session_id: str | None = None
    recogniser: Recogniser
    fps: float
    pipeline_ms_p50: float | None = None
    profile_id: str
    camera_ok: bool
    last_command: CommandLogEntry | None = None


class EngineFrame(BaseModel):
    """Sent up to 30 times a second. Clients keep only the latest one."""

    type: Literal["frame"] = "frame"
    seq: int
    t: float
    active: bool
    state: EngineState
    source: SourceKind
    hands: list[HandLandmarks]
    extended: list[bool] | None = Field(
        None, description="Per finger (thumb, index, middle, ring, little) of the main hand"
    )
    pose: Pose
    confidence: float = Field(ge=0, le=1)
    recogniser: Recogniser
    hold: HoldInfo | None = None
    cooldown_ms_left: int = 0
    fps: float


# Events: never dropped, delivered in order.
class CommandEvent(BaseModel):
    kind: Literal["command"] = "command"
    command: CommandLogEntry


class HoldCancelledEvent(BaseModel):
    kind: Literal["hold_cancelled"] = "hold_cancelled"
    action: Action
    reason: Literal["pose_changed", "moved", "hand_lost"]


class ActivationChangedEvent(BaseModel):
    kind: Literal["activation_changed"] = "activation_changed"
    active: bool


class WarningEvent(BaseModel):
    kind: Literal["warning"] = "warning"
    code: Literal["CAMERA_LOST", "CAMERA_BACK", "KEYS_NOT_ALLOWED", "FOCUS_BLOCKED", "SLOW_PIPELINE"]
    message: str


class SettingsChangedEvent(BaseModel):
    kind: Literal["settings_changed"] = "settings_changed"
    settings: Settings


class RecordingPromptEvent(BaseModel):
    kind: Literal["recording_prompt"] = "recording_prompt"
    session_id: str
    step: int
    total_steps: int
    prompt: str
    gesture: Gesture | None = None
    seconds: float


class JobProgressEvent(BaseModel):
    kind: Literal["job_progress"] = "job_progress"
    job: Job


EngineEvent = Annotated[
    CommandEvent
    | HoldCancelledEvent
    | ActivationChangedEvent
    | WarningEvent
    | SettingsChangedEvent
    | RecordingPromptEvent
    | JobProgressEvent,
    Field(discriminator="kind"),
]


class EngineEventMessage(BaseModel):
    type: Literal["event"] = "event"
    event: EngineEvent


ServerMessage = Annotated[EngineFrame | EngineEventMessage, Field(discriminator="type")]


# Client to server
class HelloMessage(BaseModel):
    type: Literal["hello"] = "hello"
    role: Literal["overlay", "settings"]


class FocusMessage(BaseModel):
    type: Literal["focus"] = "focus"
    has_focus: bool
    route: str


class DeckAckMessage(BaseModel):
    type: Literal["deck_ack"] = "deck_ack"
    command_id: int
    t: float


ClientMessage = Annotated[HelloMessage | FocusMessage | DeckAckMessage, Field(discriminator="type")]


class SetActiveRequest(BaseModel):
    active: bool


class SetSourceRequest(BaseModel):
    kind: SourceKind
    session_id: str | None = None
    loop: bool = True


class OverlayRequest(BaseModel):
    mode: Literal["full", "compact", "hidden"]


class OverlayResponse(BaseModel):
    mode: Literal["full", "compact", "hidden"]
