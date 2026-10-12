"""The whole pipeline on synthetic hands: landmarks in, pose, hold, commands out."""

import numpy as np

from app.contract.common import Action, EngineState
from app.contract.settings import Settings
from app.core.pipeline import Pipeline
from app.dataset.synthetic import SessionBuilder, two_hand_session
from tests.core.support import P1, commands_of, live_settings, run, sweep, to_inputs


def test_paused_engine_emits_only_activation():
    builder = SessionBuilder(P1, seed=21)
    builder.rest(0.5)
    builder.hold("COUNT_3", 1.6)
    builder.rest(0.5)
    builder.hold("OPEN_PALM", 1.6)
    builder.rest(0.5)
    builder.swipe(+1)
    builder.rest(0.5)
    builder.hold("THUMBS_DOWN", 1.6)
    builder.rest(0.5)
    outputs = run(Pipeline(Settings(), os_name="darwin"), builder)
    assert commands_of(outputs) == []
    assert {out.state for out in outputs} <= {EngineState.PAUSED, EngineState.HOLDING}

    builder.hold("THUMBS_UP", 1.6)  # only the activation pose does anything
    pipeline = Pipeline(Settings(), os_name="darwin")
    outputs = run(pipeline, builder)
    assert commands_of(outputs) == [("toggle_active", None)]
    assert pipeline.active


def test_the_dial_fills_while_the_hand_holds_still_and_names_its_target():
    builder = SessionBuilder(P1, seed=22)
    builder.rest(0.5)
    builder.hold("COUNT_4", 0.8)
    outputs = run(Pipeline(live_settings(), os_name="darwin"), builder)
    hold = outputs[-1].hold
    assert hold is not None and hold.action == Action.JUMP
    assert (hold.label, hold.caption) == ("4", "Slide")
    assert 0.3 < hold.progress < 0.9
    assert outputs[-1].state == EngineState.HOLDING


def test_pose_change_during_a_hold_cancels_it_and_sends_nothing():
    builder = SessionBuilder(P1, seed=23)
    builder.rest(0.5)
    builder.hold("COUNT_3", 0.6)
    builder.hold("COUNT_2", 0.5)  # a different number: the hold for 3 must not complete as 3
    builder.rest(0.5)
    outputs = run(Pipeline(live_settings(), os_name="darwin"), builder)
    assert ("jump", 3) not in commands_of(outputs)
    reasons = [c.reason for out in outputs for c in out.cancelled]
    assert "pose_changed" in reasons


def test_moving_the_hand_during_a_hold_cancels_it():
    builder = SessionBuilder(P1, seed=24)
    builder.rest(0.5)
    builder.hold("COUNT_3", 0.5)
    y0 = float(builder.centre[1])
    for i in range(12):  # 0.4 s of steady vertical movement: about 1.3 hand lengths in 0.2 s
        centre = np.array([builder.centre[0], y0 + 6.0 * (i + 1) * builder.size / 62])
        builder._emit([builder._hand("COUNT_3", centre=centre)])
    builder.rest(0.3)
    outputs = run(Pipeline(live_settings(), os_name="darwin"), builder)
    reasons = [c.reason for out in outputs for c in out.cancelled]
    assert "moved" in reasons
    assert commands_of(outputs) == []


def test_losing_the_hand_cancels_the_hold():
    builder = SessionBuilder(P1, seed=25)
    builder.hold("COUNT_3", 0.6)
    builder.gap(0.6)
    outputs = run(Pipeline(live_settings(), os_name="darwin"), builder)
    assert [c.reason for out in outputs for c in out.cancelled] == ["hand_lost"]


def test_palm_held_for_five_seconds_blanks_once():
    builder = SessionBuilder(P1, seed=26)
    builder.rest(0.5)
    builder.hold("OPEN_PALM", 5.0)
    builder.rest(0.5)
    outputs = run(Pipeline(live_settings(), os_name="darwin"), builder)
    assert commands_of(outputs) == [("blank_toggle", None)]


def test_second_swipe_inside_800_ms_is_ignored_but_a_later_one_counts():
    builder = SessionBuilder(P1, seed=27)
    builder.hold("OPEN_PALM", 0.3)
    sweep(builder, +1, 3.0)
    builder.hold("OPEN_PALM", 0.2)
    sweep(builder, -1, 3.0)  # 0.5 s after the first
    builder.rest(1.2)
    sweep(builder, -1, 3.0)  # well after the cooldown
    builder.rest(0.5)
    outputs = run(Pipeline(live_settings(), os_name="darwin"), builder)
    assert commands_of(outputs) == [("next", None), ("previous", None)]


def test_two_hands_counting_together_jump_to_the_sum_when_the_feature_is_on():
    header, frames = two_hand_session(seed=5)
    settings = Settings()
    settings.features.two_hand = True
    pipeline = Pipeline(settings, os_name="darwin")
    outputs = [pipeline.process(f) for f in to_inputs(frames)]
    assert commands_of(outputs) == [("toggle_active", None), ("jump", 7)]


def test_two_hands_are_ignored_when_the_feature_is_off():
    header, frames = two_hand_session(seed=5)
    pipeline = Pipeline(Settings(), os_name="darwin")
    outputs = [pipeline.process(f) for f in to_inputs(frames)]
    commands = commands_of(outputs)
    assert commands[0] == ("toggle_active", None)
    assert ("jump", 7) not in commands


def test_the_largest_hand_is_the_presenter():
    # Two hands in view: only the closer (bigger) one controls the slides.
    builder = SessionBuilder(P1, seed=28)
    near, far = builder.size, builder.size / 2
    for _ in range(60):
        builder._drift(0.4)
        builder.size = near
        big = builder._hand("COUNT_2", centre=builder.centre)
        builder.size = far
        small = builder._hand("FIST", centre=builder.centre - np.array([150.0, 0.0]))
        builder._emit([small, big])  # the small hand comes first in the list
    outputs = run(Pipeline(live_settings(), os_name="darwin"), builder)
    assert commands_of(outputs) == [("jump", 2)]


def test_changing_the_profile_changes_the_keys_without_restarting():
    builder = SessionBuilder(P1, seed=29)
    builder.hold("OPEN_PALM", 0.3)
    sweep(builder, +1, 3.0)
    builder.rest(0.5)
    pipeline = Pipeline(live_settings(), os_name="win32")
    frames = to_inputs(builder.frames)
    first = [c.keys for f in frames for c in pipeline.process(f).commands]
    assert first == [["right"]]
    settings = live_settings()
    settings.profile_id = "pdf_viewer"
    pipeline.update_settings(settings)
    assert pipeline.profile.id == "pdf_viewer"
