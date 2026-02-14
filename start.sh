#!/usr/bin/env bash
# ──────────────────────────────────────────────
# AI Paralegal – One-command Startup Script
# Kills anything stuck, then starts fresh:
#   PostgreSQL (Docker/Colima) → Backend → Frontend
# ──────────────────────────────────────────────

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

HTTPS_MODE="${ENABLE_LOCAL_HTTPS:-false}"
CERT_DIR="$ROOT_DIR/frontend/certificates"
CERT_FILE="$CERT_DIR/localhost.pem"
KEY_FILE="$CERT_DIR/localhost-key.pem"
SEED_DEMO_DATA="${SEED_DEMO_DATA:-true}"

BACKEND_ENV_FILE="$ROOT_DIR/backend/.env"
BACKEND_ENV_EXAMPLE="$ROOT_DIR/backend/.env.example"
BACKEND_ENV_BACKUP=""
BACKEND_ENV_CREATED="false"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${CYAN}[AI Paralegal]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
ok()   { echo -e "${GREEN}[OK]${NC} $1"; }
err()  { echo -e "${RED}[ERROR]${NC} $1"; }

prepare_backend_env() {
  log "Preparing backend environment..."

  if [[ -f "$BACKEND_ENV_FILE" ]]; then
    BACKEND_ENV_BACKUP="$ROOT_DIR/backend/.env.autobak.$(date +%Y%m%d_%H%M%S)"
    cp "$BACKEND_ENV_FILE" "$BACKEND_ENV_BACKUP"
    ok "Backed up backend/.env → ${BACKEND_ENV_BACKUP##$ROOT_DIR/}"
  else
    if [[ -f "$BACKEND_ENV_EXAMPLE" ]]; then
      cp "$BACKEND_ENV_EXAMPLE" "$BACKEND_ENV_FILE"
      BACKEND_ENV_CREATED="true"
      ok "Created backend/.env from .env.example"
    else
      err "Missing backend/.env and backend/.env.example"
      exit 1
    fi
  fi

  python3 - <<'PY'
from pathlib import Path
import secrets

env_path = Path("backend/.env")
content = env_path.read_text()
placeholder_values = {
    "change-me-to-a-secure-random-string",
    "your-super-secret-key-change-in-production",
    "",
}

lines = content.splitlines()
updated = False
found_jwt = False
for i, line in enumerate(lines):
    if line.startswith("JWT_SECRET_KEY="):
        found_jwt = True
        current = line.split("=", 1)[1].strip()
        if current in placeholder_values:
            lines[i] = f"JWT_SECRET_KEY={secrets.token_urlsafe(64)}"
            updated = True

if not found_jwt:
    lines.append(f"JWT_SECRET_KEY={secrets.token_urlsafe(64)}")
    updated = True

if updated:
    env_path.write_text("\n".join(lines) + "\n")
    print("UPDATED_JWT")

# Check GROQ key presence for user-friendly warning in shell
groq = ""
for line in lines:
    if line.startswith("GROQ_API_KEY="):
        groq = line.split("=", 1)[1].strip()
        break

if not groq:
    print("MISSING_GROQ")
PY

  if grep -q "^GROQ_API_KEY=$" "$BACKEND_ENV_FILE"; then
    warn "GROQ_API_KEY is empty in backend/.env (AI features will be limited until set)"
  fi
}

if [[ "$HTTPS_MODE" == "true" ]]; then
  if [[ ! -f "$CERT_FILE" || ! -f "$KEY_FILE" ]]; then
    err "ENABLE_LOCAL_HTTPS=true but cert files are missing in frontend/certificates"
    exit 1
  fi
  ok "Local HTTPS mode enabled"
fi

# ── Helper: force-kill everything on a port ───────────────────
kill_port() {
  local PORT=$1
  local PIDS
  PIDS=$(lsof -ti :"$PORT" 2>/dev/null || true)
  if [ -n "$PIDS" ]; then
    warn "Port $PORT in use (PIDs: $PIDS) — force killing..."
    echo "$PIDS" | xargs kill -9 2>/dev/null || true
    sleep 1
    # Verify it's dead
    PIDS=$(lsof -ti :"$PORT" 2>/dev/null || true)
    if [ -n "$PIDS" ]; then
      err "Could not free port $PORT. Kill manually: lsof -ti :$PORT | xargs kill -9"
      exit 1
    fi
    ok "Port $PORT freed"
  fi
}

# ── Helper: kill stale uvicorn / node / next processes ────────
kill_stale() {
  log "Cleaning up stale processes..."

  # Kill any uvicorn processes from this project
  pkill -9 -f "uvicorn app.main:app.*--port 8000" 2>/dev/null || true

  # Kill any next-server / node processes from this project's frontend
  pkill -9 -f "next-server.*AI_Paralegal" 2>/dev/null || true
  pkill -9 -f "next dev.*AI_Paralegal" 2>/dev/null || true
  pkill -9 -f "node.*AI_Paralegal/frontend" 2>/dev/null || true

  sleep 1

  # Force-free the ports regardless of what's on them
  kill_port 8000
  kill_port 3000

  ok "All stale processes cleaned"
}

cleanup() {
  EXIT_CODE=$?
  echo ""
  log "Shutting down services..."
  [[ -n "$BACKEND_PID" ]]  && kill "$BACKEND_PID"  2>/dev/null
  [[ -n "$FRONTEND_PID" ]] && kill "$FRONTEND_PID" 2>/dev/null
  # Also kill any child processes spawned by uvicorn --reload / next dev
  pkill -9 -f "uvicorn app.main:app.*--port 8000" 2>/dev/null || true
  pkill -9 -f "node.*AI_Paralegal/frontend" 2>/dev/null || true
  wait 2>/dev/null

  if [[ "$EXIT_CODE" -ne 0 ]]; then
    if [[ "$BACKEND_ENV_CREATED" == "true" && -f "$BACKEND_ENV_FILE" ]]; then
      rm -f "$BACKEND_ENV_FILE"
      warn "Startup failed: removed auto-created backend/.env to avoid partial state"
    elif [[ -n "$BACKEND_ENV_BACKUP" && -f "$BACKEND_ENV_BACKUP" ]]; then
      cp "$BACKEND_ENV_BACKUP" "$BACKEND_ENV_FILE"
      warn "Startup failed: restored backend/.env from backup (${BACKEND_ENV_BACKUP##$ROOT_DIR/})"
    fi
  fi

  log "All services stopped."
}
trap cleanup EXIT INT TERM

prepare_backend_env

# ══════════════════════════════════════════════════════════════
# STEP 1 — Kill anything stuck
# ══════════════════════════════════════════════════════════════
kill_stale

# ══════════════════════════════════════════════════════════════
# STEP 2 — Docker runtime (Docker Desktop or Colima)
# ══════════════════════════════════════════════════════════════
log "Checking Docker runtime..."
if docker info &>/dev/null; then
  ok "Docker is running"
else
  if command -v colima &>/dev/null; then
    log "Starting Colima..."
    colima start 2>/dev/null || true
    sleep 3
  fi
  if ! docker info &>/dev/null; then
    err "Docker is not running. Please start Docker Desktop or Colima first."
    exit 1
  fi
  ok "Docker is running (via Colima)"
fi

# ══════════════════════════════════════════════════════════════
# STEP 3 — PostgreSQL container
# ══════════════════════════════════════════════════════════════
log "Starting PostgreSQL..."
docker compose up -d db 2>/dev/null || docker-compose up -d db 2>/dev/null
for i in {1..30}; do
  if docker exec paralegal_db pg_isready -U paralegal &>/dev/null; then
    break
  fi
  sleep 1
done
if docker exec paralegal_db pg_isready -U paralegal &>/dev/null; then
  ok "PostgreSQL is ready on port 5432"
else
  err "PostgreSQL failed to start within 30s"
  exit 1
fi

# ══════════════════════════════════════════════════════════════
# STEP 4 — Backend (FastAPI + Uvicorn)
# ══════════════════════════════════════════════════════════════
log "Starting backend..."
cd "$ROOT_DIR/backend"

if [ ! -d "venv" ]; then
  warn "Virtual environment not found. Creating..."
  python3 -m venv venv
  source venv/bin/activate
  pip install -r requirements.txt
else
  source venv/bin/activate
fi

if [ -f "alembic.ini" ]; then
  log "Running database migrations..."
  alembic upgrade head 2>/dev/null || warn "Alembic migrations skipped"
fi

if [[ "$SEED_DEMO_DATA" == "true" ]]; then
  log "Seeding demo data (idempotent)..."
  python seed.py >/dev/null 2>&1 || warn "Demo seed skipped (seed.py returned non-zero)"
fi

if [[ "$HTTPS_MODE" == "true" ]]; then
  uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --ssl-keyfile "$KEY_FILE" --ssl-certfile "$CERT_FILE" &
else
  uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
fi
BACKEND_PID=$!
sleep 2

if kill -0 "$BACKEND_PID" 2>/dev/null; then
  if [[ "$HTTPS_MODE" == "true" ]]; then
    ok "Backend running on https://localhost:8000"
  else
    ok "Backend running on http://localhost:8000"
  fi
else
  err "Backend failed to start"
  exit 1
fi

# ══════════════════════════════════════════════════════════════
# STEP 5 — Frontend (Next.js)
# ══════════════════════════════════════════════════════════════
log "Starting frontend..."
cd "$ROOT_DIR/frontend"

if [ ! -d "node_modules" ]; then
  warn "node_modules not found. Installing..."
  npm install
fi

if [[ "$HTTPS_MODE" == "true" ]]; then
  export BACKEND_ORIGIN="https://localhost:8000"
  npm run dev:https &
else
  export BACKEND_ORIGIN="http://localhost:8000"
  npm run dev &
fi
FRONTEND_PID=$!
sleep 3

if kill -0 "$FRONTEND_PID" 2>/dev/null; then
  if [[ "$HTTPS_MODE" == "true" ]]; then
    ok "Frontend running on https://localhost:3000"
  else
    ok "Frontend running on http://localhost:3000"
  fi
else
  err "Frontend failed to start"
  exit 1
fi

# ══════════════════════════════════════════════════════════════
# READY
# ══════════════════════════════════════════════════════════════
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   AI Paralegal is running!                   ║${NC}"
echo -e "${GREEN}║                                              ║${NC}"
if [[ "$HTTPS_MODE" == "true" ]]; then
  echo -e "${GREEN}║   Frontend:  https://localhost:3000           ║${NC}"
  echo -e "${GREEN}║   Backend:   https://localhost:8000           ║${NC}"
  echo -e "${GREEN}║   API Docs:  https://localhost:8000/api/docs  ║${NC}"
else
  echo -e "${GREEN}║   Frontend:  http://localhost:3000            ║${NC}"
  echo -e "${GREEN}║   Backend:   http://localhost:8000            ║${NC}"
  echo -e "${GREEN}║   API Docs:  http://localhost:8000/api/docs   ║${NC}"
fi
echo -e "${GREEN}║                                              ║${NC}"
echo -e "${GREEN}║   Press Ctrl+C to stop all services          ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
echo ""

# Keep script alive
wait
