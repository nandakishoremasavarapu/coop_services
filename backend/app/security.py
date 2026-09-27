"""Password hashing and session token handling.

- Passwords are hashed with bcrypt (salted, adaptive - replaces the previous
  unsalted SHA-256 scheme).
- Session tokens are HMAC-SHA256 signed payloads (``base64url(payload).signature``)
  so they cannot be forged or tampered with by the client. The token only
  identifies the user; the authoritative role is always re-read from the
  database on every authenticated request.
"""

import base64
import hashlib
import hmac
import json
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

import bcrypt

from .config import get_settings

# ---------------------------------------------------------------------------
# Passwords
# ---------------------------------------------------------------------------


def hash_password(password: str) -> str:
    """Hash a plain-text password with bcrypt (returns utf-8 str for storage)."""
    rounds = get_settings().bcrypt_rounds
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=rounds)).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """Constant-time bcrypt verification. Returns False on any mismatch."""
    if not password or not password_hash:
        return False
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def needs_rehash(password_hash: str) -> bool:
    """True if a stored hash should be upgraded (not used for bcrypt yet)."""
    return False


# ---------------------------------------------------------------------------
# Session tokens
# ---------------------------------------------------------------------------


def _secret() -> bytes:
    return get_settings().secret_key.encode("utf-8")


def _b64encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def _b64decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def create_session_token(user_id: str, role: str) -> str:
    """Create a signed session token: base64url(payload).hmac_sha256(payload)."""
    settings = get_settings()
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.session_ttl_days)
    payload = json.dumps(
        {"userId": str(user_id), "role": role, "exp": expires_at.timestamp()},
        separators=(",", ":"),
        sort_keys=True,
    ).encode("utf-8")
    payload_b64 = _b64encode(payload)
    signature = hmac.new(_secret(), payload_b64.encode("ascii"), hashlib.sha256).hexdigest()
    return f"{payload_b64}.{signature}"


def parse_session_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify signature + expiry and return the payload, or None."""
    if not token or "." not in token:
        return None
    payload_b64, signature = token.rsplit(".", 1)
    expected = hmac.new(_secret(), payload_b64.encode("ascii"), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(signature, expected):
        return None
    try:
        payload = json.loads(_b64decode(payload_b64).decode("utf-8"))
    except (ValueError, UnicodeDecodeError):
        return None
    exp = payload.get("exp")
    if not isinstance(exp, (int, float)) or datetime.now(timezone.utc).timestamp() > float(exp):
        return None
    if not payload.get("userId"):
        return None
    return payload


def generate_secret_key() -> str:
    """Helper for generating a strong SECRET_KEY (used in docs/scripts)."""
    return secrets.token_hex(32)
