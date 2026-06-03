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
DATABASE_SSL=true
JWT_SECRET=<generate-a-long-random-secret>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
CORS_ORIGINS=https://atlas-fieldops-b321xccpu-dwinboys-projects.vercel.app
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

Automatic startup and pre-deploy migrations are disabled for Railway. After the service deploys and `DATABASE_URL` is confirmed in the Railway variables panel, run migrations manually from the backend service shell:

```bash
alembic upgrade head
```

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
NEXT_PUBLIC_API_BASE_URL=https://<railway-backend-domain>/api/v1
INTERNAL_API_BASE_URL=https://<railway-backend-domain>/api/v1
```

## Notes

- Migrations are intentionally manual on Railway so the app can start even if database variables are delayed or being debugged.
- The Docker start command listens on Railway's injected `$PORT`.
- Do not commit secrets. Keep all production values in Railway variables.
