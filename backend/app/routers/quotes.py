"""Provider quotes for service bookings."""

from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Query

from ..database import BOOKINGS, PROVIDER_PROFILES, QUOTES, get_database
from ..deps import get_current_user
from ..schemas.booking import QuoteCreateRequest
from ..serializers import serialize_doc, to_object_id
from ..services import create_notification

router = APIRouter(prefix="/api/quotes", tags=["quotes"])


async def _quotes_payload(db, booking_id) -> Dict[str, Any]:
    quotes = (
        await db[QUOTES].find({"bookingId": booking_id}).sort("createdAt", 1).to_list(length=None)
    )
    items = []
    for quote in quotes:
        provider = await db[PROVIDER_PROFILES].find_one({"userId": quote.get("providerId")})
        items.append({"quote": serialize_doc(quote), "provider": serialize_doc(provider)})
    return {"quotes": items}


@router.get("")
async def list_quotes(
    bookingId: str = Query(...),
    user: Dict[str, Any] = Depends(get_current_user),
):
    db = get_database()
    booking_oid = to_object_id(bookingId)
    if booking_oid is None:
        return {"quotes": []}
    return await _quotes_payload(db, booking_oid)


@router.post("")
async def submit_quote(
    body: QuoteCreateRequest,
    user: Dict[str, Any] = Depends(get_current_user),
):
    if user["role"] != "provider":
        raise HTTPException(status_code=401, detail="Unauthorized")

    db = get_database()
    booking_oid = to_object_id(body.bookingId)
    booking = (
        await db[BOOKINGS].find_one({"_id": booking_oid}) if booking_oid else None
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking["status"] not in ("submitted", "quoted"):
        raise HTTPException(
            status_code=400, detail="Cannot submit quote for this booking status"
        )

    existing = await db[QUOTES].find_one(
        {"bookingId": booking_oid, "providerId": user["_id"]}
    )
    if existing:
        raise HTTPException(
            status_code=409, detail="You have already submitted a quote for this booking"
        )

    now = datetime.now(timezone.utc)
    quote_doc = {
        "bookingId": booking_oid,
        "providerId": user["_id"],
        "amount": str(body.amount),
        "note": body.note,
        "version": 1,
        "status": "submitted",
        "estimatedArrival": body.estimatedArrival,
        "createdAt": now,
    }
    result = await db[QUOTES].insert_one(quote_doc)
    quote_doc["_id"] = result.inserted_id

    await db[BOOKINGS].update_one(
        {"_id": booking_oid}, {"$set": {"status": "quoted", "updatedAt": now}}
    )

    await create_notification(
        booking.get("customerId"),
        "quote_received",
        "New quote received",
        "A provider submitted a quote for your service request.",
        related_entity_id=booking_oid,
        related_entity_type="booking",
    )

    return {"success": True, "quote": serialize_doc(quote_doc)}
