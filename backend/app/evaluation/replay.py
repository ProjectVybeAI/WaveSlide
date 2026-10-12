"""Replay one labelled session through the real pipeline and score it.

Event scoring rule (ARCHITECTURE.md step 7): a labelled segment is correct when exactly the
mapped command fires between its start and 0.5 s after its end. A missing command, a wrong
one or an extra one all make the segment wrong.

The pipeline runs as fast as possible (no waiting for the clock), keys go to a RecordingSender,
and before each labelled segment the engine is switched on, as the presenter would have it.
"""

from dataclasses import dataclass, field
from pathlib import Path

from app.contract.common import Gesture, Pose
from app.contract.sessions import SessionHeader, SessionLabel
from app.contract.settings import Settings
from app.core.intents import pose_intent, swipe_intent
from app.core.pipeline import Pipeline, PoseClassifier
from app.core.reliability import Controls
from app.dataset.store import iter_inputs, read_header
from app.engine.command_log import CommandLog
from app.engine.dispatcher import Dispatcher
from app.keys.sender import RecordingSender

GRACE_AFTER_SEGMENT_S = 0.5
PROFILE = "powerpoint"
Expected = tuple[str, int | None]  # (action, slide)


@dataclass
class Fired:
    t: float  # session time of the frame that fired the command
    action: str
    slide: int | None
    pipeline_ms: float  # frame handed over to key sent

    @property
    def what(self) -> Expected:
        return (self.action, self.slide)


@dataclass
class Segment:
    label: SessionLabel
    expected: Expected
    fired: list[Fired]

    @property
    def correct(self) -> bool:
        return [f.what for f in self.fired] == [self.expected]

    @property
    def recognised_slide(self) -> int | None:
        """The slide a jump went to inside this segment (None when no jump fired)."""
        return next((f.slide for f in self.fired if f.action == "jump"), None)


@dataclass
class SessionRun:
    header: SessionHeader
    segments: list[Segment] = field(default_factory=list)
    fired: list[Fired] = field(default_factory=list)  # every command of the whole session
    detection_rate: float | None = None  # share of frames inside labels that had a hand


def expected_command(settings: Settings, gesture: str) -> Expected | None:
    """The command a label's gesture should cause under these Settings (None: not a command)."""
    if gesture.startswith("COUNT_") and int(gesture.split("_")[1]) > 5:
        return ("jump", int(gesture.split("_")[1]))
    try:
        gesture_enum = Gesture(gesture)
    except ValueError:
        return None
    if gesture_enum in (Gesture.SWIPE_LEFT, Gesture.SWIPE_RIGHT):
        intent = swipe_intent(settings, gesture_enum)
    else:
        intent = pose_intent(settings, Pose(gesture))
    return (intent.action.value, intent.slide) if intent else None


def scored_labels(header: SessionHeader) -> list[SessionLabel]:
    """Labels that are commands. A two-hand session scores only its 6-10 counts."""
    labels = [label for label in header.labels if label.gesture != "TALKING"]
    if header.kind == "two_hand":
        labels = [label for label in labels if label.gesture.startswith("COUNT_")]
    return labels


def make_settings(two_hand: bool = False, start_paused: bool = False) -> Settings:
    settings = Settings(start_paused=start_paused)
    settings.features.two_hand = two_hand
    return settings


def replay_commands(
    path: Path,
    settings: Settings,
    classifier: PoseClassifier | None = None,
    controls: Controls | None = None,
    activate_at: list[float] | None = None,
) -> list[Fired]:
    """Run a session as fast as possible; every command that fires, in order.

    `activate_at` lists session times at which the engine is switched on (the presenter's state)."""
    pipeline = Pipeline(settings, os_name="darwin", classifier=classifier, controls=controls)
    dispatcher = Dispatcher(RecordingSender(), CommandLog(None), lambda: [], lambda: True)
    pending = sorted(activate_at or [])
    fired: list[Fired] = []
    for frame in iter_inputs(path):
        while pending and frame.t >= pending[0]:
            pending.pop(0)
            pipeline.set_active(True)
        for command in pipeline.process(frame).commands:
            entry, _ = dispatcher.dispatch(command, PROFILE, frame.captured_at)
            fired.append(Fired(frame.t, command.action.value, command.slide, entry.pipeline_ms))
    return fired


def run_session(path: Path, classifier: PoseClassifier | None = None) -> SessionRun:
    """Replay a labelled session and score every labelled segment."""
    header = read_header(path)
    settings = make_settings(two_hand=header.kind == "two_hand")
    labels = scored_labels(header)
    fired = replay_commands(path, settings, classifier, activate_at=[label.start for label in labels])
    run = SessionRun(header, fired=fired, detection_rate=_detection_rate(path, labels))
    for label in labels:
        expected = expected_command(settings, label.gesture)
        if expected is None:
            continue
        inside = [f for f in fired if label.start <= f.t <= label.end + GRACE_AFTER_SEGMENT_S]
        run.segments.append(Segment(label, expected, inside))
    return run


def _detection_rate(path: Path, labels: list[SessionLabel]) -> float | None:
    """Share of the frames inside labelled segments in which a hand was found."""
    seen = total = 0
    windows = [(label.start, label.end) for label in labels]
    for frame in iter_inputs(path):
        if any(start <= frame.t <= end for start, end in windows):
            total += 1
            seen += bool(frame.hands)
    return seen / total if total else None
