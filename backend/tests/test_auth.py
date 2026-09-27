"""Authentication & registration tests."""


async def test_health(client):
    response = await client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"ok": True}


async def test_register_customer(client):
    response = await client.post(
        "/api/auth/register",
        json={
            "phone": "9812345678",
            "password": "secret123",
            "role": "customer",
            "fullName": "New Customer",
            "email": "new@example.com",
            "city": "Visakhapatnam",
            "pincode": "530026",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["user"]["role"] == "customer"
    assert data["user"]["profileName"] == "New Customer"
    assert "password" not in str(data).lower()

    # The session cookie must be set and usable.
    assert "session" in response.cookies
    me = await client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["user"]["phone"] == "9812345678"
    assert me.json()["user"]["profile"]["fullName"] == "New Customer"


async def test_register_provider_creates_pending_verification(client):
    response = await client.post(
        "/api/auth/register",
        json={
            "phone": "9823456789",
            "password": "secret123",
            "role": "provider",
            "fullName": "New Provider",
            "experience": "6",
            "bio": "Test bio",
        },
    )
    assert response.status_code == 200
    me = await client.get("/api/auth/me")
    profile = me.json()["user"]["profile"]
    assert profile["verificationStatus"] == "pending"
    assert profile["experience"] == 6


async def test_register_duplicate_phone_rejected(client):
    payload = {
        "phone": "9100000001",
        "password": "secret123",
        "role": "customer",
        "fullName": "Duplicate",
    }
    response = await client.post("/api/auth/register", json=payload)
    assert response.status_code == 409
    assert "error" in response.json()


async def test_register_admin_role_blocked(client):
    """Administrative roles must never be self-registered (privilege escalation)."""
    for role in ("federation_admin", "society_admin", "super_admin"):
        response = await client.post(
            "/api/auth/register",
            json={
                "phone": "9899999999",
                "password": "secret123",
                "role": role,
                "fullName": "Hacker",
            },
        )
        assert response.status_code == 400, role
        assert "error" in response.json()


async def test_login_success(client):
    response = await client.post(
        "/api/auth/login", json={"phone": "9100000001", "password": "password123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["profileName"] == "Priya Menon"
    assert data["user"]["role"] == "customer"


async def test_login_wrong_password(client):
    response = await client.post(
        "/api/auth/login", json={"phone": "9100000001", "password": "wrong"}
    )
    assert response.status_code == 401
    assert response.json()["error"] == "Invalid credentials"


async def test_login_unknown_user(client):
    response = await client.post(
        "/api/auth/login", json={"phone": "0000000000", "password": "x" * 10}
    )
    assert response.status_code == 401


async def test_me_requires_auth(client):
    response = await client.get("/api/auth/me")
    assert response.status_code == 401


async def test_forged_session_cookie_rejected(client):
    """Unsigned / tampered tokens must be rejected by the signature check."""
    import base64
    import json

    payload = base64.urlsafe_b64encode(
        json.dumps(
            {"userId": "000000000000000000000000", "role": "super_admin", "exp": 9999999999}
        ).encode()
    ).decode().rstrip("=")
    forged = f"{payload}.deadbeef"
    response = await client.get(
        "/api/auth/me", headers={"Authorization": f"Bearer {forged}"}
    )
    assert response.status_code == 401


async def test_logout_clears_session(client):
    response = await client.post(
        "/api/auth/login", json={"phone": "9100000001", "password": "password123"}
    )
    assert response.status_code == 200
    assert (await client.get("/api/auth/me")).status_code == 200

    response = await client.post("/api/auth/logout")
    assert response.status_code == 200
    assert response.json()["success"] is True
    # Cookie is cleared (Max-Age=0) -> subsequent me call is unauthorized.
    response = await client.get("/api/auth/me")
    assert response.status_code == 401


async def test_password_hashing_is_bcrypt(client):
    """Stored hashes must be salted bcrypt, not plain or SHA-256."""
    from app.database import USERS, get_database

    user = await get_database()[USERS].find_one({"phone": "9100000001"})
    assert user["passwordHash"].startswith("$2")
    assert len(user["passwordHash"]) >= 50
