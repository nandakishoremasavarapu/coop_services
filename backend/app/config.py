"""Application configuration.

All runtime settings come from environment variables (see .env.example).
Secrets are never hardcoded; MONGODB_URI must be provided at runtime.
"""

from functools import lru_cache
from typing import Annotated, List, Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ------------------------------------------------------------------
    # Database
    # ------------------------------------------------------------------
    # Full MongoDB Atlas connection string, e.g.
    # mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
    mongodb_uri: str = Field(
        default="mongomock://memory",
        description=(
            "MongoDB connection string. 'mongomock://memory' runs an in-memory "
            "mock database (offline demo / tests only - data is NOT persisted)."
        ),
    )
    mongodb_db_name: str = Field(default="shram_setu", description="Database name.")

    # ------------------------------------------------------------------
    # Security
    # ------------------------------------------------------------------
    # Used to sign session tokens. MUST be overridden in production with a
    # long random string, e.g. output of: python -c "import secrets; print(secrets.token_hex(32))"
    secret_key: str = Field(default="dev-insecure-secret-key-change-me")

    session_ttl_days: int = Field(default=7)
    bcrypt_rounds: int = Field(
        default=12,
        description="bcrypt cost factor for password hashing (lower = faster tests).",
    )
    session_cookie_name: str = Field(default="session")
    cookie_domain: Optional[str] = Field(
        default=None,
        description="Optional cookie domain (e.g. '.example.com'). Leave unset for localhost.",
    )
    cookie_secure: bool = Field(
        default=False,
        description="Set True when serving the API over HTTPS in production.",
    )
    cookie_samesite: str = Field(default="lax")

    # ------------------------------------------------------------------
    # CORS
    # ------------------------------------------------------------------
    cors_origins: Annotated[List[str], NoDecode] = Field(
        default_factory=lambda: [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ],
        description="Comma-separated list of allowed frontend origins.",
    )
    cors_origin_regex: Optional[str] = Field(
        default=None,
        description="Optional regex of additionally allowed origins (e.g. preview hosts).",
    )

    # ------------------------------------------------------------------
    # Business rules (mirrors the existing frontend expectations)
    # ------------------------------------------------------------------
    platform_fee_pct: float = Field(default=0.10, description="Platform fee (0.10 = 10%).")

    # ------------------------------------------------------------------
    # Startup behaviour
    # ------------------------------------------------------------------
    seed_on_start: bool = Field(
        default=True,
        description="Seed initial categories/demo data automatically when the database is empty.",
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, value):
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @field_validator("mongodb_uri", mode="before")
    @classmethod
    def _empty_uri_means_mock(cls, value):
        # An empty/whitespace MONGODB_URI falls back to the in-memory mock so
        # the app still runs offline (with a loud warning) until the real
        # Atlas connection string is provided.
        if value is None or str(value).strip() == "":
            return "mongomock://memory"
        return str(value).strip()

    @property
    def is_mock_db(self) -> bool:
        return self.mongodb_uri.startswith("mongomock://")


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    if settings.secret_key == "dev-insecure-secret-key-change-me":
        # Visible reminder, does not block development.
        print(
            "[config] WARNING: SECRET_KEY is using the insecure development default. "
            "Set a strong SECRET_KEY environment variable for production."
        )
    return settings
