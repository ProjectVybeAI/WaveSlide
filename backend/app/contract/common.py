"""Shared vocabulary: poses, gestures, actions and error codes.

Every other contract module builds on these enums, and the frontend gets them
as TypeScript string unions through openapi.json.
"""

from enum import StrEnum

SCHEMA_VERSION = 1


class Pose(StrEnum):
    """A static hand shape, recognised frame by frame (rules or trained model)."""

    NONE = "NONE"
    FIST = "FIST"
    OPEN_PALM = "OPEN_PALM"  # all five fingers extended and held together ("stop")
    THUMBS_UP = "THUMBS_UP"
    THUMBS_DOWN = "THUMBS_DOWN"
    COUNT_1 = "COUNT_1"
    COUNT_2 = "COUNT_2"
    COUNT_3 = "COUNT_3"
    COUNT_4 = "COUNT_4"
    COUNT_5 = "COUNT_5"  # all five extended and spread ("high five")


class Gesture(StrEnum):
    """Anything a mapping can use: a held pose or a swipe."""

    SWIPE_LEFT = "SWIPE_LEFT"
    SWIPE_RIGHT = "SWIPE_RIGHT"
    FIST = "FIST"
    OPEN_PALM = "OPEN_PALM"
    THUMBS_UP = "THUMBS_UP"
    THUMBS_DOWN = "THUMBS_DOWN"
    COUNT_1 = "COUNT_1"
    COUNT_2 = "COUNT_2"
    COUNT_3 = "COUNT_3"
    COUNT_4 = "COUNT_4"
    COUNT_5 = "COUNT_5"


class Action(StrEnum):
    """What a command does in the presentation app."""

    NEXT = "next"
    PREVIOUS = "previous"
    BLANK_TOGGLE = "blank_toggle"
    TOGGLE_ACTIVE = "toggle_active"
    START_SHOW = "start_show"
    EXIT_SHOW = "exit_show"
    JUMP = "jump"


class Recogniser(StrEnum):
    RULES = "rules"
    ML = "ml"


class SourceKind(StrEnum):
    CAMERA = "camera"
    REPLAY = "replay"


class EngineState(StrEnum):
    """States of the reliability state machine (ARCHITECTURE.md step 6)."""

    PAUSED = "PAUSED"
    ACTIVE = "ACTIVE"
    HOLDING = "HOLDING"
    COOLDOWN = "COOLDOWN"


class ErrorCode(StrEnum):
    VALIDATION_ERROR = "VALIDATION_ERROR"
    MAPPING_CONFLICT = "MAPPING_CONFLICT"
    ACTIVATION_MUST_BE_HELD_POSE = "ACTIVATION_MUST_BE_HELD_POSE"
    NO_MODEL = "NO_MODEL"
    SESSION_NOT_FOUND = "SESSION_NOT_FOUND"
    CAMERA_UNAVAILABLE = "CAMERA_UNAVAILABLE"
    NO_CAMERA_IN_REPLAY = "NO_CAMERA_IN_REPLAY"
    CAMERA_REQUIRED = "CAMERA_REQUIRED"
    RECORDING_IN_PROGRESS = "RECORDING_IN_PROGRESS"
    NO_RECORDING = "NO_RECORDING"
    NOT_ENOUGH_DATA = "NOT_ENOUGH_DATA"
    JOB_RUNNING = "JOB_RUNNING"
    JOB_NOT_FOUND = "JOB_NOT_FOUND"
    EVALUATION_NOT_FOUND = "EVALUATION_NOT_FOUND"
    NOT_FOUND = "NOT_FOUND"
    INTERNAL_ERROR = "INTERNAL_ERROR"
