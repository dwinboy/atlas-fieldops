#!/usr/bin/env sh
set -eu

DATABASE_URL_VALUE="${DATABASE_URL:-}"

if [ -z "$DATABASE_URL_VALUE" ] || echo "$DATABASE_URL_VALUE" | grep -q '{{'; then
  echo "WARNING: DATABASE_URL is not properly resolved. Skipping database migrations."
  echo "Run migrations manually later with: alembic upgrade head"
else
  echo "DATABASE_URL found. Running database migrations..."
  alembic upgrade head
fi

exec "$@"
