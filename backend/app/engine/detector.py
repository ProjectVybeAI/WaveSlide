"""MediaPipe HandLandmarker (Tasks API, VIDEO mode): image in, up to two hands of 21 points out."""

from pathlib import Path

import numpy as np

from app.core.types import Hand


class HandDetector:
    def __init__(self, model_path: Path, num_hands: int = 2, min_confidence: float = 0.6):
        from mediapipe.tasks.python import BaseOptions, vision

        options = vision.HandLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=str(model_path)),
            running_mode=vision.RunningMode.VIDEO,
            num_hands=num_hands,
            min_hand_detection_confidence=min_confidence,
            min_hand_presence_confidence=min_confidence,
            min_tracking_confidence=0.5,
        )
        self._landmarker = vision.HandLandmarker.create_from_options(options)
        self._last_ms = -1

    def detect(self, rgb: np.ndarray, timestamp_ms: int) -> list[Hand]:
        import mediapipe as mp

        timestamp_ms = max(timestamp_ms, self._last_ms + 1)  # VIDEO mode needs increasing times
        self._last_ms = timestamp_ms
        image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        result = self._landmarker.detect_for_video(image, timestamp_ms)
        hands = []
        for landmarks, handedness in zip(result.hand_landmarks, result.handedness, strict=True):
            points = np.array([[p.x, p.y, p.z] for p in landmarks], dtype=float)
            category = handedness[0]
            hands.append(Hand(category.category_name, float(category.score), points))
        return hands

    def close(self) -> None:
        self._landmarker.close()
