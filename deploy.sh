#!/usr/bin/env bash
set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ok()   { echo -e "${GREEN}[OK]${NC} $*"; }
fail() { echo -e "${RED}[FAIL]${NC} $*"; exit 1; }
skip() { echo -e "${YELLOW}[SKIP]${NC} $*"; }
info() { echo -e "$*"; }

# Run a command locally or on the remote server
run_on_server() {
  if [[ "$DEPLOY_MODE" == "remote" ]]; then
    ssh "$DEPLOY_HOST" "$@"
  else
    bash -c "$*"
  fi
}

# Run a multi-line script on server (passes via stdin)
run_script_on_server() {
  if [[ "$DEPLOY_MODE" == "remote" ]]; then
    ssh "$DEPLOY_HOST" bash -s
  else
    bash
  fi
}

# Defaults
DEPLOY_MODE=""       # "remote" or "local"
DEPLOY_HOST=""
ENV_FILE=""
DOMAIN=""
ADMIN_EMAIL=""
ADMIN_PASSWORD=""
OZMA_USER_EMAIL=""
OZMA_USER_PASSWORD=""
OZMADB_CLIENT_SECRET=""

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --remote)      DEPLOY_MODE="remote"; [[ -n "${2:-}" ]] || fail "--remote requires a host argument (user@host)"; DEPLOY_HOST="$2"; shift 2 ;;
    --local)       DEPLOY_MODE="local"; shift ;;
    --env)         [[ -n "${2:-}" ]] || fail "--env requires a file path"; ENV_FILE="$2"; shift 2 ;;
    --domain)      [[ -n "${2:-}" ]] || fail "--domain requires a domain name"; DOMAIN="$2"; shift 2 ;;
    --admin-email) [[ -n "${2:-}" ]] || fail "--admin-email requires an email address"; ADMIN_EMAIL="$2"; shift 2 ;;
    --admin-password) [[ -n "${2:-}" ]] || fail "--admin-password requires a password"; ADMIN_PASSWORD="$2"; shift 2 ;;
    --ozma-email)  [[ -n "${2:-}" ]] || fail "--ozma-email requires an email address"; OZMA_USER_EMAIL="$2"; shift 2 ;;
    --ozma-password) [[ -n "${2:-}" ]] || fail "--ozma-password requires a password"; OZMA_USER_PASSWORD="$2"; shift 2 ;;
    --ozmadb-client-secret) [[ -n "${2:-}" ]] || fail "--ozmadb-client-secret requires a value"; OZMADB_CLIENT_SECRET="$2"; shift 2 ;;
    *) fail "Unknown argument: $1" ;;
  esac
done

# Load .env file if provided or auto-detect
if [[ -z "$ENV_FILE" && -f ".env" ]]; then
  ENV_FILE=".env"
fi

if [[ -n "$ENV_FILE" ]]; then
  [[ -f "$ENV_FILE" ]] || fail ".env file not found: $ENV_FILE"
  # Load vars not already set from CLI
  while IFS='=' read -r key value; do
    [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
    value="${value%%#*}"   # strip inline comments
    value="${value%"${value##*[![:space:]]}"}"  # trim trailing whitespace
    value="${value#\"}"; value="${value%\"}"     # strip surrounding double quotes
    value="${value#\'}"; value="${value%\'}"     # strip surrounding single quotes
    # Only set if not already set via CLI
    case "$key" in
      DEPLOY_HOST)        [[ -z "$DEPLOY_HOST" ]]        && DEPLOY_HOST="$value" ;;
      DOMAIN)             [[ -z "$DOMAIN" ]]             && DOMAIN="$value" ;;
      ADMIN_EMAIL)        [[ -z "$ADMIN_EMAIL" ]]        && ADMIN_EMAIL="$value" ;;
      ADMIN_PASSWORD)     [[ -z "$ADMIN_PASSWORD" ]]     && ADMIN_PASSWORD="$value" ;;
      OZMA_USER_EMAIL)        [[ -z "$OZMA_USER_EMAIL" ]]        && OZMA_USER_EMAIL="$value" ;;
      OZMA_USER_PASSWORD)     [[ -z "$OZMA_USER_PASSWORD" ]]     && OZMA_USER_PASSWORD="$value" ;;
      OZMADB_CLIENT_SECRET)   [[ -z "$OZMADB_CLIENT_SECRET" ]]   && OZMADB_CLIENT_SECRET="$value" ;;
    esac
  done < "$ENV_FILE"
fi

# If DEPLOY_HOST is set in env and mode not set, default to remote
if [[ -z "$DEPLOY_MODE" && -n "$DEPLOY_HOST" ]]; then
  DEPLOY_MODE="remote"
fi

# Interactive prompts for missing required variables
prompt_if_missing() {
  local varname="$1"
  local prompt="$2"
  local secret="${3:-false}"
  if [[ -z "${!varname}" ]]; then
    if [[ -t 0 ]]; then
      if [[ "$secret" == "true" ]]; then
        read -rsp "$prompt: " value; echo
      else
        read -rp "$prompt: " value
      fi
      printf -v "$varname" '%s' "$value"
    fi
  fi
}

prompt_if_missing DEPLOY_MODE      "Mode (remote/local)"
if [[ "${DEPLOY_MODE}" == "remote" ]]; then
  prompt_if_missing DEPLOY_HOST "SSH target (user@host)"
fi
prompt_if_missing DOMAIN           "Domain (e.g. example.com)"
prompt_if_missing ADMIN_EMAIL      "Keycloak admin email"
prompt_if_missing ADMIN_PASSWORD   "Keycloak admin password" true
prompt_if_missing OZMA_USER_EMAIL  "ozma user email"
prompt_if_missing OZMA_USER_PASSWORD "ozma user password" true

# Validate all required variables are set
validate_required() {
  local missing=()
  [[ -z "$DEPLOY_MODE" ]]         && missing+=("--local or --remote user@host")
  [[ -z "$DOMAIN" ]]              && missing+=("--domain / DOMAIN")
  [[ -z "$ADMIN_EMAIL" ]]         && missing+=("--admin-email / ADMIN_EMAIL")
  [[ -z "$ADMIN_PASSWORD" ]]      && missing+=("--admin-password / ADMIN_PASSWORD")
  [[ -z "$OZMA_USER_EMAIL" ]]     && missing+=("--ozma-email / OZMA_USER_EMAIL")
  [[ -z "$OZMA_USER_PASSWORD" ]]  && missing+=("--ozma-password / OZMA_USER_PASSWORD")
  if [[ "$DEPLOY_MODE" == "remote" && -z "$DEPLOY_HOST" ]]; then
    missing+=("SSH target (user@host) for --remote")
  fi
  if [[ ${#missing[@]} -gt 0 ]]; then
    echo -e "${RED}Missing required configuration:${NC}"
    for m in "${missing[@]}"; do echo "  - $m"; done
    exit 1
  fi
}

validate_required

stage_preflight() {
  info "\n==> Stage 1: Preflight"

  if [[ "$DEPLOY_MODE" == "remote" ]]; then
    ssh -o BatchMode=yes -o ConnectTimeout=10 "$DEPLOY_HOST" 'echo ok' > /dev/null 2>&1 \
      || fail "Cannot connect to $DEPLOY_HOST via SSH. Check your SSH config."
    ok "SSH connection to $DEPLOY_HOST"
  else
    ok "Local mode — no SSH needed"
  fi

  command -v curl > /dev/null || fail "curl is required on the local machine"
  ok "Preflight complete"
}

stage_preflight

stage_docker_install() {
  info "\n==> Stage 2: Docker install"

  if run_on_server 'docker version > /dev/null 2>&1'; then
    skip "Docker already installed"
    return
  fi

  info "Installing Docker..."
  run_on_server 'curl -fsSL https://get.docker.com | sh > /dev/null'

  # Re-check
  run_on_server 'docker version > /dev/null 2>&1' \
    || fail "Docker installation failed"

  ok "Docker installed"
}

stage_docker_install

REPO_URL="https://github.com/vientooscuro/ozma.git"

stage_deploy_repo() {
  info "\n==> Stage 3: Deploy repo"

  if [[ "$DEPLOY_MODE" == "remote" ]]; then
    local current_branch
    current_branch="$(git rev-parse --abbrev-ref HEAD)"
    info "Pushing branch '$current_branch' to origin..."
    git push origin "$current_branch" \
      || fail "git push failed. Make sure you have push access."
    ok "Pushed to origin"
  fi

  run_script_on_server << 'REMOTE_SCRIPT'
    set -euo pipefail
    if [ -d "$HOME/ozma/.git" ]; then
      echo "Repo exists, pulling..."
      git -C "$HOME/ozma" pull
    else
      echo "Cloning repo..."
      git clone https://github.com/vientooscuro/ozma.git "$HOME/ozma"
    fi
REMOTE_SCRIPT

  ok "Repo deployed"
}

stage_deploy_repo

stage_write_env() {
  info "\n==> Stage 4: Env setup"

  local env_content
  env_content="ADMIN_EMAIL=${ADMIN_EMAIL}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
CADDY_ADDRESS=${CADDY_ADDRESS_OVERRIDE:-${DOMAIN}}
EXTERNAL_ORIGIN=https://${DOMAIN}
HTTP_PORT=${HTTP_PORT_OVERRIDE:-80}
HTTPS_PORT=${HTTPS_PORT_OVERRIDE:-443}
OZMADB_CLIENT_SECRET=${OZMADB_CLIENT_SECRET}"

  if [[ "$DEPLOY_MODE" == "remote" ]]; then
    ssh "$DEPLOY_HOST" "cat > \$HOME/ozma/.env" <<< "$env_content"
  else
    echo "$env_content" > "$HOME/ozma/.env"
  fi

  ok ".env written to ~/ozma/.env"
}

stage_write_env

stage_build_frontend() {
  info "\n==> Stage 4b: Build frontend locally"

  local script_dir
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

  command -v node > /dev/null || fail "node is required on the deploy machine to build the frontend"

  # Install deps if node_modules is missing or outdated
  if [[ ! -d "${script_dir}/node_modules" ]]; then
    info "Installing frontend dependencies..."
    (cd "${script_dir}" && corepack enable && YARN_NODE_LINKER=node-modules yarn install --immutable) \
      || fail "yarn install failed"
  fi

  info "Running yarn build..."
  (cd "${script_dir}" && YARN_NODE_LINKER=node-modules yarn build) \
    || fail "yarn build failed"

  # Upload dist/ to server
  if [[ "$DEPLOY_MODE" == "remote" ]]; then
    info "Uploading dist/ to server..."
    rsync -az --delete "${script_dir}/dist/" "${DEPLOY_HOST}:~/ozma/dist/" \
      || fail "rsync of dist/ failed"
  fi

  ok "Frontend built and uploaded"
}

stage_build_frontend

stage_docker_compose() {
  info "\n==> Stage 5: Docker Compose"

  run_script_on_server << 'REMOTE_SCRIPT'
    set -euo pipefail
    cd "$HOME/ozma"
    docker compose pull
    docker compose up -d --build
REMOTE_SCRIPT

  ok "Docker Compose started"

  # Wait for Keycloak to become healthy
  info "Waiting for Keycloak to be ready..."

  local max_attempts=60   # 60 * 5s = 5 minutes
  local attempt=0
  until run_on_server 'docker exec ozma-keycloak-1 curl -fsS http://localhost:8080/auth/realms/master > /dev/null 2>&1'; do
    attempt=$((attempt + 1))
    if [[ $attempt -ge $max_attempts ]]; then
      fail "Keycloak did not become ready within 5 minutes. Check: docker compose logs keycloak"
    fi
    printf "."
    sleep 5
  done
  echo ""
  ok "Keycloak is ready"
}

stage_docker_compose

# Determine base URL for API calls
get_base_url() {
  if [[ "$DEPLOY_MODE" == "remote" ]]; then
    echo "https://${DOMAIN}"
  else
    echo "http://localhost:9080"
  fi
}

KC_ADMIN_TOKEN=""

# Obtain Keycloak admin token, stores in KC_ADMIN_TOKEN
kc_get_admin_token() {
  local base_url
  base_url="$(get_base_url)"

  local response
  response=$(curl -fsS \
    -d "client_id=admin-cli" \
    -d "username=${ADMIN_EMAIL}" \
    -d "password=${ADMIN_PASSWORD}" \
    -d "grant_type=password" \
    "${base_url}/auth/realms/master/protocol/openid-connect/token") \
    || fail "Could not obtain Keycloak admin token. Check ADMIN_EMAIL/ADMIN_PASSWORD."

  KC_ADMIN_TOKEN=$(echo "$response" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
  [[ -n "$KC_ADMIN_TOKEN" ]] || fail "Empty token in Keycloak response"
}

stage_provision_users() {
  info "\n==> Stage 6: User provisioning"
  local base_url
  base_url="$(get_base_url)"
  local KC_OZMA_USER_ID=""

  # 6a — Verify Keycloak admin
  info "6a: Verifying Keycloak admin token..."
  kc_get_admin_token
  ok "Keycloak admin authenticated"

  # 6b — Create user in Keycloak realm: ozma
  info "6b: Checking for ozma user in Keycloak realm 'ozma'..."

  local encoded_email
  encoded_email=$(python3 -c "import urllib.parse; print(urllib.parse.quote('${OZMA_USER_EMAIL}'))")

  local existing_users
  existing_users=$(curl -fsS \
    -H "Authorization: Bearer ${KC_ADMIN_TOKEN}" \
    "${base_url}/auth/admin/realms/ozma/users?email=${encoded_email}") \
    || fail "Failed to query Keycloak users"

  local user_count
  user_count=$(echo "$existing_users" | grep -o '"id"' | wc -l | tr -d ' ')

  if [[ "$user_count" -gt 0 ]]; then
    skip "Keycloak user ${OZMA_USER_EMAIL} already exists in realm ozma"
    KC_OZMA_USER_ID=$(echo "$existing_users" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  else
    info "Creating user ${OZMA_USER_EMAIL} in realm ozma..."
    local create_body
    create_body=$(python3 -c "
import json
print(json.dumps({
  'username': '${OZMA_USER_EMAIL}',
  'email': '${OZMA_USER_EMAIL}',
  'enabled': True,
  'emailVerified': True
}))
")
    local create_http_code
    create_http_code=$(curl -fsS -o /dev/null -w "%{http_code}" \
      -X POST \
      -H "Authorization: Bearer ${KC_ADMIN_TOKEN}" \
      -H "Content-Type: application/json" \
      -d "$create_body" \
      "${base_url}/auth/admin/realms/ozma/users") \
      || fail "Failed to create Keycloak user"

    [[ "$create_http_code" == "201" ]] || fail "Keycloak user creation returned HTTP $create_http_code"

    local user_data
    user_data=$(curl -fsS \
      -H "Authorization: Bearer ${KC_ADMIN_TOKEN}" \
      "${base_url}/auth/admin/realms/ozma/users?email=${encoded_email}") \
      || fail "Failed to fetch newly created user"
    KC_OZMA_USER_ID=$(echo "$user_data" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    [[ -n "$KC_OZMA_USER_ID" ]] || fail "Could not get user ID after creation"

    ok "Keycloak user created (id: ${KC_OZMA_USER_ID})"
  fi

  # Set password (always, even if user existed — ensures correct password)
  info "Setting password for Keycloak user..."
  local password_body
  password_body=$(python3 -c "
import json
print(json.dumps({
  'type': 'password',
  'value': '${OZMA_USER_PASSWORD}',
  'temporary': False
}))
")
  curl -fsS \
    -X PUT \
    -H "Authorization: Bearer ${KC_ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$password_body" \
    "${base_url}/auth/admin/realms/ozma/users/${KC_OZMA_USER_ID}/reset-password" \
    || fail "Failed to set password for Keycloak user"
  ok "Keycloak user password set"

  # 6c — Create user in ozma database
  info "6c: Creating user in ozma database..."

  # Get ozma realm token for admin (admin is in realm ozma via keycloak-prepare-realm.py)
  local ozma_admin_token
  local token_response
  token_response=$(curl -fsS \
    -d "client_id=ozma" \
    -d "username=${ADMIN_EMAIL}" \
    -d "password=${ADMIN_PASSWORD}" \
    -d "grant_type=password" \
    "${base_url}/auth/realms/ozma/protocol/openid-connect/token") \
    || fail "Could not obtain ozma realm token for admin."
  ozma_admin_token=$(echo "$token_response" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
  [[ -n "$ozma_admin_token" ]] || fail "Empty ozma admin token"

  # Check if user already exists in public.users
  local query_body
  query_body=$(python3 -c "
import json
print(json.dumps({
  'query': \"SELECT id FROM public.users WHERE name = '\" + '${OZMA_USER_EMAIL}'.replace(\"'\", \"''\") + \"' LIMIT 1\"
}))
")
  local existing_ozma_user
  existing_ozma_user=$(curl -fsS \
    -X POST \
    -H "Authorization: Bearer ${ozma_admin_token}" \
    -H "Content-Type: application/json" \
    -d "$query_body" \
    "${base_url}/api/views/anonymous/entries") \
    || fail "Failed to query ozma users"

  local has_rows
  has_rows=$(echo "$existing_ozma_user" | python3 -c "
import json, sys
d = json.load(sys.stdin)
rows = d.get('result', {}).get('rows', [])
print(len(rows))
" 2>/dev/null || echo "0")

  if [[ "$has_rows" -gt 0 ]]; then
    skip "ozma DB user ${OZMA_USER_EMAIL} already exists"
  else
    info "Inserting ${OZMA_USER_EMAIL} into public.users..."
    local insert_body
    insert_body=$(python3 -c "
import json
print(json.dumps({
  'operations': [{
    'type': 'insert',
    'entity': {'schema': 'public', 'name': 'users'},
    'fields': {
      'name': '${OZMA_USER_EMAIL}',
      'description': '',
      'is_enabled': True,
      'is_root': False,
      'metadata': {}
    }
  }]
}))
")
    local insert_http_code
    insert_http_code=$(curl -fsS -o /dev/null -w "%{http_code}" \
      -X POST \
      -H "Authorization: Bearer ${ozma_admin_token}" \
      -H "Content-Type: application/json" \
      -d "$insert_body" \
      "${base_url}/api/transaction") \
      || fail "Failed to insert ozma user"

    [[ "$insert_http_code" == "200" ]] || fail "ozma user insert returned HTTP $insert_http_code"
    ok "ozma DB user created"
  fi

  ok "User provisioning complete"
}

stage_provision_users

stage_seed_field_attributes() {
  info "\n==> Stage 7: Seed field attributes"

  run_script_on_server << 'REMOTE_SCRIPT'
    set -euo pipefail
    docker exec ozma-postgres-1 psql -U postgres -d ozmadb << 'SQL'
      INSERT INTO public.fields_attributes (schema_id, field_entity_id, field_name, attributes, priority, allow_broken)
      SELECT
        (SELECT id FROM public.schemas WHERE name = 'admin'),
        (SELECT id FROM public.entities WHERE name = 'color_variants' AND schema_id = (SELECT id FROM public.schemas WHERE name = 'funapp')),
        field_name,
        attributes,
        0,
        false
      FROM (VALUES
        ('background', '@{
    caption = { schema: ''admin'', message: ''Background'' },
    cell_color = case when current_theme() in (''admin.light_old'') then { background: background } end,
    option_variant = case when current_theme() not in (''admin.light_old'') then { background: background } end
}'),
        ('foreground', '@{
    caption = { schema: ''admin'', message: ''Foreground'' },
    cell_color = case when current_theme() in (''admin.light_old'') then { background: foreground } end,
    option_variant = case when current_theme() not in (''admin.light_old'') then { background: foreground } end
}'),
        ('border', '@{
    caption = { schema: ''admin'', message: ''Border'' },
    cell_color = case when current_theme() in (''admin.light_old'') then { background: border } end,
    option_variant = case when current_theme() not in (''admin.light_old'') then { background: border } end
}'),
        ('name', '@{
    caption = { schema: ''admin'', message: ''Name'' },
    cell_color = case when current_theme() in (''admin.light_old'') then { background: background, border: border } end,
    option_variant = case when current_theme() not in (''admin.light_old'') then { background: background, border: border } end
}'),
        ('theme_id', '@{
    caption = { schema: ''admin'', message: ''Theme'' }
}')
      ) AS t(field_name, attributes)
      ON CONFLICT ON CONSTRAINT "__unique__fields_attributes__name" DO NOTHING;
SQL
REMOTE_SCRIPT

  ok "Field attributes seeded"
}

stage_seed_field_attributes

stage_clear_settings() {
  info "\n==> Stage 8: Clear default settings"

  run_script_on_server << 'REMOTE_SCRIPT'
    set -euo pipefail
    docker exec ozma-postgres-1 psql -U postgres -d ozmadb -c "
      DELETE FROM funapp.settings WHERE name IN ('banner_message', 'banner_important', 'show_sign_up_button_in_banner', 'show_invite_button_in_banner');
    "
REMOTE_SCRIPT

  ok "Default settings cleared"
}

stage_clear_settings

stage_seed_base_settings() {
  info "\n==> Stage 8a: Seed base settings (default font size)"

  # Set-if-absent so a redeploy never clobbers an instance's own font size.
  run_script_on_server << 'REMOTE_SCRIPT'
    set -euo pipefail
    docker exec ozma-postgres-1 psql -U postgres -d ozmadb -c "
      INSERT INTO funapp.settings (name, value)
      SELECT 'font_size', '14'
      WHERE NOT EXISTS (SELECT 1 FROM funapp.settings WHERE name = 'font_size');
    "
REMOTE_SCRIPT

  ok "Base settings seeded (font_size=14)"
}

stage_seed_base_settings
