"""Provider directory and provider profile management."""

from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException

from ..database import (
    CERTIFICATIONS,
    get_database,
    IDENTITY_VERIFICATIONS,
    PROVIDER_PROFILES,
    PROVIDER_SKILLS,
    RATINGS,
    SERVICE_CATEGORIES,
    SKILLS,
    SOCIETIES,
    USERS,
    WELFARE_RECORDS,
)
from ..deps import get_current_user, is_admin
from ..schemas.misc import ProviderProfileUpdateRequest
from ..serializers import serialize_doc, serialize_docs, to_object_id

router = APIRouter(prefix="/api/providers", tags=["providers"])

PROVIDER_ALLOWED_FIELDS = (
    "displayName",
    "experience",
    "bio",
    "serviceArea",
    "address",
    "city",
    "pincode",
    "availability",
    "profilePhotoUrl",
)
ADMIN_ONLY_FIELDS = ("verificationStatus",)


@router.get("")
async def list_providers():
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
                        "role": user.get("role"),
                    }
                )
                if user
                else None,
                "society": serialize_doc(society),
            }
        )
    return {"providers": items}


@router.get("/{provider_id}")
async def get_provider(provider_id: str):
    db = get_database()
    oid = to_object_id(provider_id)
    profile = (
        await db[PROVIDER_PROFILES].find_one({"_id": oid}) if oid else None
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Provider not found")

    user = await db[USERS].find_one({"_id": profile.get("userId")})
    society = None
    if profile.get("societyId"):
        society = await db[SOCIETIES].find_one({"_id": profile["societyId"]})

    skills = []
    async for link in db[PROVIDER_SKILLS].find({"providerId": oid}):
        skill = await db[SKILLS].find_one({"_id": link.get("skillId")})
        category = None
        if skill and skill.get("categoryId"):
            category = await db[SERVICE_CATEGORIES].find_one({"_id": skill["categoryId"]})
        skills.append(
            {
                "skill": serialize_doc(skill),
                "category": serialize_doc(category),
                "yearsExp": link.get("yearsExp"),
            }
        )

    certifications = (
        await db[CERTIFICATIONS].find({"providerId": oid}).to_list(length=None)
    )
    welfare = (
        await db[WELFARE_RECORDS].find({"providerId": oid}).to_list(length=None)
    )
    verification = await db[IDENTITY_VERIFICATIONS].find_one(
        {"userId": profile.get("userId")}
    )
    ratings = (
        await db[RATINGS]
        .find({"providerId": profile.get("userId")})
        .sort("createdAt", -1)
        .limit(10)
        .to_list(length=None)
    )

    return {
        "provider": {
            "provider": serialize_doc(profile),
            "user": serialize_doc(
                {
                    "id": user["_id"],
                    "phone": user.get("phone"),
                    "email": user.get("email"),
                }
            )
            if user
            else None,
            "society": serialize_doc(society),
        },
        "skills": skills,
        "certifications": serialize_docs(certifications),
        "welfare": serialize_docs(welfare),
        "verification": serialize_doc(verification),
        "ratings": serialize_docs(ratings),
    }


@router.patch("/{provider_id}")
async def update_provider(
    provider_id: str,
    body: ProviderProfileUpdateRequest,
    user: Dict[str, Any] = Depends(get_current_user),
):
    db = get_database()
    oid = to_object_id(provider_id)
    profile = (
        await db[PROVIDER_PROFILES].find_one({"_id": oid}) if oid else None
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Not found")

    is_owner = profile.get("userId") == user["_id"]
    admin = is_admin(user)
    if not is_owner and not admin:
        raise HTTPException(status_code=403, detail="Forbidden")

    update_data: Dict[str, Any] = {"updatedAt": datetime.now(timezone.utc)}
    for field, value in body.model_dump(exclude_unset=True).items():
        if field in PROVIDER_ALLOWED_FIELDS:
            if field == "availability" and value not in ("available", "unavailable", "busy"):
                raise HTTPException(status_code=400, detail="Invalid availability")
            update_data[field] = value
        elif field in ADMIN_ONLY_FIELDS and admin:
            if value not in ("pending", "verified", "failed", "review_required"):
                raise HTTPException(status_code=400, detail="Invalid verificationStatus")
            update_data[field] = value

    if not update_data:
        return {"success": True, "provider": serialize_doc(profile)}

    await db[PROVIDER_PROFILES].update_one({"_id": oid}, {"$set": update_data})
    updated = await db[PROVIDER_PROFILES].find_one({"_id": oid})
    return {"success": True, "provider": serialize_doc(updated)}
