#!/usr/bin/env bash
set -euo pipefail

# Run postgres + redis via docker compose, then app + worker locally

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Initialize PID vars so cleanup trap doesn't fail on unbound variable
WORKER_PID=""
APP_PID=""

cleanup() {
    echo ""
    echo "Stopping..."
    [ -n "$WORKER_PID" ] && kill "$WORKER_PID" 2>/dev/null || true
    [ -n "$APP_PID" ] && kill "$APP_PID" 2>/dev/null || true
    [ -n "$WORKER_PID" ] && wait "$WORKER_PID" 2>/dev/null || true
    [ -n "$APP_PID" ] && wait "$APP_PID" 2>/dev/null || true
    echo "Done."
}
trap cleanup EXIT INT TERM

# Load .env so Prisma CLI can find DATABASE_URL
while IFS='=' read -r key value; do
    [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
    [[ -z "$value" ]] && continue
    export "$key=$value"
done < <(grep -v '^\s*#' .env | grep -v '^\s*$')

# ── Start infra (postgres + redis) ────────────────────────────────
echo "Starting postgres & redis..."
docker compose up -d postgres redis

# Wait for them to be healthy
echo "Waiting for services to be healthy..."
until docker compose exec -T postgres pg_isready -U boilerplate -d boilerplate >/dev/null 2>&1; do
    sleep 1
done
until docker compose exec -T redis redis-cli ping >/dev/null 2>&1; do
    sleep 1
done
echo "Infra ready."

# ── Run migrations + seed ─────────────────────────────────────────
echo "Running migrations..."
npx prisma migrate deploy
echo "Seeding database..."
npm run db:seed || true

# ── Start worker (background) ─────────────────────────────────────
echo "Starting worker..."
npm run worker &
WORKER_PID=$!

# ── Start app (foreground) ────────────────────────────────────────
echo "Starting dev server..."
npm run dev &
APP_PID=$!

# Wait for either to exit
wait -n "$WORKER_PID" "$APP_PID" 2>/dev/null || true
echo "A process exited. Shutting down..."
