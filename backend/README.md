# Shram Setu — FastAPI Backend

Python/FastAPI backend for the Shram Setu cooperative service platform, using
**MongoDB Atlas** (via the async Motor driver) as the primary database.

- Interactive API docs: `http://localhost:8000/docs` (Swagger UI)
- Alternative docs: `http://localhost:8000/redoc`

---

## 1. Requirements

- Python 3.11+ (`python --version`)
- A MongoDB Atlas cluster (free M0 tier is fine)

## 2. Setup (Windows PowerShell)

```powershell
# from the repository root
cd backend

# 1. Create and activate a virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1
# If script execution is blocked, run this once per PowerShell session:
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
copy .env.example .env
notepad .env
```

In `.env`, set at minimum:

```ini
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
SECRET_KEY=<long random string>
```

Generate a `SECRET_KEY` with:

```powershell
python -c "import secrets; print(secrets.token_hex(32))"
```

> **Atlas network access:** in the Atlas console under *Network Access*, allow
> your IP (or `0.0.0.0/0` for development) or the backend cannot connect.

## 3. Run the backend

```powershell
# from backend/, with the venv activated
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

On startup the backend:

1. Connects to MongoDB Atlas (`MONGODB_URI`).
2. Creates all collections and **indexes** (idempotent).
3. Seeds initial data **only if the database is empty** (25 service
   categories, specific services, societies, demo accounts, sample bookings —
   see `app/seed.py`). Repeated runs never duplicate or delete anything.

To seed manually at any time (safe, idempotent):

```powershell
python -m app.seed
```

Health check: `http://localhost:8000/api/health` → `{"ok": true}`

## 4. Demo accounts (created by the seed)

| Role              | Phone       | Password      |
| ----------------- | ----------- | ------------- |
| Federation admin  | 9000000001  | admin123      |
| Society admin     | 9000000002  | admin123      |
| Customer          | 9100000001  | password123   |
| Customer          | 9100000002  | password123   |
| Provider          | 9200000001  | password123   |
| Provider          | 9200000002  | password123   |

Administrative roles **cannot** self-register through the public API; admin
accounts come from the seed / database.

## 5. Run the tests

```powershell
# from backend/, venv activated
python -m pytest tests/ -v
```

The suite (53 tests) runs against an in-memory mock MongoDB
(`mongomock-motor`) — no Atlas connection or network access needed. It covers
authentication, permissions/ownership, the booking lifecycle, quotes, price
revisions, notifications, and the admin endpoints.

## 6. Project layout

```
backend/
├── app/
│   ├── main.py           # FastAPI app, CORS, error format, health, seed route
│   ├── config.py         # pydantic-settings (reads MONGODB_URI etc.)
│   ├── database.py       # Motor client, collection names, indexes
│   ├── security.py       # bcrypt hashing + HMAC-signed session tokens
│   ├── deps.py           # auth dependencies (get_current_user, require_roles)
│   ├── serializers.py    # MongoDB document -> JSON (id, ISO dates)
│   ├── services.py       # shared helpers (notifications, fees, profiles)
│   ├── defaults.py       # default admin settings & welfare schemes
│   ├── seed.py           # idempotent seed script
│   ├── schemas/          # Pydantic request models
│   └── routers/          # auth, services, bookings, quotes, price_revisions,
│                         # providers, notifications, conversations, messages, admin
├── tests/                # pytest suite (mock MongoDB)
├── requirements.txt
└── .env.example
```

## 7. Environment variables

| Variable            | Required | Default                | Purpose                                          |
| ------------------- | -------- | ---------------------- | ------------------------------------------------ |
| `MONGODB_URI`       | yes      | (in-memory mock)       | MongoDB Atlas connection string                  |
| `MONGODB_DB_NAME`   | no       | `shram_setu`           | Database name inside the cluster                 |
| `SECRET_KEY`        | prod     | insecure dev default   | Signs session tokens                             |
| `SESSION_TTL_DAYS`  | no       | `7`                    | Session lifetime                                 |
| `CORS_ORIGINS`      | no       | localhost:3000 origins | Comma-separated allowed frontend origins         |
| `CORS_ORIGIN_REGEX` | no       | —                      | Regex of extra allowed origins                   |
| `COOKIE_DOMAIN`     | no       | (host-only)            | Cookie domain, e.g. `.example.com` in production |
| `COOKIE_SECURE`     | no       | `false`                | `true` when serving over HTTPS                   |
| `PLATFORM_FEE_PCT`  | no       | `0.10`                 | Platform fee (10%)                               |
| `SEED_ON_START`     | no       | `true`                 | Auto-seed when the database is empty             |
| `BCRYPT_ROUNDS`     | no       | `12`                   | Password hash cost factor                        |

Special case: `MONGODB_URI=mongomock://memory` runs an **in-memory mock
database** (used by tests and offline demos — data is not persisted).

## 8. API endpoints

All paths mirror the previous Next.js `/api/*` contract, so the existing
frontend works unchanged. Session auth uses an HttpOnly `session` cookie
(HMAC-signed); the same token is also accepted as `Authorization: Bearer`.

### Auth
| Method | Path                      | Description                                   |
| ------ | ------------------------- | --------------------------------------------- |
| POST   | `/api/auth/register`      | Register customer/provider (admins blocked)   |
| POST   | `/api/auth/login`         | Login (phone + password), sets session cookie |
| POST   | `/api/auth/logout`        | Clear session                                 |
| GET    | `/api/auth/me`            | Current user + profile                        |

### Catalogue & providers
| Method | Path                              | Description                          |
| ------ | --------------------------------- | ------------------------------------ |
| GET    | `/api/services/categories`        | Active service categories            |
| GET    | `/api/services/specific?categoryId=` | Services within a category        |
| GET    | `/api/providers`                  | Provider directory                   |
| GET    | `/api/providers/{id}`             | Provider detail (skills, ratings...) |
| PATCH  | `/api/providers/{id}`             | Update own profile / admin verify    |

### Bookings, quotes, price revisions
| Method | Path                          | Description                                        |
| ------ | ----------------------------- | -------------------------------------------------- |
| GET    | `/api/bookings?role=`         | Role-scoped booking list                           |
| POST   | `/api/bookings`               | Create request (customer) — auto-generates quotes  |
| GET    | `/api/bookings/{id}`          | Full detail (quotes, revisions, payment, rating…)  |
| PATCH  | `/api/bookings/{id}`          | Lifecycle actions (state machine below)            |
| GET    | `/api/quotes?bookingId=`      | Quotes for a booking                               |
| POST   | `/api/quotes`                 | Provider submits a quote                           |
| GET    | `/api/price-revisions?bookingId=` | Price revision history                         |
| POST   | `/api/price-revisions`        | Provider requests a price change                   |

Booking lifecycle actions (`PATCH /api/bookings/{id}` body `{"action": ...}`):

```
select_provider → accept_booking → mark_arrived → confirm_arrival
→ request_price_change → approve_price_change / reject_price_change
→ start_work → complete_work → confirm_completion
→ record_payment → submit_rating        (+ cancel_booking from pre-work states)
```

### Messaging & notifications
| Method | Path                       | Description                            |
| ------ | -------------------------- | -------------------------------------- |
| GET    | `/api/notifications`       | Own notifications (latest 50)          |
| PATCH  | `/api/notifications`       | Mark one / all as read                 |
| GET    | `/api/conversations`       | Enriched conversation list             |
| POST   | `/api/conversations`       | Ensure a conversation exists           |
| GET    | `/api/messages?conversationId=` | Messages (marks incoming as read) |
| POST   | `/api/messages`            | Send message (demo auto-reply kept)    |

### Admin (society/federation/super admin only)
| Method | Path                                | Description                       |
| ------ | ----------------------------------- | --------------------------------- |
| GET    | `/api/admin/stats`                  | Dashboard statistics / analytics  |
| GET    | `/api/admin/providers`              | Provider management list          |
| POST   | `/api/admin/providers/{id}/verify`  | Verify / reject a provider        |
| GET    | `/api/admin/settings`               | Platform settings (persisted)     |
| POST   | `/api/admin/settings`               | Update settings                   |
| GET    | `/api/admin/welfare`                | Welfare schemes, claims, stats    |
| POST   | `/api/admin/welfare`                | approve/reject/new_claim/relief   |

### Misc
| Method | Path          | Description                              |
| ------ | ------------- | ---------------------------------------- |
| GET    | `/api/health` | Health check (pings MongoDB)             |
| POST   | `/api/seed`   | Idempotent seed (never deletes data)     |

## 9. MongoDB collections

`users`, `customer_profiles`, `provider_profiles`, `identity_verifications`,
`federations`, `societies`, `service_categories`, `specific_services`,
`skills`, `provider_skills`, `bookings`, `quotes`, `price_revisions`,
`milestone_confirmations`, `payments`, `invoices`, `ratings`, `conversations`,
`messages`, `cancellations`, `disputes`, `welfare_records`, `notifications`,
`audit_events`, `admin_settings`, `welfare_state`, `certifications`.

References use MongoDB `ObjectId`s; the API serializes `_id` → `id` (string)
and datetimes → ISO-8601 strings. Indexes (unique phone/email, booking
lookups, conversation participants, etc.) are created automatically on startup.
