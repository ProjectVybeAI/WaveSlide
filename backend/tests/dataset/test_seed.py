from app.dataset.store import iter_frames, read_header, write_session
from app.dataset.synthetic import demo_session


def test_seed_is_byte_identical_across_runs(tmp_path):
    for name in ("a", "b"):
        header, frames = demo_session(42)
        write_session(tmp_path / f"{name}.jsonl", header, frames)
    assert (tmp_path / "a.jsonl").read_bytes() == (tmp_path / "b.jsonl").read_bytes()


def test_session_files_hold_landmarks_only(tmp_path):
    header, frames = demo_session(42)
    path = tmp_path / "demo.jsonl"
    write_session(path, header, frames)
    assert read_header(path).source == "synthetic"
    first = next(f for f in iter_frames(path) if f.hands)
    assert set(first.model_dump()) == {"t", "hands"}
    assert len(first.hands[0].landmarks) == 21


def test_demo_script_labels_every_scripted_gesture():
    header, _ = demo_session(42)
    assert [label.gesture for label in header.labels] == [
        "THUMBS_UP",
        "SWIPE_RIGHT",
        "SWIPE_RIGHT",
        "SWIPE_LEFT",
        "COUNT_3",
        "OPEN_PALM",
        "OPEN_PALM",
        "THUMBS_UP",
    ]
