#!/usr/bin/env bash
# Cloud Agent start phase: per-boot reconciliation of runtime state. Must be
# idempotent, avoid duplicate processes, verify readiness, then return so the
# `terminals` dev servers can launch. Long-running servers do NOT belong here.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

pg_ver="$(pg_lsclusters -h 2>/dev/null | awk 'NR==1 {print $1}')"
pg_ver="${pg_ver:-16}"

# Start the cluster only when it is not already online (safe across reboots).
if ! pg_lsclusters -h 2>/dev/null | grep -q online; then
  sudo pg_ctlcluster "$pg_ver" main start
fi

# Block until Postgres accepts connections before touching it.
for _ in $(seq 1 30); do
  if sudo -u postgres pg_isready -q; then
    break
  fi
  sleep 1
done

# Ensure the dev role and database exist (idempotent).
sudo -u postgres psql -v ON_ERROR_STOP=1 <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'moonshot') THEN
    CREATE ROLE moonshot WITH LOGIN PASSWORD 'moonshot';
  END IF;
END $$;
SQL

if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname = 'moonshot'" | grep -q 1; then
  sudo -u postgres createdb -O moonshot moonshot
fi

# node-pg-migrate only applies pending migrations, so this reconciles the schema
# on every boot without side effects. The dev seed café (`clay-and-bean`) and
# its menu are created by the migrations themselves.
pnpm --filter @moonshot/api migrate

echo "[start] Postgres online and schema migrated"
