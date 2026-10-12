"""Switching a reliability control off (what the evaluation's ablation does), and the re-arm grace."""

from app.contract.common import Action, Gesture, Pose
from app.contract.settings import Settings
from app.core.reliability import Controls, Reliability
from tests.core.test_reliability import FRAME, Clock


def clock_without(control: str) -> Clock:
    """A clock whose state machine has one reliability control switched off."""
    clock = Clock()
    clock.machine = Reliability(Settings(), True, Controls(**{control: False}))
    return clock


def test_without_hold_a_pose_fires_on_the_first_frame():
    clock = clock_without("hold")
    clock.show(Pose.COUNT_3, FRAME)
    assert clock.actions() == [Action.JUMP]


def test_with_hold_the_same_pose_does_not_fire_at_once():
    clock = Clock()
    clock.show(Pose.COUNT_3, FRAME)
    assert clock.actions() == []


def test_without_stillness_a_moving_hand_can_hold_and_fire():
    clock = clock_without("stillness")
    clock.show(Pose.COUNT_3, 1.2, speed=3.0)
    assert clock.actions() == [Action.JUMP]


def test_with_stillness_a_moving_hand_never_fires():
    clock = Clock()
    clock.show(Pose.COUNT_3, 1.2, speed=3.0)
    assert clock.actions() == []


def test_without_cooldown_a_swipe_can_follow_at_once():
    clock = clock_without("cooldown")
    clock.swipe(Gesture.SWIPE_RIGHT)
    clock.swipe(Gesture.SWIPE_RIGHT)
    assert clock.actions() == [Action.NEXT, Action.NEXT]


def test_with_cooldown_the_second_swipe_is_ignored():
    clock = Clock()
    clock.swipe(Gesture.SWIPE_RIGHT)
    clock.swipe(Gesture.SWIPE_RIGHT)
    assert clock.actions() == [Action.NEXT]


def test_without_rearm_a_held_palm_blanks_again_after_the_cooldown():
    clock = clock_without("rearm")
    clock.show(Pose.OPEN_PALM, 5.0)
    assert len(clock.actions()) > 1


def test_with_rearm_a_held_palm_blanks_once():
    clock = Clock()
    clock.show(Pose.OPEN_PALM, 5.0)
    assert clock.actions() == [Action.BLANK_TOGGLE]


def test_a_one_frame_dropout_does_not_re_arm_a_held_palm():
    clock = Clock()
    clock.show(Pose.OPEN_PALM, 1.2)
    clock.show(Pose.NONE, FRAME, hand=False)  # the detector lost the hand for one frame
    clock.show(Pose.OPEN_PALM, 3.0)
    assert clock.actions() == [Action.BLANK_TOGGLE]


def test_a_real_release_longer_than_the_grace_does_re_arm():
    clock = Clock()
    clock.show(Pose.OPEN_PALM, 1.2)
    clock.show(Pose.NONE, 0.5)
    clock.show(Pose.OPEN_PALM, 1.2)
    assert clock.actions() == [Action.BLANK_TOGGLE, Action.BLANK_TOGGLE]
