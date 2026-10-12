"""From a fired command to keys on the keyboard (or a blocked entry in the log).

Order of checks: the profile supports the action, no WaveSlide window has focus (focus
guard), Accessibility permission is granted, then the keys are pressed. Whatever happens, the
command is logged with its latency (frame capture to key sent), so the Live screen shows
"Not sent" and the reason instead of silence.
"""

import logging
import time
from collections.abc import Callable

from app.contract.engine import CommandLogEntry, WarningEvent
from app.core.commands import Command
from app.engine.command_log import CommandLog
from app.keys.focus import focus_block_reason
from app.keys.sender import KeySender

log = logging.getLogger("waveslide.keys")
PRACTICE_PROFILE = "practice"


class Dispatcher:
    def __init__(
        self,
        sender: KeySender,
        command_log: CommandLog,
        focused_routes: Callable[[], list[str]],
        keys_allowed: Callable[[], bool],
    ):
        self.sender = sender
        self.log = command_log
        self._focused_routes = focused_routes
        self._keys_allowed = keys_allowed

    def dispatch(
        self, command: Command, profile_id: str, captured_at: float
    ) -> tuple[CommandLogEntry, WarningEvent | None]:
        """Send one command. `captured_at` is the perf_counter time of the frame that caused it."""
        practice = profile_id == PRACTICE_PROFILE  # the deck follows the command event, no keys
        blocked = command.blocked_reason
        warning: WarningEvent | None = None
        if blocked is None and command.keys and not practice:
            blocked, warning = self._check_and_send(command.keys)
        entry = CommandLogEntry(
            id=self.log.next_id(),
            t=time.time(),
            action=command.action,
            gesture=command.gesture,
            slide=command.slide,
            keys=command.keys,
            pipeline_ms=round((time.perf_counter() - captured_at) * 1000, 2),
            dry_run=self.sender.dry_run or practice,
            blocked_reason=blocked,
        )
        self.log.add(entry)
        return entry, warning

    def _check_and_send(self, keys: list[str]) -> tuple[str | None, WarningEvent | None]:
        reason = focus_block_reason(self._focused_routes())
        if reason:
            return reason, WarningEvent(code="FOCUS_BLOCKED", message=reason)
        if not self._keys_allowed():
            message = "Accessibility permission is missing, so keys cannot be sent."
            return message, WarningEvent(code="KEYS_NOT_ALLOWED", message=message)
        try:
            self.sender.send(keys)
        except Exception as exc:  # noqa: BLE001 - the key library can fail in many OS-specific ways
            log.warning("sending keys failed: %s", exc)
            message = "The keys could not be sent."
            return message, WarningEvent(code="KEYS_NOT_ALLOWED", message=message)
        return None, None
