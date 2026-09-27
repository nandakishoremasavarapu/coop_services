"""Service catalogue endpoints (categories + specific services)."""

from fastapi import APIRouter, HTTPException, Query

from ..database import SERVICE_CATEGORIES, SPECIFIC_SERVICES, get_database
from ..serializers import serialize_docs, to_object_id

router = APIRouter(prefix="/api/services", tags=["services"])


@router.get("/categories")
async def list_categories():
    db = get_database()
    categories = (
        await db[SERVICE_CATEGORIES]
        .find({"isActive": True})
        .sort("sortOrder", 1)
        .to_list(length=None)
    )
    return {"categories": serialize_docs(categories)}


@router.get("/specific")
async def list_specific_services(categoryId: str = Query(...)):
    db = get_database()
    category_oid = to_object_id(categoryId)
    if category_oid is None:
        raise HTTPException(status_code=400, detail="Invalid categoryId")

    services = (
        await db[SPECIFIC_SERVICES]
        .find({"categoryId": category_oid, "isActive": True})
        .to_list(length=None)
    )
    return {"services": serialize_docs(services)}
