"""Shared pytest fixtures.

The suite runs against an in-memory mock MongoDB (mongomock-motor) so it needs
no network access or Atlas credentials. Environment variables are set BEFORE
the app is imported so the cached settings pick them up. Every test gets a
freshly seeded database, giving full isolation between tests.
"""

import os

# --- must happen before any app import -----------------------------------
os.environ["MONGODB_URI"] = "mongomock://memory"
os.environ["MONGODB_DB_NAME"] = "shram_setu_test"
os.environ["SECRET_KEY"] = "test-secret-key-for-pytest-only"
os.environ["SEED_ON_START"] = "false"
os.environ["BCRYPT_ROUNDS"] = "4"
os.environ["CORS_ORIGINS"] = "http://testserver"

import httpx  # noqa: E402

import pytest_asyncio  # noqa: E402

from app.config import get_settings  # noqa: E402
from app.database import ensure_indexes, get_database, reset_client  # noqa: E402
from app.main import app  # noqa: E402
from app.seed import seed_database  # noqa: E402

DEMO = {
    "customer": ("9100000001", "password123"),
    "customer2": ("9100000002", "password123"),
    "provider": ("9200000001", "password123"),
    "provider2": ("9200000002", "password123"),
    "provider3": ("9200000003", "password123"),
    "provider4": ("9200000004", "password123"),
    "society_admin": ("9000000002", "admin123"),
    "federation_admin": ("9000000001", "admin123"),
}

# Clients created by login() are closed by the `client` fixture teardown.
_TRACKED_CLIENTS: list = []


@pytest_asyncio.fixture(loop_scope="function")
async def client():
    """Async HTTP client bound to the FastAPI app, with a fresh seeded DB."""
    reset_client()
    db = get_database()
    await ensure_indexes(db)
    await seed_database(db)
    app.state.settings = get_settings()

    _TRACKED_CLIENTS.clear()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as async_client:
        yield async_client
        for extra in _TRACKED_CLIENTS:
            await extra.aclose()
        _TRACKED_CLIENTS.clear()


async def login(client: httpx.AsyncClient, persona: str) -> httpx.AsyncClient:
    """Return a NEW client logged in as a demo persona (isolated cookie jar,
    so tests can act as several users at once)."""
    phone, password = DEMO[persona]
    response = await client.post("/api/auth/login", json={"phone": phone, "password": password})
    assert response.status_code == 200, response.text
    token = response.cookies.get("session")
    assert token, "no session cookie set"

    persona_client = httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://testserver",
        cookies={"session": token},
    )
    _TRACKED_CLIENTS.append(persona_client)
    return persona_client


@pytest_asyncio.fixture(loop_scope="function")
async def customer_client(client):
    return await login(client, "customer")


@pytest_asyncio.fixture(loop_scope="function")
async def provider_client(client):
    return await login(client, "provider")


@pytest_asyncio.fixture(loop_scope="function")
async def admin_client(client):
    return await login(client, "society_admin")
