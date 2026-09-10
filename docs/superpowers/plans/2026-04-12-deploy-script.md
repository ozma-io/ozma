# Deploy Script Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a single `deploy.sh` script that provisions a remote server (or runs locally) — installs Docker, deploys the ozma stack via Docker Compose, and creates admin/user accounts in Keycloak and ozma.

**Architecture:** One bash script with two modes (`--remote user@host` / `--local`). Remote mode SSHs to the server and runs commands there; local mode runs everything directly. User provisioning (Stage 6) uses `curl` against the HTTP API after services are up.

**Tech Stack:** bash, curl, git, docker compose, Keycloak REST API, ozmadb HTTP transaction API (`POST /api/transaction`)

---

## File Structure

- **Create:** `deploy.sh` — main script, all logic in one file
- No other files needed

---

### Task 1: Script skeleton — argument parsing and .env loading

**Files:**
- Create: `deploy.sh`

- [ ] **Step 1: Create the script with shebang, strict mode, and color helpers**

```bash
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
```

- [ ] **Step 2: Add variable defaults and argument parsing**

```bash
# Defaults
DEPLOY_MODE=""       # "remote" or "local"
DEPLOY_HOST=""
ENV_FILE=""
DOMAIN=""
ADMIN_EMAIL=""
ADMIN_PASSWORD=""
OZMA_USER_EMAIL=""
OZMA_USER_PASSWORD=""

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --remote)      DEPLOY_MODE="remote"; DEPLOY_HOST="$2"; shift 2 ;;
    --local)       DEPLOY_MODE="local"; shift ;;
    --env)         ENV_FILE="$2"; shift 2 ;;
    --domain)      DOMAIN="$2"; shift 2 ;;
    --admin-email) ADMIN_EMAIL="$2"; shift 2 ;;
    --admin-password) ADMIN_PASSWORD="$2"; shift 2 ;;
    --ozma-email)  OZMA_USER_EMAIL="$2"; shift 2 ;;
    --ozma-password) OZMA_USER_PASSWORD="$2"; shift 2 ;;
    *) fail "Unknown argument: $1" ;;
  esac
done
```

- [ ] **Step 3: Add .env file loading (before fallback to prompts)**

```bash
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
    # Only set if not already set via CLI
    case "$key" in
      DEPLOY_HOST)        [[ -z "$DEPLOY_HOST" ]]        && DEPLOY_HOST="$value" ;;
      DOMAIN)             [[ -z "$DOMAIN" ]]             && DOMAIN="$value" ;;
      ADMIN_EMAIL)        [[ -z "$ADMIN_EMAIL" ]]        && ADMIN_EMAIL="$value" ;;
      ADMIN_PASSWORD)     [[ -z "$ADMIN_PASSWORD" ]]     && ADMIN_PASSWORD="$value" ;;
      OZMA_USER_EMAIL)    [[ -z "$OZMA_USER_EMAIL" ]]    && OZMA_USER_EMAIL="$value" ;;
      OZMA_USER_PASSWORD) [[ -z "$OZMA_USER_PASSWORD" ]] && OZMA_USER_PASSWORD="$value" ;;
    esac
  done < "$ENV_FILE"
fi

# If DEPLOY_HOST is set in env and mode not set, default to remote
if [[ -z "$DEPLOY_MODE" && -n "$DEPLOY_HOST" ]]; then
  DEPLOY_MODE="remote"
fi
```

- [ ] **Step 4: Add interactive prompts for missing required variables**

```bash
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
      eval "$varname=\"$value\""
    fi
  fi
}

prompt_if_missing DEPLOY_MODE      "Mode (remote/local)"
prompt_if_missing DOMAIN           "Domain (e.g. example.com)"
prompt_if_missing ADMIN_EMAIL      "Keycloak admin email"
prompt_if_missing ADMIN_PASSWORD   "Keycloak admin password" true
prompt_if_missing OZMA_USER_EMAIL  "ozma user email"
prompt_if_missing OZMA_USER_PASSWORD "ozma user password" true
```

- [ ] **Step 5: Validate all required variables are set**

```bash
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
```

- [ ] **Step 6: Make executable and do a quick smoke test**

```bash
chmod +x deploy.sh
# Test: should fail with "Missing required configuration"
bash deploy.sh --local 2>&1 | grep -q "Missing required" && echo "Validation works"
# Test: unknown arg should fail
bash deploy.sh --unknown 2>&1 | grep -q "Unknown argument" && echo "Unknown arg detection works"
```

- [ ] **Step 7: Commit**

```bash
git add deploy.sh
git commit -m "feat(deploy): add script skeleton with arg parsing and .env loading"
```

---

### Task 2: Stage 1 — Preflight check

**Files:**
- Modify: `deploy.sh`

- [ ] **Step 1: Add preflight function after validate_required call**

```bash
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
```

- [ ] **Step 2: Test preflight in local mode**

```bash
# Should print [OK] Local mode and [OK] Preflight complete
bash deploy.sh --local --domain x.com --admin-email a@b.com --admin-password pass \
  --ozma-email u@b.com --ozma-password pass 2>&1 | grep -E "\[OK\]|\[FAIL\]"
```

Expected output includes `[OK] Local mode` and `[OK] Preflight complete`.

- [ ] **Step 3: Commit**

```bash
git add deploy.sh
git commit -m "feat(deploy): add stage 1 preflight check"
```

---

### Task 3: Stage 2 — Docker install

**Files:**
- Modify: `deploy.sh`

- [ ] **Step 1: Add helper to run commands either locally or via SSH**

Add this near the top of the script, after color helpers:

```bash
# Run a command locally or on the remote server
run_on_server() {
  if [[ "$DEPLOY_MODE" == "remote" ]]; then
    ssh "$DEPLOY_HOST" "$@"
  else
    bash -c "$*"
  fi
}
```

- [ ] **Step 2: Add stage_docker_install function**

```bash
stage_docker_install() {
  info "\n==> Stage 2: Docker install"

  if run_on_server 'command -v docker > /dev/null 2>&1'; then
    skip "Docker already installed"
    return
  fi

  info "Installing Docker..."
  run_on_server 'curl -fsSL https://get.docker.com | sh'

  # Add current user to docker group (so docker can be run without sudo)
  run_on_server 'sudo usermod -aG docker "$USER" || true'

  # Re-check
  run_on_server 'command -v docker > /dev/null 2>&1' \
    || fail "Docker installation failed"

  ok "Docker installed"
}

stage_docker_install
```

- [ ] **Step 3: Test locally (Docker already installed)**

```bash
bash deploy.sh --local --domain x.com --admin-email a@b.com --admin-password pass \
  --ozma-email u@b.com --ozma-password pass 2>&1 | grep -E "Stage 2|\[SKIP\]|\[OK\]"
```

Expected: `[SKIP] Docker already installed`

- [ ] **Step 4: Commit**

```bash
git add deploy.sh
git commit -m "feat(deploy): add stage 2 docker install"
```

---

### Task 4: Stage 3 — Deploy repo

**Files:**
- Modify: `deploy.sh`

- [ ] **Step 1: Add run_on_server_heredoc helper for multi-line SSH commands**

Add after `run_on_server`:

```bash
# Run a multi-line script on server (passes via stdin)
run_script_on_server() {
  if [[ "$DEPLOY_MODE" == "remote" ]]; then
    ssh "$DEPLOY_HOST" bash -s
  else
    bash
  fi
}
```

- [ ] **Step 2: Add stage_deploy_repo function**

```bash
REPO_URL="https://github.com/vientooscuro/ozma.git"
REPO_DIR="~/ozma"

stage_deploy_repo() {
  info "\n==> Stage 3: Deploy repo"

  if [[ "$DEPLOY_MODE" == "remote" ]]; then
    # Push current branch to origin before pulling on server
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
```

- [ ] **Step 3: Test in local mode (will clone or pull ~/ozma)**

```bash
bash deploy.sh --local --domain x.com --admin-email a@b.com --admin-password pass \
  --ozma-email u@b.com --ozma-password pass 2>&1 | grep -E "Stage 3|\[OK\]|\[FAIL\]"
```

Expected: `[OK] Repo deployed`

- [ ] **Step 4: Commit**

```bash
git add deploy.sh
git commit -m "feat(deploy): add stage 3 repo deploy via git clone/pull"
```

---

### Task 5: Stage 4 — Write .env on server

**Files:**
- Modify: `deploy.sh`

- [ ] **Step 1: Add stage_write_env function**

```bash
stage_write_env() {
  info "\n==> Stage 4: Env setup"

  local env_content
  env_content="ADMIN_EMAIL=${ADMIN_EMAIL}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
CADDY_ADDRESS=${DOMAIN}
EXTERNAL_ORIGIN=https://${DOMAIN}
HTTP_PORT=80
HTTPS_PORT=443"

  if [[ "$DEPLOY_MODE" == "remote" ]]; then
    ssh "$DEPLOY_HOST" "cat > \$HOME/ozma/.env" <<< "$env_content"
  else
    echo "$env_content" > "$HOME/ozma/.env"
  fi

  ok ".env written to ~/ozma/.env"
}

stage_write_env
```

- [ ] **Step 2: Test locally**

```bash
bash deploy.sh --local --domain mysite.com --admin-email a@b.com --admin-password pass \
  --ozma-email u@b.com --ozma-password pass 2>&1 | grep -E "Stage 4|\[OK\]|\[FAIL\]"
cat ~/ozma/.env
```

Expected: `.env` file with correct values including `CADDY_ADDRESS=mysite.com` and `EXTERNAL_ORIGIN=https://mysite.com`.

- [ ] **Step 3: Commit**

```bash
git add deploy.sh
git commit -m "feat(deploy): add stage 4 .env setup on server"
```

---

### Task 6: Stage 5 — Docker Compose up + Keycloak healthcheck

**Files:**
- Modify: `deploy.sh`

- [ ] **Step 1: Add stage_docker_compose function**

```bash
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
  local base_url
  if [[ "$DEPLOY_MODE" == "remote" ]]; then
    base_url="https://${DOMAIN}"
  else
    base_url="http://localhost:9080"
  fi

  local max_attempts=24   # 24 * 5s = 2 minutes
  local attempt=0
  until curl -fsS "${base_url}/auth/health" > /dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [[ $attempt -ge $max_attempts ]]; then
      fail "Keycloak did not become ready within 2 minutes. Check: docker compose logs keycloak"
    fi
    printf "."
    sleep 5
  done
  echo ""
  ok "Keycloak is ready"
}

stage_docker_compose
```

- [ ] **Step 2: Commit**

```bash
git add deploy.sh
git commit -m "feat(deploy): add stage 5 docker compose + keycloak healthcheck"
```

---

### Task 7: Stage 6a — Verify Keycloak admin token

**Files:**
- Modify: `deploy.sh`

- [ ] **Step 1: Add base URL helper and KC admin token function**

```bash
# Determine base URL for API calls (always from local machine or on-server)
get_base_url() {
  if [[ "$DEPLOY_MODE" == "remote" ]]; then
    echo "https://${DOMAIN}"
  else
    echo "http://localhost:9080"
  fi
}

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
```

- [ ] **Step 2: Add stage_provision_users with 6a — verify admin**

```bash
KC_ADMIN_TOKEN=""

stage_provision_users() {
  info "\n==> Stage 6: User provisioning"
  local base_url
  base_url="$(get_base_url)"

  # 6a — Verify Keycloak admin
  info "6a: Verifying Keycloak admin token..."
  kc_get_admin_token
  ok "Keycloak admin authenticated"
```

- [ ] **Step 3: Commit**

```bash
git add deploy.sh
git commit -m "feat(deploy): add stage 6a keycloak admin token verification"
```

---

### Task 8: Stage 6b — Create ozma Keycloak user (realm: ozma)

**Files:**
- Modify: `deploy.sh`

- [ ] **Step 1: Add 6b inside stage_provision_users**

```bash
  # 6b — Create user in Keycloak realm: ozma
  info "6b: Checking for ozma user in Keycloak realm 'ozma'..."

  local existing_users
  existing_users=$(curl -fsS \
    -H "Authorization: Bearer ${KC_ADMIN_TOKEN}" \
    "${base_url}/auth/admin/realms/ozma/users?email=$(python3 -c "import urllib.parse; print(urllib.parse.quote('${OZMA_USER_EMAIL}')")")") \
    || fail "Failed to query Keycloak users"

  local user_count
  user_count=$(echo "$existing_users" | grep -o '"id"' | wc -l | tr -d ' ')

  if [[ "$user_count" -gt 0 ]]; then
    skip "Keycloak user ${OZMA_USER_EMAIL} already exists in realm ozma"
    # Still need the user ID for password reset
    KC_OZMA_USER_ID=$(echo "$existing_users" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  else
    info "Creating user ${OZMA_USER_EMAIL} in realm ozma..."
    local create_response
    create_response=$(curl -fsS -w "\n%{http_code}" \
      -X POST \
      -H "Authorization: Bearer ${KC_ADMIN_TOKEN}" \
      -H "Content-Type: application/json" \
      -d "{\"username\":\"${OZMA_USER_EMAIL}\",\"email\":\"${OZMA_USER_EMAIL}\",\"enabled\":true,\"emailVerified\":true}" \
      "${base_url}/auth/admin/realms/ozma/users") \
      || fail "Failed to create Keycloak user"

    local http_code
    http_code=$(echo "$create_response" | tail -1)
    [[ "$http_code" == "201" ]] || fail "Keycloak user creation returned HTTP $http_code"

    # Fetch the new user ID
    local user_data
    user_data=$(curl -fsS \
      -H "Authorization: Bearer ${KC_ADMIN_TOKEN}" \
      "${base_url}/auth/admin/realms/ozma/users?email=$(python3 -c "import urllib.parse; print(urllib.parse.quote('${OZMA_USER_EMAIL}')")")") \
      || fail "Failed to fetch newly created user"
    KC_OZMA_USER_ID=$(echo "$user_data" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    [[ -n "$KC_OZMA_USER_ID" ]] || fail "Could not get user ID after creation"

    ok "Keycloak user created (id: ${KC_OZMA_USER_ID})"
  fi

  # Set password
  info "Setting password for user ${KC_OZMA_USER_ID}..."
  curl -fsS \
    -X PUT \
    -H "Authorization: Bearer ${KC_ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"type\":\"password\",\"value\":\"${OZMA_USER_PASSWORD}\",\"temporary\":false}" \
    "${base_url}/auth/admin/realms/ozma/users/${KC_OZMA_USER_ID}/reset-password" \
    || fail "Failed to set password for Keycloak user"
  ok "Keycloak user password set"
```

- [ ] **Step 2: Declare KC_OZMA_USER_ID at top of stage_provision_users**

At the very start of `stage_provision_users`, add:

```bash
  local KC_OZMA_USER_ID=""
```

- [ ] **Step 3: Commit**

```bash
git add deploy.sh
git commit -m "feat(deploy): add stage 6b create ozma keycloak user"
```

---

### Task 9: Stage 6c — Create ozma application user

**Files:**
- Modify: `deploy.sh`

The ozmadb transaction API is at `POST /api/transaction`. It accepts a JSON body with `operations` array. Each operation has `type`, `entity` (with `schema` and `name`), and `fields`. The `public.users` entity fields are: `name` (email/username), `description`, `is_enabled`, `is_root`, `metadata`, `role_id`.

- [ ] **Step 1: Add 6c inside stage_provision_users — get ozma user token**

We need an ozma user token (authenticated as the ozma user, not KC admin) to check if the user exists. But for insert we use the admin token. First obtain an ozma-realm token for the admin:

```bash
  # 6c — Create user in ozma database
  info "6c: Creating user in ozma database..."

  # Get a token for the ozma realm (admin user is in realm ozma too)
  local ozma_admin_token
  local token_response
  token_response=$(curl -fsS \
    -d "client_id=ozma" \
    -d "username=${ADMIN_EMAIL}" \
    -d "password=${ADMIN_PASSWORD}" \
    -d "grant_type=password" \
    "${base_url}/auth/realms/ozma/protocol/openid-connect/token") \
    || fail "Could not obtain ozma realm token for admin. Is admin also in realm ozma?"
  ozma_admin_token=$(echo "$token_response" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
  [[ -n "$ozma_admin_token" ]] || fail "Empty ozma admin token"
```

- [ ] **Step 2: Check if ozma DB user already exists**

```bash
  # Check if user already exists in public.users
  local check_response
  check_response=$(curl -fsS \
    -H "Authorization: Bearer ${ozma_admin_token}" \
    "${base_url}/api/views/public/user_views?args=%7B%7D" 2>/dev/null) || true

  # Use FunQL anonymous query endpoint to check
  local existing_ozma_user
  existing_ozma_user=$(curl -fsS \
    -H "Authorization: Bearer ${ozma_admin_token}" \
    -H "Content-Type: application/json" \
    -d "{\"query\":\"SELECT id FROM public.users WHERE name = '${OZMA_USER_EMAIL}' LIMIT 1\"}" \
    "${base_url}/api/views/anonymous") \
    || fail "Failed to query ozma users"

  local rows_count
  rows_count=$(echo "$existing_ozma_user" | grep -o '"rows":\[' | wc -l | tr -d ' ')
  local has_rows
  has_rows=$(echo "$existing_ozma_user" | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d.get('result',{}).get('rows',[])))" 2>/dev/null || echo "0")
```

- [ ] **Step 3: Insert ozma user if not exists**

```bash
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
    local insert_response
    insert_response=$(curl -fsS -w "\n%{http_code}" \
      -X POST \
      -H "Authorization: Bearer ${ozma_admin_token}" \
      -H "Content-Type: application/json" \
      -d "$insert_body" \
      "${base_url}/api/transaction") \
      || fail "Failed to insert ozma user"

    local insert_code
    insert_code=$(echo "$insert_response" | tail -1)
    [[ "$insert_code" == "200" ]] || fail "ozma user insert returned HTTP $insert_code: $(echo "$insert_response" | head -1)"
    ok "ozma DB user created"
  fi
```

- [ ] **Step 4: Close the stage_provision_users function**

```bash
  ok "User provisioning complete"
}

stage_provision_users
```

- [ ] **Step 5: Commit**

```bash
git add deploy.sh
git commit -m "feat(deploy): add stage 6c create ozma db user via transaction API"
```

---

### Task 10: End-to-end test in local mode

**Files:**
- Modify: `deploy.sh` (minor fixes only if needed)

- [ ] **Step 1: Ensure ozma is running locally, then run the full script**

```bash
# Make sure docker compose is up locally first
cd ~/ozma && docker compose up -d

# Run deploy in local mode
cd ~/ozma
bash deploy.sh --local \
  --domain localhost \
  --admin-email admin@example.com \
  --admin-password adminpass \
  --ozma-email testuser@example.com \
  --ozma-password testpass 2>&1
```

Expected: all stages print `[OK]`, no `[FAIL]`.

- [ ] **Step 2: Run again to verify idempotency**

```bash
bash deploy.sh --local \
  --domain localhost \
  --admin-email admin@example.com \
  --admin-password adminpass \
  --ozma-email testuser@example.com \
  --ozma-password testpass 2>&1
```

Expected: Docker install shows `[SKIP]`, git pull succeeds, Keycloak user shows `[SKIP]`, ozma user shows `[SKIP]`.

- [ ] **Step 3: Verify the ozma user was created in the DB**

```bash
curl -s http://localhost:9080/api/views/anonymous \
  -H "Content-Type: application/json" \
  -d '{"query":"SELECT id, name, is_enabled FROM public.users WHERE name = '\''testuser@example.com'\'' LIMIT 1"}' \
  | python3 -m json.tool
```

Expected: one row with `name: testuser@example.com` and `is_enabled: true`.

- [ ] **Step 4: Final commit**

```bash
git add deploy.sh
git commit -m "feat(deploy): complete deploy.sh with all 6 stages"
```

---

## Self-Review Notes

1. **Spec coverage:** All 6 stages covered. Remote/local modes covered. `.env` priority (CLI → file → prompt) covered. Idempotency covered for all operations.

2. **ozma realm admin token (Task 9):** The script assumes the Keycloak admin (`ADMIN_EMAIL`) is also a user in realm `ozma`. This is set up by `keycloak-prepare-realm.py` via the realm JSON — confirmed by seeing `"users"` section in the realm JSON with `{ADMIN_EMAIL}`. This assumption is valid.

3. **URL encoding:** Email addresses in query strings are URL-encoded via `python3 -c "import urllib.parse..."` — this handles `+` and `@` chars correctly.

4. **`run_script_on_server` with heredoc:** In remote mode, stdin of `ssh host bash -s` becomes the heredoc. In local mode, stdin of `bash` becomes the heredoc. Both work with `<< 'REMOTE_SCRIPT'`.

5. **`python3` dependency:** The script uses `python3` for JSON building and URL encoding. This is available on virtually all modern Linux servers. No pip packages needed.
