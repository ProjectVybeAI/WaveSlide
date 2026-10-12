"""Settings rules beyond field ranges (the ranges themselves live in the contract models).

Checked in this order, so the first problem the user can fix is the one reported:
1. ACTIVATION_MUST_BE_HELD_POSE (422): a swipe cannot switch the engine on.
2. MAPPING_CONFLICT (409): one gesture on two actions, or an action on a reserved COUNT_* gesture.
3. NO_MODEL (409): recogniser "ml" with no trained model.
"""

from pathlib import Path

from app.contract.common import ErrorCode, Gesture, Recogniser
from app.contract.settings import Settings
from app.core.poses import COUNT_OF_POSE
from app.errors import AppError
from app.ml.store import MODEL_FILE

SWIPES = {Gesture.SWIPE_LEFT, Gesture.SWIPE_RIGHT}
RESERVED_FOR_JUMP = {Gesture(pose.value) for pose in COUNT_OF_POSE}


def model_available(data_dir: Path) -> bool:
    return (data_dir / MODEL_FILE).is_file()


def validate_settings(settings: Settings, data_dir: Path) -> Settings:
    mappings = settings.mappings.model_dump()

    if settings.mappings.toggle_active in SWIPES:
        raise AppError(
            ErrorCode.ACTIVATION_MUST_BE_HELD_POSE,
            "Turning WaveSlide on or off needs a held pose. A swipe could switch it on by accident.",
            422,
            {"gesture": settings.mappings.toggle_active},
        )

    actions_by_gesture: dict[str, list[str]] = {}
    for action, gesture in mappings.items():
        actions_by_gesture.setdefault(gesture, []).append(action)
    for gesture, actions in actions_by_gesture.items():
        if gesture in RESERVED_FOR_JUMP:
            raise AppError(
                ErrorCode.MAPPING_CONFLICT,
                f"{gesture} is reserved for jumping to a slide. Pick another gesture.",
                409,
                {"gesture": gesture, "actions": [*actions, "jump"]},
            )
        if len(actions) > 1:
            raise AppError(
                ErrorCode.MAPPING_CONFLICT,
                f"{gesture} is assigned to more than one action: {', '.join(actions)}.",
                409,
                {"gesture": gesture, "actions": actions},
            )

    if settings.recogniser == Recogniser.ML and not model_available(data_dir):
        raise AppError(
            ErrorCode.NO_MODEL,
            "There is no trained model yet. Train one in Dataset, or use the rules.",
            409,
        )
    return settings
