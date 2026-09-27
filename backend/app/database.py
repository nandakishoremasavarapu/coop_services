"""MongoDB connection management.

A single Motor (async MongoDB driver) client is created for the whole process
and shared across requests. All access goes through ``get_db()`` so the
connection is reused efficiently.

For offline demos and the automated test-suite, ``MONGODB_URI=mongomock://memory``
swaps in an in-memory mock implementation (mongomock-motor) so the API can run
without network access. That mode is for development/testing only.
"""

import logging
from typing import Any, Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from .config import get_settings

logger = logging.getLogger("shramsetu.db")

# Process-wide client cache (avoids opening a new connection per request/hot-reload).
_client: Optional[AsyncIOMotorClient] = None
_db: Optional[AsyncIOMotorDatabase] = None


def _build_client(uri: str) -> AsyncIOMotorClient:
    if uri.startswith("mongomock://"):
        try:
            from mongomock_motor import AsyncMongoMockClient
        except ImportError as exc:  # pragma: no cover
            raise RuntimeError(
                "MONGODB_URI uses the in-memory mock database but the "
                "'mongomock-motor' package is not installed. "
                "Install it with: pip install mongomock-motor"
            ) from exc
        logger.warning(
            "[db] Using in-memory MOCK MongoDB (mongomock). Data is NOT persisted. "
            "Set MONGODB_URI to your MongoDB Atlas connection string for real storage."
        )
        return AsyncMongoMockClient()  # type: ignore[return-value]
    return AsyncIOMotorClient(uri, serverSelectionTimeoutMS=15000, tz_aware=True)


def get_client() -> AsyncIOMotorClient:
    """Return the shared Motor client, creating it on first use."""
    global _client
    if _client is None:
        settings = get_settings()
        _client = _build_client(settings.mongodb_uri)
    return _client


def get_database() -> AsyncIOMotorDatabase:
    """Return the shared database handle."""
    global _db
    if _db is None:
        settings = get_settings()
        _db = get_client()[settings.mongodb_db_name]
    return _db


async def close_client() -> None:
    """Close the shared client (called on application shutdown)."""
    global _client, _db
    if _client is not None:
        try:
            _client.close()
        except Exception:  # pragma: no cover
            pass
    _client = None
    _db = None


def reset_client() -> None:
    """Force a new client on next access (used by the test-suite)."""
    global _client, _db
    _client = None
    _db = None


# Collection name constants - single source of truth.
USERS = "users"
CUSTOMER_PROFILES = "customer_profiles"
PROVIDER_PROFILES = "provider_profiles"
IDENTITY_VERIFICATIONS = "identity_verifications"
FEDERATIONS = "federations"
SOCIETIES = "societies"
SERVICE_CATEGORIES = "service_categories"
SPECIFIC_SERVICES = "specific_services"
SKILLS = "skills"
PROVIDER_SKILLS = "provider_skills"
BOOKINGS = "bookings"
QUOTES = "quotes"
PRICE_REVISIONS = "price_revisions"
MILESTONE_CONFIRMATIONS = "milestone_confirmations"
PAYMENTS = "payments"
INVOICES = "invoices"
RATINGS = "ratings"
CONVERSATIONS = "conversations"
MESSAGES = "messages"
CANCELLATIONS = "cancellations"
DISPUTES = "disputes"
WELFARE_RECORDS = "welfare_records"
NOTIFICATIONS = "notifications"
AUDIT_EVENTS = "audit_events"
ADMIN_SETTINGS = "admin_settings"
WELFARE_STATE = "welfare_state"
CERTIFICATIONS = "certifications"


async def ensure_indexes(db: AsyncIOMotorDatabase) -> None:
    """Create the collections' indexes.

    Safe to run repeatedly (MongoDB creates indexes idempotently).
    """
    await db[USERS].create_index([("phone", 1)], unique=True)
    await db[USERS].create_index([("email", 1)], unique=True, sparse=True)
    await db[USERS].create_index([("role", 1)])

    await db[CUSTOMER_PROFILES].create_index([("userId", 1)], unique=True)
    await db[PROVIDER_PROFILES].create_index([("userId", 1)], unique=True)
    await db[PROVIDER_PROFILES].create_index([("verificationStatus", 1)])
    await db[IDENTITY_VERIFICATIONS].create_index([("userId", 1)])

    await db[SOCIETIES].create_index([("name", 1)], unique=True)
    await db[FEDERATIONS].create_index([("name", 1)])

    await db[SERVICE_CATEGORIES].create_index([("name", 1)], unique=True)
    await db[SERVICE_CATEGORIES].create_index([("sortOrder", 1)])
    await db[SPECIFIC_SERVICES].create_index([("categoryId", 1), ("name", 1)], unique=True)

    await db[SKILLS].create_index([("name", 1), ("categoryId", 1)], unique=True)
    await db[PROVIDER_SKILLS].create_index([("providerId", 1)])
    await db[PROVIDER_SKILLS].create_index([("skillId", 1)])

    await db[BOOKINGS].create_index([("customerId", 1), ("createdAt", -1)])
    await db[BOOKINGS].create_index([("providerId", 1), ("createdAt", -1)])
    await db[BOOKINGS].create_index([("status", 1)])

    await db[QUOTES].create_index([("bookingId", 1), ("providerId", 1)], unique=True)
    await db[QUOTES].create_index([("bookingId", 1)])

    await db[PRICE_REVISIONS].create_index([("bookingId", 1)])
    await db[MILESTONE_CONFIRMATIONS].create_index([("bookingId", 1)])
    await db[PAYMENTS].create_index([("bookingId", 1)])
    await db[INVOICES].create_index([("bookingId", 1)])
    await db[INVOICES].create_index([("invoiceNumber", 1)], unique=True)
    await db[RATINGS].create_index([("bookingId", 1)], unique=True)
    await db[RATINGS].create_index([("providerId", 1)])

    await db[CONVERSATIONS].create_index([("bookingId", 1)])
    await db[CONVERSATIONS].create_index([("participantIds", 1)])
    await db[MESSAGES].create_index([("conversationId", 1), ("createdAt", 1)])

    await db[NOTIFICATIONS].create_index([("recipientId", 1), ("createdAt", -1)])
    await db[WELFARE_RECORDS].create_index([("providerId", 1)])
    await db[AUDIT_EVENTS].create_index([("createdAt", -1)])


async def ping(db: AsyncIOMotorDatabase) -> bool:
    """Return True if the database answers a ping command."""
    try:
        await db.command("ping")
        return True
    except Exception as exc:  # pragma: no cover - network/Atlas issues
        logger.error("[db] ping failed: %s", exc)
        return False


def collection(name: str) -> Any:
    """Convenience accessor used by scripts (seed, etc.)."""
    return get_database()[name]
