"""Request schemas for bookings, quotes and price revisions."""

from typing import List, Optional

from pydantic import BaseModel, Field


class BookingCreateRequest(BaseModel):
    categoryId: Optional[str] = None
    serviceId: Optional[str] = None
    serviceDescription: str = Field(min_length=1, max_length=2000)
    address: str = Field(min_length=1, max_length=500)
    city: Optional[str] = None
    pincode: Optional[str] = None
    latitude: Optional[str] = None
    longitude: Optional[str] = None
    preferredTime: Optional[str] = None
    isEmergency: Optional[bool] = False
    mediaUrls: Optional[List[str]] = None


class QuoteCreateRequest(BaseModel):
    bookingId: str
    amount: str = Field(min_length=1, max_length=32)
    note: Optional[str] = None
    estimatedArrival: Optional[str] = None


class PriceRevisionCreateRequest(BaseModel):
    bookingId: str
    originalAmount: Optional[str] = None
    proposedAmount: str = Field(min_length=1, max_length=32)
    reason: str = Field(min_length=1, max_length=1000)


class BookingActionRequest(BaseModel):
    """PATCH /api/bookings/{id} - action plus optional extra fields.

    Extra fields (providerId, initialAmount, method, amount, rating,
    reviewText, proposedAmount) are passed through, mirroring the
    previous API contract.
    """

    action: str
    providerId: Optional[str] = None
    initialAmount: Optional[str] = None
    method: Optional[str] = None
    amount: Optional[str] = None
    rating: Optional[int] = None
    reviewText: Optional[str] = None
    proposedAmount: Optional[str] = None

    model_config = {"extra": "allow"}
