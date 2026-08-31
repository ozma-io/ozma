#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

MODE="all"
UI_BUILD_MODE="docker" # docker | local
FORCE_UI_BUILD=false
SKIP_GIT_PULL=false
PRE_PULL_SHA=""
POST_PULL_SHA=""

log() {
  printf '\n[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

usage() {
  cat <<'EOF'
Usage: ./server_update_after_pull.sh [--only_ui | --only_db] [--ui-local] [--force-ui-build] [--skip-git-pull]

Options:
  --only_ui              Update only ozma (UI) container.
  --only_db              Update only ozmadb container.
  --ui-local             Build UI locally with yarn and copy dist into running ozma container.
  --force-ui-build       Rebuild the UI even if the pull changed no UI files.
  --force-ui-local-build Deprecated alias for --force-ui-build.
  --skip-git-pull        Skip git pull step.
  -h, --help             Show this help.

Git runs as the owner of the repository, docker as the current user, so the
script works when it is started by root but the checkout belongs to somebody
else (remotes may rely on that user's SSH config and keys).
EOF
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: required command not found: $1" >&2
    exit 1
  fi
}

repo_owner() {
  stat -c '%U' "$ROOT_DIR/.git" 2>/dev/null ||
    stat -f '%Su' "$ROOT_DIR/.git" 2>/dev/null ||
    true
}

# Docker usually needs root while the checkout belongs to a regular user, so
# the two halves of this script run under different accounts. Git must use the
# owner's account: remotes may point at SSH host aliases defined only in that
# user's ~/.ssh/config, and git refuses to touch a repo owned by somebody else.
run_git() {
  if [[ -z "$REPO_OWNER" || "$CURRENT_USER" == "$REPO_OWNER" ]]; then
    git -C "$ROOT_DIR" "$@"
    return
  fi

  require_cmd sudo
  if ! sudo -n -u "$REPO_OWNER" true 2>/dev/null; then
    echo "Error: $ROOT_DIR is owned by '$REPO_OWNER', and '$CURRENT_USER' cannot sudo to that user without a password." >&2
    echo "Run the script as '$REPO_OWNER', or pull manually and pass --skip-git-pull." >&2
    exit 1
  fi
  sudo -n -u "$REPO_OWNER" -H git -C "$ROOT_DIR" "$@"
}

try_pull_image() {
  local image="$1"
  local before after
  before="$(docker inspect --format='{{index .RepoDigests 0}}' "$image" 2>/dev/null || true)"
  if docker pull "$image" >&2; then
    after="$(docker inspect --format='{{index .RepoDigests 0}}' "$image" 2>/dev/null || true)"
    if [[ -n "$before" && "$before" == "$after" ]]; then
      echo "unchanged"
    else
      echo "updated"
    fi
    return 0
  fi
  log "docker pull $image skipped (image not available in registry)" >&2
  echo "unchanged"
  return 0
}

ui_changed_in_pull() {
  if [[ -z "$PRE_PULL_SHA" || -z "$POST_PULL_SHA" || "$PRE_PULL_SHA" == "$POST_PULL_SHA" ]]; then
    return 1
  fi

  run_git diff --name-only "$PRE_PULL_SHA" "$POST_PULL_SHA" | grep -Eq \
    '^(src/|public/|package\.json|yarn\.lock|\.yarnrc\.yml|\.yarn/|docker/Dockerfile\.ozma|docker/Caddyfile|vue\.config\.js|tsconfig\.json)'
}

deps_changed_in_pull() {
  if [[ -z "$PRE_PULL_SHA" || -z "$POST_PULL_SHA" || "$PRE_PULL_SHA" == "$POST_PULL_SHA" ]]; then
    return 1
  fi

  run_git diff --name-only "$PRE_PULL_SHA" "$POST_PULL_SHA" | grep -Eq \
    '^(package\.json|yarn\.lock|\.yarnrc\.yml|\.yarn/)'
}

for arg in "$@"; do
  case "$arg" in
    --only_ui)
      if [[ "$MODE" != "all" ]]; then
        echo "Error: --only_ui and --only_db are mutually exclusive." >&2
        exit 1
      fi
      MODE="ui"
      ;;
    --only_db)
      if [[ "$MODE" != "all" ]]; then
        echo "Error: --only_ui and --only_db are mutually exclusive." >&2
        exit 1
      fi
      MODE="db"
      ;;
    --ui-local)
      UI_BUILD_MODE="local"
      ;;
    --force-ui-build|--force-ui-local-build)
      FORCE_UI_BUILD=true
      ;;
    --skip-git-pull)
      SKIP_GIT_PULL=true
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Error: unknown argument: $arg" >&2
      usage >&2
      exit 1
      ;;
  esac
done

require_cmd docker
require_cmd git
if [[ "$UI_BUILD_MODE" == "local" ]]; then
  require_cmd yarn
fi

REPO_OWNER="$(repo_owner)"
CURRENT_USER="$(id -un)"
if [[ -n "$REPO_OWNER" && "$CURRENT_USER" != "$REPO_OWNER" ]]; then
  log "running git as '$REPO_OWNER' (owner of $ROOT_DIR), docker as '$CURRENT_USER'"
fi

if [[ "$SKIP_GIT_PULL" != true && "$MODE" != "db" ]]; then
  PRE_PULL_SHA="$(run_git rev-parse HEAD)"
  log "git pull"
  run_git pull --ff-only
  POST_PULL_SHA="$(run_git rev-parse HEAD)"
else
  PRE_PULL_SHA="$(run_git rev-parse HEAD)"
  POST_PULL_SHA="$PRE_PULL_SHA"
fi

log "docker pull ghcr images"
UI_IMAGE_CHANGED=false
DB_IMAGE_CHANGED=false
REPORT_IMAGE_CHANGED=false
if [[ "$MODE" != "db" ]]; then
  result="$(try_pull_image ghcr.io/vientooscuro/ozma:master)"
  [[ "$result" == "updated" ]] && UI_IMAGE_CHANGED=true
fi
if [[ "$MODE" != "ui" ]]; then
  result="$(try_pull_image ghcr.io/vientooscuro/ozmadb:master)"
  [[ "$result" == "updated" ]] && DB_IMAGE_CHANGED=true
fi
if [[ "$MODE" == "all" ]]; then
  result="$(try_pull_image ghcr.io/vientooscuro/ozma-report-generator:master)"
  [[ "$result" == "updated" ]] && REPORT_IMAGE_CHANGED=true
fi

DO_UI=false
DO_DB=false
DO_REPORT=false
case "$MODE" in
  all)
    DO_UI=true
    DO_DB=true
    DO_REPORT=true
    ;;
  ui)
    DO_UI=true
    ;;
  db)
    DO_DB=true
    ;;
esac

if [[ "$DO_UI" == true ]]; then
  if [[ "$UI_BUILD_MODE" == "local" ]]; then
    if [[ "$FORCE_UI_BUILD" == true ]] || ui_changed_in_pull; then
      if [[ "$FORCE_UI_BUILD" == true ]] || deps_changed_in_pull; then
        log "yarn install (deps changed)"
        YARN_NODE_LINKER=node-modules yarn install --immutable --inline-builds
      else
        log "deps unchanged, skip yarn install"
      fi
      log "local UI build with yarn"
      YARN_NODE_LINKER=node-modules yarn build
    else
      log "UI files unchanged by pull, skip yarn build"
    fi

    log "recreate ozma and sync local dist/"
    docker compose up -d --force-recreate ozma
    OZMA_CONTAINER_ID="$(docker compose ps -q ozma)"
    if [[ -z "$OZMA_CONTAINER_ID" ]]; then
      echo "Error: failed to resolve ozma container id." >&2
      exit 1
    fi
    if [[ ! -d "$ROOT_DIR/dist" ]]; then
      echo "Error: dist/ not found after local UI build." >&2
      exit 1
    fi
    docker exec "$OZMA_CONTAINER_ID" sh -lc 'rm -rf /usr/share/caddy/*'
    docker cp "$ROOT_DIR/dist/." "$OZMA_CONTAINER_ID:/usr/share/caddy"
  else
    # The ozma image is built from this checkout, so a pull that touches UI
    # sources must trigger a rebuild on its own: the ghcr image is only a hint
    # about the base layers and may not even be published.
    if [[ "$FORCE_UI_BUILD" == true ]] || [[ "$UI_IMAGE_CHANGED" == true ]] || ui_changed_in_pull; then
      log "rebuild + recreate ozma"
      docker compose build --pull ozma
      docker compose up -d --force-recreate ozma
    else
      log "ozma image and UI sources unchanged, skip rebuild"
    fi
  fi
fi

if [[ "$DO_DB" == true ]]; then
  if [[ "$DB_IMAGE_CHANGED" == true ]]; then
    log "new ozmadb image available, rebuild + recreate"
    docker compose build --pull ozmadb
    docker compose up -d --force-recreate ozmadb
  else
    log "ozmadb image unchanged, skip rebuild"
  fi
fi

if [[ "$DO_REPORT" == true ]]; then
  if [[ "$REPORT_IMAGE_CHANGED" == true ]]; then
    log "new ozma-report-generator image available, recreate"
    docker compose up -d --force-recreate ozma-report-generator
  else
    log "ozma-report-generator image unchanged, skip recreate"
  fi
fi

log "current status"
if [[ "$DO_UI" == true && "$DO_DB" == true ]]; then
  docker compose ps ozma ozmadb ozma-report-generator
elif [[ "$DO_UI" == true ]]; then
  docker compose ps ozma
elif [[ "$DO_DB" == true ]]; then
  docker compose ps ozmadb
fi

log "pruning unused Docker data..."
docker system prune -af

log "done"
