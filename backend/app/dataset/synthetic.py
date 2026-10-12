"""Synthetic hands: 21 MediaPipe-style landmarks built from per-pose finger templates.

Used for tests, the seeded demo and the replay mode, so everything after MediaPipe
can run without a webcam. Results computed from these hands are always flagged
"synthetic"; real numbers come from recorded participants.

Landmark order (MediaPipe): 0 wrist; thumb 1-4; index 5-8; middle 9-12; ring 13-16; little 17-20.
"""

from dataclasses import dataclass
from datetime import UTC, datetime

import numpy as np

from app.contract.common import Gesture
from app.contract.engine import HandLandmarks
from app.contract.sessions import SessionFrame, SessionHeader, SessionLabel

IMAGE_W, IMAGE_H = 640, 480
FPS = 30.0

# Hand space: wrist at the origin, y points down (image convention), 1 unit = wrist to
# middle knuckle. Values describe a right hand, palm facing the camera, on the mirrored image.
KNUCKLES = np.array([[-0.32, -0.94], [0.0, -1.0], [0.27, -0.93], [0.50, -0.80]])
SEGMENTS = np.array([[0.45, 0.28, 0.22], [0.50, 0.31, 0.24], [0.47, 0.29, 0.23], [0.37, 0.22, 0.20]])
THUMB_BASE = np.array([-0.28, -0.22])
THUMB_DIR = np.array([-0.62, -0.78])
THUMB_SEGMENTS = np.array([0.38, 0.30, 0.26])
CURL_ANGLES = np.radians([75.0, 100.0, 70.0])  # flexion at the three joints of a curled finger


@dataclass(frozen=True)
class PoseTemplate:
    """Curl per finger (thumb, index, middle, ring, little): 0 straight, 1 fully curled."""

    curl: tuple[float, float, float, float, float]
    spread: float  # extra fan-out in radians; negative pulls fingers together
    roll_deg: float = 0.0  # rotates the whole hand (thumbs up / down)


TEMPLATES: dict[str, PoseTemplate] = {
    "NONE": PoseTemplate((0.5, 0.45, 0.5, 0.55, 0.6), 0.0),
    "FIST": PoseTemplate((1.0, 1.0, 1.0, 1.0, 1.0), 0.0),
    "OPEN_PALM": PoseTemplate((0.0, 0.0, 0.0, 0.0, 0.0), -0.30),
    "THUMBS_UP": PoseTemplate((0.0, 1.0, 1.0, 1.0, 1.0), 0.0, roll_deg=38.0),
    "THUMBS_DOWN": PoseTemplate((0.0, 1.0, 1.0, 1.0, 1.0), 0.0, roll_deg=218.0),
    "COUNT_1": PoseTemplate((1.0, 0.0, 1.0, 1.0, 1.0), 0.0),
    "COUNT_2": PoseTemplate((1.0, 0.0, 0.0, 1.0, 1.0), 0.08),
    "COUNT_3": PoseTemplate((1.0, 0.0, 0.0, 0.0, 1.0), 0.08),
    "COUNT_4": PoseTemplate((1.0, 0.0, 0.0, 0.0, 0.0), 0.10),
    "COUNT_5": PoseTemplate((0.0, 0.0, 0.0, 0.0, 0.0), 0.22),
}


@dataclass(frozen=True)
class Participant:
    """Per-person variation, so 'participants' differ the way real people do."""

    name: str
    finger_scale: float
    spread_bias: float
    curl_bias: float
    hand_size: float  # wrist to middle knuckle in pixels at 1 m


PARTICIPANTS = [
    Participant("p1", 1.00, 0.00, 0.00, 62.0),
    Participant("p2", 0.94, 0.03, -0.06, 56.0),
    Participant("p3", 1.06, -0.03, 0.05, 68.0),
]


def _finger(base: np.ndarray, direction: np.ndarray, lengths: np.ndarray, curl: float) -> np.ndarray:
    """Four points (knuckle, two joints, tip). Curl bends the finger toward the camera and back."""
    points = [np.array([base[0], base[1], 0.0])]
    d = np.array([direction[0], direction[1], 0.0])
    toward_camera = np.array([0.0, 0.0, -1.0])
    angle = 0.0
    for length, joint in zip(lengths, CURL_ANGLES * curl, strict=True):
        angle += joint
        step = length * (np.cos(angle) * d + np.sin(angle) * toward_camera)
        points.append(points[-1] + step)
    return np.array(points)


def hand_points(template: PoseTemplate, person: Participant, rng: np.random.Generator) -> np.ndarray:
    """A (21, 3) hand in hand space for one template and participant, with joint noise."""
    curl = np.clip(np.array(template.curl) + person.curl_bias + rng.normal(0, 0.04, 5), 0, 1)
    spread = template.spread + person.spread_bias + rng.normal(0, 0.015)
    points = np.zeros((21, 3))
    thumb_base = np.array([*THUMB_BASE, 0.0])
    # Thumb: curled thumbs fold across the palm toward the middle knuckle.
    thumb_dir = (1 - curl[0]) * THUMB_DIR + curl[0] * np.array([0.75, -0.55])
    thumb_dir /= np.linalg.norm(thumb_dir)
    thumb = [thumb_base]
    for length in THUMB_SEGMENTS * person.finger_scale:
        thumb.append(thumb[-1] + length * np.array([*thumb_dir, -0.15 * curl[0]]))
    points[1:5] = thumb
    for i in range(4):
        knuckle = KNUCKLES[i]
        fan = (i - 1.5) * spread
        base_angle = np.arctan2(knuckle[0], -knuckle[1]) + fan
        direction = np.array([np.sin(base_angle), -np.cos(base_angle)])
        lengths = SEGMENTS[i] * person.finger_scale
        points[5 + 4 * i : 9 + 4 * i] = _finger(knuckle, direction, lengths, curl[i + 1])
    return points


def place(
    points: np.ndarray,
    centre_px: tuple[float, float],
    size_px: float,
    roll_deg: float,
    left: bool,
    rng: np.random.Generator,
    noise_px: float = 1.2,
) -> HandLandmarks:
    """Hand space to normalised image coordinates: scale, roll, mirror, translate, add noise."""
    p = points.copy()
    if left:
        p[:, 0] = -p[:, 0]
    theta = np.radians(roll_deg if not left else -roll_deg)
    rot = np.array([[np.cos(theta), -np.sin(theta)], [np.sin(theta), np.cos(theta)]])
    # Centre the hand on its palm (between wrist and middle knuckle) before rotating.
    p[:, :2] = (p[:, :2] - np.array([0.0, -0.5])) @ rot.T
    xy = p[:, :2] * size_px + np.array(centre_px) + rng.normal(0, noise_px, (21, 2))
    z = p[:, 2] * size_px / IMAGE_W
    landmarks = [
        [round(float(x / IMAGE_W), 4), round(float(y / IMAGE_H), 4), round(float(zz), 4)]
        for (x, y), zz in zip(xy, z, strict=True)
    ]
    return HandLandmarks(
        handedness="Left" if left else "Right",
        score=round(float(0.93 + rng.uniform(0, 0.06)), 3),
        landmarks=landmarks,
    )


class SessionBuilder:
    """Builds a timeline of frames and labels at 30 fps."""

    def __init__(
        self,
        person: Participant,
        seed: int,
        distance_m: float = 1.0,
        noise_px: float = 1.2,
        dropout: float = 0.0,
    ):
        self.person = person
        self.rng = np.random.default_rng(seed)
        self.noise_px = noise_px  # landmark jitter; a dim room makes the detector less steady
        self.dropout = dropout  # share of frames in which the detector finds no hand
        self.dropout_rng = np.random.default_rng(seed + 7)  # separate, so dropout 0 changes nothing
        self.size = person.hand_size / distance_m
        self.frames: list[SessionFrame] = []
        self.labels: list[SessionLabel] = []
        self.t = 0.0
        self.centre = np.array([430.0, 250.0])

    def _emit(self, hands: list[HandLandmarks]) -> None:
        if self.dropout and self.dropout_rng.random() < self.dropout:
            hands = []
        self.frames.append(SessionFrame(t=round(self.t, 4), hands=hands))
        self.t += 1.0 / FPS

    def _drift(self, amount: float) -> None:
        """Small wandering of the hand centre (not a swipe)."""
        self.centre += self.rng.normal(0, amount, 2)
        self.centre = np.clip(self.centre, [200, 150], [520, 330])

    def gap(self, seconds: float) -> None:
        """No hand in view."""
        for _ in range(int(seconds * FPS)):
            self._emit([])

    def rest(self, seconds: float) -> None:
        """A relaxed, half-curled hand moving a little, as between gestures."""
        for _ in range(int(seconds * FPS)):
            self._drift(1.5)
            self._emit([self._hand("NONE")])

    def _hand(self, pose: str, left: bool = False, centre: np.ndarray | None = None) -> HandLandmarks:
        template = TEMPLATES[pose]
        points = hand_points(template, self.person, self.rng)
        roll = template.roll_deg + self.rng.normal(0, 4)
        c = self.centre if centre is None else centre
        return place(points, (float(c[0]), float(c[1])), self.size, roll, left, self.rng, self.noise_px)

    def hold(self, pose: str, seconds: float, label: str | None = None) -> None:
        start = self.t
        for _ in range(int(seconds * FPS)):
            self._drift(0.4)
            self._emit([self._hand(pose)])
        if label:
            self.labels.append(SessionLabel(start=round(start, 3), end=round(self.t, 3), gesture=label))

    def rest_toward(self, x: float, seconds: float) -> None:
        """Rest while the hand glides slowly to image column `x` (a swipe then starts from there)."""
        n = int(seconds * FPS)
        step = (x - self.centre[0]) / max(n, 1)
        for _ in range(n):
            self.centre[0] += step
            self.centre[1] += self.rng.normal(0, 1.0)
            self._emit([self._hand("NONE")])

    def swipe_from_rest(self, direction: int, travel_lengths: float = 3.0, duration_s: float = 0.3) -> None:
        """A swipe that starts where the hand rests and ends where the arm stops (no jumps)."""
        start = self.t
        n = max(2, int(duration_s * FPS))
        x0 = float(self.centre[0])
        travel = direction * travel_lengths * self.size
        for i in range(n):
            phase = 0.5 - 0.5 * np.cos(np.pi * i / (n - 1))
            centre = np.array([x0 + travel * phase, self.centre[1] + self.rng.normal(0, 2)])
            self._emit([self._hand("OPEN_PALM", centre=centre)])
        self.centre[0] = x0 + travel
        gesture = Gesture.SWIPE_RIGHT if direction > 0 else Gesture.SWIPE_LEFT
        self.labels.append(SessionLabel(start=round(start, 3), end=round(self.t, 3), gesture=gesture))

    def swipe(self, direction: int, travel_lengths: float = 3.0, duration_s: float = 0.3) -> None:
        """Palm moves sideways; direction +1 is the presenter's right (image right, mirrored)."""
        start = self.t
        n = max(2, int(duration_s * FPS))
        x0 = float(self.centre[0])
        travel = direction * travel_lengths * self.size
        for i in range(n):
            phase = 0.5 - 0.5 * np.cos(np.pi * i / (n - 1))  # ease in and out like a real arm
            centre = np.array([x0 + travel * (phase - 0.5), self.centre[1] + self.rng.normal(0, 2)])
            self._emit([self._hand("OPEN_PALM", centre=centre)])
        gesture = Gesture.SWIPE_RIGHT if direction > 0 else Gesture.SWIPE_LEFT
        self.labels.append(SessionLabel(start=round(start, 3), end=round(self.t, 3), gesture=gesture))

    def two_hands(self, right_pose: str, left_pose: str, seconds: float, label: str) -> None:
        start = self.t
        for _ in range(int(seconds * FPS)):
            self._drift(0.4)
            right = self._hand(right_pose, centre=self.centre + np.array([70.0, 0.0]))
            left = self._hand(left_pose, left=True, centre=self.centre - np.array([150.0, 0.0]))
            self._emit([right, left])
        self.labels.append(SessionLabel(start=round(start, 3), end=round(self.t, 3), gesture=label))

    def talking(self, seconds: float) -> None:
        """Hands moving while someone talks: slow waves, half-open shapes, hands dropping out."""
        start = self.t
        end = self.t + seconds
        while self.t < end:
            choice = self.rng.random()
            if choice < 0.2:
                self.gap(self.rng.uniform(0.5, 2.0))
                continue
            pose = self.rng.choice(["NONE", "NONE", "NONE", "COUNT_2", "OPEN_PALM", "FIST"])
            for _ in range(int(self.rng.uniform(0.2, 0.7) * FPS)):
                self._drift(6.0)  # gesturing while talking: faster wander than a held pose
                self._emit([self._hand(str(pose))])
        self.labels.append(SessionLabel(start=round(start, 3), end=round(self.t, 3), gesture="TALKING"))

    def header(
        self, session_id: str, kind: str, distance_m: float = 1.0, lighting: str = "normal"
    ) -> SessionHeader:
        return SessionHeader(
            id=session_id,
            kind=kind,
            source="synthetic",
            participant=self.person.name,
            distance_m=distance_m,
            lighting=lighting,
            luminance_mean=None,
            fps=FPS,
            created_at=datetime(2026, 10, 1, tzinfo=UTC).isoformat(),
            labels=self.labels,
        )


POSE_GESTURES = [
    "FIST",
    "OPEN_PALM",
    "THUMBS_UP",
    "THUMBS_DOWN",
    "COUNT_1",
    "COUNT_2",
    "COUNT_3",
    "COUNT_4",
    "COUNT_5",
]


# A dim room is simulated as a less steady detector (more jitter, some frames with no hand), with
# a plausible mean picture brightness (0-255). Synthetic sessions say so in their header.
LIGHTING = {
    "bright": {"noise_px": 1.2, "dropout": 0.0, "luminance": 168.0},
    "normal": {"noise_px": 1.2, "dropout": 0.0, "luminance": 121.0},
    "dim": {"noise_px": 2.4, "dropout": 0.04, "luminance": 47.0},
}


def gestures_session(
    person: Participant,
    seed: int,
    distance_m: float = 1.0,
    lighting: str = "normal",
    rounds: int = 3,
    swipes_each_way: int = 10,
) -> tuple[SessionHeader, list[SessionFrame]]:
    """Each pose held 4 s, `rounds` times, with rests; then swipes each way."""
    look = LIGHTING[lighting]
    b = SessionBuilder(person, seed, distance_m, look["noise_px"], look["dropout"])
    b.gap(0.5)
    for _round in range(rounds):
        for pose in POSE_GESTURES:
            b.rest(1.0)
            b.hold(pose, 4.0, label=pose)
    for direction in (+1, -1):
        for _ in range(swipes_each_way):
            b.rest_toward(IMAGE_W / 2 - direction * 1.5 * b.size, 1.2)  # so the whole swipe stays in view
            b.swipe_from_rest(direction)
    b.rest(1.0)
    sid = f"synthetic-gestures-{person.name}"
    if distance_m != 1.0 or lighting != "normal":
        sid += f"-{distance_m:g}m-{lighting}"
    header = b.header(sid, "gestures", distance_m, lighting)
    header.luminance_mean = look["luminance"]
    return header, b.frames


def talking_session(person: Participant, seed: int, minutes: float = 3.0):
    b = SessionBuilder(person, seed)
    b.talking(minutes * 60)
    return b.header(f"synthetic-talking-{person.name}", "talking"), b.frames


def two_hand_session(seed: int):
    """Five on one hand plus two on the other: slide 7."""
    b = SessionBuilder(PARTICIPANTS[0], seed)
    b.gap(0.5)
    b.hold("THUMBS_UP", 1.6, label="THUMBS_UP")
    b.rest(1.8)
    b.two_hands("COUNT_5", "COUNT_2", 1.6, label="COUNT_7")
    b.rest(1.5)
    return b.header("synthetic-two-hand", "two_hand"), b.frames


def demo_session(seed: int):
    """The scripted demo: go live, next, next, previous, jump 3, blank, unblank, pause."""
    b = SessionBuilder(PARTICIPANTS[0], seed)
    b.gap(1.0)
    b.rest(0.8)
    b.hold("THUMBS_UP", 1.5, label="THUMBS_UP")
    b.rest(2.0)
    b.swipe(+1)
    b.rest(1.5)
    b.swipe(+1)
    b.rest(1.5)
    b.swipe(-1)
    b.rest(1.5)
    b.hold("COUNT_3", 1.5, label="COUNT_3")
    b.rest(1.5)
    b.hold("OPEN_PALM", 1.3, label="OPEN_PALM")
    b.rest(1.5)
    b.hold("OPEN_PALM", 1.3, label="OPEN_PALM")
    b.rest(1.5)
    b.hold("THUMBS_UP", 1.5, label="THUMBS_UP")
    b.rest(1.0)
    b.gap(1.0)
    return b.header("synthetic-demo", "demo"), b.frames
