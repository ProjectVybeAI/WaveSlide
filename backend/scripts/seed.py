"""Deterministic synthetic sessions (seed 42) into data/sessions/.

Running it twice gives byte-identical files. Phase 2 extends it to train the demo
model and run a demo evaluation, both flagged synthetic.

    uv run python scripts/seed.py               # full set into data/sessions
    uv run python scripts/seed.py --fixtures    # small copies into tests/fixtures/sessions
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import BACKEND_DIR, get_config  # noqa: E402
from app.dataset.store import write_session  # noqa: E402
from app.dataset.synthetic import (  # noqa: E402
    PARTICIPANTS,
    demo_session,
    gestures_session,
    talking_session,
    two_hand_session,
)

SEED = 42


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


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fixtures", action="store_true", help="write small test fixtures")
    args = parser.parse_args()
    target = (
        BACKEND_DIR / "tests" / "fixtures" / "sessions"
        if args.fixtures
        else get_config().resolved_data_dir / "sessions"
    )
    for header, frames in build(args.fixtures):
        write_session(target / f"{header.id}.jsonl", header, frames)
        print(f"  {header.id}: {len(frames)} frames")
    print(f"Wrote synthetic sessions to {target}")


if __name__ == "__main__":
    main()
