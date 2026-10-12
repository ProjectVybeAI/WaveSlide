"""Pose rules and the 4-of-5 stabiliser (ARCHITECTURE.md step 4).

The rules look at one frame only. The stabiliser then makes the pose steady: it becomes
the reported pose only when 4 of the last 5 frames agree, so one odd frame changes nothing.
"""

from collections import Counter, deque

from app.contract.common import Pose
from app.core.features import HandFeatures

THUMB_UP_MAX_DEG = 45.0  # thumb within 45 degrees of straight up counts as thumbs-up
FIST_MIN_BEND = 70.0  # a fist needs curled fingers: a relaxed half-curled hand is not a fist
WINDOW = 5
AGREE = 4

COUNT_POSES = {1: Pose.COUNT_1, 2: Pose.COUNT_2, 3: Pose.COUNT_3, 4: Pose.COUNT_4, 5: Pose.COUNT_5}


def classify_rules(features: HandFeatures, palm_spread_max: float) -> Pose:
    """First matching rule wins: thumbs, fist, open palm vs five, then counting fingers."""
    extended = features.extended
    n_extended = sum(extended)
    if n_extended == 1 and extended[0]:
        if features.thumb_from_up <= THUMB_UP_MAX_DEG:
            return Pose.THUMBS_UP
        if features.thumb_from_up >= 180 - THUMB_UP_MAX_DEG:
            return Pose.THUMBS_DOWN
    if n_extended == 0:
        finger_bends = features.bends[1:]
        return Pose.FIST if sum(finger_bends) / len(finger_bends) >= FIST_MIN_BEND else Pose.NONE
    if n_extended == 5:
        # Fingers together ("stop") is the palm; fingers fanned out is a high five, the number 5.
        return Pose.OPEN_PALM if features.spread <= palm_spread_max else Pose.COUNT_5
    return COUNT_POSES[n_extended]


class PoseStabiliser:
    def __init__(self) -> None:
        self._recent: deque[Pose] = deque(maxlen=WINDOW)

    def reset(self) -> None:
        self._recent.clear()

    def push(self, pose: Pose) -> tuple[Pose, float]:
        """Add this frame's pose. Returns (stable pose, confidence = share of agreeing frames)."""
        self._recent.append(pose)
        best, votes = Counter(self._recent).most_common(1)[0]
        if votes >= AGREE:
            return best, votes / WINDOW
        return Pose.NONE, 0.0
