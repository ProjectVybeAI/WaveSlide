"""Per-frame features without the rest of the pipeline, for training and evaluating classifiers.

It runs the same steps the pipeline runs before classifying (largest hand, true-scale
stretch, One Euro smoothing, features), so a model is trained on exactly what it will see live.
"""

from app.contract.settings import Sensitivity
from app.core.features import HandFeatures, compute_features
from app.core.tracking import HandTracker, largest_hands, true_scale
from app.core.types import FrameInput


class FeatureExtractor:
    def __init__(self, smoothing: float | None = None):
        self.tracker = HandTracker(smoothing if smoothing is not None else Sensitivity().smoothing)

    def features(self, frame: FrameInput) -> HandFeatures | None:
        """Features of the presenter's (largest) hand, or None when no usable hand is in view."""
        hands = [true_scale(h, frame.aspect) for h in largest_hands(frame.hands, 1)]
        for track, hand in self.tracker.update(hands, frame.t):
            return compute_features(track.filter(hand.points, frame.t), hand.handedness)
        return None
