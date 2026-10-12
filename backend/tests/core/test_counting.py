"""Two-hand counting: the truth table, then the same rules through the whole pipeline."""

import itertools

import pytest

from app.contract.common import Pose
from app.contract.settings import Settings
from app.core.counting import counted_pose, two_hand_slide
from app.core.pipeline import Pipeline
from app.dataset.synthetic import PARTICIPANTS, SessionBuilder, two_hand_session
from tests.core.support import commands_of, run, to_inputs

COUNTS = [Pose.COUNT_1, Pose.COUNT_2, Pose.COUNT_3, Pose.COUNT_4, Pose.COUNT_5]


@pytest.mark.parametrize("other", COUNTS)
def test_five_plus_any_count_is_the_sum_whichever_hand_is_which(other):
    expected = 5 + COUNTS.index(other) + 1
    assert two_hand_slide(Pose.COUNT_5, other) == expected
    assert two_hand_slide(other, Pose.COUNT_5) == expected


@pytest.mark.parametrize(
    ("first", "second"),
    [
        (a, b)
        for a, b in itertools.product([*COUNTS, Pose.NONE, Pose.FIST, Pose.OPEN_PALM], repeat=2)
        if Pose.COUNT_5 not in (a, b) or not (a in COUNTS and b in COUNTS)
    ],
)
def test_every_other_combination_gives_no_jump(first, second):
    assert two_hand_slide(first, second) is None


def test_two_threes_are_no_jump_and_not_a_three():
    assert counted_pose([Pose.COUNT_3, Pose.COUNT_3]) == (Pose.NONE, None)


def test_a_count_with_a_resting_second_hand_is_no_jump():
    assert counted_pose([Pose.COUNT_3, Pose.NONE]) == (Pose.NONE, None)
    assert counted_pose([Pose.COUNT_5, Pose.NONE]) == (Pose.NONE, None)


def test_a_single_hand_counts_normally():
    assert counted_pose([Pose.COUNT_3]) == (Pose.COUNT_3, None)


def test_other_poses_pass_through_with_two_hands_in_view():
    assert counted_pose([Pose.THUMBS_UP, Pose.COUNT_5]) == (Pose.THUMBS_UP, None)
    assert counted_pose([Pose.OPEN_PALM, Pose.NONE]) == (Pose.OPEN_PALM, None)


def test_a_valid_pair_reports_count_five_with_the_sum_as_the_slide():
    assert counted_pose([Pose.COUNT_2, Pose.COUNT_5]) == (Pose.COUNT_5, 7)


def _two_hand_settings(on: bool) -> Settings:
    settings = Settings()
    settings.features.two_hand = on
    return settings


def test_replaying_synthetic_two_hand_jumps_to_slide_7_with_two_hand_on():
    _, frames = two_hand_session(seed=5)
    pipeline = Pipeline(_two_hand_settings(True), os_name="darwin")
    outputs = [pipeline.process(f) for f in to_inputs(frames)]
    assert commands_of(outputs) == [("toggle_active", None), ("jump", 7)]


def test_replaying_synthetic_two_hand_never_jumps_above_5_with_two_hand_off():
    _, frames = two_hand_session(seed=5)
    pipeline = Pipeline(_two_hand_settings(False), os_name="darwin")
    jumps = [
        slide
        for action, slide in commands_of([pipeline.process(f) for f in to_inputs(frames)])
        if action == "jump"
    ]
    assert all(slide <= 5 for slide in jumps)


def _two_hands(right: str, left: str, seconds: float = 1.6) -> SessionBuilder:
    builder = SessionBuilder(PARTICIPANTS[0], seed=41)
    builder.rest(0.5)
    builder.two_hands(right, left, seconds, label="COUNT_7")
    builder.rest(0.5)
    return builder


def test_two_hand_on_two_threes_cause_no_command():
    builder = _two_hands("COUNT_3", "COUNT_3")
    settings = _two_hand_settings(True)
    settings.start_paused = False
    assert commands_of(run(Pipeline(settings, os_name="darwin"), builder)) == []


def test_two_hand_on_a_count_with_the_other_hand_at_rest_causes_no_command():
    builder = _two_hands("COUNT_4", "NONE")
    settings = _two_hand_settings(True)
    settings.start_paused = False
    assert commands_of(run(Pipeline(settings, os_name="darwin"), builder)) == []


def test_two_hand_on_a_single_hand_in_view_still_jumps_normally():
    builder = SessionBuilder(PARTICIPANTS[0], seed=42)
    builder.rest(0.5)
    builder.hold("COUNT_4", 1.6)
    builder.rest(0.5)
    settings = _two_hand_settings(True)
    settings.start_paused = False
    assert commands_of(run(Pipeline(settings, os_name="darwin"), builder)) == [("jump", 4)]


def test_two_hand_count_needs_both_hands_still():
    # The second hand waves about: the fastest hand sets the speed, so no hold may start.
    builder = SessionBuilder(PARTICIPANTS[0], seed=43)
    builder.rest(0.5)
    for _ in range(48):
        builder._drift(0.4)
        right = builder._hand("COUNT_5", centre=builder.centre + [70.0, 0.0])
        wave = float(builder.rng.normal(0, 40))
        left = builder._hand("COUNT_2", left=True, centre=builder.centre - [150.0 + wave, 0.0])
        builder._emit([right, left])
    settings = _two_hand_settings(True)
    settings.start_paused = False
    assert commands_of(run(Pipeline(settings, os_name="darwin"), builder)) == []
