"""Small synthetic session sets for the dataset, ml and evaluation tests (built once per test run).

Full seed sessions take minutes to replay with the model, so tests use short versions: every
pose held 2.2 s, a few swipes, 20 s of talking. The generator and pipeline are the real ones.
"""

import shutil
import tempfile
from functools import cache
from pathlib import Path

from app.dataset.store import write_session
from app.dataset.synthetic import (
    IMAGE_W,
    LIGHTING,
    PARTICIPANTS,
    POSE_GESTURES,
    Participant,
    SessionBuilder,
    talking_session,
    two_hand_session,
)
from app.ml.training import train_model, training_sessions


def mini_gestures(
    person: Participant, seed: int, distance_m: float = 1.0, lighting: str = "normal", swipes: int = 2
):
    look = LIGHTING[lighting]
    b = SessionBuilder(person, seed, distance_m, look["noise_px"], look["dropout"])
    b.gap(0.3)
    for pose in POSE_GESTURES:
        b.rest(0.8)
        b.hold(pose, 2.2, label=pose)
    for direction in (+1, -1):
        for _ in range(swipes):
            b.rest_toward(IMAGE_W / 2 - direction * 1.5 * b.size, 1.0)
            b.swipe_from_rest(direction)
    b.rest(0.8)
    suffix = "" if (distance_m, lighting) == (1.0, "normal") else f"-{distance_m:g}m-{lighting}"
    header = b.header(f"synthetic-gestures-{person.name}{suffix}", "gestures", distance_m, lighting)
    header.luminance_mean = look["luminance"]
    return header, b.frames


def write_mini_set(sessions_dir: Path, participants: int = 3, talking: bool = True) -> None:
    """Gesture sessions for the first `participants` people, plus talking and two-hand sessions."""
    for i, person in enumerate(PARTICIPANTS[:participants]):
        header, frames = mini_gestures(person, 500 + i)
        write_session(sessions_dir / f"{header.id}.jsonl", header, frames)
        if talking:
            header, frames = talking_session(person, 600 + i, minutes=0.35)
            write_session(sessions_dir / f"{header.id}.jsonl", header, frames)
    if participants >= 2:
        header, frames = mini_gestures(PARTICIPANTS[0], 520, distance_m=2.0)
        write_session(sessions_dir / f"{header.id}.jsonl", header, frames)
    header, frames = two_hand_session(530)
    write_session(sessions_dir / f"{header.id}.jsonl", header, frames)


@cache
def mini_data_dir() -> Path:
    """A data dir (sessions/ and a trained model in models/) shared by every test; never modified."""
    data_dir = Path(tempfile.mkdtemp(prefix="waveslide-mini-"))
    write_mini_set(data_dir / "sessions")
    sessions = data_dir / "sessions"
    train_model(training_sessions([sessions], ["synthetic"]), data_dir, lambda f, m: None)
    return data_dir


def copy_mini_data(destination: Path) -> None:
    """A private copy of the shared data dir, for tests that change files."""
    shutil.copytree(mini_data_dir(), destination, dirs_exist_ok=True)
