#!/usr/bin/env sh
set -eu

echo "Running database migrations..."
python -m alembic upgrade head
echo "Migrations completed successfully!"

exec "$@"
