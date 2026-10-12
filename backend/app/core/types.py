"""Plain data passed through the pipeline. No framework imports here."""

from dataclasses import dataclass, field

import numpy as np


@dataclass
class Hand:
    handedness: str  # "Left" or "Right", as MediaPipe reports it on the mirrored image
    score: float
    points: np.ndarray  # shape (21, 3): x, y in 0..1 of the image, z relative depth


@dataclass
class FrameInput:
    """One frame from any landmark source (camera or replay)."""

    t: float  # seconds, monotonic within the source
    captured_at: float  # time.perf_counter() when the frame was captured, for latency
    hands: list[Hand] = field(default_factory=list)
