"""Session files: data/sessions/<id>.jsonl, a header line then one line per frame."""

import time
from collections.abc import Iterator
from pathlib import Path

import numpy as np

from app.config import BACKEND_DIR
from app.contract.sessions import SessionFrame, SessionHeader, SessionSummary
from app.core.types import FrameInput, Hand

# The small synthetic sessions live under tests/ so CI has data; they are searched after the user's own.
FIXTURE_SESSIONS = BACKEND_DIR / "tests" / "fixtures" / "sessions"


def sessions_dirs(data_dir: Path) -> list[Path]:
    """Where sessions live: the user's data first, then the small committed fixtures."""
    return [data_dir / "sessions", FIXTURE_SESSIONS]


def session_paths(dirs: list[Path]) -> list[Path]:
    """Every session file once (the first directory wins on a repeated id), sorted by id."""
    seen: dict[str, Path] = {}
    for directory in dirs:
        for path in sorted(directory.glob("*.jsonl")):
            seen.setdefault(path.stem, path)
    return [seen[name] for name in sorted(seen)]


def iter_inputs(path: Path) -> Iterator[FrameInput]:
    """A session as pipeline input, as fast as the caller asks for it. `captured_at` is stamped when
    each frame is handed out, so the pipeline time measured after it is the real cost of the frame."""
    for frame in iter_frames(path):
        hands = [Hand(h.handedness, h.score, np.asarray(h.landmarks, dtype=float)) for h in frame.hands]
        yield FrameInput(t=frame.t, captured_at=time.perf_counter(), hands=hands)


def write_session(path: Path, header: SessionHeader, frames: list[SessionFrame]) -> None:
    """Deterministic output: same header and frames give byte-identical files."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as f:
        f.write(header.model_dump_json() + "\n")
        for frame in frames:
            f.write(frame.model_dump_json() + "\n")


def read_header(path: Path) -> SessionHeader:
    with path.open(encoding="utf-8") as f:
        return SessionHeader.model_validate_json(f.readline())


def iter_frames(path: Path) -> Iterator[SessionFrame]:
    with path.open(encoding="utf-8") as f:
        f.readline()
        for line in f:
            if line.strip():
                yield SessionFrame.model_validate_json(line)


def summarise(path: Path) -> SessionSummary:
    header = read_header(path)
    n_frames, last_t = 0, 0.0
    for frame in iter_frames(path):
        n_frames += 1
        last_t = frame.t
    return SessionSummary(
        id=header.id,
        kind=header.kind,
        source=header.source,
        participant=header.participant,
        distance_m=header.distance_m,
        lighting=header.lighting,
        luminance_mean=header.luminance_mean,
        n_frames=n_frames,
        duration_s=round(last_t, 2),
        created_at=header.created_at,
    )


def find_session(sessions_dirs: list[Path], session_id: str) -> Path | None:
    """Look in each directory in order (data/sessions first, then the committed fixtures)."""
    for directory in sessions_dirs:
        candidate = directory / f"{session_id}.jsonl"
        if candidate.is_file():
            return candidate
    return None
