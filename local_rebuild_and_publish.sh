#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"
OZMADB_LOCAL_DIR="${OZMADB_LOCAL_DIR:-/Users/vientooscuro/SyncFolder/ozmadb}"
OZMADB_LOCAL_IMAGE="ghcr.io/vientooscuro/ozmadb:master"
OZMADB_BIN_PATH="$OZMADB_LOCAL_DIR/out/ozmadb/OzmaDB"
OZMADB_DOCKER_PLATFORM="${OZMADB_DOCKER_PLATFORM:-}"
MODE="all"
NO_REBUILD=false
UI_BRANCH=""

log() {
  printf '\n[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

usage() {
  cat <<'EOF'
Usage: ./local_rebuild_and_publish.sh [--only_ui | --only_db] [--no_rebuild] [--branch <branch>]

Options:
  --only_ui            Build and restart only ozma (UI) container.
  --only_db            Build ozmadb from local sources, then build and restart only ozmadb container.
  --no_rebuild         For --only_ui, skip rebuilding ozma image and copy local ./dist into container.
  --branch <branch>    For UI builds: checkout this branch before building, restore current branch after.
  -h, --help           Show this help.
EOF
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: required command not found: $1" >&2
    exit 1
  fi
}

platform_to_runtime() {
  case "$1" in
    linux/amd64)
      echo "linux-x64"
      ;;
    linux/arm64)
      echo "linux-arm64"
      ;;
    *)
      return 1
      ;;
  esac
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --only_ui)
      if [[ "$MODE" != "all" ]]; then
        echo "Error: --only_ui and --only_db are mutually exclusive." >&2
        exit 1
      fi
      MODE="only_ui"
      ;;
    --only_db)
      if [[ "$MODE" != "all" ]]; then
        echo "Error: --only_ui and --only_db are mutually exclusive." >&2
        exit 1
      fi
      MODE="only_db"
      ;;
    --no_rebuild)
      NO_REBUILD=true
      ;;
    --branch)
      shift
      UI_BRANCH="${1:-}"
      if [[ -z "$UI_BRANCH" ]]; then
        echo "Error: --branch requires a branch name." >&2
        exit 1
      fi
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Error: unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
  shift
done

BUILD_UI=false
BUILD_DB=false
case "$MODE" in
  all)
    BUILD_UI=true
    BUILD_DB=true
    ;;
  only_ui)
    BUILD_UI=true
    ;;
  only_db)
    BUILD_DB=true
    ;;
esac

require_cmd docker

if [[ "$NO_REBUILD" == true ]] && [[ "$MODE" != "only_ui" ]]; then
  echo "Error: --no_rebuild is supported only with --only_ui." >&2
  exit 1
fi

if [[ "$BUILD_DB" == true ]]; then
  require_cmd file
  require_cmd git
  require_cmd dotnet

  if [[ ! -d "$OZMADB_LOCAL_DIR" ]]; then
    echo "Error: local ozmadb directory not found: $OZMADB_LOCAL_DIR" >&2
    exit 1
  fi

  if [[ ! -f "$OZMADB_LOCAL_DIR/docker/Dockerfile" ]]; then
    echo "Error: Dockerfile not found: $OZMADB_LOCAL_DIR/docker/Dockerfile" >&2
    exit 1
  fi

  if [[ ! -d "$OZMADB_LOCAL_DIR/.git" ]]; then
    echo "Error: git repository not found: $OZMADB_LOCAL_DIR/.git" >&2
    exit 1
  fi

  OZMADB_RUNTIME_ID=""
  if [[ -n "$OZMADB_DOCKER_PLATFORM" ]]; then
    if ! OZMADB_RUNTIME_ID="$(platform_to_runtime "$OZMADB_DOCKER_PLATFORM")"; then
      echo "Error: unsupported OZMADB_DOCKER_PLATFORM: $OZMADB_DOCKER_PLATFORM" >&2
      echo "Supported values: linux/amd64, linux/arm64" >&2
      exit 1
    fi
  fi

  log "Building OzmaDB binaries from source..."
  rm -rf "$OZMADB_LOCAL_DIR/out/ozmadb"
  if [[ -n "$OZMADB_RUNTIME_ID" ]]; then
    dotnet publish "$OZMADB_LOCAL_DIR/OzmaDB/OzmaDB.fsproj" \
      -c Release \
      -o "$OZMADB_LOCAL_DIR/out/ozmadb" \
      -p:RuntimeIdentifier="$OZMADB_RUNTIME_ID"
  else
    dotnet publish "$OZMADB_LOCAL_DIR/OzmaDB/OzmaDB.fsproj" \
      -c Release \
      -o "$OZMADB_LOCAL_DIR/out/ozmadb"
  fi

  if [[ -z "$OZMADB_DOCKER_PLATFORM" ]]; then
    if [[ ! -f "$OZMADB_BIN_PATH" ]]; then
      echo "Error: OzmaDB binary not found: $OZMADB_BIN_PATH" >&2
      exit 1
    fi

    OZMADB_BIN_INFO="$(file -b "$OZMADB_BIN_PATH" | tr '[:upper:]' '[:lower:]')"
    if [[ "$OZMADB_BIN_INFO" == *"x86-64"* ]] || [[ "$OZMADB_BIN_INFO" == *"x86_64"* ]]; then
      OZMADB_DOCKER_PLATFORM="linux/amd64"
    elif [[ "$OZMADB_BIN_INFO" == *"aarch64"* ]] || [[ "$OZMADB_BIN_INFO" == *"arm64"* ]]; then
      OZMADB_DOCKER_PLATFORM="linux/arm64"
    else
      echo "Error: cannot detect OzmaDB binary architecture from: $OZMADB_BIN_INFO" >&2
      echo "Set OZMADB_DOCKER_PLATFORM manually (e.g. linux/amd64)." >&2
      exit 1
    fi
  fi

  log "Using OzmaDB platform: $OZMADB_DOCKER_PLATFORM"

  log "Building local OzmaDB base image from $OZMADB_LOCAL_DIR..."
  docker build \
    --platform "$OZMADB_DOCKER_PLATFORM" \
    -f "$OZMADB_LOCAL_DIR/docker/Dockerfile" \
    -t "$OZMADB_LOCAL_IMAGE" \
    "$OZMADB_LOCAL_DIR"

  log "Reverting generated lockfile changes in ozmadb..."
  git -C "$OZMADB_LOCAL_DIR" restore \
    OzmaDBSchema/packages.lock.json \
    OzmaUtils/packages.lock.json
fi

UI_BUILD_CONTEXT="$ROOT_DIR"
if [[ "$BUILD_UI" == true ]] && [[ -n "$UI_BRANCH" ]] && [[ "$NO_REBUILD" != true ]]; then
  require_cmd git
  CURRENT_BRANCH="$(git symbolic-ref --short HEAD 2>/dev/null || git rev-parse --short HEAD)"
  if [[ "$CURRENT_BRANCH" == "$UI_BRANCH" ]]; then
    : # already on the requested branch, use ROOT_DIR as-is
  else
    # Check if the branch is checked out in a worktree
    WORKTREE_PATH=""
    wt_current=""
    while IFS= read -r wt_line; do
      case "$wt_line" in
        "worktree "*) wt_current="${wt_line#worktree }" ;;
        "branch refs/heads/$UI_BRANCH") WORKTREE_PATH="$wt_current"; break ;;
      esac
    done < <(git worktree list --porcelain)
    if [[ -n "$WORKTREE_PATH" ]]; then
      log "Branch '$UI_BRANCH' is checked out in worktree at '$WORKTREE_PATH'. Using it as build context."
      UI_BUILD_CONTEXT="$WORKTREE_PATH"
    else
      log "Switching to branch '$UI_BRANCH' for UI build (current: '$CURRENT_BRANCH')..."
      git checkout "$UI_BRANCH"
      CHECKOUT_DONE=true
    fi
  fi
fi

log "Building Docker images..."
if [[ "$BUILD_DB" == true ]]; then
  DOCKER_DEFAULT_PLATFORM="$OZMADB_DOCKER_PLATFORM" docker compose build ozmadb
fi
if [[ "$BUILD_UI" == true ]]; then
  if [[ "$NO_REBUILD" == true ]]; then
    log "Skipping ozma image rebuild (--no_rebuild)."
  elif [[ "$UI_BUILD_CONTEXT" != "$ROOT_DIR" ]]; then
    COMPOSE_PROJECT="$(basename "$ROOT_DIR" | tr '[:upper:]' '[:lower:]')"
    OZMA_IMAGE="${COMPOSE_PROJECT}-ozma"
    log "Building ozma image '$OZMA_IMAGE' from context: $UI_BUILD_CONTEXT"
    docker build \
      -f "$ROOT_DIR/docker/Dockerfile.ozma" \
      -t "$OZMA_IMAGE" \
      "$UI_BUILD_CONTEXT"
  else
    docker compose build ozma
  fi
fi

if [[ "${CHECKOUT_DONE:-false}" == true ]]; then
  log "Restoring branch '$CURRENT_BRANCH'..."
  git checkout "$CURRENT_BRANCH"
fi

log "Publishing changes and restarting containers..."
if [[ "$BUILD_DB" == true ]]; then
  DOCKER_DEFAULT_PLATFORM="$OZMADB_DOCKER_PLATFORM" docker compose up -d --no-deps ozmadb
fi
if [[ "$BUILD_UI" == true ]]; then
  if [[ "$NO_REBUILD" == true ]]; then
    if [[ ! -d "$ROOT_DIR/dist" ]]; then
      echo "Error: local dist directory not found: $ROOT_DIR/dist" >&2
      echo "Run yarn build first, then re-run with --no_rebuild." >&2
      exit 1
    fi

    docker compose up -d --no-deps ozma
    OZMA_CONTAINER_ID="$(docker compose ps -q ozma)"
    if [[ -z "$OZMA_CONTAINER_ID" ]]; then
      echo "Error: failed to resolve ozma container id." >&2
      exit 1
    fi

    log "Copying local dist/ into ozma container..."
    docker exec "$OZMA_CONTAINER_ID" sh -lc 'rm -rf /usr/share/caddy/*'
    docker cp "$ROOT_DIR/dist/." "$OZMA_CONTAINER_ID:/usr/share/caddy"
  else
    docker compose up -d --no-deps ozma
  fi
fi

log "Current status:"
if [[ "$BUILD_DB" == true ]] && [[ "$BUILD_UI" == true ]]; then
  docker compose ps ozmadb ozma
elif [[ "$BUILD_DB" == true ]]; then
  docker compose ps ozmadb
else
  docker compose ps ozma
fi

log "Pruning unused Docker data..."
docker system prune -af

log "Done."
