"""Broadcast hub between the engine thread and WebSocket clients.

Frames: each client keeps only the latest (a slow client skips frames, never lags).
Events: queued per client and never dropped, so the command log stays complete.
"""

import asyncio
import threading
from dataclasses import dataclass, field

from app.contract.engine import EngineEvent, EngineEventMessage, EngineFrame


@dataclass(eq=False)  # identity hashing: each connection is its own client
class Client:
    role: str = "unknown"
    has_focus: bool = False
    route: str = ""
    latest_frame: EngineFrame | None = None
    events: list[EngineEventMessage] = field(default_factory=list)
    wake: asyncio.Event = field(default_factory=asyncio.Event)
    loop: asyncio.AbstractEventLoop | None = None


class Hub:
    def __init__(self) -> None:
        self._clients: set[Client] = set()
        self._lock = threading.Lock()

    def connect(self) -> Client:
        client = Client(loop=asyncio.get_running_loop())
        with self._lock:
            self._clients.add(client)
        return client

    def disconnect(self, client: Client) -> None:
        with self._lock:
            self._clients.discard(client)

    def clients(self) -> list[Client]:
        with self._lock:
            return list(self._clients)

    def publish_frame(self, frame: EngineFrame) -> None:
        for client in self.clients():
            client.latest_frame = frame
            self._wake(client)

    def publish_event(self, event: EngineEvent) -> None:
        message = EngineEventMessage(event=event)
        for client in self.clients():
            with self._lock:
                client.events.append(message)
            self._wake(client)

    def take(self, client: Client) -> tuple[list[EngineEventMessage], EngineFrame | None]:
        """Everything pending for one client: events first (in order), then the newest frame."""
        with self._lock:
            events, client.events = client.events, []
            frame, client.latest_frame = client.latest_frame, None
            client.wake.clear()
        return events, frame

    def any_window_focused(self, except_route: str | None = None) -> bool:
        """True if a WaveSlide window has keyboard focus (used by the focus guard)."""
        return any(
            c.has_focus and not (except_route and c.route.startswith(except_route)) for c in self.clients()
        )

    @staticmethod
    def _wake(client: Client) -> None:
        if client.loop is not None and not client.loop.is_closed():
            client.loop.call_soon_threadsafe(client.wake.set)
