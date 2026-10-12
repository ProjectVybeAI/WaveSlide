"""The reliability state machine (ARCHITECTURE.md step 6).

    PAUSED -> HOLDING -> COOLDOWN -> ACTIVE <-> HOLDING -> COOLDOWN -> ACTIVE

- PAUSED: only the activation gesture is watched; everything else is ignored.
- A held pose (count, palm, thumbs, fist) starts HOLDING only if the hand is still. The
  dial fills as elapsed / hold time. A pose change lasting over 150 ms, or movement, cancels.
- A full dial fires the command. A swipe fires at once.
- COOLDOWN ignores every intent (800 ms; 1500 ms after the activation toggles).
- Re-arm: after a held pose fires, that pose must be released before it can fire again,
  so a palm held for five seconds blanks the screen once, not six times.

Time comes in as explicit timestamps, so the machine runs on replays and in CI.
"""

from dataclasses import dataclass, field

from app.contract.common import Action, EngineState, Gesture, Pose
from app.contract.engine import HoldInfo
from app.contract.settings import Settings
from app.core.intents import Intent, pose_intent, swipe_intent

GRACE_S = 0.150  # a pose may flicker this long without cancelling a hold


@dataclass
class Signals:
    """What the recogniser saw in one frame."""

    t: float
    hand_present: bool
    pose: Pose  # the stable pose (NONE when unsure)
    slide: int | None  # the number being counted when two hands count together
    speed: float  # palm speed, hand lengths per second
    swipe: Gesture | None = None


@dataclass
class Cancelled:
    action: Action
    reason: str  # "pose_changed", "moved" or "hand_lost"


@dataclass
class Step:
    state: EngineState
    active: bool
    hold: HoldInfo | None
    cooldown_ms_left: int
    fired: list[Intent] = field(default_factory=list)
    cancelled: list[Cancelled] = field(default_factory=list)


@dataclass
class _Hold:
    intent: Intent
    pose: Pose
    slide: int | None
    started: float
    mismatch_since: float | None = None


class Reliability:
    def __init__(self, settings: Settings, active: bool):
        self.settings = settings
        self.active = active
        self.state = EngineState.ACTIVE if active else EngineState.PAUSED
        self._hold: _Hold | None = None
        self._cooldown_until = 0.0
        self._must_release: Pose | None = None  # the re-arm rule

    def set_active(self, active: bool) -> None:
        """Forced from outside (the pause button): drop any hold or cooldown."""
        self.active = active
        self.state = EngineState.ACTIVE if active else EngineState.PAUSED
        self._hold = None
        self._cooldown_until = 0.0

    def update(self, sig: Signals) -> Step:
        fired: list[Intent] = []
        cancelled: list[Cancelled] = []
        if self._must_release is not None and sig.pose != self._must_release:
            self._must_release = None  # released, so it may fire again
        if self.state == EngineState.COOLDOWN and sig.t >= self._cooldown_until:
            self.state = EngineState.ACTIVE if self.active else EngineState.PAUSED
        if self.state == EngineState.HOLDING:
            self._advance_hold(sig, fired, cancelled)
        if self.state in (EngineState.ACTIVE, EngineState.PAUSED):
            self._look_for_intent(sig, fired)
        return Step(
            self.state, self.active, self._hold_info(sig.t), self._cooldown_left(sig.t), fired, cancelled
        )

    # ---- steps -----------------------------------------------------------------
    def _look_for_intent(self, sig: Signals, fired: list[Intent]) -> None:
        if sig.swipe and self.state == EngineState.ACTIVE:
            intent = swipe_intent(self.settings, sig.swipe)
            if intent:
                self._fire(intent, sig.t, fired)
                return
        if not sig.hand_present or sig.pose == Pose.NONE or sig.pose == self._must_release:
            return
        if sig.speed >= self.settings.sensitivity.still_max_speed:
            return  # a moving hand never starts a hold: this is what separates swipes from holds
        intent = pose_intent(self.settings, sig.pose, sig.slide)
        if intent is None:
            return
        if self.state == EngineState.PAUSED and intent.action != Action.TOGGLE_ACTIVE:
            return  # while paused only the activation gesture counts
        self._hold = _Hold(intent, sig.pose, sig.slide, sig.t)
        self.state = EngineState.HOLDING

    def _advance_hold(self, sig: Signals, fired: list[Intent], cancelled: list[Cancelled]) -> None:
        hold = self._hold
        assert hold is not None and hold.intent.hold_ms is not None
        if sig.hand_present and sig.pose == hold.pose and sig.slide == hold.slide:
            hold.mismatch_since = None
        else:
            if hold.mismatch_since is None:
                hold.mismatch_since = sig.t
            if sig.t - hold.mismatch_since > GRACE_S:
                reason = "pose_changed" if sig.hand_present else "hand_lost"
                self._cancel(cancelled, reason)
                return
        if sig.swipe or sig.speed >= self.settings.sensitivity.still_max_speed:
            self._cancel(cancelled, "moved")  # a swipe in the middle of a hold wins: it fires below
            return
        if sig.t - hold.started >= hold.intent.hold_ms / 1000:
            self._hold = None
            self._fire(hold.intent, sig.t, fired, released_pose=hold.pose)

    def _cancel(self, cancelled: list[Cancelled], reason: str) -> None:
        assert self._hold is not None
        cancelled.append(Cancelled(self._hold.intent.action, reason))
        self._hold = None
        self.state = EngineState.ACTIVE if self.active else EngineState.PAUSED

    def _fire(self, intent: Intent, t: float, fired: list[Intent], released_pose: Pose | None = None) -> None:
        fired.append(intent)
        timing = self.settings.timing
        if intent.action == Action.TOGGLE_ACTIVE:
            self.active = not self.active
            cooldown_ms = timing.activation_cooldown_ms
        else:
            cooldown_ms = timing.cooldown_ms
        self._must_release = released_pose  # None for swipes: the motion itself is the release
        self._cooldown_until = t + cooldown_ms / 1000
        self.state = EngineState.COOLDOWN

    # ---- what the overlay shows -------------------------------------------------
    def _hold_info(self, t: float) -> HoldInfo | None:
        if self.state != EngineState.HOLDING or self._hold is None:
            return None
        intent = self._hold.intent
        assert intent.hold_ms is not None
        label, caption = intent.dial_text(going_live=not self.active)
        progress = min(1.0, (t - self._hold.started) / (intent.hold_ms / 1000))
        return HoldInfo(
            action=intent.action, label=label, caption=caption, progress=progress, hold_ms=intent.hold_ms
        )

    def _cooldown_left(self, t: float) -> int:
        if self.state != EngineState.COOLDOWN:
            return 0
        return max(0, round((self._cooldown_until - t) * 1000))
