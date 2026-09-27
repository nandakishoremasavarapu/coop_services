"""Shram Setu - FastAPI backend entry point.

Run (from the backend/ directory):
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

Interactive API docs: http://localhost:8000/docs
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import get_settings
from .database import close_client, ensure_indexes, get_database, ping
from .routers import (
    admin,
    auth,
    bookings,
    conversations,
    messages,
    notifications,
    price_revisions,
    providers,
    quotes,
    services,
)
from .seed import seed_database

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(name)s: %(message)s")
logger = logging.getLogger("shramsetu")

DESCRIPTION = """
Backend for **Shram Setu** - a cooperative service platform connecting
households with verified cooperative service providers.

Roles: customer, provider, society_admin, federation_admin (super_admin reserved).

Authenticate via the `session` cookie set by `POST /api/auth/login`
(or send it as `Authorization: Bearer <token>`).
"""


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    app.state.settings = settings

    db = get_database()
    try:
        connected = await ping(db)
    except Exception as exc:
        logger.error("[startup] Database connection failed: %s", exc)
        connected = False

    if connected:
        await ensure_indexes(db)
        if settings.seed_on_start:
            user_count = await db["users"].count_documents({})
            if user_count == 0:
                logger.info("[startup] Empty database detected - running seed...")
                summary = await seed_database(db)
                logger.info("[startup] Seeded: %s", summary)
            else:
                logger.info("[startup] Database ready (%s users).", user_count)
        else:
            logger.info("[startup] Database ready (auto-seed disabled).")
    else:
        logger.warning(
            "[startup] Continuing without a verified database connection - "
            "requests touching the database will fail until it is reachable."
        )

    yield

    await close_client()


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="Shram Setu API",
        description=DESCRIPTION,
        version="1.0.0",
        lifespan=lifespan,
    )

    # CORS: the Next.js frontend calls this API directly from the browser,
    # with credentials (session cookie), so origins must be allow-listed.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_origin_regex=settings.cors_origin_regex,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ------------------------------------------------------------------
    # Error format: {"error": "..."} - the contract the existing frontend
    # expects (it reads `data.error` from failed responses).
    # ------------------------------------------------------------------
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.detail},
            headers=getattr(exc, "headers", None),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        first = exc.errors()[0] if exc.errors() else {}
        field = ".".join(str(p) for p in first.get("loc", []) if p != "body")
        message = first.get("msg", "Invalid request")
        detail = f"{field}: {message}" if field else message
        return JSONResponse(status_code=400, content={"error": detail})

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.exception("Unhandled error on %s %s", request.method, request.url.path)
        return JSONResponse(status_code=500, content={"error": "Internal server error"})

    # ------------------------------------------------------------------
    # Routers (paths mirror the previous Next.js /api/* contract exactly)
    # ------------------------------------------------------------------
    app.include_router(auth.router)
    app.include_router(services.router)
    app.include_router(bookings.router)
    app.include_router(quotes.router)
    app.include_router(price_revisions.router)
    app.include_router(providers.router)
    app.include_router(notifications.router)
    app.include_router(conversations.router)
    app.include_router(messages.router)
    app.include_router(admin.router)

    @app.get("/api/health", tags=["health"])
    async def health():
        """Health check - verifies the MongoDB connection."""
        try:
            ok = await ping(get_database())
        except Exception:
            ok = False
        return {"ok": ok}

    @app.post("/api/seed", tags=["health"])
    async def seed():
        """Idempotently seed required initial data (safe to call repeatedly)."""
        db = get_database()
        await ensure_indexes(db)
        summary = await seed_database(db)
        return {"success": True, "message": "Database seeded successfully", "summary": summary}

    return app


app = create_app()
