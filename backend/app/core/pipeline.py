"""The recognition pipeline: landmarks in, pose / hold / commands out.

Phase 0 is a pass-through: it reports the hands and pose NONE. Phase 1 adds
hand selection, smoothing, features, pose rules, swipes and the reliability
state machine (ARCHITECTURE.md "The interesting core", steps 2-6).
"""

from dataclasses import dataclass, field

from app.contract.common import EngineState, Pose
from app.contract.engine import CommandLogEntry, HoldInfo
from app.contract.settings import Settings
from app.core.types import FrameInput


@dataclass
class PipelineOutput:
    pose: Pose = Pose.NONE
    confidence: float = 0.0
    state: EngineState = EngineState.PAUSED
    active: bool = False
    extended: list[bool] | None = None
    hold: HoldInfo | None = None
    cooldown_ms_left: int = 0
    commands: list[CommandLogEntry] = field(default_factory=list)


class Pipeline:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.active = not settings.start_paused

    def update_settings(self, settings: Settings) -> None:
        self.settings = settings

    def set_active(self, active: bool) -> None:
        self.active = active

    def process(self, frame: FrameInput) -> PipelineOutput:
        state = EngineState.ACTIVE if self.active else EngineState.PAUSED
        return PipelineOutput(state=state, active=self.active)
