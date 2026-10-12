"""Finger counting with one or two hands (ARCHITECTURE.md step 4, two-hand counting).

One hand shows 1-5. With two-hand counting on and both hands in view, one hand must show
COUNT_5 and the other 1-5, and the sum (6-10) is the slide. Every other two-hand
combination gives no jump, so a resting second hand can never turn a 3 into a wrong slide.
The poses passed in are the stable poses; the reliability state machine adds the
"both hands still" and hold-time conditions.
"""

from app.contract.common import Pose
from app.core.intents import COUNT_POSES


def two_hand_slide(first: Pose, second: Pose) -> int | None:
    """6-10 when one hand is COUNT_5 and the other is a count; None for anything else."""
    if first not in COUNT_POSES or second not in COUNT_POSES:
        return None
    if Pose.COUNT_5 not in (first, second):
        return None
    return COUNT_POSES[first] + COUNT_POSES[second]


def counted_pose(poses: list[Pose]) -> tuple[Pose, int | None]:
    """The pose and slide number to act on, from the stable poses of the hands in view.

    `poses[0]` is the main (largest) hand. Returns (pose, slide): `slide` is set only for a
    valid two-hand count. A count pose that cannot become a jump is reported as NONE.
    """
    main = poses[0]
    if len(poses) < 2:
        return main, None
    slide = two_hand_slide(main, poses[1])
    if slide is not None:
        return Pose.COUNT_5, slide
    if main in COUNT_POSES:
        return Pose.NONE, None  # two hands in view and not a valid 5 + n: no jump
    return main, None
