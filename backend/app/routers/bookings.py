"""Booking endpoints: list, create, detail and the status state machine.

The booking lifecycle mirrors the existing frontend workflow exactly:

submitted -> quoted -> provider_selected -> accepted
  -> arrived_pending_confirmation -> arrived
  -> (price_change_pending -> price_confirmed)*
  -> work_started -> completed_pending_confirmation -> completed
  -> paid -> rated
with cancellations possible from several pre-work states.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from ..database import (
    BOOKINGS,
    CUSTOMER_PROFILES,
    INVOICES,
    MILESTONE_CONFIRMATIONS,
    PAYMENTS,
    PRICE_REVISIONS,
    PROVIDER_PROFILES,
    QUOTES,
    RATINGS,
    SERVICE_CATEGORIES,
    SPECIFIC_SERVICES,
    USERS,
    get_database,
)
from ..deps import ADMIN_ROLES, get_current_user, is_admin
from ..schemas.booking import BookingActionRequest, BookingCreateRequest
from ..serializers import serialize_doc, serialize_docs, to_object_id
from ..services import (
    AUTO_QUOTE_TEMPLATES,
    compute_fee,
    create_notification,
    get_customer_profile,
    parse_amount,
)
from ..config import get_settings

router = APIRouter(prefix="/api/bookings", tags=["bookings"])

# Status transition table - identical to the previous implementation.
ALLOWED_TRANSITIONS = {
    "select_provider": {"from": ["submitted", "quoted"], "role": ["customer"], "newStatus": "provider_selected"},
    "accept_booking": {"from": ["provider_selected"], "role": ["provider"], "newStatus": "accepted"},
    "mark_arrived": {"from": ["accepted"], "role": ["provider"], "newStatus": "arrived_pending_confirmation"},
    "confirm_arrival": {"from": ["arrived_pending_confirmation"], "role": ["customer"], "newStatus": "arrived"},
    "request_price_change": {"from": ["arrived", "price_confirmed"], "role": ["provider"], "newStatus": "price_change_pending"},
    "approve_price_change": {"from": ["price_change_pending"], "role": ["customer"], "newStatus": "price_confirmed"},
    "reject_price_change": {"from": ["price_change_pending"], "role": ["customer"], "newStatus": "cancelled"},
    "start_work": {"from": ["arrived", "price_confirmed"], "role": ["provider"], "newStatus": "work_started"},
    "complete_work": {"from": ["work_started"], "role": ["provider"], "newStatus": "completed_pending_confirmation"},
    "confirm_completion": {"from": ["completed_pending_confirmation"], "role": ["customer"], "newStatus": "completed"},
    "record_payment": {"from": ["completed"], "role": ["customer", "provider"], "newStatus": "paid"},
    "submit_rating": {"from": ["paid"], "role": ["customer"], "newStatus": "rated"},
    "cancel_booking": {
        "from": ["submitted", "quoted", "provider_selected", "accepted", "arrived"],
        "role": ["customer", "provider", "society_admin", "federation_admin", "super_admin"],
        "newStatus": "cancelled",
    },
}


def _booking_view(booking: Dict[str, Any], category: Optional[Dict], service: Optional[Dict]) -> Dict:
    return {
        "booking": serialize_doc(booking),
        "category": serialize_doc(category),
        "service": serialize_doc(service),
    }


async def _load_category_service(db, booking: Dict[str, Any]):
    category = None
    service = None
    if booking.get("categoryId"):
        category = await db[SERVICE_CATEGORIES].find_one({"_id": to_object_id(booking["categoryId"])})
    if booking.get("serviceId"):
        service = await db[SPECIFIC_SERVICES].find_one({"_id": to_object_id(booking["serviceId"])})
    return category, service


async def _auto_generate_quotes(db, booking: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Create the initial demo quotes from the first registered providers.

    Preserved from the previous implementation so the customer quote-selection
    UI works immediately after a booking is submitted.
    """
    providers = await db[USERS].find({"role": "provider", "isActive": True}).to_list(length=3)
    if not providers:
        return []

    now = datetime.now(timezone.utc)
    quote_docs = []
    for provider, template in zip(providers, AUTO_QUOTE_TEMPLATES):
        quote_docs.append(
            {
                "bookingId": booking["_id"],
                "providerId": provider["_id"],
                "amount": template["amount"],
                "note": template["note"],
                "version": 1,
                "status": "submitted",
                "estimatedArrival": template["estimatedArrival"],
                "createdAt": now,
            }
        )
    if quote_docs:
        await db[QUOTES].insert_many(quote_docs)
    return quote_docs


async def _quotes_with_providers(db, booking_id) -> List[Dict[str, Any]]:
    quotes = await db[QUOTES].find({"bookingId": booking_id}).sort("createdAt", 1).to_list(length=None)
    result = []
    for quote in quotes:
        provider = await db[PROVIDER_PROFILES].find_one({"userId": quote.get("providerId")})
        result.append({"quote": serialize_doc(quote), "provider": serialize_doc(provider)})
    return result


@router.get("")
async def list_bookings(
    role: Optional[str] = Query(default=None),
    user: Dict[str, Any] = Depends(get_current_user),
):
    """List bookings visible to the authenticated user.

    Visibility is derived from the user's real database role (never from the
    query parameter): customers see their own bookings, providers see their
    assigned jobs plus open requests, admins see the latest 100 bookings.
    """
    db = get_database()
    user_role = user["role"]

    if user_role == "customer":
        cursor = (
            db[BOOKINGS]
            .find({"customerId": user["_id"]})
            .sort("createdAt", -1)
        )
    elif user_role == "provider":
        cursor = db[BOOKINGS].find(
            {"$or": [{"providerId": user["_id"]}, {"status": "submitted"}]}
        ).sort("createdAt", -1)
    elif user_role in ADMIN_ROLES:
        cursor = db[BOOKINGS].find({}).sort("createdAt", -1).limit(100)
    else:
        raise HTTPException(status_code=403, detail="Invalid role")

    bookings = await cursor.to_list(length=None)
    response_items = []
    for booking in bookings:
        category, service = await _load_category_service(db, booking)
        response_items.append(_booking_view(booking, category, service))
    return {"bookings": response_items}


@router.post("")
async def create_booking(
    body: BookingCreateRequest,
    user: Dict[str, Any] = Depends(get_current_user),
):
    if user["role"] != "customer":
        raise HTTPException(
            status_code=401, detail="Unauthorized. Please log in as a customer."
        )

    db = get_database()
    now = datetime.now(timezone.utc)

    # Resolve / validate the category (fall back to the first category, as before).
    final_category_id = to_object_id(body.categoryId)
    if final_category_id is None or not await db[SERVICE_CATEGORIES].find_one(
        {"_id": final_category_id}
    ):
        first_cat = await db[SERVICE_CATEGORIES].find_one(
            {"isActive": True}, sort=[("sortOrder", 1)]
        )
        final_category_id = first_cat["_id"] if first_cat else None

    final_service_id = to_object_id(body.serviceId) if body.serviceId else None
    if final_service_id is not None and not await db[SPECIFIC_SERVICES].find_one(
        {"_id": final_service_id}
    ):
        final_service_id = None

    cust_profile = await get_customer_profile(user["_id"])

    preferred_time = None
    if body.preferredTime:
        try:
            preferred_time = datetime.fromisoformat(
                body.preferredTime.replace("Z", "+00:00")
            )
        except ValueError:
            preferred_time = None

    booking_doc = {
        "customerId": user["_id"],
        "providerId": None,
        "societyId": None,
        "categoryId": final_category_id,
        "serviceId": final_service_id,
        "serviceDescription": body.serviceDescription,
        "mediaUrls": body.mediaUrls or [],
        "address": body.address,
        "city": body.city or (cust_profile or {}).get("city") or "Visakhapatnam",
        "pincode": body.pincode or (cust_profile or {}).get("pincode") or "530026",
        "latitude": body.latitude or (cust_profile or {}).get("latitude"),
        "longitude": body.longitude or (cust_profile or {}).get("longitude"),
        "preferredTime": preferred_time,
        "isEmergency": bool(body.isEmergency),
        "status": "submitted",
        "finalPrice": None,
        "platformFee": None,
        "totalAmount": None,
        "notes": None,
        "createdAt": now,
        "updatedAt": now,
    }

    result = await db[BOOKINGS].insert_one(booking_doc)
    booking_doc["_id"] = result.inserted_id

    # Auto-generate the initial provider quotes (existing behaviour).
    quotes = await _auto_generate_quotes(db, booking_doc)

    # Notifications: confirm to the customer, alert the quoted providers.
    await create_notification(
        user["_id"],
        "booking_submitted",
        "Service request submitted",
        "Your service request has been submitted. Provider quotes will appear shortly.",
        related_entity_id=booking_doc["_id"],
        related_entity_type="booking",
    )
    for quote in quotes:
        await create_notification(
            quote["providerId"],
            "new_booking",
            "New service request in your area",
            body.serviceDescription[:120],
            related_entity_id=booking_doc["_id"],
            related_entity_type="booking",
        )

    return {"success": True, "booking": serialize_doc(booking_doc)}


def _can_view_booking(user: Dict[str, Any], booking: Dict[str, Any]) -> bool:
    """Customers may only view their own bookings; providers (who browse and
    quote on open requests) and admins may view any booking."""
    if is_admin(user):
        return True
    if user["role"] == "provider":
        return True
    return booking.get("customerId") == user["_id"]


@router.get("/{booking_id}")
async def get_booking(
    booking_id: str,
    user: Dict[str, Any] = Depends(get_current_user),
):
    db = get_database()
    oid = to_object_id(booking_id)
    if oid is None:
        raise HTTPException(status_code=404, detail="Booking not found")

    booking = await db[BOOKINGS].find_one({"_id": oid})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if not _can_view_booking(user, booking):
        raise HTTPException(status_code=404, detail="Booking not found")

    # Seed demo quotes on read for fresh bookings (existing behaviour).
    existing_quotes = await db[QUOTES].count_documents({"bookingId": oid})
    if existing_quotes == 0 and booking["status"] in ("submitted", "quoted"):
        await _auto_generate_quotes(db, booking)

    category, service = await _load_category_service(db, booking)
    customer_profile = await db[CUSTOMER_PROFILES].find_one(
        {"userId": booking.get("customerId")}
    )
    provider_profile = None
    if booking.get("providerId"):
        provider_profile = await db[PROVIDER_PROFILES].find_one(
            {"userId": booking["providerId"]}
        )

    price_revisions = (
        await db[PRICE_REVISIONS].find({"bookingId": oid}).to_list(length=None)
    )
    milestones = (
        await db[MILESTONE_CONFIRMATIONS].find({"bookingId": oid}).to_list(length=None)
    )
    payment = await db[PAYMENTS].find_one({"bookingId": oid})
    invoice = await db[INVOICES].find_one({"bookingId": oid})
    rating = await db[RATINGS].find_one({"bookingId": oid})

    return {
        "booking": serialize_doc(booking),
        "category": serialize_doc(category),
        "service": serialize_doc(service),
        "customerProfile": serialize_doc(customer_profile),
        "providerProfile": serialize_doc(provider_profile),
        "quotes": await _quotes_with_providers(db, oid),
        "priceRevisions": serialize_docs(price_revisions),
        "milestones": serialize_docs(milestones),
        "payment": serialize_doc(payment),
        "invoice": serialize_doc(invoice),
        "rating": serialize_doc(rating),
    }


def _check_ownership(action: str, user: Dict[str, Any], booking: Dict[str, Any]) -> None:
    """Resource-ownership checks (hardened compared to the previous backend).

    Raises 403 unless the acting user owns the booking action being performed.
    """
    customer_id = booking.get("customerId")
    provider_id = booking.get("providerId")

    if action in ("select_provider", "confirm_arrival", "approve_price_change",
                  "reject_price_change", "confirm_completion", "submit_rating"):
        if customer_id != user["_id"]:
            raise HTTPException(status_code=403, detail="Not authorized for this action")
    elif action in ("accept_booking", "mark_arrived", "request_price_change",
                    "start_work", "complete_work"):
        if provider_id != user["_id"]:
            raise HTTPException(status_code=403, detail="Not authorized for this action")
    elif action == "record_payment":
        if customer_id != user["_id"] and provider_id != user["_id"]:
            raise HTTPException(status_code=403, detail="Not authorized for this action")
    elif action == "cancel_booking":
        if not (
            customer_id == user["_id"]
            or provider_id == user["_id"]
            or is_admin(user)
        ):
            raise HTTPException(status_code=403, detail="Not authorized for this action")


@router.patch("/{booking_id}")
async def update_booking(
    booking_id: str,
    body: BookingActionRequest,
    user: Dict[str, Any] = Depends(get_current_user),
):
    db = get_database()
    settings = get_settings()
    oid = to_object_id(booking_id)
    if oid is None:
        raise HTTPException(status_code=404, detail="Booking not found")

    booking = await db[BOOKINGS].find_one({"_id": oid})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    action = body.action
    transition = ALLOWED_TRANSITIONS.get(action)
    if not transition:
        raise HTTPException(status_code=400, detail="Invalid action")

    # Role is taken from the freshly-loaded database user document.
    if user["role"] not in transition["role"]:
        raise HTTPException(status_code=403, detail="Not authorized for this action")

    if booking["status"] not in transition["from"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot perform {action} from status {booking['status']}",
        )

    _check_ownership(action, user, booking)

    now = datetime.now(timezone.utc)
    update_data: Dict[str, Any] = {"status": transition["newStatus"], "updatedAt": now}

    extra = body.model_dump(exclude={"action"})

    # ------------------------------------------------------------------
    # Action-specific side effects (mirroring the previous implementation,
    # with one fix: the price selected by the customer is now stored on
    # select_provider so the payment step shows the real amount).
    # ------------------------------------------------------------------
    if action == "select_provider" and extra.get("providerId"):
        provider_oid = to_object_id(extra["providerId"])
        if provider_oid is None or not await db[USERS].find_one(
            {"_id": provider_oid, "role": "provider"}
        ):
            raise HTTPException(status_code=400, detail="Invalid provider")
        update_data["providerId"] = provider_oid
        if extra.get("initialAmount"):
            update_data.update(
                compute_fee(parse_amount(extra["initialAmount"]), settings.platform_fee_pct)
            )

    if action == "accept_booking" and extra.get("initialAmount"):
        update_data.update(
            compute_fee(parse_amount(extra["initialAmount"]), settings.platform_fee_pct)
        )

    if action == "approve_price_change" and extra.get("proposedAmount"):
        update_data.update(
            compute_fee(parse_amount(extra["proposedAmount"]), settings.platform_fee_pct)
        )

    if action == "record_payment":
        method = extra.get("method") or "online"
        if method not in ("online", "cash"):
            method = "online"
        amount = extra.get("amount") or booking.get("totalAmount") or "0"
        await db[PAYMENTS].insert_one(
            {
                "bookingId": oid,
                "method": method,
                "expectedAmount": str(booking.get("totalAmount") or "0"),
                "paidAmount": str(amount),
                "status": "success",
                "transactionRef": f"TXN{int(now.timestamp() * 1000)}",
                "collectedBy": user["_id"],
                "notes": None,
                "createdAt": now,
                "updatedAt": now,
            }
        )
        await db[INVOICES].insert_one(
            {
                "bookingId": oid,
                "invoiceNumber": f"INV-{int(now.timestamp() * 1000)}",
                "serviceAmount": str(booking.get("finalPrice") or "0"),
                "platformFee": str(booking.get("platformFee") or "0"),
                "totalAmount": str(booking.get("totalAmount") or "0"),
                "paymentStatus": "paid",
                "issuedAt": now,
                "createdAt": now,
            }
        )

    if action == "submit_rating" and extra.get("rating"):
        if not (1 <= int(extra["rating"]) <= 5):
            raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
        await db[RATINGS].insert_one(
            {
                "bookingId": oid,
                "customerId": user["_id"],
                "providerId": booking.get("providerId"),
                "rating": int(extra["rating"]),
                "reviewText": extra.get("reviewText"),
                "createdAt": now,
            }
        )
        # Recompute the provider's average rating.
        if booking.get("providerId"):
            provider_ratings = (
                await db[RATINGS]
                .find({"providerId": booking["providerId"]})
                .to_list(length=None)
            )
            if provider_ratings:
                avg = sum(r["rating"] for r in provider_ratings) / len(provider_ratings)
                await db[PROVIDER_PROFILES].update_one(
                    {"userId": booking["providerId"]},
                    {
                        "$set": {
                            "ratingAvg": f"{avg:.2f}",
                            "ratingCount": len(provider_ratings),
                            "updatedAt": now,
                        }
                    },
                )

    await db[BOOKINGS].update_one({"_id": oid}, {"$set": update_data})
    updated = await db[BOOKINGS].find_one({"_id": oid})

    # ------------------------------------------------------------------
    # Notifications to the counterparty on key transitions.
    # ------------------------------------------------------------------
    notify_map = {
        "select_provider": (booking.get("providerId"), "provider_selected", "You were selected for a service job"),
        "accept_booking": (booking.get("customerId"), "booking_accepted", "Your provider accepted the booking"),
        "mark_arrived": (booking.get("customerId"), "provider_arrived", "Your provider has arrived - please confirm"),
        "request_price_change": (booking.get("customerId"), "price_change", "Provider requested a price change"),
        "start_work": (booking.get("customerId"), "work_started", "Work has started on your service"),
        "complete_work": (booking.get("customerId"), "work_completed", "Work is complete - please confirm"),
        "record_payment": (booking.get("providerId"), "payment_recorded", "Payment recorded for your job"),
        "submit_rating": (booking.get("providerId"), "new_rating", "You received a new rating"),
        "cancel_booking": (
            booking.get("providerId") if user["_id"] == booking.get("customerId") else booking.get("customerId"),
            "booking_cancelled",
            "A booking was cancelled",
        ),
    }
    notification = notify_map.get(action)
    if notification:
        recipient, ntype, title = notification
        if recipient:
            await create_notification(
                recipient, ntype, title, None,
                related_entity_id=oid, related_entity_type="booking",
            )

    return {"success": True, "booking": serialize_doc(updated)}
