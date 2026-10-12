"""A fired intent turned into a command: the key sequence from the app profile.

The engine adds the id, timestamps and latency, applies the focus guard and sends the keys.
"""

from dataclasses import dataclass

from app.contract.common import Action, Gesture
from app.contract.system import AppProfile
from app.core.intents import Intent
from app.keys.profiles import keys_for


@dataclass(frozen=True)
class Command:
    action: Action
    gesture: Gesture
    slide: int | None
    keys: list[str]
    blocked_reason: str | None = None


def make_command(profile: AppProfile, intent: Intent) -> Command:
    """Resolve the profile's keys for this intent. Unsupported actions become blocked commands,
    so the presenter still sees "not sent, and why" instead of nothing happening."""
    if intent.action == Action.TOGGLE_ACTIVE:
        return Command(intent.action, intent.gesture, None, [])  # changes WaveSlide, presses nothing
    if intent.action in profile.unsupported or intent.action not in profile.keys:
        reason = f"{profile.name} has no shortcut for this"
        return Command(intent.action, intent.gesture, intent.slide, [], reason)
    return Command(
        intent.action, intent.gesture, intent.slide, keys_for(profile, intent.action, intent.slide)
    )
