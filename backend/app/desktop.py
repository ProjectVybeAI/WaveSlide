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
from app.platform.overlay import overlay_geometry

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
    parser.add_argument(
        "--overlay-focus",
        action="store_true",
        help="let the overlay take focus (fallback if its buttons cannot be clicked; the focus guard "
        "then keeps keys out of it)",
    )
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
    screen_width = screen.width if screen else None
    overlay_settings = app.state.waveslide.settings.get().overlay
    start_mode = "compact" if overlay_settings.compact else "full"
    width, height, x, y = overlay_geometry(start_mode, screen_width)
    overlay = webview.create_window(
        "WaveSlide overlay",
        f"{ui_url}/overlay",
        width=width,
        height=height,
        x=x,
        y=y,
        frameless=True,
        on_top=True,
        focus=args.overlay_focus,  # False: showing the overlay never steals focus from the slides
        resizable=False,
        easy_drag=True,
        hidden=not overlay_settings.visible,
        background_color=SURFACE,
    )

    def set_overlay(mode: str) -> None:
        """Called by POST /api/overlay: resize and re-dock the overlay, or hide it."""
        if mode == "hidden":
            overlay.hide()
            return
        w, h, new_x, new_y = overlay_geometry(mode, screen_width)
        overlay.resize(w, h)
        if new_x is not None:
            overlay.move(new_x, new_y)
        overlay.show()

    app.state.waveslide.overlay_controller = set_overlay
    webview.start()  # blocks until the windows close
    server.should_exit = True


if __name__ == "__main__":
    main()
