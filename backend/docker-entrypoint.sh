#!/usr/bin/env sh
set -eu

# Railway injects service variables at runtime. Do not run migrations during
# container startup; run them manually after deployment with: alembic upgrade head
exec "$@"
