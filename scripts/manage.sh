#!/usr/bin/env bash
# Purpose: manage local OmniMentor services and common verification shortcuts safely.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WORKSPACE_DIR="$ROOT_DIR/workspace"
CONFIG_FILE="$ROOT_DIR/config/manage.env"
RUNTIME_DIR="${TMPDIR:-/tmp}/omnimentor-manage"
PID_DIR="$RUNTIME_DIR/pids"
LOG_DIR="$RUNTIME_DIR/logs"

# Defaults (can be overridden in config/manage.env)
API_PORT=9992
WEB_PORT=9991
OLLAMA_PORT=11434
API_HOST="127.0.0.1"
WEB_HOST="127.0.0.1"
OLLAMA_HOST="127.0.0.1"
DATABASE_URL="./data/omnimentor.db"
OLLAMA_DEFAULT_MODEL="llama3.2"
AUTO_START_OLLAMA=false
HEALTH_RETRIES=60
HEALTH_INTERVAL_SEC=1

mkdir -p "$PID_DIR" "$LOG_DIR"

log_info() { echo "[INFO] $*"; }
log_warn() { echo "[WARN] $*"; }
log_error() { echo "[ERROR] $*" >&2; }

get_port_pids() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -ti tcp:"$port" || true
  fi
}

load_config() {
  if [[ -f "$CONFIG_FILE" ]]; then
    # shellcheck disable=SC1090
    source "$CONFIG_FILE"
  fi
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    log_error "Missing required command: $1"
    exit 1
  }
}

pid_file() {
  echo "$PID_DIR/$1.pid"
}

log_file() {
  echo "$LOG_DIR/$1.log"
}

service_port() {
  case "$1" in
    api) echo "$API_PORT" ;;
    web) echo "$WEB_PORT" ;;
    ollama) echo "$OLLAMA_PORT" ;;
    *) return 1 ;;
  esac
}

service_health_url() {
  case "$1" in
    api) echo "http://$API_HOST:$API_PORT/health" ;;
    web) echo "http://$WEB_HOST:$WEB_PORT" ;;
    ollama) echo "http://$OLLAMA_HOST:$OLLAMA_PORT/api/tags" ;;
    *) return 1 ;;
  esac
}

is_pid_running() {
  local pid="$1"
  [[ -n "$pid" ]] && kill -0 "$pid" >/dev/null 2>&1
}

kill_port() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    local pids
    pids="$(get_port_pids "$port")"
    if [[ -n "$pids" ]]; then
      log_warn "Killing existing process(es) on port $port: $pids"
      # shellcheck disable=SC2086
      kill $pids >/dev/null 2>&1 || true
      sleep 1
      pids="$(get_port_pids "$port")"
      if [[ -n "$pids" ]]; then
        # shellcheck disable=SC2086
        kill -9 $pids >/dev/null 2>&1 || true
      fi
    fi
  else
    log_warn "lsof not available; skipping port cleanup for $port"
  fi
}

external_port_pids() {
  local service="$1"
  local port managed_pid pids
  port="$(service_port "$service")"
  managed_pid=""
  if [[ -f "$(pid_file "$service")" ]]; then
    managed_pid="$(cat "$(pid_file "$service")")"
  fi
  pids="$(get_port_pids "$port")"

  if [[ -z "$pids" ]]; then
    return 0
  fi

  if [[ -n "$managed_pid" ]]; then
    printf '%s\n' "$pids" | grep -vx "$managed_pid" || true
  else
    printf '%s\n' "$pids"
  fi
}

start_service() {
  local service="$1"
  local cmd=""
  local port
  local launch_prefix=""
  port="$(service_port "$service")"

  stop_service "$service" >/dev/null 2>&1 || true

  local conflicting_pids
  conflicting_pids="$(external_port_pids "$service")"
  if [[ -n "$conflicting_pids" ]]; then
    log_warn "Port $port is already in use by process(es): $conflicting_pids — killing automatically."
    for cpid in $conflicting_pids; do
      kill "$cpid" 2>/dev/null || true
    done
    sleep 1
    # Verify port is now free
    conflicting_pids="$(external_port_pids "$service")"
    if [[ -n "$conflicting_pids" ]]; then
      log_warn "Port $port still occupied — force-killing: $conflicting_pids"
      for cpid in $conflicting_pids; do
        kill -9 "$cpid" 2>/dev/null || true
      done
      sleep 1
    fi
  fi

  case "$service" in
    api)
      cmd="cd '$ROOT_DIR' && exec env API_PORT='$API_PORT' DATABASE_URL='$DATABASE_URL' pnpm --dir workspace --filter @omnimentor/api dev"
      ;;
    web)
      cmd="cd '$ROOT_DIR' && exec pnpm --dir workspace --filter @omnimentor/web exec vite --host '$WEB_HOST' --port '$WEB_PORT' --strictPort"
      ;;
    ollama)
      require_cmd ollama
      cmd="cd '$ROOT_DIR' && exec env OLLAMA_HOST='$OLLAMA_HOST:$OLLAMA_PORT' ollama serve"
      ;;
    *)
      log_error "Unsupported service: $service"
      exit 1
      ;;
  esac

  log_info "Starting $service on port $port"
  if command -v setsid >/dev/null 2>&1; then
    launch_prefix="setsid "
  fi
  nohup ${launch_prefix}bash -lc "$cmd" >"$(log_file "$service")" 2>&1 &
  local pid=$!
  echo "$pid" >"$(pid_file "$service")"
  sleep 1

  if is_pid_running "$pid"; then
    log_info "$service started (pid=$pid, log=$(log_file "$service"))"
  else
    log_error "$service failed to start. Check log: $(log_file "$service")"
    exit 1
  fi
}

stop_service() {
  local service="$1"
  local pid_path
  local stopped_managed=false
  pid_path="$(pid_file "$service")"

  if [[ -f "$pid_path" ]]; then
    local pid
    pid="$(cat "$pid_path")"
    if is_pid_running "$pid"; then
      log_info "Stopping $service (pid=$pid)"
      kill -TERM "-$pid" >/dev/null 2>&1 || kill "$pid" >/dev/null 2>&1 || true
      sleep 1
      if is_pid_running "$pid"; then
        kill -KILL "-$pid" >/dev/null 2>&1 || kill -9 "$pid" >/dev/null 2>&1 || true
      fi
      stopped_managed=true
    fi
    rm -f "$pid_path"
  fi

  local remaining_pids
  remaining_pids="$(get_port_pids "$(service_port "$service")")"
  if [[ -n "$remaining_pids" ]]; then
    log_warn "$service port $(service_port "$service") still in use by: $remaining_pids — killing to free port."
    # shellcheck disable=SC2086
    kill $remaining_pids 2>/dev/null || true
    sleep 1
    remaining_pids="$(get_port_pids "$(service_port "$service")")"
    if [[ -n "$remaining_pids" ]]; then
      # shellcheck disable=SC2086
      kill -9 $remaining_pids 2>/dev/null || true
      sleep 1
    fi
  fi

  if [[ "$stopped_managed" == true ]]; then
    log_info "$service stopped"
  elif [[ -n "$remaining_pids" ]]; then
    log_info "$service was not managed by this script; external process(es) remain running"
  else
    log_info "$service stopped"
  fi
}

status_service() {
  local service="$1"
  local pid_path
  pid_path="$(pid_file "$service")"
  local port
  port="$(service_port "$service")"

  if [[ -f "$pid_path" ]] && is_pid_running "$(cat "$pid_path")"; then
    echo "$service: running (pid=$(cat "$pid_path"), port=$port)"
  elif command -v lsof >/dev/null 2>&1; then
    local port_pids
    port_pids="$(get_port_pids "$port" | tr '\n' ',' | sed 's/,$//')"
    if [[ -n "$port_pids" ]]; then
      echo "$service: running (external pid=$port_pids, port=$port)"
    else
      echo "$service: stopped (port=$port)"
    fi
  else
    echo "$service: stopped (port=$port)"
  fi
}

health_service() {
  local service="$1"
  local url
  url="$(service_health_url "$service")"
  local i=1
  while [[ "$i" -le "$HEALTH_RETRIES" ]]; do
    if curl -fsS "$url" >/dev/null 2>&1; then
      echo "$service: healthy ($url)"
      return 0
    fi
    sleep "$HEALTH_INTERVAL_SEC"
    i=$((i + 1))
  done
  echo "$service: unhealthy ($url)"
  return 1
}

logs_service() {
  local service="$1"
  local lines="${2:-80}"
  local file
  file="$(log_file "$service")"
  if [[ -f "$file" ]]; then
    tail -n "$lines" "$file"
  else
    log_warn "No log file for $service yet"
  fi
}

run_workspace_cmd() {
  cd "$ROOT_DIR"
  pnpm --dir workspace "$@"
}

run_with_api_if_needed() {
  local started_api=false

  if ! health_service api >/dev/null 2>&1; then
    start_service api
    started_api=true
    health_service api >/dev/null 2>&1
  fi

  run_workspace_cmd "$@"

  if [[ "$started_api" == true ]]; then
    stop_service api >/dev/null 2>&1 || true
  fi
}

run_full_gate() {
  local started_api=false

  run_workspace_cmd lint
  run_workspace_cmd typecheck
  run_workspace_cmd test
  run_workspace_cmd test:e2e
  run_workspace_cmd build

  if ! health_service api >/dev/null 2>&1; then
    start_service api
    started_api=true
    health_service api >/dev/null 2>&1
  fi

  run_workspace_cmd smoke
  run_workspace_cmd eval
  run_workspace_cmd audit

  if [[ "$started_api" == true ]]; then
    stop_service api >/dev/null 2>&1 || true
  fi
}

pkg_cmd() {
  local action="${1:-}"
  shift || true
  case "$action" in
    install) run_workspace_cmd install "$@" ;;
    add) run_workspace_cmd add "$@" ;;
    remove|uninstall) run_workspace_cmd remove "$@" ;;
    audit) run_workspace_cmd audit "$@" ;;
    prune) run_workspace_cmd store prune ;;
    update) run_workspace_cmd up "$@" ;;
    *)
      log_error "Usage: manage.sh pkg <install|add|remove|uninstall|audit|prune|update> [...]"
      exit 1
      ;;
  esac
}

ollama_cmd() {
  local action="${1:-}"
  shift || true
  require_cmd ollama

  case "$action" in
    start) start_service ollama ;;
    stop) stop_service ollama ;;
    restart) stop_service ollama; start_service ollama ;;
    status) status_service ollama ;;
    model)
      local model_action="${1:-}"
      local model_name="${2:-$OLLAMA_DEFAULT_MODEL}"
      case "$model_action" in
        install) ollama pull "$model_name" ;;
        uninstall) ollama rm "$model_name" ;;
        list) ollama list ;;
        ensure)
          if ollama list | awk '{print $1}' | grep -Fx "$model_name" >/dev/null 2>&1; then
            log_info "Model already installed: $model_name"
          else
            ollama pull "$model_name"
          fi
          ;;
        *)
          log_error "Usage: manage.sh ollama model <install|uninstall|list|ensure> [model]"
          exit 1
          ;;
      esac
      ;;
    *)
      log_error "Usage: manage.sh ollama <start|stop|restart|status|model>"
      exit 1
      ;;
  esac
}

doctor() {
  local ok=true
  for cmd in node pnpm curl; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
      log_error "Missing command: $cmd"
      ok=false
    fi
  done

  if [[ ! -d "$WORKSPACE_DIR" ]]; then
    log_error "Workspace directory missing: $WORKSPACE_DIR"
    ok=false
  fi

  echo "Configured ports: api=$API_PORT web=$WEB_PORT ollama=$OLLAMA_PORT"
  if command -v lsof >/dev/null 2>&1; then
    for p in "$API_PORT" "$WEB_PORT" "$OLLAMA_PORT"; do
      local pids
      pids="$(lsof -ti tcp:"$p" || true)"
      if [[ -n "$pids" ]]; then
        echo "port $p in use by: $pids"
      else
        echo "port $p is free"
      fi
    done
  fi

  if [[ "$ok" != true ]]; then
    exit 1
  fi
  log_info "Doctor checks passed"
}

start_group() {
  local target="${1:-all}"
  case "$target" in
    all)
      start_service api
      start_service web
      if [[ "$AUTO_START_OLLAMA" == "true" ]]; then
        start_service ollama
      fi
      ;;
    api|web|ollama) start_service "$target" ;;
    *) log_error "Unknown service target: $target"; exit 1 ;;
  esac
}

stop_group() {
  local target="${1:-all}"
  case "$target" in
    all)
      stop_service web || true
      stop_service api || true
      stop_service ollama || true
      ;;
    api|web|ollama) stop_service "$target" ;;
    *) log_error "Unknown service target: $target"; exit 1 ;;
  esac
}

status_group() {
  local target="${1:-all}"
  case "$target" in
    all)
      status_service api
      status_service web
      status_service ollama
      ;;
    api|web|ollama) status_service "$target" ;;
    *) log_error "Unknown service target: $target"; exit 1 ;;
  esac
}

health_group() {
  local target="${1:-all}"
  case "$target" in
    all)
      local failed=0
      health_service api || failed=1
      health_service web || failed=1
      health_service ollama || failed=1
      return "$failed"
      ;;
    api|web|ollama) health_service "$target" ;;
    *) log_error "Unknown service target: $target"; exit 1 ;;
  esac
}

show_ports() {
  echo "api=$API_PORT"
  echo "web=$WEB_PORT"
  echo "ollama=$OLLAMA_PORT"
}

show_help() {
  cat <<'EOF'
Usage: scripts/manage.sh <command> [args]

Core service commands:
  start <api|web|ollama|all>
  stop <api|web|ollama|all>
  restart <api|web|ollama|all>
  status [api|web|ollama|all]
  health [api|web|ollama|all]
  logs <api|web|ollama> [lines]
  ports
  kill-port <api|web|ollama|port-number>
  doctor

Ollama commands:
  ollama start|stop|restart|status
  ollama model install <name>
  ollama model uninstall <name>
  ollama model list
  ollama model ensure <name>

Package commands:
  pkg install
  pkg add <pkg> [--filter <workspace>]
  pkg remove <pkg> [--filter <workspace>]
  pkg uninstall <pkg> [--filter <workspace>]
  pkg audit
  pkg prune
  pkg update [pkg]

Compatibility shortcuts:
  lint | typecheck | test | test:e2e | test:e2e:headed | build | smoke | eval | audit | dev | all

Config file:
  config/manage.env
EOF
}

load_config
command="${1:-help}"
shift || true

case "$command" in
  start)
    target="${1:-all}"
    start_group "$target"
    status_group "$target"
    ;;
  stop) stop_group "${1:-all}" ;;
  restart)
    target="${1:-all}"
    stop_group "$target"
    start_group "$target"
    status_group "$target"
    ;;
  status) status_group "${1:-all}" ;;
  health) health_group "${1:-all}" ;;
  logs) logs_service "${1:-api}" "${2:-80}" ;;
  ports) show_ports ;;
  kill-port)
    target="${1:-}"
    if [[ -z "$target" ]]; then
      log_error "Usage: manage.sh kill-port <api|web|ollama|port-number>"
      exit 1
    fi
    if [[ "$target" =~ ^[0-9]+$ ]]; then
      kill_port "$target"
    else
      kill_port "$(service_port "$target")"
    fi
    ;;
  doctor) doctor ;;
  ollama) ollama_cmd "$@" ;;
  pkg) pkg_cmd "$@" ;;
  lint) run_workspace_cmd lint ;;
  typecheck) run_workspace_cmd typecheck ;;
  test) run_workspace_cmd test ;;
  test:e2e) run_workspace_cmd test:e2e ;;
  test:e2e:headed) run_workspace_cmd test:e2e:headed ;;
  build) run_workspace_cmd build ;;
  smoke) run_with_api_if_needed smoke ;;
  eval) run_with_api_if_needed eval ;;
  audit) run_workspace_cmd audit ;;
  dev) run_workspace_cmd dev ;;
  all) run_full_gate ;;
  help|--help|-h) show_help ;;
  *)
    log_error "Unknown command: $command"
    show_help
    exit 1
    ;;
esac
