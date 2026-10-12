"""The guided recording protocols: a timeline of prompts, some of which are labelled.

A labelled step becomes a label in the session header, so the evaluation knows what the
participant was asked to do and when. Unlabelled steps (get ready, relax) are rest.
The timeline depends only on the protocol name, never on the camera, so it is easy to test.
"""

from dataclasses import dataclass
from typing import Literal

Protocol = Literal["gestures", "talking", "two_hand"]

HOLD_S = 4.0  # each pose is held this long
READY_S = 2.5  # a warning before each pose, so the hold starts when the hand is already in place
ROUNDS = 3
SWIPE_WINDOW_S = 2.0
SWIPES_EACH_WAY = 10
TALKING_S = 180.0
TWO_HAND_ROUNDS = 2

POSE_PROMPTS = {
    "FIST": "Make a fist",
    "OPEN_PALM": "Open palm, fingers together",
    "THUMBS_UP": "Thumbs up",
    "THUMBS_DOWN": "Thumbs down",
    "COUNT_1": "Hold up 1 finger",
    "COUNT_2": "Hold up 2 fingers",
    "COUNT_3": "Hold up 3 fingers",
    "COUNT_4": "Hold up 4 fingers",
    "COUNT_5": "Hold up 5 fingers, spread wide",
}


@dataclass(frozen=True)
class Step:
    prompt: str
    seconds: float
    gesture: str | None = None  # what the hand should do in this step (None: rest)
    labelled: bool = False  # True: the header gets a label for this step


def _gestures() -> list[Step]:
    steps = [Step("Get ready: raise one hand to the camera", READY_S)]
    for _ in range(ROUNDS):
        for gesture, prompt in POSE_PROMPTS.items():
            steps.append(Step(f"Get ready: {prompt.lower()}", READY_S, gesture))
            steps.append(Step(prompt, HOLD_S, gesture, labelled=True))
    for gesture, name in (("SWIPE_RIGHT", "right"), ("SWIPE_LEFT", "left")):
        for _ in range(SWIPES_EACH_WAY):
            steps.append(Step("Relax your hand", 1.0))
            steps.append(Step(f"Swipe {name}", SWIPE_WINDOW_S, gesture, labelled=True))
    return steps


def _two_hand() -> list[Step]:
    steps = [Step("Get ready: raise both hands", READY_S)]
    steps.append(Step("Thumbs up to switch on", 3.0, "THUMBS_UP", labelled=True))
    for _ in range(TWO_HAND_ROUNDS):
        for other in range(1, 6):
            gesture = f"COUNT_{5 + other}"
            steps.append(Step(f"Get ready: five on one hand, {other} on the other", READY_S, gesture))
            steps.append(Step(f"Five and {other}: slide {5 + other}", HOLD_S, gesture, labelled=True))
    return steps


def timeline(protocol: Protocol) -> list[Step]:
    if protocol == "gestures":
        return _gestures()
    if protocol == "talking":
        return [Step("Talk about your last project and use your hands naturally", TALKING_S, "TALKING", True)]
    return _two_hand()


def step_at(steps: list[Step], t: float) -> int | None:
    """Index of the step running at `t` seconds, or None when the protocol is over."""
    start = 0.0
    for index, step in enumerate(steps):
        start += step.seconds
        if t < start:
            return index
    return None
