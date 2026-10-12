"""The recognition pipeline: landmarks in, pose / hold / commands out.

    select hands -> One Euro smoothing -> features -> pose rules -> 4-of-5 stabiliser
                                                   \\-> palm motion -> swipe
    -> reliability state machine -> commands (keys from the app profile)

It sees only landmarks and explicit timestamps, so it runs on a webcam, a recorded
session or a synthetic one in exactly the same way (ARCHITECTURE.md decision 4).
"""

from collections.abc import Callable
from dataclasses import dataclass, field

import numpy as np

from app.contract.common import EngineState, Pose
from app.contract.engine import HoldCancelledEvent, HoldInfo
from app.contract.settings import Settings
from app.contract.system import AppProfile
from app.core.commands import Command, make_command
from app.core.features import HandFeatures, compute_features
from app.core.intents import COUNT_POSES
from app.core.poses import classify_rules
from app.core.reliability import Reliability, Signals
from app.core.tracking import HandTracker, Track, largest_hands
from app.core.types import FrameInput, Hand
from app.keys.profiles import load_profiles

# A pose classifier turns features into a pose. The rules are the default; Phase 2 plugs the
# trained random forest in here, so the comparison isolates the classifier.
PoseClassifier = Callable[[HandFeatures, Settings], Pose]


def rules_classifier(features: HandFeatures, settings: Settings) -> Pose:
    return classify_rules(features, settings.sensitivity.palm_spread_max)


@dataclass
class PipelineOutput:
    pose: Pose = Pose.NONE
    confidence: float = 0.0
    state: EngineState = EngineState.PAUSED
    active: bool = False
    extended: list[bool] | None = None
    hold: HoldInfo | None = None
    cooldown_ms_left: int = 0
    commands: list[Command] = field(default_factory=list)
    cancelled: list[HoldCancelledEvent] = field(default_factory=list)


@dataclass
class _Seen:
    """What one tracked hand looked like in this frame."""

    track: Track
    features: HandFeatures
    pose: Pose  # stable pose
    confidence: float


class Pipeline:
    def __init__(
        self, settings: Settings, os_name: str | None = None, classifier: PoseClassifier | None = None
    ):
        self.settings = settings
        self.os_name = os_name
        self.classifier: PoseClassifier = classifier or rules_classifier
        self.tracker = HandTracker(settings.sensitivity.smoothing)
        self.reliability = Reliability(settings, active=not settings.start_paused)
        self.profile = self._load_profile()

    @property
    def active(self) -> bool:
        return self.reliability.active

    def update_settings(self, settings: Settings) -> None:
        self.settings = settings
        self.reliability.settings = settings
        self.tracker.set_smoothing(settings.sensitivity.smoothing)
        self.profile = self._load_profile()

    def set_active(self, active: bool) -> None:
        self.reliability.set_active(active)

    def _load_profile(self) -> AppProfile:
        return load_profiles(self.os_name)[self.settings.profile_id]

    def process(self, frame: FrameInput) -> PipelineOutput:
        seen = self._observe(frame)
        primary = seen[0] if seen else None
        if primary is None:
            signals = Signals(frame.t, hand_present=False, pose=Pose.NONE, slide=None, speed=0.0)
        else:
            pose, slide = self._counted_pose(seen)
            motion = primary.track.motion
            swipe = motion.swipe(self.settings.sensitivity)
            if swipe:
                motion.reset()  # one swipe, one event
            signals = Signals(frame.t, True, pose, slide, motion.speed(), swipe)
        step = self.reliability.update(signals)

        out = PipelineOutput(
            state=step.state, active=step.active, hold=step.hold, cooldown_ms_left=step.cooldown_ms_left
        )
        if primary:
            out.pose, out.confidence = signals.pose, primary.confidence
            out.extended = primary.features.extended
        out.commands = [make_command(self.profile, intent) for intent in step.fired]
        out.cancelled = [HoldCancelledEvent(action=c.action, reason=c.reason) for c in step.cancelled]  # type: ignore[arg-type]
        return out

    # ---- steps -----------------------------------------------------------------
    def _observe(self, frame: FrameInput) -> list[_Seen]:
        """Steps 2-4 for each chosen hand, biggest first."""
        count = 2 if self.settings.features.two_hand else 1
        hands = [self._true_scale(h, frame.aspect) for h in largest_hands(frame.hands, count)]
        seen: list[_Seen] = []
        for track, hand in self.tracker.update(hands, frame.t):
            smoothed = track.filter(hand.points, frame.t)
            features = compute_features(smoothed, hand.handedness)
            if features is None:
                continue
            raw_pose = self.classifier(features, self.settings)
            pose, confidence = track.stabiliser.push(raw_pose)
            track.motion.push(
                frame.t, features.palm, features.scale, self.settings.sensitivity.swipe_max_ms / 1000
            )
            seen.append(_Seen(track, features, pose, confidence))
        return seen

    @staticmethod
    def _true_scale(hand: Hand, aspect: float) -> Hand:
        """Stretch x (and the matching z) by the image aspect, so distances are in image heights."""
        return Hand(hand.handedness, hand.score, hand.points * np.array([aspect, 1.0, aspect]))

    def _counted_pose(self, seen: list[_Seen]) -> tuple[Pose, int | None]:
        """The main hand's pose, or, when two hands both count, the pose with the sum as the slide."""
        main = seen[0]
        if len(seen) == 2 and all(s.pose in COUNT_POSES for s in seen):
            counts = [COUNT_POSES[s.pose] for s in seen]
            higher = max(seen, key=lambda s: COUNT_POSES[s.pose])
            return higher.pose, sum(counts)
        return main.pose, None
