# AI Paralegal - Legal Practice Automation

AI-powered legal practice management platform with document drafting, client management, case tracking, billing, calendar deadlines, and AI legal research — all powered by **Groq AI (free tier)**.

## Architecture

```
Frontend (Next.js 14)  →  Backend (FastAPI)  →  PostgreSQL
                                ↕
                           Groq AI API
                      (llama-3.3-70b-versatile)
```

## Features

| Module | Description |
|--------|-------------|
| **Client Management** | Client intake, contact management, status tracking, CSV/JSON import |
| **Case Management** | Case tracking with type, status, court info, opposing counsel |
| **Document Drafting** | AI-generated contracts, agreements, and legal documents |
| **Billing & Time** | Invoice generation, payment status, amount tracking |
| **Calendar & Deadlines** | Court dates, filing deadlines, event management |
| **AI Legal Research** | AI-powered case law search, statute analysis, summarization |

**Cross-cutting features on all modules:**
- CSV / JSON file upload & bulk import
- AI-powered auto-suggestion (keyword completion on form fields)

---

## Running the Project Locally

### One Command (Recommended)

From project root:

```bash
./start.sh
```

`start.sh` now handles end-to-end bootstrapping:
- starts PostgreSQL container
- creates `backend/.env` from `.env.example` if missing
- auto-generates a strong `JWT_SECRET_KEY` if placeholder/empty
- installs missing dependencies (`backend/venv`, `frontend/node_modules`)
- runs migrations (when available)
- optionally seeds demo data (`SEED_DEMO_DATA=true` by default)
- starts backend and frontend

Optional toggles:

```bash
# Enable local HTTPS mode
ENABLE_LOCAL_HTTPS=true ./start.sh

# Skip demo seed data
SEED_DEMO_DATA=false ./start.sh
```

### Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| **Python** | 3.11+ | 3.12 recommended |
| **Node.js** | 18+ | For the Next.js frontend |
| **Docker** | Any | For PostgreSQL (Docker Desktop or Colima on macOS) |
| **Groq API Key** | Free | Get one at https://console.groq.com/keys |

> **macOS < 14 note:** Docker Desktop may not work on older macOS versions. Use [Colima](https://github.com/abiosoft/colima) instead: `brew install colima && colima start`.

---

### Step 1: Clone the Repository

```bash
git clone <your-repo-url>
cd AI_Paralegal
```

### Step 2: Start the Database (PostgreSQL)

```bash
docker-compose up -d
```

This starts PostgreSQL 16 on **port 5432** with:
- **User:** `paralegal`
- **Password:** `paralegal_secret`
- **Database:** `ai_paralegal`

Verify it's running:

```bash
docker ps   # Should show paralegal_db container
```

> If using Colima, make sure it's started first: `colima start`

### Step 3: Set Up the Backend

```bash
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate        # macOS / Linux
# venv\Scripts\activate         # Windows

# Install dependencies
pip install -r requirements.txt
```

#### Configure Environment Variables

Create a `.env` file inside the `backend/` folder:

```bash
cat > .env << 'EOF'
# App
DEBUG=True

# Database (matches docker-compose.yml)
DATABASE_URL=postgresql+psycopg://paralegal:paralegal_secret@localhost:5432/ai_paralegal

# JWT - CHANGE THIS IN PRODUCTION
JWT_SECRET_KEY=change-me-to-a-secure-random-string
COOKIE_SECURE=False

# Groq AI (FREE - get key from https://console.groq.com/keys)
GROQ_API_KEY=your-groq-api-key-here
AI_MODEL=llama-3.3-70b-versatile

# Frontend URL
FRONTEND_URL=http://localhost:3000
FRONTEND_URL_HTTPS=https://localhost:3000

# Local HTTPS toggle (set True if using local certs)
ENABLE_LOCAL_HTTPS=False
EOF
```

> **Important:** Replace `your-groq-api-key-here` with your actual Groq API key.

### Secret Rotation (Recommended)

Generate strong secrets:

```bash
cd backend
python scripts/generate_secrets.py
```

Copy the generated values into your `backend/.env` (at minimum `JWT_SECRET_KEY`).

#### Start the Backend Server

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The backend will automatically create all database tables on first startup.

Verify it's running:

```bash
curl http://localhost:8000/api/health
# Should return: {"status": "healthy"}
```

### Step 4: Set Up the Frontend

Open a **new terminal** window:

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

### Optional: Run with Local HTTPS

Local certificates are available in `frontend/certificates/`.

```bash
ENABLE_LOCAL_HTTPS=true ./start.sh
```

This runs frontend/backend on HTTPS localhost and uses secure cookie mode when `COOKIE_SECURE=True`.

### Step 5: Open the App

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:3000 |
| **API Docs (Swagger)** | http://localhost:8000/api/docs |
| **API Docs (ReDoc)** | http://localhost:8000/api/redoc |

### Step 6: Register or Use Demo Credentials

On first launch, register a new account on the login page, or use the pre-seeded demo account:

| Field | Value |
|-------|-------|
| **Email** | `demo@lawfirm.com` |
| **Password** | `demo1234` |

> The demo account is created automatically when the backend starts.

---

## Project Structure

```
AI_Paralegal/
├── docker-compose.yml          # PostgreSQL database
├── backend/
│   ├── app/
│   │   ├── main.py             # FastAPI app entry point
│   │   ├── config.py           # Settings (loaded from .env)
│   │   ├── database.py         # SQLAlchemy engine & session
│   │   ├── models.py           # Database models
│   │   ├── schemas.py          # Pydantic request/response schemas
│   │   ├── services/
│   │   │   └── ai_service.py   # Groq AI integration
│   │   └── routers/
│   │       ├── auth.py         # Login & register
│   │       ├── clients.py      # Client CRUD + import
│   │       ├── cases.py        # Case CRUD + import
│   │       ├── documents.py    # Document CRUD + AI drafting
│   │       ├── billing.py      # Invoice CRUD + import
│   │       ├── calendar.py     # Events & deadlines + import
│   │       ├── research.py     # AI legal research
│   │       └── ai.py           # AI suggest endpoint
│   ├── requirements.txt
│   ├── venv/                   # Python virtual environment
│   └── .env                    # Environment variables (not committed)
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx        # Login / Register page
│   │   │   └── dashboard/      # All 6 dashboard modules
│   │   ├── lib/
│   │   │   ├── api.ts          # API client (all backend calls)
│   │   │   └── store.ts        # Zustand auth store
│   │   └── components/
│   │       ├── AutoSuggestInput.tsx  # AI keyword suggestions
│   │       └── FileImport.tsx        # CSV/JSON file upload
│   ├── next.config.js          # API proxy rewrites
│   ├── package.json
│   └── tailwind.config.ts
└── README.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Email/password login (returns JWT) |
| POST | `/api/auth/register` | Register new account |
| GET | `/api/auth/me` | Get current user |
| GET/POST | `/api/clients` | List / Create clients |
| POST | `/api/clients/import` | Bulk import clients (CSV/JSON) |
| GET/POST | `/api/cases` | List / Create cases |
| POST | `/api/cases/import` | Bulk import cases |
| GET/POST | `/api/documents` | List / Create documents |
| POST | `/api/documents/draft` | AI document drafting |
| GET/POST | `/api/billing/invoices` | List / Create invoices |
| POST | `/api/billing/import` | Bulk import invoices |
| GET/POST | `/api/calendar/events` | List / Create events |
| POST | `/api/calendar/import` | Bulk import events |
| POST | `/api/ai/research` | AI legal research |
| POST | `/api/ai/suggest` | AI keyword auto-suggestions |
| GET | `/api/health` | Health check |

## Tech Stack

- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS 3.4, Zustand
- **Backend:** Python 3.12, FastAPI 0.109, SQLAlchemy 2.0, Pydantic 2.6
- **Database:** PostgreSQL 16 (Docker)
- **AI:** Groq (free tier) — llama-3.3-70b-versatile
- **Auth:** Email/password with bcrypt + JWT (HS256, 7-day expiry)

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Login page stuck on "Please wait..." | Backend may be unresponsive. Restart it: kill the uvicorn process and run `uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload` again |
| `connection refused` on port 5432 | Make sure Docker/Colima and the PostgreSQL container are running: `docker-compose up -d` |
| `ModuleNotFoundError` | Make sure the virtualenv is activated: `source backend/venv/bin/activate` |
| AI features not working | Verify your `GROQ_API_KEY` is set correctly in `backend/.env` |
| Port already in use | Kill the process on that port: `lsof -i :8000` then `kill -9 <PID>` |

## Future Deployment (Cheap Stack)

| Service | Provider | Cost |
|---------|----------|------|
| Frontend | Vercel | Free tier |
| Backend | Railway / Render | ~$5/mo |
| Database | Supabase / Neon | Free tier (PostgreSQL) |
| AI | Groq | Free tier |

**Estimated monthly cost: $0-5/mo** for a production deployment.
