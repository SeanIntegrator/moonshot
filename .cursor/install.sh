#!/usr/bin/env bash
# Cloud Agent install phase: idempotent, source-derived setup that must terminate.
# Runtime services (Postgres, migrations) live in start.sh; long-running dev
# servers live in the environment.json `terminals`.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

# PostgreSQL is a stable system dependency. When booting from the environment
# snapshot it is already present, so this is a fast no-op; the guard keeps the
# script usable on a bare base image too.
if ! command -v pg_ctlcluster >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq postgresql postgresql-contrib
fi

# Workspace dependencies (pnpm version is pinned via package.json "packageManager").
pnpm install --frozen-lockfile

# Local dev env files are gitignored; generate them only when missing so a
# developer's own overrides are never clobbered.
api_env="apps/moonshot-api/.env"
if [ ! -f "$api_env" ]; then
  cat > "$api_env" <<'ENV'
PORT=3000
DATABASE_URL=postgres://moonshot:moonshot@127.0.0.1:5432/moonshot
JWT_SECRET=local-dev-secret-change-me
MENU_ADMIN_EMAILS=owner@example.com
CORS_ORIGINS=
ORDER_AHEAD_BASE_URL=http://localhost:5176
ENV
fi

order_ahead_env="apps/moonshot-order-ahead/.env"
if [ ! -f "$order_ahead_env" ]; then
  cat > "$order_ahead_env" <<'ENV'
VITE_API_URL=http://localhost:3000
VITE_CAFE_SLUG=clay-and-bean
ENV
fi

# The KDS and admin SPAs read VITE_API_URL to reach the API in dev (in prod a
# runtime-config.js is written at container start instead).
for app in moonshot-kds moonshot-admin; do
  app_env="apps/$app/.env"
  if [ ! -f "$app_env" ]; then
    echo "VITE_API_URL=http://localhost:3000" > "$app_env"
  fi
done

echo "[install] complete"
