#!/usr/bin/env sh
set -eu

# Export DATABASE_URL so it's available to the Python app
export DATABASE_URL="${DATABASE_URL:-}"

if [ -z "$DATABASE_URL" ] || echo "$DATABASE_URL" | grep -q '{{'; then
  echo "⚠️  WARNING: DATABASE_URL not properly resolved. Skipping database migrations."
  echo "   Run migrations manually later with: alembic upgrade head"
else
  echo "✓ DATABASE_URL found. Running database migrations..."
  alembic upgrade head
fi

exec "$@"
