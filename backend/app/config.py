"""Engine configuration from environment variables / .env, validated at startup."""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_DIR = BACKEND_DIR.parent


class Config(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="WAVESLIDE_", env_file=PROJECT_DIR / ".env", extra="ignore")

    port: int = Field(8765, ge=1024, le=65535)
    ui_origin: str = "http://localhost:5173"
    data_dir: Path = PROJECT_DIR / "data"
    source: Literal["camera", "replay"] = "camera"
    replay_session: str = "synthetic-demo"
    keys: Literal["pyautogui", "record"] = "pyautogui"
    log_level: Literal["debug", "info", "warning", "error"] = "info"

    @property
    def resolved_data_dir(self) -> Path:
        """Relative paths in .env are relative to the project root, not the working directory."""
        path = self.data_dir if self.data_dir.is_absolute() else PROJECT_DIR / self.data_dir
        return path.resolve()

    @property
    def allowed_origins(self) -> list[str]:
        port_origin = f"http://127.0.0.1:{self.port}"
        return [self.ui_origin, port_origin, f"http://localhost:{self.port}"]


@lru_cache
def get_config() -> Config:
    return Config()
