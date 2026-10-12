"""Test helpers: turn synthetic sessions into pipeline frames and collect what comes out."""

from contextlib import contextmanager

import numpy as np

from app.contract.settings import Settings
from app.core.pipeline import Pipeline, PipelineOutput
from app.core.types import FrameInput, Hand
from app.dataset import synthetic
from app.dataset.synthetic import PARTICIPANTS, PoseTemplate, SessionBuilder

P1, P2, P3 = PARTICIPANTS


@contextmanager
def fingers_together():
    """Synthetic OPEN_PALM with the fingers pulled together (spread about 0.3, under the 0.45 limit).

    The committed generator pulls them together by only -0.12, which gives a spread of 0.41-0.59:
    straddling the threshold. See "Integration requests" in the Phase 1 backend report.
    """
    original = synthetic.TEMPLATES["OPEN_PALM"]
    synthetic.TEMPLATES["OPEN_PALM"] = PoseTemplate((0.0,) * 5, -0.30)
    try:
        yield
    finally:
        synthetic.TEMPLATES["OPEN_PALM"] = original


def live_settings(**changes) -> Settings:
    """Default settings, but already active (not paused), so tests can start with gestures."""
    settings = Settings(start_paused=False)
    for name, value in changes.items():
        setattr(settings, name, value)
    return settings


def to_inputs(frames) -> list[FrameInput]:
    """SessionFrames to pipeline input, with explicit session timestamps."""
    return [
        FrameInput(
            t=f.t,
            captured_at=0.0,
            hands=[Hand(h.handedness, h.score, np.asarray(h.landmarks, dtype=float)) for h in f.hands],
        )
        for f in frames
    ]


def run(pipeline: Pipeline, builder: SessionBuilder) -> list[PipelineOutput]:
    return [pipeline.process(frame) for frame in to_inputs(builder.frames)]


def commands_of(outputs: list[PipelineOutput]) -> list[tuple[str, int | None]]:
    """(action, slide) of every command, in order."""
    return [(c.action.value, c.slide) for out in outputs for c in out.commands]


def diagonal_swipe(builder: SessionBuilder, travel_lengths: float = 3.0, duration_s: float = 0.3) -> None:
    """Palm moves as far up as it moves sideways (45 degrees): not a swipe."""
    n = int(duration_s * synthetic.FPS)
    x0, y0 = float(builder.centre[0]), float(builder.centre[1])
    travel = travel_lengths * builder.size
    for i in range(n):
        phase = 0.5 - 0.5 * np.cos(np.pi * i / (n - 1))
        centre = np.array([x0 + travel * (phase - 0.5), y0 - travel * (phase - 0.5)])
        builder._emit([builder._hand("OPEN_PALM", centre=centre)])


def park(builder: SessionBuilder, direction: int, travel_lengths: float) -> None:
    """Move the resting hand so a following sweep is centred on the image and stays inside it."""
    builder.centre[0] = 320.0 - direction * travel_lengths * builder.size / 2


def sweep(builder: SessionBuilder, direction: int, travel_lengths: float, duration_s: float = 0.3) -> None:
    """A swipe from where the hand rests, ending where the arm stops. (The generator's own swipe()
    teleports the hand half a swipe before and after the motion, which no arm does.)"""
    n = max(2, int(duration_s * synthetic.FPS))
    x_start = float(builder.centre[0])
    travel = direction * travel_lengths * builder.size
    for i in range(n):
        phase = 0.5 - 0.5 * np.cos(np.pi * i / (n - 1))
        centre = np.array([x_start + travel * phase, builder.centre[1] + builder.rng.normal(0, 2)])
        builder._emit([builder._hand("OPEN_PALM", centre=centre)])
    builder.centre[0] = x_start + travel
