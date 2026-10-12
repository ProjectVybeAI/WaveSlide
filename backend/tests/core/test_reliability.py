"""The reliability state machine, driven by hand-written signals with explicit timestamps."""

from app.contract.common import Action, EngineState, Gesture, Pose
from app.contract.settings import Settings
from app.core.reliability import Reliability, Signals, Step

FRAME = 1 / 30


class Clock:
    """Feeds one constant observation to the machine for some seconds and collects what happens."""

    def __init__(self, settings: Settings | None = None, active: bool = True):
        self.machine = Reliability(settings or Settings(), active)
        self.t = 0.0
        self.fired: list[tuple[float, Action, int | None]] = []
        self.cancelled: list[tuple[float, str]] = []
        self.last: Step | None = None

    def show(self, pose: Pose, seconds: float, speed: float = 0.1, slide=None, swipe=None, hand=True) -> None:
        for _ in range(max(1, round(seconds / FRAME))):
            self.t += FRAME
            step = self.machine.update(Signals(self.t, hand, pose, slide, speed, swipe))
            swipe = None  # a swipe is a single event
            self.last = step
            self.fired += [(self.t, i.action, i.slide) for i in step.fired]
            self.cancelled += [(self.t, c.reason) for c in step.cancelled]

    def swipe(self, gesture: Gesture) -> None:
        self.show(Pose.NONE, FRAME, speed=5.0, swipe=gesture)

    def actions(self) -> list[Action]:
        return [action for _, action, _ in self.fired]


def test_a_held_pose_fires_when_the_ring_is_full():
    clock = Clock()
    clock.show(Pose.COUNT_3, 0.9)
    assert clock.fired == []
    assert 0.8 < clock.last.hold.progress < 1.0 and clock.last.state == EngineState.HOLDING
    clock.show(Pose.COUNT_3, 0.2)
    assert clock.fired == [(clock.fired[0][0], Action.JUMP, 3)]
    assert clock.last.state == EngineState.COOLDOWN


def test_the_ring_shows_its_target_and_fills_with_time():
    clock = Clock()
    clock.show(Pose.COUNT_3, 0.5)
    hold = clock.last.hold
    assert (hold.label, hold.caption, hold.hold_ms) == ("3", "Slide", 1000)
    assert 0.45 < hold.progress < 0.6


def test_palm_uses_its_own_shorter_hold_time():
    clock = Clock()
    clock.show(Pose.OPEN_PALM, 0.9)
    assert clock.actions() == [Action.BLANK_TOGGLE]


def test_hold_is_cancelled_by_a_pose_change():
    clock = Clock()
    clock.show(Pose.COUNT_3, 0.5)
    clock.show(Pose.FIST, 0.4)  # the pose changed and stayed changed
    assert [reason for _, reason in clock.cancelled] == ["pose_changed"]
    assert clock.last.hold is None or clock.last.hold.action == Action.START_SHOW  # a new hold may begin
    assert clock.fired == []


def test_a_pose_flicker_under_150_ms_does_not_cancel_the_hold():
    clock = Clock()
    clock.show(Pose.COUNT_3, 0.5)
    clock.show(Pose.NONE, 0.1)
    clock.show(Pose.COUNT_3, 0.6)
    assert clock.cancelled == []
    assert clock.actions() == [Action.JUMP]


def test_hold_is_cancelled_by_movement():
    clock = Clock()
    clock.show(Pose.COUNT_3, 0.5)
    clock.show(Pose.COUNT_3, FRAME, speed=1.5)  # the palm speeds up past 1 hand length per second
    assert [reason for _, reason in clock.cancelled] == ["moved"]
    clock.show(Pose.COUNT_3, 1.5, speed=1.5)  # and while it keeps moving, no hold starts
    assert clock.fired == [] and clock.last.hold is None


def test_hold_is_cancelled_when_the_hand_is_lost():
    clock = Clock()
    clock.show(Pose.COUNT_3, 0.5)
    clock.show(Pose.NONE, 0.3, hand=False)
    assert [reason for _, reason in clock.cancelled] == ["hand_lost"]


def test_a_moving_hand_never_starts_a_hold():
    clock = Clock()
    clock.show(Pose.COUNT_2, 2.0, speed=2.0)
    assert clock.fired == [] and clock.last.state == EngineState.ACTIVE


def test_swipe_fires_at_once_and_a_second_swipe_inside_800_ms_is_ignored():
    clock = Clock()
    clock.swipe(Gesture.SWIPE_RIGHT)
    assert clock.actions() == [Action.NEXT]
    clock.show(Pose.NONE, 0.7)
    clock.swipe(Gesture.SWIPE_RIGHT)  # 0.7 s later: still cooling down
    assert clock.actions() == [Action.NEXT]
    assert clock.last.state == EngineState.COOLDOWN
    clock.show(Pose.NONE, 0.2)  # the cooldown is over
    clock.swipe(Gesture.SWIPE_LEFT)
    assert clock.actions() == [Action.NEXT, Action.PREVIOUS]


def test_cooldown_ignores_held_poses_too_and_reports_the_time_left():
    clock = Clock()
    clock.swipe(Gesture.SWIPE_RIGHT)
    clock.show(Pose.COUNT_2, 0.4)
    assert clock.last.state == EngineState.COOLDOWN
    assert 350 < clock.last.cooldown_ms_left < 450
    assert clock.last.hold is None


def test_a_palm_held_for_five_seconds_blanks_once():
    clock = Clock()
    clock.show(Pose.OPEN_PALM, 5.0)
    assert clock.actions() == [Action.BLANK_TOGGLE]


def test_the_pose_must_be_released_before_it_can_fire_again():
    clock = Clock()
    clock.show(Pose.OPEN_PALM, 2.0)  # fires once, cooldown over, still held
    clock.show(Pose.NONE, 0.2)  # released
    clock.show(Pose.OPEN_PALM, 1.2)  # shown again: fires again (unblank)
    assert clock.actions() == [Action.BLANK_TOGGLE, Action.BLANK_TOGGLE]


def test_release_during_the_cooldown_counts():
    clock = Clock()
    clock.show(Pose.OPEN_PALM, 0.9)  # fires
    clock.show(Pose.NONE, 0.3)  # released inside the 800 ms cooldown
    clock.show(Pose.OPEN_PALM, 1.6)  # the cooldown ends 0.8 s after the first fire; then 0.8 s of hold
    assert clock.actions() == [Action.BLANK_TOGGLE, Action.BLANK_TOGGLE]


def test_paused_engine_emits_only_the_activation_gesture():
    clock = Clock(active=False)
    clock.show(Pose.COUNT_3, 2.0)
    clock.show(Pose.OPEN_PALM, 2.0)
    clock.show(Pose.THUMBS_DOWN, 2.0)
    clock.swipe(Gesture.SWIPE_RIGHT)
    clock.show(Pose.NONE, 1.0)
    assert clock.fired == [] and clock.last.state == EngineState.PAUSED
    clock.show(Pose.THUMBS_UP, 1.2)
    assert clock.actions() == [Action.TOGGLE_ACTIVE]
    assert clock.machine.active is True


def test_activation_shows_going_live_and_uses_the_longer_cooldown():
    clock = Clock(active=False)
    clock.show(Pose.THUMBS_UP, 0.5)
    assert (clock.last.hold.label, clock.last.hold.caption) == ("Live", "Go")
    assert clock.last.state == EngineState.HOLDING and clock.last.active is False
    clock.show(Pose.THUMBS_UP, 0.6)
    assert clock.last.state == EngineState.COOLDOWN
    assert 1400 < clock.last.cooldown_ms_left <= 1500  # activation cooldown, not 800 ms
    clock.show(Pose.NONE, 0.6)  # a swipe at 1.1 s is still inside the 1500 ms
    clock.swipe(Gesture.SWIPE_RIGHT)
    assert clock.actions() == [Action.TOGGLE_ACTIVE]
    clock.show(Pose.NONE, 1.0)  # now 2.7 s after the fire's start: past the 1500 ms
    clock.swipe(Gesture.SWIPE_RIGHT)
    assert clock.actions() == [Action.TOGGLE_ACTIVE, Action.NEXT]


def test_thumbs_up_again_pauses_the_engine():
    clock = Clock(active=True)
    clock.show(Pose.THUMBS_UP, 1.2)
    assert clock.actions() == [Action.TOGGLE_ACTIVE] and clock.machine.active is False
    clock.show(Pose.NONE, 2.0)
    assert clock.last.state == EngineState.PAUSED


def test_turned_off_features_are_ignored():
    settings = Settings()
    settings.features.blank = False
    settings.features.finger_jump = False
    clock = Clock(settings)
    clock.show(Pose.OPEN_PALM, 1.5)
    clock.show(Pose.NONE, 0.3)
    clock.show(Pose.COUNT_4, 1.5)
    assert clock.fired == []


def test_remapping_changes_the_gesture_and_its_hold_time():
    settings = Settings()
    settings.mappings.next = Gesture.FIST  # next is now a held fist, start_show a swipe
    settings.mappings.start_show = Gesture.SWIPE_RIGHT
    settings.mappings.previous = Gesture.SWIPE_LEFT
    clock = Clock(settings)
    clock.show(Pose.FIST, 1.2)
    assert clock.actions() == [Action.NEXT]
    clock.show(Pose.NONE, 0.8)  # past the cooldown
    clock.swipe(Gesture.SWIPE_RIGHT)
    assert clock.actions() == [Action.NEXT, Action.START_SHOW]


def test_two_hands_counting_together_jump_to_the_sum():
    clock = Clock()
    clock.show(Pose.COUNT_5, 1.2, slide=7)
    assert clock.fired[0][1:] == (Action.JUMP, 7)


def test_changing_the_counted_number_restarts_the_hold():
    clock = Clock()
    clock.show(Pose.COUNT_5, 0.6, slide=7)
    clock.show(Pose.COUNT_5, 0.4, slide=6)  # a hand changed: 7 became 6
    assert [reason for _, reason in clock.cancelled] == ["pose_changed"]
    assert clock.fired == []


def test_forcing_the_state_from_outside_drops_any_hold():
    clock = Clock()
    clock.show(Pose.COUNT_3, 0.5)
    clock.machine.set_active(False)
    assert clock.machine.state == EngineState.PAUSED
    clock.show(Pose.COUNT_3, 1.5)
    assert clock.fired == []
