"""Deterministic synthetic sessions (seed 42) into data/sessions/.

Running it twice gives byte-identical session files. The full seed then trains the demo
model and runs a demo evaluation on the synthetic sessions; both are flagged synthetic.

    uv run python scripts/seed.py                  # sessions, demo model, demo evaluation
    uv run python scripts/seed.py --sessions-only  # just the session files
    uv run python scripts/seed.py --fixtures       # small copies into tests/fixtures/sessions
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import BACKEND_DIR, get_config  # noqa: E402
from app.dataset.store import sessions_dirs, write_session  # noqa: E402
from app.dataset.synthetic import (  # noqa: E402
    PARTICIPANTS,
    demo_session,
    gestures_session,
    talking_session,
    two_hand_session,
)
from app.evaluation.runner import run_evaluation, save_report  # noqa: E402
from app.ml.training import train_model, training_sessions  # noqa: E402

SEED = 42
CONDITIONS = [(0.5, "normal"), (1.5, "normal"), (2.0, "normal"), (1.0, "bright"), (1.0, "dim")]


def build(fixtures: bool):
    """Yield (header, frames) for every synthetic session."""
    yield demo_session(SEED)
    yield two_hand_session(SEED + 1)
    if fixtures:
        yield talking_session(PARTICIPANTS[0], SEED + 10, minutes=0.5)
        return
    for i, person in enumerate(PARTICIPANTS):
        yield gestures_session(person, SEED + 100 + i)
        yield talking_session(person, SEED + 200 + i)
    # One participant at other distances and lighting levels, for the distance and lighting sections.
    first = PARTICIPANTS[0]
    for i, (distance, lighting) in enumerate(CONDITIONS):
        yield gestures_session(first, SEED + 300 + i, distance, lighting, rounds=1, swipes_each_way=5)


def train_and_evaluate(data_dir: Path) -> None:
    """The demo model and the demo evaluation, from the synthetic sessions only."""
    dirs = sessions_dirs(data_dir)
    card = train_model(training_sessions(dirs, ["synthetic"]), data_dir, lambda f, m: None)
    print(f"Trained the demo model (synthetic): leave-one-participant-out macro-F1 {card.lopo_macro_f1}")
    report = run_evaluation(dirs, ["synthetic"], logs_dir=data_dir / "logs")
    save_report(data_dir, report)
    print(f"Ran the demo evaluation {report.id} (synthetic): data/eval/{report.id}/report.json")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fixtures", action="store_true", help="write small test fixtures")
    parser.add_argument("--sessions-only", action="store_true", help="skip the demo model and evaluation")
    args = parser.parse_args()
    data_dir = get_config().resolved_data_dir
    target = BACKEND_DIR / "tests" / "fixtures" / "sessions" if args.fixtures else data_dir / "sessions"
    for header, frames in build(args.fixtures):
        write_session(target / f"{header.id}.jsonl", header, frames)
        print(f"  {header.id}: {len(frames)} frames")
    print(f"Wrote synthetic sessions to {target}")
    if not (args.fixtures or args.sessions_only):
        train_and_evaluate(data_dir)


if __name__ == "__main__":
    main()
