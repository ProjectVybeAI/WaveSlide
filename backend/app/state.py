"""Objects shared by the routers, created once in create_app() and kept on app.state."""

from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Annotated

from fastapi import Depends, Request

from app.config import Config
from app.engine.hub import Hub
from app.engine.runner import Engine
from app.settings.store import SettingsStore


@dataclass
class AppState:
    config: Config
    hub: Hub
    engine: Engine
    settings: SettingsStore
    # Set by the desktop launcher; in a plain browser the overlay mode is only remembered.
    overlay_controller: Callable[[str], None] | None = None
    overlay_mode: str = "full"
    extras: dict = field(default_factory=dict)


def get_state(request: Request) -> AppState:
    return request.app.state.waveslide


StateDep = Annotated[AppState, Depends(get_state)]
