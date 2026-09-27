"""Authentication endpoints: register, login, logout, current user."""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response

from ..database import (
    CUSTOMER_PROFILES,
    IDENTITY_VERIFICATIONS,
    PROVIDER_PROFILES,
    USERS,
    get_database,
)
from ..deps import get_current_user_optional
from ..schemas.auth import LoginRequest, RegisterRequest
from ..security import create_session_token, hash_password, verify_password
from ..serializers import serialize_doc, to_object_id
from ..services import get_profile_name

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _set_session_cookie(response: Response, token: str, request: Request) -> None:
    settings = request.app.state.settings
    max_age = settings.session_ttl_days * 24 * 60 * 60
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        max_age=max_age,
        expires=int((datetime.now(timezone.utc) + timedelta(seconds=max_age)).timestamp()),
        path="/",
        domain=settings.cookie_domain,
        secure=settings.cookie_secure,
        httponly=True,
        samesite=settings.cookie_samesite,
    )


def _clear_session_cookie(response: Response, request: Request) -> None:
    settings = request.app.state.settings
    response.set_cookie(
        key=settings.session_cookie_name,
        value="",
        max_age=0,
        expires=0,
        path="/",
        domain=settings.cookie_domain,
        secure=settings.cookie_secure,
        httponly=True,
        samesite=settings.cookie_samesite,
    )


@router.post("/register")
async def register(body: RegisterRequest, request: Request, response: Response):
    db = get_database()

    if await db[USERS].find_one({"phone": body.phone}):
        raise HTTPException(status_code=409, detail="Phone number already registered")

    if body.email and await db[USERS].find_one({"email": body.email}):
        raise HTTPException(status_code=409, detail="Email address already registered")

    now = datetime.now(timezone.utc)
    user_doc: Dict[str, Any] = {
        "phone": body.phone,
        "passwordHash": hash_password(body.password),
        "role": body.role,
        "isActive": True,
        "language": "en",
        "createdAt": now,
        "updatedAt": now,
    }
    if body.email:
        user_doc["email"] = body.email

    result = await db[USERS].insert_one(user_doc)
    user_id = result.inserted_id

    if body.role == "customer":
        await db[CUSTOMER_PROFILES].insert_one(
            {
                "userId": user_id,
                "fullName": body.fullName,
                "dateOfBirth": None,
                "gender": None,
                "address": body.address,
                "city": body.city,
                "pincode": body.pincode,
                "latitude": None,
                "longitude": None,
                "createdAt": now,
                "updatedAt": now,
            }
        )
    elif body.role == "provider":
        try:
            experience = int(body.experience) if body.experience else 0
        except (TypeError, ValueError):
            experience = 0
        society_id = to_object_id(body.societyId) if body.societyId else None
        await db[PROVIDER_PROFILES].insert_one(
            {
                "userId": user_id,
                "societyId": society_id,
                "displayName": body.fullName,
                "experience": experience,
                "serviceArea": None,
                "address": body.address,
                "city": body.city,
                "pincode": body.pincode,
                "latitude": None,
                "longitude": None,
                "availability": "available",
                "verificationStatus": "pending",
                "ratingAvg": None,
                "ratingCount": 0,
                "bio": body.bio,
                "profilePhotoUrl": None,
                "createdAt": now,
                "updatedAt": now,
            }
        )
        await db[IDENTITY_VERIFICATIONS].insert_one(
            {
                "userId": user_id,
                "method": "manual",
                "status": "pending",
                "verifiedAt": None,
                "reviewedBy": None,
                "notes": "Awaiting society admin verification",
                "createdAt": now,
                "updatedAt": now,
            }
        )

    user = await db[USERS].find_one({"_id": user_id})
    token = create_session_token(str(user_id), user["role"])
    _set_session_cookie(response, token, request)

    return {
        "success": True,
        "user": {
            "id": str(user_id),
            "phone": user["phone"],
            "email": user.get("email"),
            "role": user["role"],
            "profileName": body.fullName,
        },
    }


@router.post("/login")
async def login(body: LoginRequest, request: Request, response: Response):
    db = get_database()
    user = await db[USERS].find_one({"phone": body.phone})

    if not user or not verify_password(body.password, user.get("passwordHash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.get("isActive", True):
        raise HTTPException(status_code=403, detail="Account is inactive")

    token = create_session_token(str(user["_id"]), user["role"])
    _set_session_cookie(response, token, request)

    return {
        "success": True,
        "user": {
            "id": str(user["_id"]),
            "phone": user["phone"],
            "email": user.get("email"),
            "role": user["role"],
            "profileName": await get_profile_name(user),
        },
    }


@router.post("/logout")
async def logout(request: Request, response: Response):
    _clear_session_cookie(response, request)
    return {"success": True}


@router.get("/me")
async def me(user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    profile = None
    if user["role"] == "customer":
        from ..services import get_customer_profile

        profile = serialize_doc(await get_customer_profile(user["_id"]))
    elif user["role"] == "provider":
        from ..services import get_provider_profile

        profile = serialize_doc(await get_provider_profile(user["_id"]))

    return {
        "user": {
            "id": str(user["_id"]),
            "phone": user["phone"],
            "email": user.get("email"),
            "role": user["role"],
            "profileName": await get_profile_name(user),
            "profile": profile,
        }
    }
