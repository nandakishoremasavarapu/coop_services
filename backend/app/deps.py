"""FastAPI dependencies for authentication and role-based authorization.

The session token (signed cookie or Bearer header) only identifies the user.
The user document - and crucially its ``role`` - is re-loaded from MongoDB on
every request, so client-supplied roles or stale token roles are never trusted.
"""

from typing import Any, Dict, Iterable, Optional

from fastapi import Depends, HTTPException, Request, status

from .database import get_database
from .security import parse_session_token

ADMIN_ROLES = ("society_admin", "federation_admin", "super_admin")
ALL_ROLES = ("customer", "provider") + ADMIN_ROLES


def _extract_token(request: Request) -> Optional[str]:
    """Read the session token from the cookie or an Authorization header."""
    settings_cookie = request.app.state.settings.session_cookie_name
    token = request.cookies.get(settings_cookie)
    if token:
        return token
    auth_header = request.headers.get("authorization")
    if auth_header and auth_header.lower().startswith("bearer "):
        return auth_header[7:].strip()
    return None


async def get_current_user_optional(request: Request) -> Optional[Dict[str, Any]]:
    """Return the authenticated user document or None (no error)."""
    token = _extract_token(request)
    if not token:
        return None
    payload = parse_session_token(token)
    if not payload:
        return None
    db = get_database()
    from .serializers import to_object_id

    user = await db["users"].find_one({"_id": to_object_id(payload["userId"])})
    if user is None or not user.get("isActive", True):
        return None
    return user


async def get_current_user(
    user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
) -> Dict[str, Any]:
    """Require an authenticated, active user."""
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
        )
    return user


def require_roles(*roles: str):
    """Dependency factory: require the authenticated user to have one of ``roles``."""

    allowed: Iterable[str] = roles

    async def _dependency(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        if user.get("role") not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized for this action",
            )
        return user

    return _dependency


def require_admin(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """Require any administrative role."""
    if user.get("role") not in ADMIN_ROLES:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
        )
    return user


def is_admin(user: Dict[str, Any]) -> bool:
    return user.get("role") in ADMIN_ROLES
