from types import SimpleNamespace

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def make_completion_response(matched_slug, reply: str):
    import json

    payload = json.dumps({"matchedSlug": matched_slug, "reply": reply})
    message = SimpleNamespace(content=payload)
    return SimpleNamespace(choices=[SimpleNamespace(message=message)])


def test_suggest_returns_matched_slug(monkeypatch):
    def fake_completion(**kwargs):
        assert kwargs["messages"][1] == {"role": "user", "content": "I need a data processing addendum"}
        return make_completion_response("data-processing-agreement", "Sounds like a DPA is the closest fit.")

    monkeypatch.setattr("app.document_suggest.completion", fake_completion)

    response = client.post(
        "/api/documents/suggest",
        json={"description": "I need a data processing addendum"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["matchedSlug"] == "data-processing-agreement"
    assert body["reply"] == "Sounds like a DPA is the closest fit."


def test_suggest_discards_hallucinated_slug(monkeypatch):
    def fake_completion(**kwargs):
        return make_completion_response("not-a-real-slug", "Not sure this fits our catalog.")

    monkeypatch.setattr("app.document_suggest.completion", fake_completion)

    response = client.post(
        "/api/documents/suggest",
        json={"description": "I need a will and testament"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["matchedSlug"] is None
