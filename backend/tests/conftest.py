import pytest
from fastapi.testclient import TestClient

from app import db
from app.main import app


@pytest.fixture()
def client(tmp_path, monkeypatch):
    """A TestClient backed by a fresh, isolated SQLite file per test."""
    monkeypatch.setattr(db, "DB_PATH", str(tmp_path / "test.db"))
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def auth_headers(client):
    response = client.post(
        "/api/auth/signup",
        json={"email": "test@example.com", "password": "password123"},
    )
    token = response.json()["token"]
    return {"Authorization": f"Bearer {token}"}
