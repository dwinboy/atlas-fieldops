#!/usr/bin/env sh
set -eu

if [ "${SKIP_DB_MIGRATIONS:-false}" != "true" ]; then
  echo "Running database migrations..."
  PYTHON_BIN="${PYTHON_BIN:-$(command -v python || command -v python3)}"
  "$PYTHON_BIN" -m alembic upgrade head
fi

exec "$@"
