"""Labelled training samples from recorded sessions: one feature vector per camera frame.

Which frames are used:
- inside a pose label, but not the first or last 0.3 s (the hand is still arriving or leaving);
- "rest" frames far from every label (a relaxed hand, class NONE);
- never swipe frames (the hand shape is irrelevant there) or frames near a label edge;
- never frames without a hand.
Only sessions of kind "gestures" carry this kind of label.
"""

from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from app.contract.common import Pose
from app.contract.sessions import SessionHeader, SessionSource
from app.contract.settings import Sensitivity
from app.core.extract import FeatureExtractor
from app.core.poses import classify_rules
from app.dataset.store import iter_inputs, read_header

EDGE_TRIM_S = 0.3
PROBE_EVERY, PROBE_MAX = 25, 300
POSES = {pose.value for pose in Pose}


@dataclass
class Samples:
    vectors: np.ndarray  # (n, 49) feature vectors
    labels: np.ndarray  # (n,) pose names
    participants: np.ndarray  # (n,) who recorded the frame: the group for leave-one-participant-out
    rules: np.ndarray  # (n,) what the rules said for the same frame
    probe: list  # a few hundred HandFeatures, for timing how long one decision takes

    def __len__(self) -> int:
        return len(self.labels)


def usable_sessions(paths: list[Path], sources: list[SessionSource]) -> list[Path]:
    """Gesture sessions from the chosen sources that contain at least one pose label."""
    chosen = []
    for path in paths:
        header = read_header(path)
        if header.kind == "gestures" and header.source in sources and _pose_labels(header):
            chosen.append(path)
    return chosen


def participants_of(paths: list[Path]) -> list[str]:
    return sorted({read_header(path).participant for path in paths})


def _pose_labels(header: SessionHeader):
    return [label for label in header.labels if label.gesture in POSES]


def frame_label(t: float, header: SessionHeader) -> str | None:
    """The pose to train this moment as, or None when the moment must not be used."""
    near_a_label = False
    for label in header.labels:
        if label.start - EDGE_TRIM_S <= t <= label.end + EDGE_TRIM_S:
            near_a_label = True
            inside = label.start + EDGE_TRIM_S <= t <= label.end - EDGE_TRIM_S
            if inside and label.gesture in POSES:
                return label.gesture
    return None if near_a_label else Pose.NONE.value


def collect_samples(paths: list[Path], progress: Callable[[float, str], None] | None = None) -> Samples:
    vectors, labels, people, rules, probe = [], [], [], [], []
    palm_spread_max = Sensitivity().palm_spread_max
    for number, path in enumerate(paths):
        header = read_header(path)
        extractor = FeatureExtractor()
        for frame in iter_inputs(path):
            features = extractor.features(frame)
            label = frame_label(frame.t, header) if features is not None else None
            if features is None or label is None:
                continue
            vectors.append(features.vector())
            labels.append(label)
            people.append(header.participant)
            rules.append(classify_rules(features, palm_spread_max).value)
            if len(vectors) % PROBE_EVERY == 0 and len(probe) < PROBE_MAX:
                probe.append(features)
        if progress:
            progress((number + 1) / len(paths), f"Read {header.id}")
    return Samples(np.array(vectors), np.array(labels), np.array(people), np.array(rules), probe)
