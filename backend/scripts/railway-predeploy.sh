#!/usr/bin/env sh
set -eu

DATABASE_URL_VALUE="${DATABASE_URL:-}"

if [ -z "$DATABASE_URL_VALUE" ]; then
  echo "ERROR: DATABASE_URL is not set. Add a Railway Postgres service and reference its DATABASE_URL." >&2
  exit 1
fi

if echo "$DATABASE_URL_VALUE" | grep -q '{{'; then
  echo "ERROR: DATABASE_URL still contains an unresolved Railway variable reference." >&2
  echo "Use Railway's variable reference for your Postgres service, or paste the resolved URL." >&2
  exit 1
fi

echo "DATABASE_URL resolved. Running Alembic migrations..."
alembic upgrade head
