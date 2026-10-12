"""Palm motion: swipe detection and palm speed (ARCHITECTURE.md step 5).

The palm centre is kept for the last 0.5 s. Movement is measured in units of the hand
length `s`, so the same physical swipe counts at 0.5 m and at 2 m. Only the *movement* is
divided by `s` (never the absolute position, which would turn small changes in `s` into
fake movement).
"""

from collections import deque

import numpy as np

from app.contract.common import Gesture
from app.contract.settings import Sensitivity

SPEED_WINDOW_S = 0.2  # palm speed = net movement over this long
MAX_GAP_S = 0.25  # a longer pause between samples means the hand was lost: start again
MAX_DRIFT_RATIO = 0.5  # vertical drift may be at most half of the horizontal travel
MIN_HISTORY_S = 0.5  # the buffer always keeps at least this much

Sample = tuple[float, float, float]  # t, x, y (image heights)


class PalmMotion:
    def __init__(self) -> None:
        self._samples: deque[Sample] = deque()
        self._scales: deque[float] = deque()  # hand length per sample, image heights
        self._scale = 1.0  # their median: one frame's hand length is too noisy (about 3%)

    def reset(self) -> None:
        self._samples.clear()
        self._scales.clear()

    def push(self, t: float, palm: np.ndarray, scale: float, history_s: float) -> None:
        """Add the palm centre (image heights) of one frame; `scale` is the hand length."""
        if self._samples and t - self._samples[-1][0] > MAX_GAP_S:
            self.reset()
        self._samples.append((t, float(palm[0]), float(palm[1])))
        self._scales.append(scale)
        keep_from = t - max(history_s, MIN_HISTORY_S)
        while self._samples[0][0] < keep_from:
            self._samples.popleft()
            self._scales.popleft()
        self._scale = float(np.median(self._scales))

    def speed(self) -> float:
        """Palm speed in hand lengths per second: how far the hand got from here in the last 0.2 s.

        The farthest earlier position counts (not just the oldest one), so a hand that went out
        and came back, like a wave, still reads as moving.
        """
        if not self._samples:
            return 0.0
        t_now, x_now, y_now = self._samples[-1]
        reach = max(
            (np.hypot(x_now - x, y_now - y) for t, x, y in self._samples if t_now - t <= SPEED_WINDOW_S),
            default=0.0,
        )
        return float(reach / self._scale / SPEED_WINDOW_S)

    def swipe(self, sensitivity: Sensitivity) -> Gesture | None:
        """A swipe: enough horizontal travel, fast enough, within the time limit, not diagonal."""
        if not self._samples:
            return None
        window = sensitivity.swipe_max_ms / 1000
        t_now, x_now, y_now = self._samples[-1]
        recent = [s for s in self._samples if t_now - s[0] <= window]
        if len(recent) < 3:
            return None
        # Start the swipe where the hand was furthest from where it is now.
        t0, x0, y0 = max(recent, key=lambda s: abs(x_now - s[1]))
        travel = (x_now - x0) / self._scale
        if abs(travel) < sensitivity.swipe_min_travel:
            return None
        if abs(y_now - y0) / self._scale > MAX_DRIFT_RATIO * abs(travel):
            return None
        if self._peak_speed(recent, t0) < sensitivity.swipe_min_speed:
            return None
        return Gesture.SWIPE_RIGHT if travel > 0 else Gesture.SWIPE_LEFT

    def _peak_speed(self, samples: list[Sample], since: float) -> float:
        """Fastest horizontal speed over any three consecutive samples (steadier than two)."""
        span = [s for s in samples if s[0] >= since]
        peak = 0.0
        for a, c in zip(span, span[2:], strict=False):
            peak = max(peak, abs(c[1] - a[1]) / self._scale / max(c[0] - a[0], 1e-6))
        return peak
