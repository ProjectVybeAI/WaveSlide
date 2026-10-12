"""The scripted synthetic demo through replay source, pipeline and key sender, with no webcam."""

import time

import numpy as np

from app.config import BACKEND_DIR
from app.contract.settings import Settings
from app.core.pipeline import Pipeline
from app.dataset.store import write_session
from app.dataset.synthetic import demo_session
from app.engine.command_log import CommandLog
from app.engine.dispatcher import Dispatcher
from app.engine.sources import ReplayLandmarkSource
from app.keys.sender import RecordingSender

TALKING = BACKEND_DIR / "tests" / "fixtures" / "sessions" / "synthetic-talking-p1.jsonl"

SCRIPTED = [
    ("toggle_active", None),
    ("next", None),
    ("next", None),
    ("previous", None),
    ("jump", 3),
    ("blank_toggle", None),
    ("blank_toggle", None),
    ("toggle_active", None),
]


def _replay_demo(tmp_path, os_name="darwin"):
    header, frames = demo_session(42)
    path = tmp_path / "synthetic-demo.jsonl"
    write_session(path, header, frames)
    source = ReplayLandmarkSource(path, realtime=False, loop=False)  # as fast as possible
    pipeline = Pipeline(Settings(), os_name=os_name)  # the app starts paused
    sender = RecordingSender()
    dispatcher = Dispatcher(sender, CommandLog(None), lambda: [], lambda: True)
    commands, states, times = [], [], []
    while (frame := source.read()) is not None:
        started = time.perf_counter()
        out = pipeline.process(frame)
        times.append((time.perf_counter() - started) * 1000)
        states.append(out.state)
        for command in out.commands:
            commands.append(command)
            dispatcher.dispatch(command, "powerpoint", frame.captured_at)
    return commands, sender, states, times


def test_full_demo_replay_produces_exactly_the_scripted_command_list(tmp_path):
    commands, sender, states, _ = _replay_demo(tmp_path)
    assert [(c.action.value, c.slide) for c in commands] == SCRIPTED
    assert all(c.blocked_reason is None for c in commands)
    assert states[-1].value == "PAUSED"  # the demo ends paused: "Paused", and no other command


def test_demo_presses_the_powerpoint_keys_in_order(tmp_path):
    _, sender, _, _ = _replay_demo(tmp_path)
    assert sender.sent == [["right"], ["right"], ["left"], ["3", "enter"], ["b"], ["b"]]


def test_demo_on_windows_uses_the_win32_keys_and_activation_presses_none(tmp_path):
    commands, _, _, _ = _replay_demo(tmp_path, os_name="win32")
    assert [c.keys for c in commands] == [
        [],
        ["right"],
        ["right"],
        ["left"],
        ["3", "enter"],
        ["b"],
        ["b"],
        [],
    ]


def test_replay_pipeline_time_p95_is_under_5_ms_per_frame(tmp_path):
    _, _, _, demo_times = _replay_demo(tmp_path)
    source = ReplayLandmarkSource(TALKING, realtime=False, loop=False)
    pipeline = Pipeline(Settings(start_paused=False), os_name="darwin")
    talking_times = []
    while (frame := source.read()) is not None:
        started = time.perf_counter()
        pipeline.process(frame)
        talking_times.append((time.perf_counter() - started) * 1000)
    for times in (demo_times, talking_times):
        assert len(times) > 500
        assert np.percentile(times, 95) < 5.0


def test_half_a_minute_of_talking_causes_no_command_active_or_paused():
    for start_paused in (True, False):
        source = ReplayLandmarkSource(TALKING, realtime=False, loop=False)
        pipeline = Pipeline(Settings(start_paused=start_paused), os_name="darwin")
        commands = []
        while (frame := source.read()) is not None:
            commands += pipeline.process(frame).commands
        assert commands == []
