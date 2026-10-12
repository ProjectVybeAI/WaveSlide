"""WebSocket /ws/engine: frames and events out, hello / focus / deck_ack in."""

import asyncio
import contextlib

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import TypeAdapter, ValidationError

from app.contract.engine import ClientMessage, DeckAckMessage, FocusMessage, HelloMessage
from app.state import AppState

router = APIRouter()
client_message = TypeAdapter(ClientMessage)


@router.websocket("/ws/engine")
async def engine_socket(websocket: WebSocket) -> None:
    state: AppState = websocket.app.state.waveslide
    origin = websocket.headers.get("origin")
    # Any web page in the user's browser could open this socket; only our own UI may.
    if origin is not None and origin not in state.config.allowed_origins:
        await websocket.close(code=1008)
        return
    await websocket.accept()
    client = state.hub.connect()

    async def receive() -> None:
        while True:
            raw = await websocket.receive_text()
            try:
                message = client_message.validate_json(raw)
            except ValidationError:
                continue  # ignore malformed messages rather than dropping the connection
            if isinstance(message, HelloMessage):
                client.role = message.role
            elif isinstance(message, FocusMessage):
                client.has_focus = message.has_focus
                client.route = message.route
            elif isinstance(message, DeckAckMessage):
                pass  # Phase 1: key-to-slide latency for the command log

    async def send() -> None:
        while True:
            await client.wake.wait()
            events, frame = state.hub.take(client)
            for event in events:
                await websocket.send_text(event.model_dump_json())
            if frame is not None:
                await websocket.send_text(frame.model_dump_json())

    tasks = [asyncio.create_task(receive()), asyncio.create_task(send())]
    try:
        await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
    except WebSocketDisconnect:
        pass
    finally:
        for task in tasks:
            task.cancel()
            with contextlib.suppress(asyncio.CancelledError, WebSocketDisconnect, Exception):
                await task
        state.hub.disconnect(client)
