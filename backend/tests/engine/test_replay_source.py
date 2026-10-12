from app.config import BACKEND_DIR
from app.engine.sources import ReplayLandmarkSource

DEMO = BACKEND_DIR / "tests" / "fixtures" / "sessions" / "synthetic-demo.jsonl"


def test_replay_yields_frames_in_order_with_21_points():
    source = ReplayLandmarkSource(DEMO, realtime=False, loop=False)
    times, hands_seen = [], 0
    while (frame := source.read()) is not None:
        times.append(frame.t)
        for hand in frame.hands:
            assert hand.points.shape == (21, 3)
            hands_seen += 1
    assert times == sorted(times)
    assert len(times) > 500
    assert hands_seen > 0


def test_looping_replay_keeps_time_increasing():
    source = ReplayLandmarkSource(DEMO, realtime=False, loop=True)
    times = [source.read().t for _ in range(1500)]
    assert all(b > a for a, b in zip(times, times[1:], strict=False))
