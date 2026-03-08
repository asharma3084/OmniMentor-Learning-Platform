#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WORKSPACE_DIR="$ROOT_DIR/workspace"
API_HEALTH_URL="http://localhost:3001/health"

run_workspace_cmd() {
  cd "$ROOT_DIR"
  pnpm --dir workspace "$@"
}

start_api() {
  cd "$ROOT_DIR"
  pnpm --dir workspace --filter @omnimentor/api dev
}

start_web() {
  cd "$ROOT_DIR"
  pnpm --dir workspace --filter @omnimentor/web dev
}

show_help() {
  cat <<'EOF'
Usage: scripts/manage.sh <command>

Commands:
  install     Install workspace dependencies
  lint        Run lint checks
  typecheck   Run TypeScript type checks
  test        Run tests
  build       Build API and web apps
  smoke       Run smoke test script
  health      Call API health endpoint
  api         Start API dev server
  web         Start web dev server
  dev         Start API and web dev servers together
  all         Run lint + typecheck + test + build + smoke
  help        Show this help
EOF
}

command="${1:-help}"

case "$command" in
  install)
    run_workspace_cmd install
    ;;
  lint)
    run_workspace_cmd lint
    ;;
  typecheck)
    run_workspace_cmd typecheck
    ;;
  test)
    run_workspace_cmd test
    ;;
  build)
    run_workspace_cmd build
    ;;
  smoke)
    run_workspace_cmd smoke
    ;;
  health)
    curl -sS "$API_HEALTH_URL"
    echo
    ;;
  api)
    start_api
    ;;
  web)
    start_web
    ;;
  dev)
    run_workspace_cmd dev
    ;;
  all)
    run_workspace_cmd lint
    run_workspace_cmd typecheck
    run_workspace_cmd test
    run_workspace_cmd build
    run_workspace_cmd smoke
    ;;
  help|--help|-h)
    show_help
    ;;
  *)
    echo "Unknown command: $command" >&2
    show_help
    exit 1
    ;;
esac
