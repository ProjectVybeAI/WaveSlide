"""Camera and keyboard permission status for the setup check.

Phase 1 adds the real macOS checks (AVFoundation camera status and
CGPreflightPostEventAccess for Accessibility). Windows needs no permission.
"""

import sys

from app.contract.system import Permissions


def check_permissions() -> Permissions:
    if sys.platform == "darwin":
        return Permissions(camera="unknown", keyboard="unknown")
    return Permissions(camera="not_required", keyboard="not_required")
