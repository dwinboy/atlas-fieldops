# Railway Backend Deployment

This backend is prepared to deploy as a Railway service from the `backend` directory.

## Railway Service Setup

1. Create a new Railway project.
2. Add a PostgreSQL database service.
3. Add a backend service from GitHub: `dwinboy/atlas-fieldops`.
4. Set the backend service root directory to:

```text
backend
```

5. Use this config-as-code file:

```text
/backend/railway.toml
```

Railway will build the Dockerfile and start FastAPI on Railway's `$PORT`.

## Required Variables

Set these on the backend service:

```env
APP_ENV=production
APP_NAME=Atlas FieldOps
DATABASE_URL=${{ Postgres.DATABASE_URL }}
JWT_SECRET=<generate-a-long-random-secret>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
BACKEND_CORS_ORIGINS=https://atlas-fieldops.vercel.app,https://atlas-fieldops-l6h6tkdyh-dwinboys-projects.vercel.app,https://atlastfieldops.com
KAFKA_BOOTSTRAP_SERVERS=
```

If your Railway PostgreSQL service is not named `Postgres`, update the reference to match the actual service name, for example:

```env
DATABASE_URL=${{ PostgreSQL.DATABASE_URL }}
```

## Optional Variables

Use a Railway Redis service if Redis-backed features are needed:

```env
REDIS_URL=${{ Redis.REDIS_URL }}
```

Without Redis, the app can still start, but Redis-backed features should not be treated as production-ready.

## Migrations

Railway runs Alembic before deployment through `backend/railway.json`. The app
and Alembic both read the same `DATABASE_URL` environment variable at runtime.
To run migrations manually from the backend service shell:

```bash
alembic upgrade head
```

## First Super Admin

After migrations have run, create or reset the first platform super admin from
the Railway backend service shell:

```bash
SUPER_ADMIN_EMAIL=<admin-email> \
SUPER_ADMIN_PASSWORD=<temporary-password-at-least-12-characters> \
SUPER_ADMIN_FULL_NAME="Platform Administrator" \
BOOTSTRAP_ORGANIZATION_NAME="Atlas FieldOps" \
BOOTSTRAP_ORGANIZATION_SLUG=atlas \
python scripts/bootstrap_super_admin.py
```

Use the printed organization slug on the login screen. The script is
idempotent: running it again updates the same user, role membership, password,
and global access grant.

## Deployment Checks

After Railway deploys, verify:

```bash
curl https://<railway-backend-domain>/api/v1/health
```

Expected response:

```json
{"status":"ok"}
```

Then update Vercel:

```env
NEXT_PUBLIC_API_URL=https://<railway-backend-domain>
```

## Notes

- Keep `DATABASE_URL` as one complete Railway reference value. Do not split it into `PGUSER`, `PGPASSWORD`, `PGHOST`, or related variables.
- The Docker start command listens on Railway's injected `$PORT`.
- Do not commit secrets. Keep all production values in Railway variables.
