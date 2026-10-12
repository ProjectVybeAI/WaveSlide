"""The command log: a ring of the last 200 commands in memory plus logs/commands-<date>.jsonl.

The Live screen and the latency measurements (evaluation E4) read it. Updating a command
(the practice deck's acknowledgement) appends the changed entry as a new line with the same id.
"""

import logging
import threading
from collections import deque
from datetime import UTC, datetime
from pathlib import Path

from app.contract.engine import CommandLogEntry

log = logging.getLogger("waveslide.commands")
RING_SIZE = 200


class CommandLog:
    def __init__(self, directory: Path | None = None):
        self.directory = directory
        self._ring: deque[CommandLogEntry] = deque(maxlen=RING_SIZE)
        self._next_id = 1
        self._lock = threading.Lock()

    def next_id(self) -> int:
        with self._lock:
            command_id, self._next_id = self._next_id, self._next_id + 1
        return command_id

    def add(self, entry: CommandLogEntry) -> None:
        with self._lock:
            self._ring.append(entry)
        self._write(entry)

    def set_ack(self, command_id: int, ack_ms: float) -> CommandLogEntry | None:
        """Record how long the practice deck took to show the result. None if the id is unknown."""
        with self._lock:
            for i, entry in enumerate(self._ring):
                if entry.id == command_id:
                    updated = entry.model_copy(update={"ack_ms": round(ack_ms, 1)})
                    self._ring[i] = updated
                    break
            else:
                return None
        self._write(updated)
        return updated

    def last(self) -> CommandLogEntry | None:
        with self._lock:
            return self._ring[-1] if self._ring else None

    def recent(self) -> list[CommandLogEntry]:
        with self._lock:
            return list(self._ring)

    def _write(self, entry: CommandLogEntry) -> None:
        if self.directory is None:
            return
        path = self.directory / f"commands-{datetime.now(UTC):%Y-%m-%d}.jsonl"
        try:
            self.directory.mkdir(parents=True, exist_ok=True)
            with path.open("a", encoding="utf-8", newline="\n") as f:
                f.write(entry.model_dump_json() + "\n")
        except OSError as exc:  # a full disk must never stop the presentation
            log.warning("could not write the command log: %s", exc)
