"""The focus guard: never press slide keys into WaveSlide's own windows.

Keys go to whichever window has keyboard focus. If that is the settings window or the
overlay, a "next slide" would do nothing useful (or type into a form), so the command is
logged as blocked instead. The practice deck is exempt: it is meant to receive them.
"""

PRACTICE_ROUTE = "/practice"
BLOCKED_REASON = "A WaveSlide window has focus. Click your presentation first."


def focus_block_reason(focused_routes: list[str]) -> str | None:
    """`focused_routes` are the routes of WaveSlide windows that report keyboard focus."""
    if any(not route.startswith(PRACTICE_ROUTE) for route in focused_routes):
        return BLOCKED_REASON
    return None
