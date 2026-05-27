# Onboarding

## Prerequisites

- Docker Desktop or compatible Docker engine.
- Python 3.12.
- Node.js 20+.
- npm 10+.

## Local Setup

```bash
cp .env.example .env
make docker-config
make docker-build
make dev
```

The compose stack also includes safe local defaults, so `docker compose up` can start Phase 1
without a `.env` file. Copy `.env.example` when you need to customize ports, credentials, API
URLs, or secrets.

## Phase 1 Compose Stack

- Backend API: <http://localhost:8000/api/v1/health>
- Backend OpenAPI: <http://localhost:8000/api/v1/docs>
- AI services health: <http://localhost:8100/api/v1/health>
- Frontend: <http://localhost:3000>
- Prometheus: <http://localhost:9090>
- Grafana: <http://localhost:3001> with the `GRAFANA_ADMIN_USER` and `GRAFANA_ADMIN_PASSWORD`
  values from `.env`.

PostgreSQL, Redis, Kafka, backend, AI services, Prometheus, and Grafana have compose health checks
or startup gates. The frontend waits for the backend health check before starting.
Grafana provisions the Prometheus datasource and a Phase 1 overview dashboard automatically.

## Development Commands

- `make backend`: run FastAPI locally.
- `make frontend`: run Next.js locally.
- `make mobile`: run Expo locally.
- `make test`: run available tests.
- `make lint`: run lint and type checks.
- `make docker-config`: validate the resolved compose file.
- `make docker-build`: build runtime images.
- `make docker-up`: start the stack in the background.
- `make docker-ps`: inspect container health.
- `make docker-logs`: follow recent compose logs.
- `make docker-down`: stop the stack.
- `make docker-clean`: stop the stack and remove local compose volumes.
