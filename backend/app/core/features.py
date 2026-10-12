"""Features that ignore distance and tilt (ARCHITECTURE.md step 3).

Input is one hand as a (21, 3) array in image-height units (x already multiplied by the
image aspect ratio). Output: the scale `s`, the hand re-centred on the wrist, divided by
`s`, rolled so the wrist-to-knuckle line points up and mirrored to look like a right hand,
plus which fingers are extended, the finger spread and the thumb direction.

MediaPipe landmark order: 0 wrist; thumb 1-4; index 5-8; middle 9-12; ring 13-16; little 17-20.
"""

from dataclasses import dataclass

import numpy as np

FEATURE_VERSION = 1  # bump when the numbers below change, so an old trained model is not loaded

WRIST, MIDDLE_KNUCKLE = 0, 9
KNUCKLES = (5, 9, 13, 17)
FINGERS = ((5, 6, 7, 8), (9, 10, 11, 12), (13, 14, 15, 16), (17, 18, 19, 20))  # index to little
FINGERTIPS = (8, 12, 16, 20)
PALM_POINTS = (0, 5, 9, 13, 17)

MAX_BEND_DEG = 35.0  # a finger counts as straight when its middle joint bends less than this
THUMB_MIN_REACH = 0.40  # a folded thumb lies on the palm: its tip is closer than this to a knuckle
MIN_SCALE = 1e-4  # a hand smaller than this (in image heights) is noise, not a hand


@dataclass
class HandFeatures:
    scale: float  # s: wrist to middle knuckle, in image heights
    points: np.ndarray  # (21, 2) normalised: wrist at the origin, units of s, rolled, right-hand look
    extended: list[bool]  # thumb, index, middle, ring, little
    bends: list[float]  # degrees at each finger's middle joint (thumb: IP joint)
    spread: float  # mean gap between neighbouring fingertips, in units of s
    thumb_from_up: float  # degrees between the thumb and straight up in the image: 0 up, 180 down
    palm: np.ndarray  # palm centre (x, y), in image heights, for the swipe detector

    def vector(self) -> np.ndarray:
        """Fixed-length vector for the random forest (49 numbers): 42 normalised coordinates,
        5 joint angles, spread and thumb direction. The thumb direction is what tells thumbs-up
        from thumbs-down, because the roll normalisation has turned both hands upright."""
        return np.concatenate([self.points.ravel(), self.bends, [self.spread, self.thumb_from_up]])


def _bend_degrees(a: np.ndarray, b: np.ndarray, c: np.ndarray) -> float:
    """Angle by which the path a -> b -> c turns at b: 0 is a straight line."""
    u, v = b - a, c - b
    denominator = np.linalg.norm(u) * np.linalg.norm(v)
    if denominator < 1e-9:
        return 180.0
    return float(np.degrees(np.arccos(np.clip(np.dot(u, v) / denominator, -1.0, 1.0))))


def compute_features(points: np.ndarray, handedness: str) -> HandFeatures | None:
    """All features for one hand, or None if the hand is degenerate (all points together)."""
    wrist = points[WRIST, :2]
    raw_up = points[MIDDLE_KNUCKLE, :2] - wrist
    scale = float(np.hypot(*raw_up))
    if scale < MIN_SCALE:
        return None

    rel = (points - points[WRIST]) / scale  # 3D, wrist at the origin, units of s
    thumb_vector = points[4, :2] - points[2, :2]
    thumb_from_up = float(abs(np.degrees(np.arctan2(thumb_vector[0], -thumb_vector[1]))))

    if handedness == "Left":
        rel[:, 0] = -rel[:, 0]  # a left hand looks like a mirrored right hand
    up = rel[MIDDLE_KNUCKLE, :2] / np.hypot(*rel[MIDDLE_KNUCKLE, :2])
    cos_roll, sin_roll = -up[1], -up[0]  # the rotation that turns `up` into (0, -1)
    rotation = np.array([[cos_roll, -sin_roll], [sin_roll, cos_roll]])
    flat = rel[:, :2] @ rotation.T

    extended, bends = [], []
    reach = np.linalg.norm(flat, axis=1)  # distance from the wrist
    thumb_bend = _bend_degrees(rel[2], rel[3], rel[4])
    nearest_knuckle = min(np.linalg.norm(flat[4] - flat[k]) for k in KNUCKLES)
    extended.append(thumb_bend < MAX_BEND_DEG and nearest_knuckle > THUMB_MIN_REACH)
    bends.append(thumb_bend)
    for mcp, pip, dip, tip in FINGERS:
        bend = _bend_degrees(rel[mcp], rel[pip], rel[dip])
        extended.append(bend < MAX_BEND_DEG and reach[tip] > reach[pip])
        bends.append(bend)

    tips = flat[list(FINGERTIPS)]
    spread = float(np.mean(np.linalg.norm(np.diff(tips, axis=0), axis=1)))
    palm = points[list(PALM_POINTS), :2].mean(axis=0)
    return HandFeatures(scale, flat, extended, bends, spread, thumb_from_up, palm)
