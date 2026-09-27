"""Serialization helpers: MongoDB documents -> JSON-safe API payloads.

Rules (matching what the existing frontend expects from the previous
Next.js API routes):

- ``_id`` (ObjectId) becomes a string field ``id``.
- Referenced ObjectIds become strings.
- ``datetime`` becomes an ISO-8601 string.
- Mongo ``None``/missing values stay ``null``.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from bson import ObjectId


def _serialize_value(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, dict):
        return serialize_doc(value)
    if isinstance(value, (list, tuple)):
        return [_serialize_value(item) for item in value]
    return value


def serialize_doc(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Convert a MongoDB document into a JSON-safe dict with an ``id`` field."""
    if doc is None:
        return None
    out: Dict[str, Any] = {}
    for key, value in doc.items():
        if key == "_id":
            out["id"] = _serialize_value(value)
        else:
            out[key] = _serialize_value(value)
    return out


def serialize_docs(docs: Optional[List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
    """Serialize a list of documents (None -> [])."""
    if not docs:
        return []
    return [serialize_doc(doc) for doc in docs]


def to_object_id(value: Any) -> Optional[ObjectId]:
    """Convert a string to ObjectId, returning None when invalid."""
    if value is None:
        return None
    if isinstance(value, ObjectId):
        return value
    try:
        return ObjectId(str(value))
    except Exception:
        return None


def is_valid_object_id(value: Any) -> bool:
    if value is None:
        return False
    try:
        ObjectId(str(value))
        return True
    except Exception:
        return False
