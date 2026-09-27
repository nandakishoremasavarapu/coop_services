"""In-app notifications."""

from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException

from ..database import NOTIFICATIONS, get_database
from ..deps import get_current_user
from ..schemas.misc import NotificationMarkReadRequest
from ..serializers import serialize_docs, to_object_id

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("")
async def list_notifications(user: Dict[str, Any] = Depends(get_current_user)):
    db = get_database()
    notifications = (
        await db[NOTIFICATIONS]
        .find({"recipientId": user["_id"]})
        .sort("createdAt", -1)
        .limit(50)
        .to_list(length=None)
    )
    return {"notifications": serialize_docs(notifications)}


@router.patch("")
async def mark_notifications_read(
    body: NotificationMarkReadRequest,
    user: Dict[str, Any] = Depends(get_current_user),
):
    db = get_database()
    if body.notificationId:
        oid = to_object_id(body.notificationId)
        if oid is None:
            raise HTTPException(status_code=400, detail="Invalid notificationId")
        # Ownership check: only the recipient may mark their own notification.
        result = await db[NOTIFICATIONS].update_one(
            {"_id": oid, "recipientId": user["_id"]},
            {"$set": {"isRead": True}},
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Notification not found")
    else:
        await db[NOTIFICATIONS].update_many(
            {"recipientId": user["_id"]}, {"$set": {"isRead": True}}
        )
    return {"success": True}
