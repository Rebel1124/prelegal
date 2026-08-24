def test_signup_returns_token(client):
    response = client.post(
        "/api/auth/signup", json={"email": "new@example.com", "password": "password123"}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["email"] == "new@example.com"
    assert body["token"]


def test_signup_rejects_duplicate_email(client):
    client.post("/api/auth/signup", json={"email": "dup@example.com", "password": "password123"})

    response = client.post(
        "/api/auth/signup", json={"email": "dup@example.com", "password": "password123"}
    )

    assert response.status_code == 409


def test_signup_rejects_short_password(client):
    response = client.post(
        "/api/auth/signup", json={"email": "short@example.com", "password": "short"}
    )

    assert response.status_code == 422


def test_login_succeeds_with_correct_password(client):
    client.post("/api/auth/signup", json={"email": "login@example.com", "password": "password123"})

    response = client.post(
        "/api/auth/login", json={"email": "login@example.com", "password": "password123"}
    )

    assert response.status_code == 200
    assert response.json()["token"]


def test_login_fails_with_wrong_password(client):
    client.post("/api/auth/signup", json={"email": "login2@example.com", "password": "password123"})

    response = client.post(
        "/api/auth/login", json={"email": "login2@example.com", "password": "wrong-password"}
    )

    assert response.status_code == 401


def test_login_fails_for_unknown_email(client):
    response = client.post(
        "/api/auth/login", json={"email": "nobody@example.com", "password": "password123"}
    )

    assert response.status_code == 401


def test_protected_route_rejects_missing_token(client):
    response = client.get("/api/documents/mine")

    assert response.status_code == 401


def test_protected_route_rejects_invalid_token(client):
    response = client.get("/api/documents/mine", headers={"Authorization": "Bearer not-a-real-token"})

    assert response.status_code == 401


def test_protected_route_accepts_valid_token(client, auth_headers):
    response = client.get("/api/documents/mine", headers=auth_headers)

    assert response.status_code == 200
    assert response.json() == []
