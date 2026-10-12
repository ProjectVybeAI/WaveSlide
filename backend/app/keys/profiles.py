"""App profiles: each presentation app's shortcuts per OS, read from profiles/*.json.

Kept as data so a student can fix a shortcut without touching code.
"""

import json
import sys
from functools import lru_cache
from pathlib import Path

from app.contract.common import Action
from app.contract.system import AppProfile

PROFILES_DIR = Path(__file__).parent / "profiles"


def current_os() -> str:
    return "darwin" if sys.platform == "darwin" else "win32"


@lru_cache
def load_profiles(os_name: str | None = None) -> dict[str, AppProfile]:
    os_name = os_name or current_os()
    profiles: dict[str, AppProfile] = {}
    for path in sorted(PROFILES_DIR.glob("*.json")):
        raw = json.loads(path.read_text(encoding="utf-8"))
        profiles[raw["id"]] = AppProfile(
            id=raw["id"],
            name=raw["name"],
            description=raw["description"],
            keys={Action(k): v for k, v in raw["keys"][os_name].items()},
            jump_strategy=raw["jump_strategy"],
            unsupported=[Action(a) for a in raw["unsupported"]],
            notes=raw["notes"],
        )
    return profiles


def keys_for(profile: AppProfile, action: Action, slide: int | None = None) -> list[str]:
    """The key sequence for one action, with the slide number filled in for jumps."""
    sequence = profile.keys.get(action, [])
    if action != Action.JUMP or slide is None:
        return list(sequence)
    if profile.jump_strategy == "step_from_home":
        return [*sequence, *["right"] * (slide - 1)]
    keys: list[str] = []
    for key in sequence:
        keys.extend(list(str(slide)) if key == "{n}" else [key])
    return keys
