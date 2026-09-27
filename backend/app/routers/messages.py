"""Messages inside a conversation, including the demo auto-reply behaviour."""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException

from ..database import CONVERSATIONS, MESSAGES, USERS, get_database
from ..deps import get_current_user
from ..schemas.misc import MessageCreateRequest
from ..serializers import serialize_doc, serialize_docs, to_object_id

router = APIRouter(prefix="/api/messages", tags=["messages"])


async def _get_participant_conversation(db, conversation_id: str, user_id):
    conv_oid = to_object_id(conversation_id)
    conv = await db[CONVERSATIONS].find_one({"_id": conv_oid}) if conv_oid else None
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if user_id not in (conv.get("participantIds") or []):
        raise HTTPException(status_code=403, detail="Forbidden")
    return conv


@router.get("")
async def list_messages(
    conversationId: str,
    user: Dict[str, Any] = Depends(get_current_user),
):
    db = get_database()
    conv = await _get_participant_conversation(db, conversationId, user["_id"])

    # Mark the other participant's unread messages as read (existing behaviour).
    await db[MESSAGES].update_many(
        {"conversationId": conv["_id"], "isRead": False, "senderId": {"$ne": user["_id"]}},
        {"$set": {"isRead": True}},
    )

    messages = (
        await db[MESSAGES]
        .find({"conversationId": conv["_id"]})
        .sort("createdAt", 1)
        .to_list(length=None)
    )
    return {"messages": serialize_docs(messages)}


def _auto_reply_for(content: str, media_url: str | None) -> str:
    """Keyword-based provider auto-reply (preserved from the previous backend)."""
    text = (content or "").lower()
    if media_url or any(w in text for w in ("photo", "pic", "audio", "record")):
        return (
            "Thank you for sharing this! The visual details help me prepare the exact "
            "diagnostic instruments and components before arriving."
        )
    if any(w in text for w in ("eta", "time", "reach", "arrive", "when")):
        return (
            "I am on route in your society area. Traffic is clear and I should reach "
            "your doorstep in approximately 20-25 minutes."
        )
    if any(w in text for w in ("gate", "security", "flat", "door", "pass", "code")):
        return (
            "Understood, thank you! I will inform security at the gate and show my "
            "Cooperative Member ID. Coming straight to your flat."
        )
    if any(w in text for w in ("part", "cost", "price", "estimate", "material")):
        return (
            "I carry genuine cooperative-approved standard components in my kit. Any "
            "replacement parts will be shown to you with transparent society prices "
            "before fitting."
        )
    if any(w in text for w in ("hi", "hello", "namaste", "morning", "afternoon")):
        return (
            "Namaste! Happy to help. Please let me know if you have any questions or "
            "gate access instructions."
        )
    return "Received! Noted your update. Looking forward to completing your service smoothly."


@router.post("")
async def send_message(
    body: MessageCreateRequest,
    user: Dict[str, Any] = Depends(get_current_user),
):
    db = get_database()
    conv = await _get_participant_conversation(db, body.conversationId, user["_id"])

    if not (body.content and body.content.strip()) and not body.mediaUrl:
        raise HTTPException(
            status_code=400, detail="conversationId and content or media are required"
        )

    now = datetime.now(timezone.utc)
    message_doc = {
        "conversationId": conv["_id"],
        "senderId": user["_id"],
        "content": (body.content or "").strip() or None,
        "mediaUrl": body.mediaUrl or None,
        "isRead": False,
        "createdAt": now,
    }
    result = await db[MESSAGES].insert_one(message_doc)
    message_doc["_id"] = result.inserted_id

    auto_reply = None
    if user["role"] == "customer":
        participant_ids = conv.get("participantIds") or []
        other_id = next((pid for pid in participant_ids if pid != user["_id"]), None)
        if other_id is None or not await db[USERS].find_one({"_id": other_id}):
            first_provider = await db[USERS].find_one({"role": "provider"})
            other_id = first_provider["_id"] if first_provider else None
        if other_id is not None:
            reply_doc = {
                "conversationId": conv["_id"],
                "senderId": other_id,
                "content": _auto_reply_for(body.content or "", body.mediaUrl),
                "mediaUrl": None,
                "isRead": False,
                "createdAt": now + timedelta(seconds=1),
            }
            reply_result = await db[MESSAGES].insert_one(reply_doc)
            reply_doc["_id"] = reply_result.inserted_id
            auto_reply = serialize_doc(reply_doc)

    return {"success": True, "message": serialize_doc(message_doc), "autoReply": auto_reply}
