"""Swipe boundaries, in hand lengths (s): 2.0 s of travel in 500 ms, mostly horizontal, fast."""

import numpy as np
import pytest

from app.core.pipeline import Pipeline
from app.core.swipe import PalmMotion
from app.dataset.synthetic import SessionBuilder
from tests.core.support import P1, P2, P3, commands_of, diagonal_swipe, live_settings, park, run, sweep


def _commands_after_swipe(person, seed, distance_m=1.0, **swipe) -> list[tuple[str, int | None]]:
    builder = SessionBuilder(person, seed, distance_m)
    park(builder, swipe["direction"], swipe["travel_lengths"])
    builder.hold("OPEN_PALM", 0.5)  # a steady hand, so the 5% margin is not eaten by wandering
    sweep(builder, **swipe)
    builder.rest(1.0)
    return commands_of(run(Pipeline(live_settings(), os_name="darwin"), builder))


@pytest.mark.parametrize("person", [P1, P2, P3], ids=lambda p: p.name)
def test_swipe_of_1_9_hand_lengths_is_rejected(person):
    assert _commands_after_swipe(person, 11, direction=+1, travel_lengths=1.9) == []


@pytest.mark.parametrize("person", [P1, P2, P3], ids=lambda p: p.name)
def test_swipe_of_2_1_hand_lengths_is_accepted(person):
    assert _commands_after_swipe(person, 11, direction=+1, travel_lengths=2.1) == [("next", None)]


def test_swipe_left_goes_to_the_previous_slide():
    assert _commands_after_swipe(P1, 12, direction=-1, travel_lengths=3.0) == [("previous", None)]


@pytest.mark.parametrize("distance_m", [0.5, 2.0])
def test_the_same_swipe_counts_at_half_a_metre_and_at_two_metres(distance_m):
    assert _commands_after_swipe(P1, 13, distance_m, direction=+1, travel_lengths=2.1) == [("next", None)]
    assert _commands_after_swipe(P1, 13, distance_m, direction=+1, travel_lengths=1.9) == []


def test_diagonal_swipe_is_rejected():
    builder = SessionBuilder(P1, seed=14)
    builder.rest(1.0)
    diagonal_swipe(builder, travel_lengths=3.0)
    builder.rest(1.0)
    assert commands_of(run(Pipeline(live_settings(), os_name="darwin"), builder)) == []


def test_slow_arm_movement_is_rejected_even_when_it_travels_far():
    # 3 hand lengths in 2 s: far enough, but nowhere near the 500 ms limit
    assert _commands_after_swipe(P1, 15, direction=+1, travel_lengths=3.0, duration_s=2.0) == []


def test_travel_threshold_follows_the_sensitivity_setting():
    settings = live_settings()
    settings.sensitivity.swipe_min_travel = 1.5
    builder = SessionBuilder(P1, seed=16)
    park(builder, +1, 1.9)
    builder.hold("OPEN_PALM", 0.5)
    sweep(builder, +1, travel_lengths=1.9)
    builder.rest(1.0)
    outputs = run(Pipeline(settings, os_name="darwin"), builder)
    assert commands_of(outputs) == [("next", None)]


def test_the_generators_own_swipe_with_its_snap_back_is_accepted_too():
    builder = SessionBuilder(P1, seed=17)
    builder.rest(1.0)
    builder.swipe(+1, travel_lengths=3.0)
    builder.rest(1.0)
    assert commands_of(run(Pipeline(live_settings(), os_name="darwin"), builder)) == [("next", None)]


def test_palm_speed_ignores_old_samples_when_the_clock_restarts():
    """Switching source restarts the time base near 0: a still hand must not read as fast."""
    motion = PalmMotion()
    for t, x in [(100.0, 0.30), (100.03, 0.30)]:
        motion.push(t, np.array([x, 0.5]), 0.2, 0.5)
    motion.push(0.0, np.array([0.70, 0.5]), 0.2, 0.5)  # far away, and time went backwards
    motion.push(0.03, np.array([0.70, 0.5]), 0.2, 0.5)
    assert motion.speed() < 0.1
