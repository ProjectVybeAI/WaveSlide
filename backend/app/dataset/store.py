"""Session files: data/sessions/<id>.jsonl, a header line then one line per frame."""

from collections.abc import Iterator
from pathlib import Path

from app.contract.sessions import SessionFrame, SessionHeader, SessionSummary


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
