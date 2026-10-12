"""Settings persistence: data/settings.json, validated on load, migrated by schema_version."""

import json
import threading
from pathlib import Path

from pydantic import ValidationError

from app.contract.common import SCHEMA_VERSION
from app.contract.settings import Settings


def migrate(raw: dict) -> dict:
    """Upgrade older settings files one version at a time. Version 1 is the first."""
    version = raw.get("schema_version", 1)
    if version > SCHEMA_VERSION:
        raise ValueError(f"settings.json is from a newer WaveSlide (version {version})")
    raw["schema_version"] = SCHEMA_VERSION
    return raw


class SettingsStore:
    def __init__(self, path: Path):
        self.path = path
        self._lock = threading.Lock()
        self._settings = self._load()

    def _load(self) -> Settings:
        if not self.path.is_file():
            return Settings()
        try:
            return Settings.model_validate(migrate(json.loads(self.path.read_text("utf-8"))))
        except (ValueError, ValidationError):
            # A broken file must not stop the demo: keep a copy and start from defaults.
            self.path.replace(self.path.with_suffix(".broken.json"))
            return Settings()

    def get(self) -> Settings:
        with self._lock:
            return self._settings.model_copy(deep=True)

    def save(self, settings: Settings) -> Settings:
        with self._lock:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            tmp = self.path.with_suffix(".tmp")
            tmp.write_text(settings.model_dump_json(indent=2), encoding="utf-8")
            tmp.replace(self.path)  # atomic: a crash never leaves half a file
            self._settings = settings.model_copy(deep=True)
            return settings.model_copy(deep=True)

    def reset(self) -> Settings:
        return self.save(Settings())
