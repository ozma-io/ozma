# Multi-Instance Deploy Design

**Date:** 2026-04-12
**Topic:** Support multiple ozmadb instances on one server via `--instance` flag in `deploy.sh`

## Overview

Extend `deploy.sh` with an `--instance <name>` flag that deploys a per-instance stack (ozmadb + ozma-report-generator) alongside the existing shared stack (Postgres + Keycloak + Redis + ozma/Caddy). Each instance gets its own subdomain, Postgres databases, and Keycloak realm. Without `--instance`, the script behaves exactly as before — full backward compatibility.

---

## Architecture

```
Shared stack (docker-compose.yml, unchanged):
  Postgres + Keycloak + Redis + ozma (Caddy)
  Domain: example.com

Per-instance stack (docker-compose.instance.yml, new):
  ozmadb_<instance> + ozma-report-generator_<instance>
  Domain: <instance>.example.com
  Project: docker compose -p <instance>
  Location: ~/ozma/ (same repo, different project name)
  DB connectivity: host.docker.internal (Postgres, Redis, Keycloak)
```

Caddy routes per instance via `caddy.d/<instance>.caddy` files, loaded via the existing `import /etc/caddy/caddy.d/*.caddy` directive.

---

## Interface

### CLI usage

```bash
# Shared stack (unchanged behavior)
./deploy.sh --remote user@host --domain example.com \
  --admin-email admin@example.com --admin-password pass \
  --ozma-email user@example.com --ozma-password pass

# Deploy an instance
./deploy.sh --remote user@host --instance crm --domain crm.gelfand.dev \
  --admin-email admin@example.com --admin-password pass \
  --ozma-email user@example.com --ozma-password pass \
  --ozmadb-password dbpass --report-generator-password rgpass
```

### New CLI flags and .env variables

| Flag | .env variable | Required when | Description |
|------|---------------|---------------|-------------|
| `--instance <name>` | `INSTANCE` | optional | Instance name (e.g. `crm`) |
| `--ozmadb-password` | `OZMADB_PASSWORD` | `--instance` set | Postgres password for ozmadb_\<instance\> DB user |
| `--report-generator-password` | `REPORT_GENERATOR_PASSWORD` | `--instance` set | Postgres password for report-generator_\<instance\> DB user |

When `--instance` is set, `OZMADB_PASSWORD` and `REPORT_GENERATOR_PASSWORD` are required. The script validates them in `validate_required`.

---

## Execution Flow

### Without `--instance` (unchanged)

Stages 1-6 run exactly as before. No new stages execute.

### With `--instance <name>`

Stages run in this order: 1 → 2 → 3 → 4 → 7 → 8 → 5 → 9 → 6

Stages 1-6 run with these adaptations:
- **Stage 4** (write .env): writes `~/ozma/.env.<instance>` instead of `~/ozma/.env`
- **Stage 5** (docker compose): runs `docker compose -f docker-compose.instance.yml -p <instance> --env-file .env.<instance> up -d --build`; Keycloak healthcheck unchanged
- **Stage 6** (user provisioning): uses realm `ozma_<instance>` instead of `ozma`

Stages 7 and 8 run **before** Stage 5 so that the databases and realm exist when ozmadb starts.
Stage 9 runs **after** Stage 5 so the containers are up when Caddy routes to them.

Three new stages:

**Stage 7 — Postgres databases**

Via `docker exec` on the `postgres` container (shared stack):

```sql
-- ozmadb instance DB
CREATE USER "ozmadb_<instance>" WITH PASSWORD '<OZMADB_PASSWORD>';
CREATE DATABASE "ozmadb_<instance>" OWNER "ozmadb_<instance>";

-- report-generator instance DB  
CREATE USER "ozma-report-generator_<instance>" WITH PASSWORD '<REPORT_GENERATOR_PASSWORD>';
CREATE DATABASE "ozma-report-generator_<instance>" OWNER "ozma-report-generator_<instance>";
```

Idempotent: check existence with `SELECT 1 FROM pg_database WHERE datname = '...'` before creating.

**Stage 8 — Keycloak realm**

Via Keycloak REST API (admin token from Stage 6a):
1. `GET /auth/admin/realms/ozma_<instance>` — check existence
2. If 404: `POST /auth/admin/realms` with realm JSON (adapted from `keycloak-realm.json` via `keycloak-prepare-realm.py`) — `EXTERNAL_ORIGIN=https://<domain>`, realm name `ozma_<instance>`
3. Create ozma user in realm `ozma_<instance>` (same as Stage 6b but for new realm)

**Stage 9 — Caddy virtual host**

1. Write `~/ozma/docker/caddy.d/<instance>.caddy` on server:

Container names follow Docker Compose project naming: `<instance>-ozmadb-1` and `<instance>-ozma-report-generator-1`.

```caddy
<domain> {
    handle_path /api/* {
        reverse_proxy <instance>-ozmadb-1:5000
    }

    handle /report-generator/* {
        reverse_proxy <instance>-ozma-report-generator-1:5000
    }

    handle /auth/* {
        reverse_proxy {$KEYCLOAK_HOST}:{$KEYCLOAK_PORT:8080}
    }

    handle /static/* {
        root /usr/share/caddy
        header Cache-Control "public, max-age=31536000, immutable"
        file_server
    }

    handle {
        root /usr/share/caddy
        header Cache-Control "no-cache, must-revalidate"
        file_server
        try_files {path} /index.html
    }
}
```

2. Run `docker exec ozma caddy reload --config /etc/caddy/Caddyfile`

Idempotent: always overwrite the file and reload.

---

## New file: `docker-compose.instance.yml`

Service names are static (`ozmadb`, `ozma-report-generator`). Isolation is provided by the docker compose project name (`-p <instance>`). The resulting container names will be `<instance>-ozmadb-1` and `<instance>-ozma-report-generator-1`.

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

---

## `.env.<instance>` format

Written to `~/ozma/.env.<instance>` on the server:

```
INSTANCE=crm
DOMAIN=crm.gelfand.dev
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=...
OZMADB_PASSWORD=...
REPORT_GENERATOR_PASSWORD=...
EXTERNAL_ORIGIN=https://crm.gelfand.dev
```

---

## Idempotency

| Operation | Idempotent behavior |
|-----------|---------------------|
| Postgres DB/user creation | Check `pg_database`/`pg_roles` before CREATE |
| Keycloak realm creation | GET → 404 → POST only |
| Keycloak user in instance realm | GET → 404 → POST only, always set password |
| ozma DB user in instance | Check → insert only if not found |
| `.caddy` file | Always overwrite + caddy reload |
| `docker compose up` instance | Idempotent by design |
| `.env.<instance>` file | Always overwrite |

---

## Backward Compatibility

- `docker-compose.yml` — not modified
- `Caddyfile` — not modified
- Existing servers without instances — unaffected
- `deploy.sh` without `--instance` — identical behavior to current version

---

## Out of Scope

- Removing/destroying instances
- Listing deployed instances
- Instance-specific Keycloak client configuration beyond realm creation
- SSL certificate management (handled by Caddy automatically)
