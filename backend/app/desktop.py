"""One-command desktop launcher: the engine plus two native windows.

    uv run python -m app.desktop            # serves the built UI from the engine (npm start)
    uv run python -m app.desktop --dev      # windows point at Vite on :5173 (npm run dev:desktop)

pywebview must own the main thread, so uvicorn runs in a background thread.
"""

import argparse
import threading
import time
import urllib.request

import uvicorn
import webview

from app.config import get_config
from app.main import create_app

OVERLAY_FULL = (340, 280)
OVERLAY_COMPACT = (220, 56)
SCREEN_MARGIN = 16
SURFACE = "#1D2125"  # --color-surface, so a frameless window never flashes white


def wait_for(url: str, seconds: float = 20.0) -> None:
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        try:
            urllib.request.urlopen(url, timeout=1)
            return
        except OSError:
            time.sleep(0.2)
    raise SystemExit(f"WaveSlide engine did not start at {url}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dev", action="store_true", help="load the UI from the Vite dev server")
    args = parser.parse_args()
    config = get_config()
    app = create_app(config)
    server = uvicorn.Server(uvicorn.Config(app, host="127.0.0.1", port=config.port, log_level="warning"))
    threading.Thread(target=server.run, name="uvicorn", daemon=True).start()
    engine_url = f"http://127.0.0.1:{config.port}"
    wait_for(f"{engine_url}/api/health")
    ui_url = config.ui_origin if args.dev else engine_url

    webview.create_window(
        "WaveSlide",
        f"{ui_url}/",
        width=1280,
        height=820,
        min_size=(720, 560),
        background_color=SURFACE,
    )
    screen = webview.screens[0] if webview.screens else None
    width, height = OVERLAY_FULL
    x = screen.width - width - SCREEN_MARGIN if screen else None
    overlay = webview.create_window(
        "WaveSlide overlay",
        f"{ui_url}/overlay",
        width=width,
        height=height,
        x=x,
        y=SCREEN_MARGIN,
        frameless=True,
        on_top=True,
        focus=False,
        resizable=False,
        easy_drag=True,
        background_color=SURFACE,
    )

    def set_overlay(mode: str) -> None:
        if mode == "hidden":
            overlay.hide()
            return
        w, h = OVERLAY_COMPACT if mode == "compact" else OVERLAY_FULL
        overlay.show()
        overlay.resize(w, h)
        if screen:
            overlay.move(screen.width - w - SCREEN_MARGIN, SCREEN_MARGIN)

    app.state.waveslide.overlay_controller = set_overlay
    webview.start()  # blocks until the windows close
    server.should_exit = True


if __name__ == "__main__":
    main()
