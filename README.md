# Atlas FieldOps

Production-grade, AI-assisted, offline-capable field operations platform for monitoring, evaluation, and frontline data collection.

## Architecture

- `frontend`: Next.js, React, TypeScript, Tailwind, React Query.
- `mobile`: Expo React Native with SQLite offline storage.
- `backend`: FastAPI, PostgreSQL, Redis, Kafka, OpenTelemetry.
- `ai-services`: OCR, OpenAI-assisted extraction, validation scoring.
- `data-pipelines`: Kafka consumers and analytics pipelines.
- `infrastructure`: Kubernetes and Terraform.

## Quick Start

```bash
cp .env.example .env
make bootstrap
docker compose up
```

Backend API: http://localhost:8000/api/v1

Frontend: http://localhost:3000

Prometheus: http://localhost:9090

Grafana: http://localhost:3001

For local frontend-only development, run:

```bash
make frontend-app
```

Then open http://127.0.0.1:3001/app. This command clears stale Next.js build artifacts before
starting, which prevents the app from loading HTML without working JavaScript after a production
build. If you are running the full Docker Compose stack, use http://localhost:3000 for the app
because http://localhost:3001 is reserved for Grafana.

## First Implementation Slice

- Tenant and user data model.
- JWT authentication.
- Role-based authorization.
- Audit logging.
- API health checks.
- Basic dashboard shell.
- Offline mobile submission queue shell.

See [docs/phase-1-status.md](docs/phase-1-status.md) for the current implementation and validation status.

## Deployment

The web application is ready for Vercel deployment from the `frontend` directory. Configure the Vercel project with:

- Root Directory: `frontend`
- Build Command: `npm run build`
- Install Command: `npm ci`
- Environment variables from `frontend/.env.production.example`

The FastAPI backend should be deployed separately on infrastructure that supports PostgreSQL, Redis, and Kafka, then exposed to the frontend through `NEXT_PUBLIC_API_BASE_URL` and `INTERNAL_API_BASE_URL`.

See [docs/vercel-deployment.md](docs/vercel-deployment.md) for the full checklist.
