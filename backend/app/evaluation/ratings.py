"""E8 user ratings, read from eval/feedback.csv (columns: participant, ease, reliability, comment)."""

import csv
from pathlib import Path

from pydantic import ValidationError

from app.contract.evaluation import E8Ratings, RatingRow

HEADER = ["participant", "ease", "reliability", "comment"]


def read_ratings(path: Path | None) -> E8Ratings | None:
    """None when the file is missing or has no rows. A malformed row stops the run with its line number."""
    if path is None or not path.is_file():
        return None
    rows = []
    with path.open(encoding="utf-8", newline="") as f:
        for number, record in enumerate(csv.DictReader(f), start=2):
            if not any((value or "").strip() for value in record.values()):
                continue
            try:
                rows.append(RatingRow(**{k: (v or "").strip() for k, v in record.items() if k in HEADER}))
            except ValidationError as exc:
                raise ValueError(f"{path.name} line {number}: ease and reliability must be 1-5") from exc
    if not rows:
        return None
    return E8Ratings(
        rows=rows,
        ease_mean=round(sum(r.ease for r in rows) / len(rows), 2),
        reliability_mean=round(sum(r.reliability for r in rows) / len(rows), 2),
    )
