"""Settings rules beyond field ranges. Phase 0 validates the schema only; Phase 1 adds
MAPPING_CONFLICT, ACTIVATION_MUST_BE_HELD_POSE and NO_MODEL here."""

from app.contract.settings import Settings


def validate_settings(settings: Settings) -> Settings:
    return settings
