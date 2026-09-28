#!/bin/bash
# System One Lab — local infrastructure only.
#
#   ./start                     PostgreSQL + every local engine
#   ./start --without-engines   PostgreSQL only
#   ./start --stop              stop containers, preserve volumes
#   ./start --clean             remove containers and clean-labelled data volumes
#   ./start --purge-models      remove model-cache-labelled volumes
#   ./start --status            show infrastructure status
#   ./start --logs [service]    show logs for an infrastructure service

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$PACKAGE_DIR/../../.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$REPO_ROOT/compose.yml}"
ENV_FILE="${ENV_FILE:-$REPO_ROOT/.env}"

BOLD='\033[1m'; DIM='\033[2m'; RED='\033[0;31m'; GREEN='\033[0;32m'
YELLOW='\033[1;33m'; CYAN='\033[0;36m'; MAGENTA='\033[0;35m'; BLUE='\033[0;34m'
WHITE='\033[1;37m'; GRAY='\033[0;90m'; NC='\033[0m'
ICON_OK='✔'; ICON_FAIL='✘'; ICON_WARN='⚠'; ICON_ARROW='▸'; ICON_DOT='●'; ICON_GEAR='⚙'; ICON_CLOCK='◷'
W=74

_ts() { date +"%H:%M:%S"; }
ok() { echo -e "  ${GRAY}$(_ts)${NC}  ${GREEN}${ICON_OK}${NC}  $*"; }
warn() { echo -e "  ${GRAY}$(_ts)${NC}  ${YELLOW}${ICON_WARN}${NC}  $*"; }
err() { echo -e "  ${GRAY}$(_ts)${NC}  ${RED}${ICON_FAIL}${NC}  $*" >&2; exit 1; }
step() { echo -e "  ${GRAY}$(_ts)${NC}  ${MAGENTA}${ICON_GEAR}${NC}  ${WHITE}$*${NC}"; }
status() { echo -e "  ${GRAY}$(_ts)${NC}  ${BLUE}${ICON_DOT}${NC}  $*"; }
_line() { printf '%*s' "$W" '' | tr ' ' "$1"; }
_box_top() { echo -e "${MAGENTA}╔$(_line '═')╗${NC}"; }
_box_bottom() { echo -e "${MAGENTA}╚$(_line '═')╝${NC}"; }
_box_line() {
  local content="$1" plain len pad
  plain=$(echo -e "$content" | sed 's/\x1b\[[0-9;]*m//g')
  len=${#plain}; pad=$((W - len)); [ "$pad" -lt 0 ] && pad=0
  echo -e "${MAGENTA}║${NC}${content}$(printf '%*s' "$pad" '')${MAGENTA}║${NC}"
}
_header() {
  echo; _box_top
  _box_line ""
  _box_line "  ${MAGENTA}${BOLD}███████╗██╗   ██╗███████╗████████╗███████╗███╗   ███╗    ██╗ ${NC}"
  _box_line "  ${MAGENTA}${BOLD}██╔════╝╚██╗ ██╔╝██╔════╝╚══██╔══╝██╔════╝████╗ ████║   ███║ ${NC}"
  _box_line "  ${MAGENTA}${BOLD}███████╗ ╚████╔╝ ███████╗   ██║   █████╗  ██╔████╔██║   ╚██║ ${NC}"
  _box_line "  ${MAGENTA}${BOLD}╚════██║  ╚██╔╝  ╚════██║   ██║   ██╔══╝  ██║╚██╔╝██║    ██║ ${NC}"
  _box_line "  ${MAGENTA}${BOLD}███████║   ██║   ███████║   ██║   ███████╗██║ ╚═╝ ██║    ██║ ${NC}"
  _box_line "  ${MAGENTA}${BOLD}╚══════╝   ╚═╝   ╚══════╝   ╚═╝   ╚══════╝╚═╝     ╚═╝    ╚═╝ ${NC}"
  _box_line ""
  _box_line "  ${WHITE}${BOLD}Decision Lab${NC}${DIM} · Local Infrastructure${NC}"
  _box_line "  ${DIM}$(date '+%Y-%m-%d %H:%M:%S')${NC}"
  _box_line ""; _box_bottom; echo
}

export DOCKER_CLI_HINTS=false
COMPOSE_PROGRESS="${COMPOSE_PROGRESS:-quiet}"
ENV_ARGS=(); [ -f "$ENV_FILE" ] && ENV_ARGS=(--env-file "$ENV_FILE")
if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose "${ENV_ARGS[@]}" --progress "$COMPOSE_PROGRESS" -f "$COMPOSE_FILE")
elif docker-compose version >/dev/null 2>&1; then
  COMPOSE=(docker-compose "${ENV_ARGS[@]}" -f "$COMPOSE_FILE")
else
  err 'Docker Compose is required'
fi

PROFILES=()
while IFS= read -r profile; do [ -n "$profile" ] && PROFILES+=("$profile"); done < <("${COMPOSE[@]}" config --profiles 2>/dev/null || true)
for profile in ${PROFILES+"${PROFILES[@]}"}; do COMPOSE+=(--profile "$profile"); done

ENGINE_SERVICES=()
SERVICES="$("${COMPOSE[@]}" config --services 2>/dev/null || true)"
for profile in ${PROFILES+"${PROFILES[@]}"}; do
  printf '%s\n' "$SERVICES" | grep -qx "$profile" && ENGINE_SERVICES+=("$profile")
done

COMPOSE_PROJECT="$("${COMPOSE[@]}" config 2>/dev/null | sed -n 's/^name: //p' | head -1)"
COMPOSE_PROJECT="${COMPOSE_PROJECT:-system-one-decision-lab}"
SKIP_LOCAL_ENGINES="${SKIP_LOCAL_ENGINES:-false}"
REBUILD_ENGINES="${REBUILD_ENGINES:-false}"

preflight() {
  command -v docker >/dev/null 2>&1 || err 'Docker is not installed'
  command -v node >/dev/null 2>&1 || err 'Node is required to read Compose retention metadata'
  docker info >/dev/null 2>&1 || err 'Docker daemon is not running — start Docker Desktop'
  [ -f "$COMPOSE_FILE" ] || err "Compose file not found: $COMPOSE_FILE"
  ok "Docker ${DIM}$(docker --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)${NC}"
}

quiet_build() {
  local log; log="$(mktemp)"
  if "${COMPOSE[@]}" build "$@" >"$log" 2>&1; then rm -f "$log"; return 0; fi
  warn 'Build failed; full output follows.'; cat "$log" >&2; rm -f "$log"; return 1
}

wait_for_health() {
  local service="$1" timeout="$2" waited=0 state
  while [ "$waited" -lt "$timeout" ]; do
    state="$("${COMPOSE[@]}" ps --format '{{.Health}}' "$service" 2>/dev/null | head -1)"
    case "$state" in
      healthy) ok "${service} ${GREEN}HEALTHY${NC}"; return 0 ;;
      unhealthy) "${COMPOSE[@]}" logs --tail 40 "$service"; err "${service} failed its health check" ;;
    esac
    [ -n "$("${COMPOSE[@]}" ps -q "$service" 2>/dev/null)" ] || err "${service} did not stay running"
    sleep 5; waited=$((waited + 5))
    [ $((waited % 60)) -eq 0 ] && echo -e "  ${GRAY}$(_ts)${NC}  ${CYAN}${ICON_CLOCK}${NC}  Still loading ${service} ${DIM}(${waited}s)${NC}"
  done
  err "${service} did not become healthy within ${timeout}s"
}

start_engines() {
  [ "${#ENGINE_SERVICES[@]}" -eq 0 ] && return 0
  if [ "$SKIP_LOCAL_ENGINES" = true ]; then warn "Skipping local engines: ${ENGINE_SERVICES[*]}"; return 0; fi
  local missing=() service
  for service in "${ENGINE_SERVICES[@]}"; do
    if [ "$REBUILD_ENGINES" = true ] || ! docker image inspect "${COMPOSE_PROJECT}-${service}:latest" >/dev/null 2>&1; then missing+=("$service"); fi
  done
  if [ "${#missing[@]}" -gt 0 ]; then step "Building engine image(s): ${missing[*]}"; quiet_build "${missing[@]}"; fi
  step "Starting local engine(s): ${ENGINE_SERVICES[*]}"
  "${COMPOSE[@]}" up -d "${ENGINE_SERVICES[@]}"
  for service in "${ENGINE_SERVICES[@]}"; do wait_for_health "$service" "${ENGINE_START_TIMEOUT:-900}"; done
}

remove_volumes_by_retention() {
  local retention="$1" volume found=false
  while IFS= read -r volume; do
    [ -z "$volume" ] && continue
    found=true
    docker volume inspect "$volume" >/dev/null 2>&1 && docker volume rm "$volume" >/dev/null || true
  done < <(
    "${COMPOSE[@]}" config --format json |
      RETENTION="$retention" node -e '
        let input = "";
        process.stdin.on("data", (chunk) => { input += chunk; });
        process.stdin.on("end", () => {
          const model = JSON.parse(input);
          for (const logicalName of model["x-sysone-retention"]?.[process.env.RETENTION] ?? []) {
            const volume = model.volumes?.[logicalName];
            if (volume?.name) console.log(volume.name);
          }
        });
      '
  )
  [ "$found" = true ] || status "No ${retention} volume is declared"
}

summary() {
  echo; _box_top; _box_line ""; _box_line "  ${WHITE}${BOLD}Infrastructure ready${NC}"; _box_line ""
  _box_line "  ${DIM}Use root composition commands for migrations and application setup.${NC}"
  _box_line ""; _box_bottom; echo
  "${COMPOSE[@]}" ps --format 'table {{.Service}}\t{{.Status}}\t{{.Ports}}'
}

cmd_start() {
  _header; preflight
  step 'Starting PostgreSQL'; "${COMPOSE[@]}" up -d postgres
  wait_for_health postgres "${INFRA_START_TIMEOUT:-60}"
  start_engines; summary
}
cmd_stop() { _header; step 'Stopping containers (volumes preserved)'; "${COMPOSE[@]}" down --remove-orphans; ok 'Stopped'; }
cmd_clean() {
  _header; step 'Removing containers'; "${COMPOSE[@]}" down --remove-orphans
  step 'Removing clean-labelled infrastructure data'; remove_volumes_by_retention clean
  ok 'Infrastructure clean · model caches preserved'
}
cmd_purge_models() {
  _header; step 'Stopping containers'; "${COMPOSE[@]}" down --remove-orphans
  step 'Removing model caches'; remove_volumes_by_retention model-cache
  ok 'Model caches removed'
}
cmd_status() {
  _header
  local running; running="$("${COMPOSE[@]}" ps --format 'table {{.Service}}\t{{.Status}}\t{{.Ports}}' 2>/dev/null || true)"
  [ -n "$running" ] && printf '%s\n' "$running" || status 'Nothing is running'
}
cmd_logs() {
  local service="${1:-${ENGINE_SERVICES[0]:-postgres}}" lines="${2:-80}"
  printf '%s\n' "$SERVICES" | grep -qx "$service" || err "Unknown infrastructure service: $service"
  "${COMPOSE[@]}" logs --tail "$lines" "$service"
}
usage() { sed -n '2,11p' "${BASH_SOURCE[0]}" | sed 's/^#\s\{0,1\}//'; }

ARGS=()
while [ "$#" -gt 0 ]; do
  case "$1" in
    --without-engines|--no-engines) SKIP_LOCAL_ENGINES=true; shift ;;
    --rebuild-engines) REBUILD_ENGINES=true; shift ;;
    *) ARGS+=("$1"); shift ;;
  esac
done
set -- ${ARGS+"${ARGS[@]}"}
command="${1:---start}"; shift || true
case "$command" in
  --start|start) cmd_start ;;
  --stop|stop|down) cmd_stop ;;
  --clean|clean) cmd_clean ;;
  --purge-models|purge-models) cmd_purge_models ;;
  --status|status|ps) cmd_status ;;
  --logs|logs) cmd_logs "$@" ;;
  --help|-h|help) usage ;;
  *) echo "Unknown option: $command" >&2; usage; exit 1 ;;
esac
