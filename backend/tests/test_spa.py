"""The built UI is served by the engine: files only from the build folder, JSON errors for the API."""

import pytest
from fastapi.testclient import TestClient

from app import main
from app.main import create_app


@pytest.fixture
def spa_client(config, tmp_path, monkeypatch):
    dist = tmp_path / "frontend" / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "index.html").write_text("<html>WaveSlide UI</html>")
    (dist / "assets" / "app.js").write_text("console.log('ok')")
    (tmp_path / "frontend" / "secret.txt").write_text("not for the web")
    monkeypatch.setattr(main, "FRONTEND_DIST", dist)
    with TestClient(create_app(config, start_engine=False)) as c:
        yield c


def test_unknown_page_falls_back_to_index_html(spa_client):
    response = spa_client.get("/settings")
    assert response.status_code == 200 and "WaveSlide UI" in response.text


def test_path_traversal_cannot_leave_the_build_folder(spa_client):
    for url in ("/../secret.txt", "/%2e%2e/secret.txt", "/..%2fsecret.txt"):
        response = spa_client.get(url)
        assert "not for the web" not in response.text


def test_unknown_api_and_ws_paths_are_a_json_404_not_the_ui(spa_client):
    for url in ("/api/nothing-here", "/ws/nothing-here"):
        response = spa_client.get(url)
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "NOT_FOUND"
