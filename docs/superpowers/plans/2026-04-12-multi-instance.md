# Multi-Instance Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `--instance <name>` flag to `deploy.sh` that deploys a per-instance ozmadb + report-generator stack with its own Postgres databases, Keycloak realm, and Caddy subdomain.

**Architecture:** `deploy.sh` gains 3 new CLI flags and 3 new stage functions. When `--instance` is set, stage execution order changes to 1→2→3→4→7→8→5→9→6. Existing stages 4, 5, 6 get conditional branching for instance vs. shared behavior. A new `docker-compose.instance.yml` file drives per-instance container stacks.

**Tech Stack:** bash, docker compose, Keycloak REST API, Postgres (via docker exec), Caddy config files

---

## File Structure

- **Modify:** `deploy.sh` — add 3 flags, adapt stages 4/5/6, add stages 7/8/9
- **Create:** `docker-compose.instance.yml` — per-instance ozmadb + report-generator
- **Create:** `deploy.env.example` update — add new instance-related vars (already exists, just add lines)

---

### Task 1: Add `--instance`, `--ozmadb-password`, `--report-generator-password` flags to `deploy.sh`

**Files:**
- Modify: `deploy.sh`

- [ ] **Step 1: Add new variable defaults after line 41 (after `OZMA_USER_PASSWORD=""`)**

Find the block:
```bash
OZMA_USER_EMAIL=""
OZMA_USER_PASSWORD=""
```

Replace with:
```bash
OZMA_USER_EMAIL=""
OZMA_USER_PASSWORD=""
INSTANCE=""
OZMADB_PASSWORD=""
REPORT_GENERATOR_PASSWORD=""
```

- [ ] **Step 2: Add new argument parsing cases before the `*) fail` catch-all**

Find:
```bash
    --ozma-password) [[ -n "${2:-}" ]] || fail "--ozma-password requires a password"; OZMA_USER_PASSWORD="$2"; shift 2 ;;
    *) fail "Unknown argument: $1" ;;
```

Replace with:
```bash
    --ozma-password) [[ -n "${2:-}" ]] || fail "--ozma-password requires a password"; OZMA_USER_PASSWORD="$2"; shift 2 ;;
    --instance)      [[ -n "${2:-}" ]] || fail "--instance requires a name"; INSTANCE="$2"; shift 2 ;;
    --ozmadb-password) [[ -n "${2:-}" ]] || fail "--ozmadb-password requires a password"; OZMADB_PASSWORD="$2"; shift 2 ;;
    --report-generator-password) [[ -n "${2:-}" ]] || fail "--report-generator-password requires a password"; REPORT_GENERATOR_PASSWORD="$2"; shift 2 ;;
    *) fail "Unknown argument: $1" ;;
```

- [ ] **Step 3: Add new vars to .env loading section**

Find the `case "$key" in` block inside the `.env` loading loop. Add these cases before `esac`:

```bash
      INSTANCE)                [[ -z "$INSTANCE" ]]                && INSTANCE="$value" ;;
      OZMADB_PASSWORD)         [[ -z "$OZMADB_PASSWORD" ]]         && OZMADB_PASSWORD="$value" ;;
      REPORT_GENERATOR_PASSWORD) [[ -z "$REPORT_GENERATOR_PASSWORD" ]] && REPORT_GENERATOR_PASSWORD="$value" ;;
```

- [ ] **Step 4: Add instance-conditional validation to `validate_required`**

Find inside `validate_required`:
```bash
  if [[ "$DEPLOY_MODE" == "remote" && -z "$DEPLOY_HOST" ]]; then
```

Add before it:
```bash
  if [[ -n "$INSTANCE" ]]; then
    [[ -z "$OZMADB_PASSWORD" ]]           && missing+=("--ozmadb-password / OZMADB_PASSWORD")
    [[ -z "$REPORT_GENERATOR_PASSWORD" ]] && missing+=("--report-generator-password / REPORT_GENERATOR_PASSWORD")
  fi
```

- [ ] **Step 5: Verify smoke tests still pass**

```bash
cd /Users/vientooscuro/SyncFolder/ozma
bash deploy.sh --local 2>&1 | grep -q "Missing required" && echo "validation still works"
bash deploy.sh --local --domain x.com --admin-email a@b.com --admin-password p \
  --ozma-email u@b.com --ozma-password p \
  --instance foo 2>&1 | grep -q "OZMADB_PASSWORD" && echo "instance validation works"
bash deploy.sh --unknown 2>&1 | grep -q "Unknown argument" && echo "unknown arg still works"
```

Expected: all three print their success message.

- [ ] **Step 6: Commit**

```bash
git add deploy.sh
git commit -m "feat(deploy): add --instance, --ozmadb-password, --report-generator-password flags"
```

---

### Task 2: Adapt `stage_write_env` for instance mode

**Files:**
- Modify: `deploy.sh`

When `--instance` is set, `stage_write_env` must write `.env.<instance>` instead of `.env`, with instance-specific variables.

- [ ] **Step 1: Replace `stage_write_env` with instance-aware version**

Find the entire `stage_write_env` function (lines 207-225) and replace it:

```bash
stage_write_env() {
  info "\n==> Stage 4: Env setup"

  local env_file env_content

  if [[ -n "$INSTANCE" ]]; then
    env_file=".env.${INSTANCE}"
    env_content="INSTANCE=${INSTANCE}
DOMAIN=${DOMAIN}
ADMIN_EMAIL=${ADMIN_EMAIL}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
OZMADB_PASSWORD=${OZMADB_PASSWORD}
REPORT_GENERATOR_PASSWORD=${REPORT_GENERATOR_PASSWORD}
EXTERNAL_ORIGIN=https://${DOMAIN}"
  else
    env_file=".env"
    env_content="ADMIN_EMAIL=${ADMIN_EMAIL}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
CADDY_ADDRESS=${DOMAIN}
EXTERNAL_ORIGIN=https://${DOMAIN}
HTTP_PORT=80
HTTPS_PORT=443"
  fi

  if [[ "$DEPLOY_MODE" == "remote" ]]; then
    ssh "$DEPLOY_HOST" "cat > \$HOME/ozma/${env_file}" <<< "$env_content"
  else
    echo "$env_content" > "$HOME/ozma/${env_file}"
  fi

  ok ".env written to ~/ozma/${env_file}"
}
```

- [ ] **Step 2: Test shared mode still writes correct .env**

```bash
cd /Users/vientooscuro/SyncFolder/ozma
bash -n deploy.sh && echo "Syntax OK"
```

Expected: `Syntax OK`

- [ ] **Step 3: Commit**

```bash
git add deploy.sh
git commit -m "feat(deploy): adapt stage_write_env to write .env.<instance> in instance mode"
```

---

### Task 3: Adapt `stage_docker_compose` for instance mode

**Files:**
- Modify: `deploy.sh`

In instance mode, `stage_docker_compose` must run `docker compose -f docker-compose.instance.yml -p <instance> --env-file .env.<instance> up -d --build` instead of the shared compose. Keycloak healthcheck is unchanged.

- [ ] **Step 1: Replace `stage_docker_compose` with instance-aware version**

Find the entire `stage_docker_compose` function and replace it:

```bash
stage_docker_compose() {
  info "\n==> Stage 5: Docker Compose"

  if [[ -n "$INSTANCE" ]]; then
    run_script_on_server << REMOTE_SCRIPT
      set -euo pipefail
      cd "\$HOME/ozma"
      docker compose -f docker-compose.instance.yml -p "${INSTANCE}" --env-file ".env.${INSTANCE}" pull
      docker compose -f docker-compose.instance.yml -p "${INSTANCE}" --env-file ".env.${INSTANCE}" up -d --build
REMOTE_SCRIPT
  else
    run_script_on_server << 'REMOTE_SCRIPT'
      set -euo pipefail
      cd "$HOME/ozma"
      docker compose pull
      docker compose up -d --build
REMOTE_SCRIPT
  fi

  ok "Docker Compose started"

  # Wait for Keycloak to become healthy (always polls shared Keycloak)
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
```

**Important:** The instance heredoc uses `<< REMOTE_SCRIPT` (no single quotes) so that `${INSTANCE}` expands locally before sending to server. The shared heredoc uses `<< 'REMOTE_SCRIPT'` (single quotes) to prevent expansion.

- [ ] **Step 2: Verify syntax**

```bash
bash -n /Users/vientooscuro/SyncFolder/ozma/deploy.sh && echo "Syntax OK"
```

- [ ] **Step 3: Commit**

```bash
git add deploy.sh
git commit -m "feat(deploy): adapt stage_docker_compose to run instance compose in instance mode"
```

---

### Task 4: Adapt `stage_provision_users` for instance mode

**Files:**
- Modify: `deploy.sh`

In instance mode, `stage_provision_users` must use realm `ozma_${INSTANCE}` instead of `ozma` everywhere. The ozma DB `/api/transaction` endpoint goes to the instance's ozmadb (same URL since Caddy routes by subdomain — and in local mode we hit the shared Caddy which doesn't know about instances yet, so we'll use a direct port approach). 

Wait — in instance mode, the ozma user in the DB belongs to the **instance's ozmadb**, not the shared one. The instance ozmadb listens on a different internal port. We need to connect to it directly.

In remote mode: `https://<instance-domain>/api/transaction`
In local mode: we can't use localhost:9080 (that's the shared Caddy). Instead hit the instance container directly on its mapped port — but `docker-compose.instance.yml` doesn't expose ports externally. Use `docker exec` approach: `docker exec <instance>-ozmadb-1 curl ...` or expose a port.

Simplest solution: in instance mode, always use `https://${DOMAIN}` as base_url (even in local mode, since domain points to server). For a truly local test, this won't work — but local mode with instances is an edge case. Document this limitation.

- [ ] **Step 1: Replace `stage_provision_users` with instance-aware version**

Find the entire `stage_provision_users` function (lines 295-456) and replace it:

```bash
stage_provision_users() {
  info "\n==> Stage 6: User provisioning"

  # In instance mode, always use the instance domain (even locally)
  local base_url
  if [[ -n "$INSTANCE" ]]; then
    base_url="https://${DOMAIN}"
  else
    base_url="$(get_base_url)"
  fi

  # Determine which realm to use
  local kc_realm
  if [[ -n "$INSTANCE" ]]; then
    kc_realm="ozma_${INSTANCE}"
  else
    kc_realm="ozma"
  fi

  local KC_OZMA_USER_ID=""

  # 6a — Verify Keycloak admin
  info "6a: Verifying Keycloak admin token..."
  kc_get_admin_token
  ok "Keycloak admin authenticated"

  # 6b — Create user in Keycloak realm
  info "6b: Checking for ozma user in Keycloak realm '${kc_realm}'..."

  local encoded_email
  encoded_email=$(python3 -c "import urllib.parse; print(urllib.parse.quote('${OZMA_USER_EMAIL}'))")

  local existing_users
  existing_users=$(curl -fsS \
    -H "Authorization: Bearer ${KC_ADMIN_TOKEN}" \
    "${base_url}/auth/admin/realms/${kc_realm}/users?email=${encoded_email}") \
    || fail "Failed to query Keycloak users in realm ${kc_realm}"

  local user_count
  user_count=$(echo "$existing_users" | grep -o '"id"' | wc -l | tr -d ' ')

  if [[ "$user_count" -gt 0 ]]; then
    skip "Keycloak user ${OZMA_USER_EMAIL} already exists in realm ${kc_realm}"
    KC_OZMA_USER_ID=$(echo "$existing_users" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  else
    info "Creating user ${OZMA_USER_EMAIL} in realm ${kc_realm}..."
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
      "${base_url}/auth/admin/realms/${kc_realm}/users") \
      || fail "Failed to create Keycloak user in realm ${kc_realm}"

    [[ "$create_http_code" == "201" ]] || fail "Keycloak user creation returned HTTP $create_http_code"

    local user_data
    user_data=$(curl -fsS \
      -H "Authorization: Bearer ${KC_ADMIN_TOKEN}" \
      "${base_url}/auth/admin/realms/${kc_realm}/users?email=${encoded_email}") \
      || fail "Failed to fetch newly created user"
    KC_OZMA_USER_ID=$(echo "$user_data" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    [[ -n "$KC_OZMA_USER_ID" ]] || fail "Could not get user ID after creation"

    ok "Keycloak user created (id: ${KC_OZMA_USER_ID})"
  fi

  # Set password (always)
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
    "${base_url}/auth/admin/realms/${kc_realm}/users/${KC_OZMA_USER_ID}/reset-password" \
    || fail "Failed to set password for Keycloak user"
  ok "Keycloak user password set"

  # 6c — Create user in ozma database
  info "6c: Creating user in ozma database..."

  local ozma_admin_token
  local token_response
  token_response=$(curl -fsS \
    -d "client_id=ozma" \
    -d "username=${ADMIN_EMAIL}" \
    -d "password=${ADMIN_PASSWORD}" \
    -d "grant_type=password" \
    "${base_url}/auth/realms/${kc_realm}/protocol/openid-connect/token") \
    || fail "Could not obtain ${kc_realm} realm token for admin."
  ozma_admin_token=$(echo "$token_response" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
  [[ -n "$ozma_admin_token" ]] || fail "Empty ozma admin token"

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
    "${base_url}/api/views/anonymous") \
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
```

- [ ] **Step 2: Verify syntax**

```bash
bash -n /Users/vientooscuro/SyncFolder/ozma/deploy.sh && echo "Syntax OK"
```

- [ ] **Step 3: Commit**

```bash
git add deploy.sh
git commit -m "feat(deploy): adapt stage_provision_users to use instance realm in instance mode"
```

---

### Task 5: Add Stage 7 — Postgres instance databases

**Files:**
- Modify: `deploy.sh`

This stage runs only in instance mode, before Stage 5. It creates two Postgres databases via `docker exec` on the shared Postgres container.

- [ ] **Step 1: Add `stage_postgres_instance` function after `stage_write_env` call (line ~227)**

Add after the `stage_write_env` call:

```bash
stage_postgres_instance() {
  info "\n==> Stage 7: Postgres instance databases"

  local pg_container="ozma-postgres-1"

  # Helper: run SQL in postgres container
  run_psql() {
    if [[ "$DEPLOY_MODE" == "remote" ]]; then
      ssh "$DEPLOY_HOST" "docker exec ${pg_container} psql -U postgres -c \"$1\""
    else
      docker exec "${pg_container}" psql -U postgres -c "$1"
    fi
  }

  # Create ozmadb instance user and database
  local ozmadb_user="ozmadb_${INSTANCE}"
  local ozmadb_db="ozmadb_${INSTANCE}"

  if run_psql "SELECT 1 FROM pg_roles WHERE rolname='${ozmadb_user}'" 2>/dev/null | grep -q '1 row'; then
    skip "Postgres user ${ozmadb_user} already exists"
  else
    run_psql "CREATE USER \"${ozmadb_user}\" WITH PASSWORD '${OZMADB_PASSWORD}';" \
      || fail "Failed to create Postgres user ${ozmadb_user}"
    ok "Postgres user ${ozmadb_user} created"
  fi

  if run_psql "SELECT 1 FROM pg_database WHERE datname='${ozmadb_db}'" 2>/dev/null | grep -q '1 row'; then
    skip "Postgres database ${ozmadb_db} already exists"
  else
    run_psql "CREATE DATABASE \"${ozmadb_db}\" OWNER \"${ozmadb_user}\";" \
      || fail "Failed to create Postgres database ${ozmadb_db}"
    ok "Postgres database ${ozmadb_db} created"
  fi

  # Create report-generator instance user and database
  local rg_user="ozma-report-generator_${INSTANCE}"
  local rg_db="ozma-report-generator_${INSTANCE}"

  if run_psql "SELECT 1 FROM pg_roles WHERE rolname='${rg_user}'" 2>/dev/null | grep -q '1 row'; then
    skip "Postgres user ${rg_user} already exists"
  else
    run_psql "CREATE USER \"${rg_user}\" WITH PASSWORD '${REPORT_GENERATOR_PASSWORD}';" \
      || fail "Failed to create Postgres user ${rg_user}"
    ok "Postgres user ${rg_user} created"
  fi

  if run_psql "SELECT 1 FROM pg_database WHERE datname='${rg_db}'" 2>/dev/null | grep -q '1 row'; then
    skip "Postgres database ${rg_db} already exists"
  else
    run_psql "CREATE DATABASE \"${rg_db}\" OWNER \"${rg_user}\";" \
      || fail "Failed to create Postgres database ${rg_db}"
    ok "Postgres database ${rg_db} created"
  fi

  ok "Postgres instance databases ready"
}
```

- [ ] **Step 2: Add conditional call in main flow**

Find:
```bash
stage_write_env

stage_docker_compose
```

Replace with:
```bash
stage_write_env

if [[ -n "$INSTANCE" ]]; then
  stage_postgres_instance
fi

stage_docker_compose
```

- [ ] **Step 3: Verify syntax**

```bash
bash -n /Users/vientooscuro/SyncFolder/ozma/deploy.sh && echo "Syntax OK"
```

- [ ] **Step 4: Commit**

```bash
git add deploy.sh
git commit -m "feat(deploy): add stage 7 postgres instance databases"
```

---

### Task 6: Add Stage 8 — Keycloak instance realm

**Files:**
- Modify: `deploy.sh`
- Read: `docker/keycloak-prepare-realm.py` (already read — takes stdin realm JSON, outputs modified JSON)
- Read: `docker/keycloak-realm.json` (template, realm name is `ozma`)

Stage 8 creates a new Keycloak realm `ozma_<instance>` by:
1. Running `keycloak-prepare-realm.py` on the realm JSON (locally, python3 is available)
2. POSTing the result to Keycloak admin API

- [ ] **Step 1: Add `stage_keycloak_realm` function**

Add after `stage_postgres_instance` function definition:

```bash
stage_keycloak_realm() {
  info "\n==> Stage 8: Keycloak instance realm"

  local realm_name="ozma_${INSTANCE}"
  local base_url
  base_url="$(get_base_url)"

  # Check if realm already exists
  local realm_check_code
  realm_check_code=$(curl -fsS -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer ${KC_ADMIN_TOKEN}" \
    "${base_url}/auth/admin/realms/${realm_name}") \
    || true

  if [[ "$realm_check_code" == "200" ]]; then
    skip "Keycloak realm ${realm_name} already exists"
    return
  fi

  info "Creating Keycloak realm ${realm_name}..."

  # Prepare realm JSON using keycloak-prepare-realm.py
  # The script reads realm JSON from stdin and outputs modified JSON
  local realm_json
  realm_json=$(python3 docker/keycloak-prepare-realm.py \
    --external-origin "https://${DOMAIN}" \
    --admin-email "${ADMIN_EMAIL}" \
    --admin-password "${ADMIN_PASSWORD}" \
    < docker/keycloak-realm.json) \
    || fail "Failed to prepare realm JSON"

  # Override realm name and id from 'ozma' to 'ozma_<instance>'
  realm_json=$(echo "$realm_json" | python3 -c "
import json, sys
d = json.load(sys.stdin)
d['realm'] = '${realm_name}'
d['id'] = '${realm_name}'
print(json.dumps(d))
") || fail "Failed to patch realm name"

  local create_code
  create_code=$(curl -fsS -o /dev/null -w "%{http_code}" \
    -X POST \
    -H "Authorization: Bearer ${KC_ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$realm_json" \
    "${base_url}/auth/admin/realms") \
    || fail "Failed to create Keycloak realm ${realm_name}"

  [[ "$create_code" == "201" ]] || fail "Keycloak realm creation returned HTTP $create_code"
  ok "Keycloak realm ${realm_name} created"
}
```

- [ ] **Step 2: Add conditional call — Stage 8 runs after Stage 7, before Stage 5**

Find:
```bash
if [[ -n "$INSTANCE" ]]; then
  stage_postgres_instance
fi

stage_docker_compose
```

Replace with:
```bash
if [[ -n "$INSTANCE" ]]; then
  stage_postgres_instance
  stage_keycloak_realm
fi

stage_docker_compose
```

**Important:** `stage_keycloak_realm` uses `KC_ADMIN_TOKEN` which is set inside `stage_provision_users`. But Stage 8 runs BEFORE Stage 6. So we need to call `kc_get_admin_token` before Stage 7/8. Add this before the instance block:

Find:
```bash
if [[ -n "$INSTANCE" ]]; then
  stage_postgres_instance
  stage_keycloak_realm
fi
```

Replace with:
```bash
if [[ -n "$INSTANCE" ]]; then
  # Need admin token for stage 8 (Keycloak realm creation)
  info "Obtaining Keycloak admin token for instance setup..."
  kc_get_admin_token
  ok "Keycloak admin token obtained"
  stage_postgres_instance
  stage_keycloak_realm
fi
```

- [ ] **Step 3: Verify syntax**

```bash
bash -n /Users/vientooscuro/SyncFolder/ozma/deploy.sh && echo "Syntax OK"
```

- [ ] **Step 4: Commit**

```bash
git add deploy.sh
git commit -m "feat(deploy): add stage 8 keycloak instance realm creation"
```

---

### Task 7: Add Stage 9 — Caddy virtual host

**Files:**
- Modify: `deploy.sh`

Stage 9 writes `docker/caddy.d/<instance>.caddy` on the server and reloads Caddy.

- [ ] **Step 1: Add `stage_caddy_instance` function**

Add after `stage_keycloak_realm` function definition:

```bash
stage_caddy_instance() {
  info "\n==> Stage 9: Caddy virtual host"

  local caddy_file="docker/caddy.d/${INSTANCE}.caddy"
  local caddy_content="${DOMAIN} {
    handle_path /api/* {
        reverse_proxy ${INSTANCE}-ozmadb-1:5000
    }

    handle /report-generator/* {
        reverse_proxy ${INSTANCE}-ozma-report-generator-1:5000
    }

    handle /auth/* {
        reverse_proxy {\\$KEYCLOAK_HOST}:{\\$KEYCLOAK_PORT:8080}
    }

    handle /static/* {
        root /usr/share/caddy
        header Cache-Control \"public, max-age=31536000, immutable\"
        file_server
    }

    handle {
        root /usr/share/caddy
        header Cache-Control \"no-cache, must-revalidate\"
        file_server
        try_files {path} /index.html
    }
}"

  if [[ "$DEPLOY_MODE" == "remote" ]]; then
    ssh "$DEPLOY_HOST" "cat > \$HOME/ozma/${caddy_file}" <<< "$caddy_content"
  else
    echo "$caddy_content" > "$HOME/ozma/${caddy_file}"
  fi

  ok "Caddy config written: ${caddy_file}"

  # Reload Caddy
  info "Reloading Caddy..."
  if [[ "$DEPLOY_MODE" == "remote" ]]; then
    ssh "$DEPLOY_HOST" "docker exec ozma-ozma-1 caddy reload --config /etc/caddy/Caddyfile" \
      || fail "Caddy reload failed"
  else
    docker exec ozma-ozma-1 caddy reload --config /etc/caddy/Caddyfile \
      || fail "Caddy reload failed"
  fi

  ok "Caddy reloaded"
}
```

**Note on container name:** The shared ozma (Caddy) container is named `ozma-ozma-1` because the docker compose project defaults to the directory name `ozma` and the service is named `ozma`.

- [ ] **Step 2: Add Stage 9 call after `stage_docker_compose`**

Find:
```bash
stage_docker_compose

# Determine base URL for API calls
```

Replace with:
```bash
stage_docker_compose

if [[ -n "$INSTANCE" ]]; then
  stage_caddy_instance
fi

# Determine base URL for API calls
```

- [ ] **Step 3: Verify syntax**

```bash
bash -n /Users/vientooscuro/SyncFolder/ozma/deploy.sh && echo "Syntax OK"
```

- [ ] **Step 4: Commit**

```bash
git add deploy.sh
git commit -m "feat(deploy): add stage 9 caddy virtual host for instance"
```

---

### Task 8: Create `docker-compose.instance.yml`

**Files:**
- Create: `docker-compose.instance.yml`

- [ ] **Step 1: Create the file**

Create `/Users/vientooscuro/SyncFolder/ozma/docker-compose.instance.yml` with this exact content:

```yaml
services:
  ozmadb:
    build:
      context: .
      dockerfile: docker/Dockerfile.ozmadb
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "100m"
        max-file: "1"
    extra_hosts:
      - "host.docker.internal:host-gateway"
    environment:
      DB_HOST: host.docker.internal
      DB_USER: ozmadb_${INSTANCE}
      DB_PASSWORD: ${OZMADB_PASSWORD}
      DB_NAME: ozmadb_${INSTANCE}
      OZMADB__JAVASCRIPT__HTTP__ENABLED: "true"
      OZMADB__JAVASCRIPT__HTTP__ALLOWEDHOSTS__0: "*"
      PRELOAD: /etc/ozmadb/preload/preload.json
      EXTERNAL_ORIGIN: https://${DOMAIN}
      AUTH_METADATA_ADDRESS: http://host.docker.internal:8080/auth/realms/ozma_${INSTANCE}/.well-known/openid-configuration
      AUTH_REQUIRE_HTTPS_METADATA: "false"
      REDIS: host.docker.internal

  ozma-report-generator:
    image: ozmaio/ozma-report-generator:master
    restart: unless-stopped
    extra_hosts:
      - "host.docker.internal:host-gateway"
    environment:
      DB_HOST: host.docker.internal
      DB_USER: ozma-report-generator_${INSTANCE}
      DB_PASSWORD: ${REPORT_GENERATOR_PASSWORD}
      DB_NAME: ozma-report-generator_${INSTANCE}
      AUTH_CLIENT_ID: ozma-report-generator
      EXTERNAL_ORIGIN: https://${DOMAIN}
      PATH_BASE: /report-generator
      OZMA_DB_URL: http://${INSTANCE}-ozmadb-1:5000
      OZMA_DB_FORCE_INSTANCE: ozma
      AUTH_METADATA_ADDRESS: http://host.docker.internal:8080/auth/realms/ozma_${INSTANCE}/.well-known/openid-configuration
      AUTH_REQUIRE_HTTPS_METADATA: "false"
```

- [ ] **Step 2: Update `deploy.env.example` with instance vars**

Add to the bottom of `deploy.env.example`:

```
# Instance-specific (required when --instance is set)
INSTANCE=
OZMADB_PASSWORD=
REPORT_GENERATOR_PASSWORD=
```

- [ ] **Step 3: Commit**

```bash
git add docker-compose.instance.yml deploy.env.example
git commit -m "feat(deploy): add docker-compose.instance.yml and update deploy.env.example"
```

---

### Task 9: End-to-end test — deploy instance `crm` to `crm.gelfand.dev`

**Files:**
- Modify: `deploy.sh` (minor fixes only if needed)
- Modify: `deploy.env` (fill in instance values)

Prerequisites: shared stack must already be running on `root@185.229.66.233`.

- [ ] **Step 1: Add instance vars to `deploy.env`**

Add to `deploy.env`:
```
INSTANCE=crm
OZMADB_PASSWORD=<strong password>
REPORT_GENERATOR_PASSWORD=<strong password>
```

And update `DOMAIN=crm.gelfand.dev`.

- [ ] **Step 2: Run deploy with instance flag**

```bash
cd /Users/vientooscuro/SyncFolder/ozma
bash deploy.sh --env deploy.env 2>&1
```

Expected: all stages print `[OK]` or `[SKIP]`, no `[FAIL]`.

- [ ] **Step 3: Verify Caddy serves the instance subdomain**

```bash
curl -fsS https://crm.gelfand.dev/auth/health && echo "Keycloak reachable via instance domain"
curl -fsS https://crm.gelfand.dev/ | grep -q "ozma" && echo "ozma frontend reachable"
```

- [ ] **Step 4: Verify ozmadb is reachable via instance domain**

```bash
curl -fsS https://crm.gelfand.dev/api/ && echo "ozmadb API reachable"
```

- [ ] **Step 5: Run again to verify idempotency**

```bash
bash deploy.sh --env deploy.env 2>&1 | grep -E "\[SKIP\]|\[FAIL\]"
```

Expected: Several `[SKIP]` lines, no `[FAIL]`.

- [ ] **Step 6: Final commit (fixes only if needed)**

```bash
git add deploy.sh
git commit -m "fix(deploy): fixes from e2e instance test"
```

---

## Self-Review Notes

1. **Spec coverage:**
   - ✅ `--instance`, `--ozmadb-password`, `--report-generator-password` flags — Task 1
   - ✅ Stage 4 writes `.env.<instance>` — Task 2
   - ✅ Stage 5 runs instance compose — Task 3
   - ✅ Stage 6 uses `ozma_<instance>` realm — Task 4
   - ✅ Stage 7 Postgres DBs — Task 5
   - ✅ Stage 8 Keycloak realm — Task 6
   - ✅ Stage 9 Caddy virtual host — Task 7
   - ✅ `docker-compose.instance.yml` — Task 8
   - ✅ Backward compatibility — implicit (all new code is inside `if [[ -n "$INSTANCE" ]]` blocks)

2. **Token ordering fix:** `kc_get_admin_token` is called explicitly before Stage 7/8 block. Stage 6's `stage_provision_users` also calls it internally — double-calling is safe (just refreshes the token).

3. **`run_psql` is a local function inside `stage_postgres_instance`** — bash allows nested function definitions but they become global. This is fine since the name is unique.

4. **Instance heredoc in `stage_docker_compose`** uses unquoted `<< REMOTE_SCRIPT` so `${INSTANCE}` expands locally — this is intentional and correct.

5. **Caddy container name** `ozma-ozma-1`: the shared compose runs in directory `~/ozma` so project name defaults to `ozma`, service name is `ozma` → container `ozma-ozma-1`. If the server uses a different project name, this will fail. Task 9 E2E test will catch this.
