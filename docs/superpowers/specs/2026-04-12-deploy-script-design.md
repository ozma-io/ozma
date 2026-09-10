# Deploy Script Design

**Date:** 2026-04-12
**Topic:** Single-script deployment of ozma + ozmadb to a remote server

## Overview

A single `deploy.sh` script in the root of the `ozma` repo that provisions a server from scratch: installs Docker, clones the repo, writes `.env`, starts all services via Docker Compose, and creates users in Keycloak and ozma. Supports two modes: remote (SSH) and local (run directly on the server).

---

## Interface

### Usage

```bash
./deploy.sh [--local | --remote user@host] [--env /path/to/.env] [OPTIONS]
```

### CLI flags and .env variables

| Flag | .env variable | Required | Description |
|------|---------------|----------|-------------|
| `--remote user@host` | `DEPLOY_HOST` | one of --remote/--local | SSH target |
| `--local` | — | one of --remote/--local | Run without SSH |
| `--env /path/.env` | — | no | Path to .env file to load |
| `--domain example.com` | `DOMAIN` | yes | Server domain (used for CADDY_ADDRESS, EXTERNAL_ORIGIN) |
| `--admin-email` | `ADMIN_EMAIL` | yes | Keycloak admin email (realm: master) |
| `--admin-password` | `ADMIN_PASSWORD` | yes | Keycloak admin password |
| `--ozma-email` | `OZMA_USER_EMAIL` | yes | ozma user email (realm: ozma + ozma DB) |
| `--ozma-password` | `OZMA_USER_PASSWORD` | yes | ozma user password |

**Priority:** CLI args → `.env` file → interactive prompt (if TTY available).

If a required variable is missing and no TTY is available, the script exits with a clear error message listing what is missing.

---

## Execution Stages

The same 6 stages run in both modes. In remote mode, stages 2–5 are executed over SSH; stage 6 (user provisioning) is executed locally via HTTP to the domain. In local mode, all stages run directly on the machine, and stage 6 uses `http://localhost:9080` instead of the domain.

### Stage 1 — Preflight

- Validate all required variables are set
- In remote mode: verify SSH connection (`ssh user@host 'echo ok'`)
- Abort with a clear message if anything is missing

### Stage 2 — Docker Install

- On the server: check if `docker` is available (`command -v docker`)
- If not: install via `curl -fsSL https://get.docker.com | sh`
- Add current user to `docker` group if needed

### Stage 3 — Deploy Repo

**Local (before SSH), only in remote mode:**
- `git push origin $(git rev-parse --abbrev-ref HEAD)` — push current branch to GitHub

**On server (via SSH in remote mode, directly in local mode):**
- If `~/ozma/` does not exist: `git clone https://github.com/vientooscuro/ozma.git ~/ozma`
- If it exists: `git -C ~/ozma pull`
- No authentication needed (public repo, HTTPS)

### Stage 4 — Env Setup

Write `~/ozma/.env` on the server with the following content derived from script parameters:

```
ADMIN_EMAIL=<value>
ADMIN_PASSWORD=<value>
CADDY_ADDRESS=<domain>
EXTERNAL_ORIGIN=https://<domain>
HTTP_PORT=80
HTTPS_PORT=443
```

In remote mode: written via SSH heredoc. In local mode: written directly.

### Stage 5 — Docker Compose

On the server:
```bash
cd ~/ozma
docker compose pull
docker compose up -d --build
```

Then poll Keycloak health endpoint until ready:
- URL: `http://localhost:9080/auth/health`
- Interval: 5 seconds
- Timeout: 2 minutes
- On timeout: exit with error

### Stage 6 — User Provisioning

Executed **locally** (or on server in local mode) via HTTP to `https://<domain>`.

#### 6a — Keycloak admin user

The Keycloak admin (`ADMIN_EMAIL` / `ADMIN_PASSWORD`) is created automatically by `keycloak-entrypoint.sh` via `KEYCLOAK_ADMIN` / `KEYCLOAK_ADMIN_PASSWORD` env vars. This stage verifies the admin can obtain a token:

```
POST /auth/realms/master/protocol/openid-connect/token
```

If this fails, exit with error (Keycloak did not start correctly).

#### 6b — ozma Keycloak user (realm: ozma)

Using the admin token:
1. `GET /auth/admin/realms/ozma/users?email=<OZMA_USER_EMAIL>` — check existence
2. If not found: `POST /auth/admin/realms/ozma/users` — create user
3. `PUT /auth/admin/realms/ozma/users/<id>/reset-password` — set password (temporary: false)

#### 6c — ozma application user

Create the same user in the ozma database via ozma's own API. The script uses the ozma HTTP API authenticated with the admin Keycloak token. It checks if the user already exists before creating (idempotent). The specific endpoint and request format will be determined during implementation by inspecting the ozma API.

---

## Error Handling

- `set -euo pipefail` throughout
- Each stage prints a status line: `[OK] Stage name` or `[FAIL] Stage name: reason`
- Colors: green for OK, red for FAIL, yellow for SKIP
- On failure: print the stage name and a human-readable message, then exit 1
- Keycloak polling prints progress dots and a final timeout message if exceeded

---

## Idempotency

The script is safe to run multiple times:

| Operation | Idempotent behavior |
|-----------|---------------------|
| Docker install | Skipped if already installed |
| `git clone` | Uses `git pull` if repo already exists |
| `.env` write | Overwrites (safe, derived from args) |
| `docker compose up` | No-op for already-running containers |
| Keycloak user creation | GET first, POST only if 404 |
| ozma user creation | GET first, POST only if not found |

---

## File Location

- Script: `deploy.sh` in the root of the `ozma` repo
- `.env` on server: `~/ozma/.env`
- Repo on server: `~/ozma/`

---

## Out of Scope

- SSL certificate management (handled by Caddy automatically)
- Backup / restore
- Multi-server deployments
- CI/CD integration
- ozmadb repo deployment (Docker image from `ghcr.io/vientooscuro/ozmadb:master` is sufficient)
