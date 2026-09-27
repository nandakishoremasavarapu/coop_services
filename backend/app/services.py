"""Shared business-logic helpers used by several routers."""

from typing import Any, Dict, Optional

from .database import (
    CUSTOMER_PROFILES,
    NOTIFICATIONS,
    PROVIDER_PROFILES,
    get_database,
)
from .serializers import to_object_id


async def get_customer_profile(user_id) -> Optional[Dict[str, Any]]:
    return await get_database()[CUSTOMER_PROFILES].find_one({"userId": to_object_id(user_id)})


async def get_provider_profile(user_id) -> Optional[Dict[str, Any]]:
    return await get_database()[PROVIDER_PROFILES].find_one({"userId": to_object_id(user_id)})


async def get_profile_name(user: Dict[str, Any]) -> str:
    """Best display name for a user, mirroring the previous login /me logic."""
    role = user.get("role")
    if role == "customer":
        profile = await get_customer_profile(user["_id"])
        return (profile or {}).get("fullName") or ""
    if role == "provider":
        profile = await get_provider_profile(user["_id"])
        return (profile or {}).get("displayName") or ""
    if role == "society_admin":
        return "Society Administrator"
    if role == "federation_admin":
        return "Federation Administrator"
    if role == "super_admin":
        return "Platform Administrator"
    return ""


async def create_notification(
    recipient_id,
    ntype: str,
    title: str,
    content: Optional[str] = None,
    related_entity_id=None,
    related_entity_type: Optional[str] = None,
) -> None:
    """Insert an in-app notification (best-effort, never raises)."""
    from datetime import datetime, timezone

    try:
        await get_database()[NOTIFICATIONS].insert_one(
            {
                "recipientId": to_object_id(recipient_id),
                "type": ntype,
                "title": title,
                "content": content,
                "isRead": False,
                "relatedEntityId": to_object_id(related_entity_id),
                "relatedEntityType": related_entity_type,
                "createdAt": datetime.now(timezone.utc),
            }
        )
    except Exception:  # pragma: no cover - notifications must never break flows
        pass


def compute_fee(amount: float, fee_pct: float) -> Dict[str, str]:
    """Return finalPrice / platformFee / totalAmount strings for an amount."""
    fee = round(amount * fee_pct, 2)
    total = round(amount + fee, 2)
    return {
        "finalPrice": f"{amount:.2f}",
        "platformFee": f"{fee:.2f}",
        "totalAmount": f"{total:.2f}",
    }


def parse_amount(value: Any, default: float = 0.0) -> float:
    try:
        return float(str(value).replace(",", "").strip())
    except (TypeError, ValueError):
        return default


# Quote templates auto-generated when a customer submits a new service request.
# Preserved from the previous implementation so the existing UI demo flow works.
AUTO_QUOTE_TEMPLATES = [
    {
        "amount": "350.00",
        "note": "₹200 inspection/base labour + estimated switch/fuse component",
        "estimatedArrival": "~25 mins ETA",
    },
    {
        "amount": "400.00",
        "note": "Comprehensive switchboard, earth-leakage & MCB trip test included.",
        "estimatedArrival": "Available Today 4:30 PM",
    },
    {
        "amount": "380.00",
        "note": "Have replacement 2.5µF capacitors and heavy-duty regulator switches in current vehicle kit.",
        "estimatedArrival": "Arrives in ~40 mins",
    },
]
