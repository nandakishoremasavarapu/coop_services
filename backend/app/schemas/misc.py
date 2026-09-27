"""Request schemas for providers, notifications, messaging and admin."""

from typing import Any, Dict, Optional

from pydantic import BaseModel


class ProviderProfileUpdateRequest(BaseModel):
    displayName: Optional[str] = None
    experience: Optional[int] = None
    bio: Optional[str] = None
    serviceArea: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    availability: Optional[str] = None
    verificationStatus: Optional[str] = None  # admin-only, enforced in the router
    profilePhotoUrl: Optional[str] = None

    model_config = {"extra": "ignore"}


class ProviderVerifyRequest(BaseModel):
    status: str
    notes: Optional[str] = None


class NotificationMarkReadRequest(BaseModel):
    notificationId: Optional[str] = None


class ConversationCreateRequest(BaseModel):
    bookingId: str
    providerId: str


class MessageCreateRequest(BaseModel):
    conversationId: str
    content: Optional[str] = None
    mediaUrl: Optional[str] = None


class AdminSettingsUpdateRequest(BaseModel):
    """POST /api/admin/settings - partial settings document merge."""

    model_config = {"extra": "allow"}

    def as_dict(self) -> Dict[str, Any]:
        return {k: v for k, v in self.model_dump().items()}


class WelfareActionRequest(BaseModel):
    action: str
    claimId: Optional[str] = None
    payoutMethod: Optional[str] = None
    reason: Optional[str] = None
    providerName: Optional[str] = None
    trade: Optional[str] = None
    schemeId: Optional[str] = None
    amount: Optional[float] = None
    hospital: Optional[str] = None
    diagnosis: Optional[str] = None
