"""create_app(): wires config, the engine, routers, CORS and error handlers."""

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app import jobs
from app.config import PROJECT_DIR, Config, get_config
from app.dataset import router as dataset
from app.engine import router as engine_router
from app.engine import ws
from app.engine.hub import Hub
from app.engine.runner import Engine
from app.errors import register_error_handlers
from app.evaluation import router as evaluation
from app.keys import router as keys
from app.keys.sender import KeySender, PyAutoGuiSender, RecordingSender
from app.ml import router as ml
from app.platform import router as platform
from app.settings import router as settings_router
from app.settings.store import SettingsStore
from app.state import AppState

FRONTEND_DIST = PROJECT_DIR / "frontend" / "dist"


def make_sender(config: Config) -> KeySender:
    return PyAutoGuiSender() if config.keys == "pyautogui" else RecordingSender()


def create_app(config: Config | None = None, start_engine: bool = True) -> FastAPI:
    config = config or get_config()
    logging.basicConfig(level=config.log_level.upper(), format="%(levelname)s %(name)s: %(message)s")
    store = SettingsStore(config.resolved_data_dir / "settings.json")
    hub = Hub()
    engine = Engine(config, store.get(), hub, make_sender(config))

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        if start_engine:
            engine.start()
        yield
        engine.stop()

    app = FastAPI(title="WaveSlide engine", version="0.1.0", lifespan=lifespan)
    app.state.waveslide = AppState(config=config, hub=hub, engine=engine, settings=store)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=config.allowed_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    register_error_handlers(app)
    for module in (platform, engine_router, settings_router, keys, dataset, ml, evaluation, jobs):
        app.include_router(module.router)
    app.include_router(ws.router)
    _serve_frontend(app, FRONTEND_DIST)
    return app


def _serve_frontend(app: FastAPI, dist: Path) -> None:
    """`npm start` serves the built UI from the engine, so one port serves everything."""
    if not (dist / "index.html").is_file():
        return
    app.mount("/assets", StaticFiles(directory=dist / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str) -> FileResponse:
        file = dist / path
        return FileResponse(file if path and file.is_file() else dist / "index.html")
