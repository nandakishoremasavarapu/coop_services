"""Mid-job price revision requests (provider proposes, customer approves)."""

from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Query

from ..database import BOOKINGS, PRICE_REVISIONS, get_database
from ..deps import get_current_user
from ..schemas.booking import PriceRevisionCreateRequest
from ..serializers import serialize_doc, serialize_docs, to_object_id
from ..services import create_notification

router = APIRouter(prefix="/api/price-revisions", tags=["price-revisions"])


@router.get("")
async def list_price_revisions(
    bookingId: str = Query(...),
    user: Dict[str, Any] = Depends(get_current_user),
):
    db = get_database()
    booking_oid = to_object_id(bookingId)
    if booking_oid is None:
        return {"revisions": []}
    revisions = (
        await db[PRICE_REVISIONS]
        .find({"bookingId": booking_oid})
        .sort("createdAt", -1)
        .to_list(length=None)
    )
    return {"revisions": serialize_docs(revisions)}


@router.post("")
async def create_price_revision(
    body: PriceRevisionCreateRequest,
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

    # Only the assigned provider may request a price change for this booking.
    if booking.get("providerId") != user["_id"]:
        raise HTTPException(status_code=403, detail="Not authorized for this action")

    if booking["status"] not in ("arrived", "price_confirmed"):
        raise HTTPException(
            status_code=400, detail="Cannot request price change at this stage"
        )

    now = datetime.now(timezone.utc)
    revision_doc = {
        "bookingId": booking_oid,
        "originalAmount": str(body.originalAmount or booking.get("finalPrice") or ""),
        "proposedAmount": str(body.proposedAmount),
        "reason": body.reason,
        "requesterId": user["_id"],
        "customerApproved": None,
        "status": "pending",
        "createdAt": now,
        "resolvedAt": None,
    }
    result = await db[PRICE_REVISIONS].insert_one(revision_doc)
    revision_doc["_id"] = result.inserted_id

    await db[BOOKINGS].update_one(
        {"_id": booking_oid}, {"$set": {"status": "price_change_pending", "updatedAt": now}}
    )

    await create_notification(
        booking.get("customerId"),
        "price_change_requested",
        "Price change requested",
        f"Proposed amount: ₹{body.proposedAmount}. Reason: {body.reason[:120]}",
        related_entity_id=booking_oid,
        related_entity_type="booking",
    )

    return {"success": True, "revision": serialize_doc(revision_doc)}
