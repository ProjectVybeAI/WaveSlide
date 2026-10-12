"""One Euro filter (Casiez et al. 2012): an exponential moving average whose cut-off rises with speed.

A still hand is smoothed hard (no jitter); a fast swipe raises the cut-off so it is not
delayed. It works on a whole (21, 3) landmark array at once, one cut-off per coordinate.
"""

import math

import numpy as np

# Tuned on swipes: a swipe lasts about 9 frames, so the speed estimate must react within a
# few frames (high derivative cut-off) and the cut-off must rise steeply with it (high beta),
# otherwise the filter eats a tenth of the travel. A still hand is still smoothed hard.
BETA = 50.0  # how fast the cut-off rises with speed (coordinates are in image heights)
DERIVATIVE_CUTOFF = 10.0  # Hz, smooths the speed estimate itself


def _alpha(cutoff: np.ndarray | float, dt: float) -> np.ndarray | float:
    """Smoothing factor for a low-pass filter with this cut-off frequency at this frame interval."""
    tau = 1.0 / (2 * math.pi * cutoff)
    return 1.0 / (1.0 + tau / dt)


class OneEuroFilter:
    def __init__(self, min_cutoff: float = 1.0, beta: float = BETA):
        self.min_cutoff = min_cutoff
        self.beta = beta
        self._t: float | None = None
        self._x = np.zeros(0)
        self._dx = np.zeros(0)

    def reset(self) -> None:
        self._t = None

    def __call__(self, x: np.ndarray, t: float) -> np.ndarray:
        """Filter one sample taken at time t (seconds). Timestamps must increase."""
        if self._t is None or t <= self._t or x.shape != self._x.shape:
            self._t, self._x, self._dx = t, x.copy(), np.zeros_like(x)
            return x.copy()
        dt = t - self._t
        raw_speed = (x - self._x) / dt
        self._dx = self._dx + _alpha(DERIVATIVE_CUTOFF, dt) * (raw_speed - self._dx)
        cutoff = self.min_cutoff + self.beta * np.abs(self._dx)
        self._x = self._x + _alpha(cutoff, dt) * (x - self._x)
        self._t = t
        return self._x.copy()
