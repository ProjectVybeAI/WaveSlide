"""Choosing and following hands (ARCHITECTURE.md step 2).

The presenter's hand is the one with the largest bounding box (closest to the camera).
Two-hand mode keeps the two largest. A Track follows one physical hand from frame to
frame so that its smoothing filter and pose stabiliser keep their history.
"""

from dataclasses import dataclass, field

import numpy as np

from app.core.one_euro import OneEuroFilter
from app.core.poses import PoseStabiliser
from app.core.swipe import PalmMotion
from app.core.types import Hand

MAX_STEP = 0.35  # a hand moves less than this (image heights) between frames; further is another hand
MAX_LOST_S = 0.3  # a track unseen for this long is forgotten


@dataclass
class Track:
    id: int
    filter: OneEuroFilter
    stabiliser: PoseStabiliser = field(default_factory=PoseStabiliser)
    motion: PalmMotion = field(default_factory=PalmMotion)
    wrist: np.ndarray = field(default_factory=lambda: np.zeros(2))
    last_seen: float = 0.0


def bounding_box_area(points: np.ndarray) -> float:
    width, height = points[:, :2].max(axis=0) - points[:, :2].min(axis=0)
    return float(width * height)


def largest_hands(hands: list[Hand], count: int) -> list[Hand]:
    """The `count` hands with the biggest bounding box, biggest first."""
    return sorted(hands, key=lambda h: bounding_box_area(h.points), reverse=True)[:count]


class HandTracker:
    def __init__(self, min_cutoff: float):
        self.min_cutoff = min_cutoff
        self._tracks: list[Track] = []
        self._next_id = 1

    def set_smoothing(self, min_cutoff: float) -> None:
        self.min_cutoff = min_cutoff
        for track in self._tracks:
            track.filter.min_cutoff = min_cutoff

    def update(self, hands: list[Hand], t: float) -> list[tuple[Track, Hand]]:
        """Match each hand to the nearest known track (by wrist) or start a new one."""
        self._tracks = [tr for tr in self._tracks if t - tr.last_seen <= MAX_LOST_S]
        pairs = sorted(
            (float(np.hypot(*(hand.points[0, :2] - track.wrist))), i, j)
            for i, hand in enumerate(hands)
            for j, track in enumerate(self._tracks)
        )
        matched: dict[int, Track] = {}
        used: set[int] = set()
        for distance, i, j in pairs:
            if distance <= MAX_STEP and i not in matched and j not in used:
                matched[i] = self._tracks[j]
                used.add(j)
        result = []
        for i, hand in enumerate(hands):
            track = matched.get(i) or self._new_track()
            track.wrist = hand.points[0, :2].copy()
            track.last_seen = t
            result.append((track, hand))
        return result

    def _new_track(self) -> Track:
        track = Track(self._next_id, OneEuroFilter(self.min_cutoff))
        self._next_id += 1
        self._tracks.append(track)
        return track
