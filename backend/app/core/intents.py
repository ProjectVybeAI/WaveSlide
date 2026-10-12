"""Intent mapping: which action a gesture means under the current Settings.

An intent is "this gesture, if it is held long enough (or swiped), should do this action".
It carries no timing state; the reliability state machine decides when it fires.
"""

from dataclasses import dataclass

from app.contract.common import Action, Gesture, Pose
from app.contract.settings import Settings

COUNT_POSES = {Pose.COUNT_1: 1, Pose.COUNT_2: 2, Pose.COUNT_3: 3, Pose.COUNT_4: 4, Pose.COUNT_5: 5}
SWIPES = (Gesture.SWIPE_LEFT, Gesture.SWIPE_RIGHT)

# What the cue dial shows while a gesture is on standby: (label, caption).
DIAL_TEXT: dict[Action, tuple[str, str]] = {
    Action.NEXT: ("Next", "Slide"),
    Action.PREVIOUS: ("Back", "Slide"),
    Action.BLANK_TOGGLE: ("Blank", "Screen"),
    Action.START_SHOW: ("Start", "Show"),
    Action.EXIT_SHOW: ("Exit", "Show"),
}


@dataclass(frozen=True)
class Intent:
    action: Action
    gesture: Gesture
    slide: int | None = None  # for JUMP
    hold_ms: int | None = None  # None: a swipe, fires at once

    def dial_text(self, going_live: bool) -> tuple[str, str]:
        """Label and caption for the dial: ("3", "Slide"), ("Blank", "Screen"), ("Live", "Go")."""
        if self.action == Action.JUMP:
            return str(self.slide), "Slide"
        if self.action == Action.TOGGLE_ACTIVE:
            return ("Live", "Go") if going_live else ("Pause", "Go")
        return DIAL_TEXT[self.action]


def _action_for(settings: Settings, gesture: Gesture) -> Action | None:
    """The action a gesture is mapped to, ignoring actions whose feature switch is off."""
    for action_name, mapped in settings.mappings.model_dump().items():
        if mapped == gesture:
            action = Action(action_name)
            if action == Action.BLANK_TOGGLE and not settings.features.blank:
                return None
            return action
    return None


def swipe_intent(settings: Settings, gesture: Gesture) -> Intent | None:
    action = _action_for(settings, gesture)
    return Intent(action, gesture) if action else None


def pose_intent(settings: Settings, pose: Pose, slide: int | None = None) -> Intent | None:
    """The intent for a held pose. `slide` overrides the number when two hands are counted."""
    if pose in COUNT_POSES:  # COUNT_1..5 are reserved for jumping
        if not settings.features.finger_jump:
            return None
        return Intent(
            Action.JUMP, Gesture(pose.value), slide or COUNT_POSES[pose], settings.timing.hold_count_ms
        )
    if pose == Pose.NONE:
        return None
    gesture = Gesture(pose.value)
    action = _action_for(settings, gesture)
    if action is None:
        return None
    hold_ms = settings.timing.hold_palm_ms if pose == Pose.OPEN_PALM else settings.timing.hold_pose_ms
    return Intent(action, gesture, None, hold_ms)
