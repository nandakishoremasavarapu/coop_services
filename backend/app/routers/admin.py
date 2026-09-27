"""Administrative endpoints: provider management, stats, settings, welfare."""

import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException

from ..database import (
    ADMIN_SETTINGS,
    BOOKINGS,
    DISPUTES,
    IDENTITY_VERIFICATIONS,
    PAYMENTS,
    PROVIDER_PROFILES,
    RATINGS,
    SOCIETIES,
    USERS,
    WELFARE_STATE,
    get_database,
)
from ..defaults import DEFAULT_ADMIN_SETTINGS, DEFAULT_WELFARE_STATE
from ..deps import get_current_user, require_admin
from ..schemas.misc import (
    AdminSettingsUpdateRequest,
    ProviderVerifyRequest,
    WelfareActionRequest,
)
from ..serializers import serialize_doc, to_object_id

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ----------------------------------------------------------------------
# Providers
# ----------------------------------------------------------------------
@router.get("/providers")
async def admin_list_providers(admin: Dict[str, Any] = Depends(require_admin)):
    db = get_database()
    profiles = (
        await db[PROVIDER_PROFILES].find({}).sort("createdAt", -1).to_list(length=None)
    )
    items = []
    for profile in profiles:
        user = await db[USERS].find_one({"_id": profile.get("userId")})
        society = None
        if profile.get("societyId"):
            society = await db[SOCIETIES].find_one({"_id": profile["societyId"]})
        items.append(
            {
                "provider": serialize_doc(profile),
                "user": serialize_doc(
                    {
                        "id": user["_id"],
                        "phone": user.get("phone"),
                        "email": user.get("email"),
                        "isActive": user.get("isActive"),
                        "createdAt": user.get("createdAt"),
                    }
                )
                if user
                else None,
                "society": serialize_doc(society),
            }
        )
    return {"providers": items}


@router.post("/providers/{provider_id}/verify")
async def verify_provider(
    provider_id: str,
    body: ProviderVerifyRequest,
    admin: Dict[str, Any] = Depends(get_current_user),
):
    if admin["role"] not in ("society_admin", "federation_admin"):
        raise HTTPException(status_code=401, detail="Unauthorized")

    if body.status not in ("verified", "failed", "review_required", "pending"):
        raise HTTPException(status_code=400, detail="Invalid status")

    db = get_database()
    oid = to_object_id(provider_id)
    profile = await db[PROVIDER_PROFILES].find_one({"_id": oid}) if oid else None
    if not profile:
        raise HTTPException(status_code=404, detail="Provider not found")

    now = datetime.now(timezone.utc)
    await db[PROVIDER_PROFILES].update_one(
        {"_id": oid},
        {"$set": {"verificationStatus": body.status, "updatedAt": now}},
    )
    await db[IDENTITY_VERIFICATIONS].update_one(
        {"userId": profile["userId"]},
        {
            "$set": {
                "status": body.status,
                "reviewedBy": admin["_id"],
                "verifiedAt": now if body.status == "verified" else None,
                "notes": body.notes,
                "updatedAt": now,
            }
        },
    )
    return {"success": True, "message": f"Provider {body.status} successfully"}


# ----------------------------------------------------------------------
# Stats / analytics
# ----------------------------------------------------------------------
@router.get("/stats")
async def admin_stats(admin: Dict[str, Any] = Depends(require_admin)):
    db = get_database()

    async def group_count(collection: str, key: str) -> List[Dict[str, Any]]:
        docs = await db[collection].find({}, {key: 1}).to_list(length=None)
        counts: Dict[str, int] = {}
        for doc in docs:
            value = doc.get(key)
            if value is None:
                value = "unknown"
            counts[value] = counts.get(value, 0) + 1
        return [{key: k, "count": v} for k, v in counts.items()]

    user_counts = await group_count(USERS, "role")
    booking_status_counts = await group_count(BOOKINGS, "status")
    provider_avail_counts = await group_count(PROVIDER_PROFILES, "availability")
    provider_verif_counts = await group_count(PROVIDER_PROFILES, "verificationStatus")

    society_count = await db[SOCIETIES].count_documents({})

    ratings_docs = await db[RATINGS].find({}).to_list(length=None)
    avg_rating = (
        f"{sum(r['rating'] for r in ratings_docs) / len(ratings_docs):.1f}"
        if ratings_docs
        else "0.0"
    )

    payment_docs = await db[PAYMENTS].find({"status": "success"}).to_list(length=None)
    total_payments = 0.0
    for payment in payment_docs:
        try:
            total_payments += float(payment.get("paidAmount") or 0)
        except (TypeError, ValueError):
            continue
    total_payments_str = (
        str(int(total_payments)) if float(total_payments).is_integer() else f"{total_payments:.2f}"
    )

    dispute_count = await db[DISPUTES].count_documents({"status": "open"})

    # Recent bookings per day (last 7 days), as YYYY-MM-DD -> count.
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    recent_docs = await db[BOOKINGS].find(
        {"createdAt": {"$gte": week_ago}}, {"createdAt": 1}
    ).to_list(length=None)
    per_day: Dict[str, int] = {}
    for doc in recent_docs:
        created = doc.get("createdAt")
        if isinstance(created, datetime):
            day = created.astimezone(timezone.utc).strftime("%Y-%m-%d")
            per_day[day] = per_day.get(day, 0) + 1
    recent_bookings = [{"date": day, "count": count} for day, count in sorted(per_day.items())]

    bookings_by_category: Dict[str, int] = {}
    async for booking in db[BOOKINGS].find({}, {"categoryId": 1}):
        category_id = str(booking.get("categoryId")) if booking.get("categoryId") else "unknown"
        bookings_by_category[category_id] = bookings_by_category.get(category_id, 0) + 1
    by_category = [
        {"categoryId": cat, "count": count} for cat, count in bookings_by_category.items()
    ][:10]

    return {
        "userCounts": user_counts,
        "bookingStatusCounts": booking_status_counts,
        "providerAvailCounts": provider_avail_counts,
        "providerVerifCounts": provider_verif_counts,
        "societyCount": society_count,
        "avgRating": avg_rating,
        "totalPayments": total_payments_str,
        "disputeCount": dispute_count,
        "recentBookings": recent_bookings,
        "bookingsByCategory": by_category,
    }


# ----------------------------------------------------------------------
# Settings
# ----------------------------------------------------------------------
def _deep_merge(base: Dict[str, Any], override: Dict[str, Any]) -> Dict[str, Any]:
    merged = dict(base)
    for key, value in (override or {}).items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = _deep_merge(merged[key], value)
        else:
            merged[key] = value
    return merged


async def _load_settings(db) -> Dict[str, Any]:
    doc = await db[ADMIN_SETTINGS].find_one({"_id": "main"})
    if not doc:
        doc = {"_id": "main", "settings": DEFAULT_ADMIN_SETTINGS, "updatedAt": None}
        await db[ADMIN_SETTINGS].insert_one(doc)
    return doc


@router.get("/settings")
async def get_settings(admin: Dict[str, Any] = Depends(require_admin)):
    db = get_database()
    doc = await _load_settings(db)
    return {
        "settings": doc.get("settings") or DEFAULT_ADMIN_SETTINGS,
        "updatedAt": (doc.get("updatedAt") or datetime.now(timezone.utc)).isoformat()
        if isinstance(doc.get("updatedAt"), datetime) or doc.get("updatedAt") is None
        else doc.get("updatedAt"),
    }


@router.post("/settings")
async def update_settings(
    body: AdminSettingsUpdateRequest,
    admin: Dict[str, Any] = Depends(require_admin),
):
    db = get_database()
    doc = await _load_settings(db)
    current = doc.get("settings") or DEFAULT_ADMIN_SETTINGS
    incoming = body.as_dict()

    updated = _deep_merge(current, incoming)
    # serviceAreas is replaced wholesale when provided (previous behaviour).
    if "serviceAreas" in incoming and incoming["serviceAreas"] is not None:
        updated["serviceAreas"] = incoming["serviceAreas"]

    now = datetime.now(timezone.utc)
    await db[ADMIN_SETTINGS].update_one(
        {"_id": "main"}, {"$set": {"settings": updated, "updatedAt": now}}, upsert=True
    )
    return {
        "success": True,
        "message": "Settings updated successfully",
        "settings": updated,
        "updatedAt": now.isoformat(),
    }


# ----------------------------------------------------------------------
# Welfare & insurance pool
# ----------------------------------------------------------------------
async def _load_welfare_state(db) -> Dict[str, Any]:
    doc = await db[WELFARE_STATE].find_one({"_id": "main"})
    if not doc:
        doc = {"_id": "main", "state": DEFAULT_WELFARE_STATE, "updatedAt": None}
        await db[WELFARE_STATE].insert_one(doc)
    return doc.get("state") or DEFAULT_WELFARE_STATE


async def _save_welfare_state(db, state: Dict[str, Any]) -> None:
    now = datetime.now(timezone.utc)
    await db[WELFARE_STATE].update_one(
        {"_id": "main"}, {"$set": {"state": state, "updatedAt": now}}, upsert=True
    )


@router.get("/welfare")
async def get_welfare(admin: Dict[str, Any] = Depends(require_admin)):
    db = get_database()
    state = await _load_welfare_state(db)
    return {"success": True, **state, "updatedAt": datetime.now(timezone.utc).isoformat()}


@router.post("/welfare")
async def welfare_action(
    body: WelfareActionRequest,
    admin: Dict[str, Any] = Depends(require_admin),
):
    db = get_database()
    state = await _load_welfare_state(db)
    schemes = state.get("schemes", [])
    claims = state.get("claims", [])
    stats = state.get("stats", {})

    if body.action == "approve_claim":
        claim = next((c for c in claims if c["id"] == body.claimId), None)
        if claim:
            claim["status"] = "disbursed"
            if body.payoutMethod:
                claim["payoutMethod"] = body.payoutMethod
            stats["totalClaimsPaid"] = stats.get("totalClaimsPaid", 0) + claim["amount"]
            stats["totalPoolCorpus"] = max(
                0, stats.get("totalPoolCorpus", 0) - claim["amount"]
            )
            await _save_welfare_state(db, state)
        return {
            "success": True,
            "message": f"Claim {body.claimId} approved and disbursed successfully!",
            "claim": claim,
            "stats": stats,
        }

    if body.action == "reject_claim":
        claim = next((c for c in claims if c["id"] == body.claimId), None)
        if claim:
            claim["status"] = "rejected"
            claim["rejectionReason"] = body.reason or "Incomplete hospital discharge paperwork"
            await _save_welfare_state(db, state)
        return {
            "success": True,
            "message": f"Claim {body.claimId} marked as rejected.",
            "claim": claim,
        }

    if body.action == "new_claim":
        scheme = next((s for s in schemes if s["id"] == body.schemeId), schemes[0] if schemes else None)
        new_claim = {
            "id": f"CLM-2026-0{82 + secrets.randbelow(20)}",
            "providerName": body.providerName or "Verified Member",
            "trade": body.trade or "Technician",
            "providerPhone": "+91 9200000001",
            "schemeId": body.schemeId or "scheme-health",
            "schemeName": (scheme or {}).get("name") or "Aarogya Sahakari Health Shield",
            "claimType": (scheme or {}).get("type") or "Medical",
            "amount": int(body.amount) if body.amount else 12000,
            "dateSubmitted": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "incidentDate": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "hospital": body.hospital or "District Cooperative Hospital",
            "diagnosis": body.diagnosis
            or "On-duty occupational strain requiring care",
            "evidenceFile": "Medical_Records_Verified.pdf",
            "status": "pending",
            "payoutMethod": "Direct NEFT to Bank Account",
            "societySteward": "Society Steward Verified",
        }
        claims.insert(0, new_claim)
        await _save_welfare_state(db, state)
        return {
            "success": True,
            "message": "New welfare claim registered successfully and queued for disbursement review.",
            "claim": new_claim,
        }

    if body.action == "instant_relief":
        relief_amount = int(body.amount) if body.amount else 5000
        stats["emergencyReserve"] = max(0, stats.get("emergencyReserve", 0) - relief_amount)
        stats["totalClaimsPaid"] = stats.get("totalClaimsPaid", 0) + relief_amount
        relief_claim = {
            "id": f"RELIEF-2026-{100 + secrets.randbelow(900)}",
            "providerName": body.providerName or "Emergency Member",
            "trade": "Emergency Relief",
            "providerPhone": "+91 9200000001",
            "schemeId": "scheme-accident",
            "schemeName": "Immediate Mutual Aid Distress Grant",
            "claimType": "Emergency Relief",
            "amount": relief_amount,
            "dateSubmitted": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "incidentDate": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "hospital": "N/A - Field Dispatch",
            "diagnosis": body.reason
            or "Immediate distress assistance dispatched prior to formal claims processing",
            "evidenceFile": "Steward_Verification_Call_Log.jpg",
            "status": "disbursed",
            "payoutMethod": "Instant UPI to Registered Member VPA",
            "societySteward": "Federation Duty Officer (Verified)",
        }
        claims.insert(0, relief_claim)
        await _save_welfare_state(db, state)
        return {
            "success": True,
            "message": f"Instant distress grant of ₹{relief_amount} dispatched successfully!",
            "claim": relief_claim,
            "stats": stats,
        }

    raise HTTPException(status_code=400, detail="Invalid action")
