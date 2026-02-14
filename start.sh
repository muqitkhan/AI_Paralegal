#!/usr/bin/env bash
# ──────────────────────────────────────────────
# AI Paralegal – One-command Startup Script
# Kills anything stuck, then starts fresh:
#   PostgreSQL (Docker/Colima) → Backend → Frontend
# ──────────────────────────────────────────────

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

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
  echo ""
  log "Shutting down services..."
  [[ -n "$BACKEND_PID" ]]  && kill "$BACKEND_PID"  2>/dev/null
  [[ -n "$FRONTEND_PID" ]] && kill "$FRONTEND_PID" 2>/dev/null
  # Also kill any child processes spawned by uvicorn --reload / next dev
  pkill -9 -f "uvicorn app.main:app.*--port 8000" 2>/dev/null || true
  pkill -9 -f "node.*AI_Paralegal/frontend" 2>/dev/null || true
  wait 2>/dev/null
  log "All services stopped."
}
trap cleanup EXIT INT TERM

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

uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
sleep 2

if kill -0 "$BACKEND_PID" 2>/dev/null; then
  ok "Backend running on http://localhost:8000"
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

npm run dev &
FRONTEND_PID=$!
sleep 3

if kill -0 "$FRONTEND_PID" 2>/dev/null; then
  ok "Frontend running on http://localhost:3000"
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
echo -e "${GREEN}║   Frontend:  http://localhost:3000            ║${NC}"
echo -e "${GREEN}║   Backend:   http://localhost:8000            ║${NC}"
echo -e "${GREEN}║   API Docs:  http://localhost:8000/docs       ║${NC}"
echo -e "${GREEN}║                                              ║${NC}"
echo -e "${GREEN}║   Press Ctrl+C to stop all services          ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
echo ""

# Keep script alive
wait
