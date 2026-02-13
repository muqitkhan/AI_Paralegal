# AI Paralegal - Legal Practice Automation

AI-powered legal practice management platform with document drafting, client management, billing, calendar tracking, and legal research.

## Architecture

```
Frontend (Next.js 14)  →  Backend (FastAPI)  →  PostgreSQL
         ↕                      ↕
     NextAuth              OpenAI API
  (Google/Microsoft)     (GPT-4o)
```

## Features

| Module | Description |
|--------|-------------|
| **Document Drafting** | AI-generated contracts, agreements, and legal documents from templates or natural language |
| **Client Management** | Client intake, contact management, status tracking |
| **Case Management** | Case tracking with type, status, court info, opposing counsel |
| **Document Review** | AI-powered analysis with risk flagging, clause extraction, summaries |
| **Billing & Time** | Time tracking, invoice generation, payment status |
| **Calendar & Deadlines** | Court dates, filing deadlines, statute of limitations alerts |
| **AI Legal Research** | Case law search, statute analysis, jurisdiction-specific research |

## Quick Start (Local Development)

### Prerequisites
- Python 3.11+
- Node.js 18+
- Docker (for PostgreSQL)

### 1. Start the Database

```bash
docker-compose up -d
```

### 2. Set Up Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # macOS/Linux
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Run server
uvicorn app.main:app --reload --port 8000
```

### 3. Set Up Frontend

```bash
cd frontend
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your OAuth credentials

# Run dev server
npm run dev
```

### 4. Open the App

- **Frontend:** http://localhost:3000
- **API Docs:** http://localhost:8000/api/docs
- **API ReDoc:** http://localhost:8000/api/redoc

## OAuth Setup

### Google
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 Client ID
3. Add `http://localhost:3000/api/auth/callback/google` as authorized redirect URI
4. Copy Client ID and Secret to both `.env` files

### Microsoft
1. Go to [Azure App Registrations](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps)
2. Register new application
3. Add `http://localhost:3000/api/auth/callback/azure-ad` as redirect URI
4. Create a client secret
5. Copy IDs and Secret to both `.env` files

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/callback` | OAuth login callback |
| GET | `/api/auth/me` | Get current user |
| GET/POST | `/api/clients/` | List/Create clients |
| GET/POST | `/api/cases/` | List/Create cases |
| GET/POST | `/api/documents/` | List/Create documents |
| POST | `/api/documents/analyze` | AI document analysis |
| POST | `/api/documents/draft` | AI document drafting |
| GET/POST | `/api/billing/invoices` | List/Create invoices |
| GET/POST | `/api/billing/time-entries` | List/Create time entries |
| GET/POST | `/api/calendar/events` | List/Create events |
| GET/POST | `/api/calendar/deadlines` | List/Create deadlines |
| POST | `/api/ai/research` | AI legal research |
| POST | `/api/ai/summarize` | AI text summarization |

## Future Deployment (Cheap Stack)

| Service | Provider | Cost |
|---------|----------|------|
| Frontend | Vercel | Free tier |
| Backend | Railway / Render | ~$5/mo |
| Database | Supabase / Neon | Free tier (PostgreSQL) |
| AI | OpenAI API | Pay-per-use |

**Estimated monthly cost: $5-15/mo** for a production deployment.

## Tech Stack

- **Frontend:** Next.js 14, React, TypeScript, Tailwind CSS, NextAuth.js, Zustand
- **Backend:** Python, FastAPI, SQLAlchemy, Pydantic, Alembic
- **Database:** PostgreSQL 16
- **AI:** OpenAI GPT-4o
- **Auth:** Google OAuth, Microsoft OAuth via NextAuth.js
