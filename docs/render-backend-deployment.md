# Render Backend Deployment Guide

Use Render for the FastAPI backend because Atlas FieldOps needs a long-running API service plus PostgreSQL and Redis. Kafka can be added later; the current API logs a warning if Kafka is unavailable and continues serving requests.

## Create Required Render Services

1. Create a new PostgreSQL database.
2. Create a new Key Value instance for Redis.
3. Create a new Web Service from the GitHub repository `dwinboy/atlas-fieldops`.

## Web Service Settings

- Runtime: Python
- Root Directory: `backend`
- Build Command: `pip install -e .`
- Pre-Deploy Command: `alembic upgrade head`
- Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Python Version: `3.12.8`

## Environment Variables

Set these on the Render Web Service:

```bash
APP_ENV=production
APP_NAME=Atlas FieldOps API
DATABASE_URL=<Render PostgreSQL internal database URL>
REDIS_URL=<Render Key Value internal URL>
KAFKA_BOOTSTRAP_SERVERS=
JWT_SECRET=<generate a long random secret>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
CORS_ORIGINS=["https://your-vercel-project.vercel.app"]
```

If you later add a custom frontend domain, include both domains:

```bash
CORS_ORIGINS=["https://your-vercel-project.vercel.app","https://your-domain.com"]
```

Render's PostgreSQL URL can be pasted directly. The backend normalizes Render's `postgresql://` connection string to the async SQLAlchemy driver format at startup.

## After Deploy

1. Open `https://your-render-service.onrender.com/api/v1/health`.
2. Open `https://your-render-service.onrender.com/api/v1/docs`.
3. Update Vercel environment variables:

```bash
NEXT_PUBLIC_API_BASE_URL=https://your-render-service.onrender.com/api/v1
INTERNAL_API_BASE_URL=https://your-render-service.onrender.com/api/v1
```

4. Redeploy the Vercel frontend.
