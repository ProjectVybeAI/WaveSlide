import pytest
from fastapi.testclient import TestClient

from app.config import Config
from app.main import create_app


def pytest_configure(config):
    config.addinivalue_line("markers", "camera: needs a webcam")
    config.addinivalue_line("markers", "keys: sends real key presses")


@pytest.fixture
def config(tmp_path) -> Config:
    return Config(source="replay", keys="record", data_dir=tmp_path / "data")


@pytest.fixture
def client(config):
    """API with the engine stopped: fast, deterministic REST tests."""
    with TestClient(create_app(config, start_engine=False)) as c:
        yield c


@pytest.fixture
def live_client(config):
    """API with the engine thread replaying synthetic-demo (no webcam, no real keys)."""
    with TestClient(create_app(config, start_engine=True)) as c:
        yield c
