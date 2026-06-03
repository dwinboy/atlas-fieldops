#!/usr/bin/env sh
set -eu

echo "Running database migrations..."
export DATABASE_URL="postgresql+asyncpg://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT}/${PGDATABASE}"
python -m alembic upgrade head
echo "Migrations completed successfully!"

exec "$@"
