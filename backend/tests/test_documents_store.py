from types import SimpleNamespace

from app.document_chat import build_fields_model, build_response_model


def make_completion_response(response_model, reply: str, fields: dict):
    payload = response_model(reply=reply, fields=fields).model_dump_json(by_alias=True)
    message = SimpleNamespace(content=payload)
    return SimpleNamespace(choices=[SimpleNamespace(message=message)])


def send_chat_message(client, headers, slug, message, monkeypatch):
    fields_model = build_fields_model(slug)
    response_model = build_response_model(slug)

    def fake_completion(**kwargs):
        fields = fields_model(effectiveDate="2026-03-01")
        return make_completion_response(response_model, "Got it!", fields.model_dump(by_alias=True))

    monkeypatch.setattr("app.document_chat.completion", fake_completion)

    return client.post(
        f"/api/documents/{slug}/chat",
        headers=headers,
        json={
            "messages": [{"role": "user", "content": message}],
            "fields": fields_model().model_dump(by_alias=True),
        },
    ).json()


def signup(client, email):
    token = client.post(
        "/api/auth/signup", json={"email": email, "password": "password123"}
    ).json()["token"]
    return {"Authorization": f"Bearer {token}"}


def test_document_shows_up_in_mine_after_first_chat_turn(client, auth_headers, monkeypatch):
    result = send_chat_message(client, auth_headers, "mutual-nda", "Set the date", monkeypatch)

    mine = client.get("/api/documents/mine", headers=auth_headers).json()

    assert len(mine) == 1
    assert mine[0]["id"] == result["documentId"]
    assert mine[0]["slug"] == "mutual-nda"
    assert mine[0]["name"] == "Mutual Non-Disclosure Agreement"


def test_starting_a_second_document_of_same_type_creates_a_new_instance(client, auth_headers, monkeypatch):
    first = send_chat_message(client, auth_headers, "mutual-nda", "First draft", monkeypatch)
    second = send_chat_message(client, auth_headers, "mutual-nda", "Second draft", monkeypatch)

    assert first["documentId"] != second["documentId"]

    mine = client.get("/api/documents/mine", headers=auth_headers).json()
    assert len(mine) == 2


def test_document_detail_returns_fields_and_messages(client, auth_headers, monkeypatch):
    result = send_chat_message(client, auth_headers, "mutual-nda", "Set the date", monkeypatch)

    detail = client.get(f"/api/documents/{result['documentId']}", headers=auth_headers).json()

    assert detail["slug"] == "mutual-nda"
    assert detail["fields"]["effectiveDate"] == "2026-03-01"
    assert detail["messages"] == [
        {"role": "user", "content": "Set the date"},
        {"role": "assistant", "content": "Got it!"},
    ]


def test_document_id_cannot_be_reused_against_a_different_slug(client, auth_headers, monkeypatch):
    nda = send_chat_message(client, auth_headers, "mutual-nda", "Set the date", monkeypatch)

    fields_model = build_fields_model("cloud-service-agreement")
    response_model = build_response_model("cloud-service-agreement")

    def fake_completion(**kwargs):
        fields = fields_model(effectiveDate="2026-04-01")
        return make_completion_response(response_model, "Got it!", fields.model_dump(by_alias=True))

    monkeypatch.setattr("app.document_chat.completion", fake_completion)

    response = client.post(
        "/api/documents/cloud-service-agreement/chat",
        headers=auth_headers,
        json={
            "messages": [{"role": "user", "content": "Set the date"}],
            "fields": fields_model().model_dump(by_alias=True),
            "documentId": nda["documentId"],
        },
    )

    assert response.status_code == 404

    detail = client.get(f"/api/documents/{nda['documentId']}", headers=auth_headers).json()
    assert detail["slug"] == "mutual-nda"
    assert detail["fields"]["effectiveDate"] == "2026-03-01"


def test_user_cannot_see_another_users_documents(client, auth_headers, monkeypatch):
    result = send_chat_message(client, auth_headers, "mutual-nda", "Set the date", monkeypatch)

    other_headers = signup(client, "other@example.com")

    assert client.get("/api/documents/mine", headers=other_headers).json() == []
    assert client.get(f"/api/documents/{result['documentId']}", headers=other_headers).status_code == 404
