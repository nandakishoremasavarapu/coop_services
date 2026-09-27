"""Conversations between customers and providers."""

from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException

from ..database import (
    BOOKINGS,
    CONVERSATIONS,
    CUSTOMER_PROFILES,
    MESSAGES,
    PROVIDER_PROFILES,
    QUOTES,
    SERVICE_CATEGORIES,
    USERS,
    get_database,
)
from ..deps import get_current_user
from ..schemas.misc import ConversationCreateRequest
from ..serializers import to_object_id

router = APIRouter(prefix="/api/conversations", tags=["conversations"])

INTRO_MESSAGE_TEMPLATE = (
    "Namaste! I am {name}, your assigned cooperative specialist. "
    "I've received your request and have the required tools ready. "
    "Please feel free to message any flat/gate instructions or specific questions!"
)


async def _ensure_conversation(db, booking_id: Optional[str], customer_id, provider_id) -> str:
    """Find or create a conversation between a customer and a provider.

    Mirrors the previous implementation, including the fallback to the first
    registered provider when an invalid providerId is supplied and the
    seeded introductory greeting message.
    """
    # Resolve a valid provider user id.
    valid_provider_id = to_object_id(provider_id)
    if valid_provider_id is None or not await db[USERS].find_one(
        {"_id": valid_provider_id, "role": "provider"}
    ):
        first_provider = await db[USERS].find_one({"role": "provider"})
        if not first_provider:
            raise HTTPException(status_code=400, detail="No providers available")
        valid_provider_id = first_provider["_id"]

    valid_booking_id = None
    if booking_id:
        booking_oid = to_object_id(booking_id)
        if booking_oid is not None and await db[BOOKINGS].find_one({"_id": booking_oid}):
            valid_booking_id = booking_oid

    # Existing conversation for the same booking + participants?
    query: Dict[str, Any] = {
        "participantIds": {"$all": [customer_id, valid_provider_id]},
    }
    if valid_booking_id:
        query["bookingId"] = valid_booking_id
    existing = await db[CONVERSATIONS].find_one(query)
    if existing:
        has_messages = await db[MESSAGES].find_one({"conversationId": existing["_id"]})
        if not has_messages:
            profile = await db[PROVIDER_PROFILES].find_one({"userId": valid_provider_id})
            provider_name = (profile or {}).get("displayName") or "Specialist"
            await db[MESSAGES].insert_one(
                {
                    "conversationId": existing["_id"],
                    "senderId": valid_provider_id,
                    "content": INTRO_MESSAGE_TEMPLATE.format(name=provider_name),
                    "mediaUrl": None,
                    "isRead": False,
                    "createdAt": datetime.now(timezone.utc),
                }
            )
        return str(existing["_id"])

    now = datetime.now(timezone.utc)
    result = await db[CONVERSATIONS].insert_one(
        {
            "bookingId": valid_booking_id,
            "participantIds": [customer_id, valid_provider_id],
            "createdAt": now,
        }
    )

    profile = await db[PROVIDER_PROFILES].find_one({"userId": valid_provider_id})
    provider_name = (profile or {}).get("displayName") or "Specialist"
    await db[MESSAGES].insert_one(
        {
            "conversationId": result.inserted_id,
            "senderId": valid_provider_id,
            "content": INTRO_MESSAGE_TEMPLATE.format(name=provider_name),
            "mediaUrl": None,
            "isRead": False,
            "createdAt": datetime.now(timezone.utc),
        }
    )
    return str(result.inserted_id)


@router.get("")
async def list_conversations(user: Dict[str, Any] = Depends(get_current_user)):
    db = get_database()
    user_id = user["_id"]

    # Auto-ensure conversations for the customer's recent bookings (existing behaviour).
    if user["role"] == "customer":
        recent_bookings = (
            await db[BOOKINGS]
            .find({"customerId": user_id})
            .sort("createdAt", -1)
            .limit(10)
            .to_list(length=None)
        )
        for booking in recent_bookings:
            if booking.get("providerId"):
                try:
                    await _ensure_conversation(db, str(booking["_id"]), user_id, booking["providerId"])
                except HTTPException:
                    continue
            else:
                booking_quotes = (
                    await db[QUOTES]
                    .find({"bookingId": booking["_id"]})
                    .limit(3)
                    .to_list(length=None)
                )
                for quote in booking_quotes:
                    try:
                        await _ensure_conversation(db, str(booking["_id"]), user_id, quote["providerId"])
                    except HTTPException:
                        continue

    conversations = (
        await db[CONVERSATIONS]
        .find({"participantIds": user_id})
        .sort("createdAt", -1)
        .to_list(length=None)
    )

    enriched = []
    for conv in conversations:
        participant_ids = conv.get("participantIds") or []
        other_id = next((pid for pid in participant_ids if pid != user_id), user_id)

        other_user = await db[USERS].find_one({"_id": other_id})
        display_name = "Cooperative Specialist"
        photo_url = None
        rating_avg = "4.9"
        trade = "Certified Service Provider"
        phone = (other_user or {}).get("phone") or "9200000001"

        if (other_user or {}).get("role") == "provider":
            pp = await db[PROVIDER_PROFILES].find_one({"userId": other_id})
            if pp:
                display_name = pp.get("displayName") or display_name
                photo_url = pp.get("profilePhotoUrl")
                rating_avg = pp.get("ratingAvg") or "4.9"
                trade = pp.get("serviceArea") or "Cooperative Technician"
        else:
            cp = await db[CUSTOMER_PROFILES].find_one({"userId": other_id})
            if cp:
                display_name = cp.get("fullName") or display_name
                trade = cp.get("city") or "Resident Customer"

        booking_details = None
        if conv.get("bookingId"):
            booking = await db[BOOKINGS].find_one({"_id": conv["bookingId"]})
            if booking:
                category = None
                if booking.get("categoryId"):
                    category = await db[SERVICE_CATEGORIES].find_one(
                        {"_id": booking["categoryId"]}
                    )
                booking_details = {
                    "id": str(booking["_id"]),
                    "status": booking.get("status"),
                    "serviceDescription": booking.get("serviceDescription"),
                    "categoryName": (category or {}).get("name") or "Home Service",
                    "preferredTime": booking.get("preferredTime").isoformat()
                    if isinstance(booking.get("preferredTime"), datetime)
                    else booking.get("preferredTime"),
                    "isEmergency": booking.get("isEmergency"),
                    "address": booking.get("address"),
                }

        last_message = await db[MESSAGES].find_one(
            {"conversationId": conv["_id"]}, sort=[("createdAt", -1)]
        )
        unread_docs = await db[MESSAGES].find(
            {"conversationId": conv["_id"], "isRead": False}
        ).to_list(length=None)
        unread_count = sum(
            1
            for m in unread_docs
            if last_message and m.get("senderId") != user_id
        )

        enriched.append(
            {
                "id": str(conv["_id"]),
                "bookingId": str(conv["bookingId"]) if conv.get("bookingId") else None,
                "createdAt": conv.get("createdAt").isoformat()
                if isinstance(conv.get("createdAt"), datetime)
                else conv.get("createdAt"),
                "otherParticipant": {
                    "id": str(other_id),
                    "role": (other_user or {}).get("role") or "provider",
                    "displayName": display_name,
                    "photoUrl": photo_url,
                    "ratingAvg": rating_avg,
                    "trade": trade,
                    "phone": phone,
                },
                "booking": booking_details,
                "lastMessage": {
                    "id": str(last_message["_id"]),
                    "content": last_message.get("content"),
                    "mediaUrl": last_message.get("mediaUrl"),
                    "senderId": str(last_message.get("senderId")),
                    "isRead": last_message.get("isRead"),
                    "createdAt": last_message.get("createdAt").isoformat()
                    if isinstance(last_message.get("createdAt"), datetime)
                    else last_message.get("createdAt"),
                }
                if last_message
                else None,
                "unreadCount": unread_count,
            }
        )

    def _sort_key(item):
        last_at = item["lastMessage"]["createdAt"] if item["lastMessage"] else item["createdAt"]
        try:
            return datetime.fromisoformat(str(last_at).replace("Z", "+00:00"))
        except ValueError:
            return datetime.min.replace(tzinfo=timezone.utc)

    enriched.sort(key=_sort_key, reverse=True)
    return {"conversations": enriched}


@router.post("")
async def create_conversation(
    body: ConversationCreateRequest,
    user: Dict[str, Any] = Depends(get_current_user),
):
    db = get_database()
    conversation_id = await _ensure_conversation(
        db, body.bookingId, user["_id"], body.providerId
    )
    return {"success": True, "conversationId": conversation_id}
