"""Request/response schemas for authentication and user profiles."""

from typing import Optional

from pydantic import BaseModel, Field, field_validator

from ..deps import ALL_ROLES

# Roles that may self-register through the public endpoint.
# Administrative roles are provisioned via the seed script / database only -
# this prevents privilege escalation through the registration form.
PUBLIC_REGISTRATION_ROLES = ("customer", "provider")


class LoginRequest(BaseModel):
    phone: str = Field(min_length=4, max_length=20)
    password: str = Field(min_length=1, max_length=128)


class RegisterRequest(BaseModel):
    phone: str = Field(min_length=4, max_length=20)
    password: str = Field(min_length=6, max_length=128)
    role: str
    fullName: str = Field(min_length=1, max_length=120)
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    experience: Optional[str] = None
    bio: Optional[str] = None
    societyId: Optional[str] = None

    @field_validator("role")
    @classmethod
    def _validate_role(cls, value: str) -> str:
        value = value.strip().lower()
        if value not in ALL_ROLES:
            raise ValueError("Invalid role")
        if value not in PUBLIC_REGISTRATION_ROLES:
            raise ValueError(
                "Admin accounts cannot be self-registered. "
                "They are provisioned by the platform administrators."
            )
        return value

    @field_validator("email")
    @classmethod
    def _validate_email(cls, value: Optional[str]) -> Optional[str]:
        if value is None or value.strip() == "":
            return None
        value = value.strip().lower()
        if "@" not in value:
            raise ValueError("Invalid email address")
        return value


class PublicUser(BaseModel):
    id: str
    phone: str
    email: Optional[str] = None
    role: str
    profileName: str = ""


class ProfileUpdateRequest(BaseModel):
    """PATCH /api/auth/me style profile updates (currently unused by the UI
    but kept for completeness of the profile-management API)."""

    fullName: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    dateOfBirth: Optional[str] = None
    gender: Optional[str] = None
