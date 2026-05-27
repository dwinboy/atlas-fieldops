# Enterprise Data Collection Platform

Production-grade, AI-assisted, offline-capable data collection platform.

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

## First Implementation Slice

- Tenant and user data model.
- JWT authentication.
- Role-based authorization.
- Audit logging.
- API health checks.
- Basic dashboard shell.
- Offline mobile submission queue shell.

See [docs/phase-1-status.md](docs/phase-1-status.md) for the current implementation and validation status.
