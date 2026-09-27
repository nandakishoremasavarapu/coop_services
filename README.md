# Shram Setu 🌉

**Shram Setu** ("Labour Bridge") is a cooperative service platform that
connects households needing at-home services with verified cooperative
service providers — with role-based dashboards for **customers**,
**providers**, and **administrators**.

## Stack

| Layer    | Technology                                                    |
| -------- | ------------------------------------------------------------- |
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4             |
| Backend  | **FastAPI** (Python), Pydantic validation                      |
| Database | **MongoDB Atlas** (async Motor driver)                        |
| Auth     | bcrypt password hashing + HMAC-signed HttpOnly session cookie |

```
Browser ──▶ Next.js frontend (port 3000)
              │  client pages  ──▶ FastAPI (port 8000)  ──▶ MongoDB Atlas
              │  server layouts ──▶ FastAPI /api/auth/me (session verification)
```

The frontend calls the backend through a **centralized API client**
(`src/lib/api.ts`) with a configurable base URL
(`NEXT_PUBLIC_API_BASE_URL`). The previous Next.js API routes + PGlite
implementation is still present as an offline fallback when that variable is
empty.

---

## Quick start (one command)

Requires **Node.js 18+** and **Python 3.11+**.

```powershell
# Windows PowerShell (from the repository root)
python run.py
```

`run.py` automatically:
1. Creates `.env` (frontend) and `backend/.env` (backend, with a generated
   `SECRET_KEY`) if missing,
2. Installs frontend (npm) and backend (venv + pip) dependencies,
3. Starts the FastAPI backend on `http://localhost:8000` (auto-seeds the
   database when empty),
4. Starts the Next.js frontend on `http://localhost:3000` and opens it.

> **One required step:** paste your **MongoDB Atlas connection string** into
> `backend/.env` as `MONGODB_URI=...` (Atlas → Connect → Drivers). Until then
> the backend runs on a temporary in-memory database and data is not saved.

## Manual setup (Windows PowerShell)

### 1. Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env      # then edit: set MONGODB_URI + SECRET_KEY
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Docs: `http://localhost:8000/docs` — details in [`backend/README.md`](backend/README.md).

### 2. Frontend

```powershell
# from the repository root (new PowerShell window)
copy .env.example .env.local   # sets NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
npm install
npm run dev -- -p 3000
```

Open `http://localhost:3000`.

### 3. MongoDB Atlas

1. Create a free cluster at <https://cloud.mongodb.com>.
2. **Network Access** → add your IP (or `0.0.0.0/0` for development).
3. **Database Access** → create a database user.
4. **Connect → Drivers** → copy the connection string into `backend/.env`:
   `MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority`

Collections and indexes are created automatically; the seed (categories,
societies, demo users, sample bookings) runs only when the database is empty
and never deletes or duplicates data.

## Demo accounts

| Role             | Phone      | Password     |
| ---------------- | ---------- | ------------ |
| Federation admin | 9000000001 | admin123     |
| Society admin    | 9000000002 | admin123     |
| Customer         | 9100000001 | password123  |
| Provider         | 9200000001 | password123  |

(Plus 9100000002/3 customers and 9200000002–5 providers — same passwords.)

## Tests

```powershell
# Backend (53 tests: auth, permissions, bookings, quotes, admin)
cd backend
.\.venv\Scripts\Activate.ps1
python -m pytest tests/ -v

# Frontend type check
npm run typecheck
```

The backend test-suite uses an in-memory mock MongoDB, so it runs without
network access.

## Environment variables

### Frontend (`.env.local`)

| Variable                  | Default | Purpose                                                     |
| ------------------------- | ------- | ----------------------------------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL`| —       | FastAPI base URL, e.g. `http://localhost:8000`. Empty = use the legacy built-in Next.js API routes (offline fallback). |
| `API_BASE_URL_SERVER`     | —       | Optional override for server-to-server calls (e.g. internal URL). |

### Backend (`backend/.env`) — see [`backend/README.md`](backend/README.md)

| Variable          | Required | Purpose                          |
| ----------------- | -------- | -------------------------------- |
| `MONGODB_URI`     | yes      | MongoDB Atlas connection string  |
| `SECRET_KEY`      | prod     | Signs session tokens             |
| `MONGODB_DB_NAME` | no       | Database name (default `shram_setu`) |
| `CORS_ORIGINS`    | no       | Allowed frontend origins         |

## Features

- **Customers:** browse 25 service categories, submit service requests
  (with media, emergency flag, scheduling), receive provider quotes, select a
  provider, follow the live job lifecycle (arrival confirmation → price
  change approval → work start → completion → payment → rating), chat with
  providers, notifications.
- **Providers:** dashboard with availability toggle, open request feed,
  quote submission, job lifecycle management, price revision requests,
  earnings view, profile management, messaging.
- **Admins:** platform statistics & analytics charts, booking oversight,
  provider verification, welfare & insurance scheme management (claims,
  instant relief), platform settings (fees, notification rules, service
  areas, integrations).
- **Security:** bcrypt password hashing, HMAC-signed HttpOnly session
  cookies, role-based authorization derived from the database (never from
  client input), per-resource ownership checks, admin-only endpoints,
  CORS allow-list, Pydantic validation everywhere, secrets only in
  environment variables.

## Project structure

```
├── run.py                 # one-command launcher (backend + frontend)
├── src/                   # Next.js frontend (unchanged design/workflows)
│   ├── app/               # pages: landing, customer/, provider/, admin/
│   ├── lib/api.ts         # centralized API client (NEXT_PUBLIC_API_BASE_URL)
│   ├── lib/session.ts     # server-side session verification via FastAPI
│   └── app/api/           # legacy Next.js API routes (offline fallback)
└── backend/               # FastAPI + MongoDB Atlas (see backend/README.md)
    ├── app/               # config, database, security, routers, seed
    └── tests/             # pytest suite (mock MongoDB)
```
