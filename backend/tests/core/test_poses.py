"""Every pose is recognised on synthetic hands from three different "participants"."""

import numpy as np
import pytest

from app.contract.common import Pose
from app.core.one_euro import OneEuroFilter
from app.core.pipeline import Pipeline
from app.core.poses import PoseStabiliser
from app.dataset.synthetic import SessionBuilder
from tests.core.support import P1, P2, P3, live_settings, run

POSES = [p for p in Pose if p != Pose.NONE]


def _share_recognised(pose: Pose, person, left: bool) -> float:
    builder = SessionBuilder(person, seed=7)
    for _ in range(75):
        builder._drift(0.4)
        builder._emit([builder._hand(pose.value, left=left)])
    outputs = run(Pipeline(live_settings(), os_name="darwin"), builder)
    settled = outputs[20:]  # the stabiliser and the filter need a few frames
    return sum(out.pose == pose for out in settled) / len(settled)


@pytest.mark.parametrize("person", [P1, P2, P3], ids=lambda p: p.name)
@pytest.mark.parametrize("pose", POSES, ids=lambda p: p.value)
def test_every_pose_is_recognised_for_each_participant(pose, person):
    assert _share_recognised(pose, person, left=False) >= 0.95


@pytest.mark.parametrize("pose", POSES, ids=lambda p: p.value)
def test_left_hands_are_mirrored_to_look_like_right_hands(pose):
    assert _share_recognised(pose, P1, left=True) >= 0.95


def test_a_relaxed_hand_is_not_a_pose():
    builder = SessionBuilder(P1, seed=3)
    builder.rest(2.5)
    outputs = run(Pipeline(live_settings(), os_name="darwin"), builder)
    assert sum(out.pose == Pose.NONE for out in outputs[20:]) / len(outputs[20:]) >= 0.9


def test_no_hand_reports_pose_none_and_no_extended_fingers():
    builder = SessionBuilder(P1, seed=3)
    builder.gap(0.5)
    out = run(Pipeline(live_settings(), os_name="darwin"), builder)[-1]
    assert out.pose == Pose.NONE
    assert out.extended is None


def test_pose_is_recognised_at_two_metres():
    builder = SessionBuilder(P2, seed=5, distance_m=2.0)
    builder.hold("COUNT_3", 2.0)
    outputs = run(Pipeline(live_settings(), os_name="darwin"), builder)
    assert sum(out.pose == Pose.COUNT_3 for out in outputs[20:]) / len(outputs[20:]) >= 0.9


def test_palm_and_five_are_separated_by_finger_spread():
    # Same five extended fingers: together is the palm ("stop"), fanned out is the number 5.
    assert _share_recognised(Pose.OPEN_PALM, P3, left=False) >= 0.95
    assert _share_recognised(Pose.COUNT_5, P3, left=False) >= 0.95


def test_stabiliser_needs_four_of_the_last_five_frames():
    stabiliser = PoseStabiliser()
    results = [stabiliser.push(p)[0] for p in [Pose.FIST] * 3]
    assert results == [Pose.NONE, Pose.NONE, Pose.NONE]  # three frames agree: not yet
    assert stabiliser.push(Pose.FIST)[0] == Pose.FIST  # the fourth makes it stable
    assert stabiliser.push(Pose.COUNT_2)[0] == Pose.FIST  # one odd frame changes nothing
    assert stabiliser.push(Pose.COUNT_2)[0] == Pose.NONE  # two in five: not sure any more


def test_one_euro_filter_smooths_a_still_hand_but_follows_a_fast_one():
    rng = np.random.default_rng(0)
    noise = 0.0025  # about 1.2 px of landmark jitter on a 480 px high image, in image heights
    still = OneEuroFilter(min_cutoff=1.0)
    outputs = [still(np.array([0.5]) + rng.normal(0, noise, 1), i / 30)[0] for i in range(300)]
    assert np.std(outputs[30:]) < 0.75 * noise  # the jitter shrinks

    fast = OneEuroFilter(min_cutoff=1.0)
    fast(np.array([0.0]), 0.0)
    for i in range(1, 10):  # moves 0.05 per frame: 1.5 image heights per second, a swipe
        value = fast(np.array([0.05 * i]), i / 30)[0]
    assert 0.45 - value < 0.03  # lags by less than a frame of motion
