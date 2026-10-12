"""Overlay window size presets (they match docs/DESIGN.md) and where the window sits."""

OVERLAY_SIZES: dict[str, tuple[int, int]] = {
    "full": (340, 280),
    "compact": (220, 56),
}
SCREEN_MARGIN = 16  # px from the top right corner of the screen


def overlay_geometry(mode: str, screen_width: int | None) -> tuple[int, int, int | None, int]:
    """(width, height, x, y) for "full" or "compact": top right of the screen, 16 px in.

    x is None when the screen size is unknown, which leaves the window where the OS puts it.
    """
    width, height = OVERLAY_SIZES[mode]
    x = screen_width - width - SCREEN_MARGIN if screen_width else None
    return width, height, x, SCREEN_MARGIN
