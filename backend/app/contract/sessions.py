"""Landmark sessions (recorded or synthetic) and the guided recorder. Landmarks only, never pixels."""

from typing import Literal

from pydantic import BaseModel, Field

from app.contract.common import SCHEMA_VERSION, Gesture
from app.contract.engine import HandLandmarks

SessionKind = Literal["gestures", "talking", "two_hand", "demo"]
SessionSource = Literal["recorded", "synthetic"]
Lighting = Literal["bright", "normal", "dim"]


class SessionLabel(BaseModel):
    start: float = Field(description="Seconds from the session start")
    end: float
    gesture: Gesture | Literal["COUNT_6", "COUNT_7", "COUNT_8", "COUNT_9", "COUNT_10", "TALKING"]


class SessionHeader(BaseModel):
    """First line of a session .jsonl file."""

    schema_version: int = SCHEMA_VERSION
    id: str
    kind: SessionKind
    source: SessionSource
    participant: str
    distance_m: float | None = None
    lighting: Lighting | None = None
    luminance_mean: float | None = None
    fps: float
    created_at: str
    labels: list[SessionLabel]


class SessionFrame(BaseModel):
    """Every following line: one camera frame's hands."""

    t: float = Field(description="Seconds from the session start")
    hands: list[HandLandmarks]


class SessionSummary(BaseModel):
    id: str
    kind: SessionKind
    source: SessionSource
    participant: str
    distance_m: float | None
    lighting: Lighting | None
    luminance_mean: float | None
    n_frames: int
    duration_s: float
    created_at: str


class SessionDetail(SessionSummary):
    labels: list[SessionLabel]


class RecordingRequest(BaseModel):
    protocol: Literal["gestures", "talking", "two_hand"]
    participant: str = Field(min_length=1, max_length=40)
    distance_m: float = Field(1.0, ge=0.3, le=3.0)
    lighting: Lighting = "normal"


class RecordingStatus(BaseModel):
    session_id: str
    protocol: Literal["gestures", "talking", "two_hand"]
    step: int
    total_steps: int
    prompt: str
    started_at: str
