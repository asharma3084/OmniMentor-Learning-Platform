#!/bin/sh

# Purpose: run isolated API and web services for Playwright E2E verification, then clean up.

set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
WORKSPACE_DIR="$ROOT_DIR/workspace"
API_PORT=10092
WEB_PORT=10091
API_URL="http://127.0.0.1:$API_PORT"
WEB_URL="http://127.0.0.1:$WEB_PORT"
DB_PATH="../services/api/data/omnimentor-e2e.db"
API_LOG=$(mktemp -t omnimentor-e2e-api.XXXX.log)
WEB_LOG=$(mktemp -t omnimentor-e2e-web.XXXX.log)
API_PID=''
WEB_PID=''

cleanup() {
  if [ -n "$WEB_PID" ]; then
    kill "$WEB_PID" 2>/dev/null || true
    wait "$WEB_PID" 2>/dev/null || true
  fi

  if [ -n "$API_PID" ]; then
    kill "$API_PID" 2>/dev/null || true
    wait "$API_PID" 2>/dev/null || true
  fi
}

wait_for_url() {
  target_url="$1"
  log_file="$2"
  label="$3"
  attempt=0

  while [ "$attempt" -lt 120 ]; do
    if curl -sf "$target_url" >/dev/null 2>&1; then
      return 0
    fi

    attempt=$((attempt + 1))
    sleep 1
  done

  echo "$label failed to become ready: $target_url" >&2
  echo "--- $label log ---" >&2
  tail -n 80 "$log_file" >&2 || true
  return 1
}

trap cleanup EXIT INT TERM

cd "$WORKSPACE_DIR"

API_PORT="$API_PORT" DATABASE_URL="$DB_PATH" pnpm --filter @omnimentor/api dev >"$API_LOG" 2>&1 &
API_PID=$!

VITE_API_URL="$API_URL" pnpm --filter @omnimentor/web exec vite --host 127.0.0.1 --port "$WEB_PORT" >"$WEB_LOG" 2>&1 &
WEB_PID=$!

wait_for_url "$API_URL/health" "$API_LOG" "API"
wait_for_url "$WEB_URL" "$WEB_LOG" "Web"

pnpm exec playwright test --config ../tests/playwright.config.js "$@"