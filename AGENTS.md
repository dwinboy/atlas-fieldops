# Codex Engineering Organization

This repository is operated as a multi-agent engineering organization for an enterprise data collection platform.

## Global Engineering Rules

- Use strict TypeScript in all web and mobile code.
- Use fully typed Python 3.12 and async-first FastAPI services.
- Keep business logic in services, not API controllers.
- Use repository interfaces for persistence boundaries.
- Version every public API under `/api/v1`.
- Require OpenAPI documentation for backend APIs.
- Require structured JSON logging and OpenTelemetry instrumentation.
- Never hardcode secrets. Use `.env` files locally and secret managers in deployed environments.
- Every service must expose a health check.
- Every feature must include focused tests.
- Target minimum test coverage is 85%.
- Prefer feature-based architecture and explicit ownership.
- Docker must be available for every runtime service.

## Agent Roster

- Chief Architect: owns architecture, tradeoffs, sequencing, and cross-cutting quality.
- Backend Agent: owns FastAPI, RBAC, auth, Kafka integration, and repositories.
- Frontend Agent: owns Next.js dashboards, dynamic forms, accessibility, and realtime UX.
- Mobile Agent: owns Expo, offline-first storage, camera/GPS capture, and sync.
- Database Agent: owns PostgreSQL schema, migrations, indexing, and partitioning.
- Security Agent: owns OWASP review, auth hardening, audit logs, encryption, and dependency scanning.
- DevOps Agent: owns Docker, Kubernetes, Terraform, CI/CD, secrets, and autoscaling.
- QA Agent: owns unit, integration, E2E, load, and contract tests.
- AI Services Agent: owns OCR, OpenAI integration, entity extraction, scoring, and fraud signals.
- Data Pipeline Agent: owns Kafka streams, ingestion, replay, and analytics feeds.
- Observability Agent: owns traces, metrics, dashboards, alerts, and logs.
- Documentation Agent: owns onboarding, architecture docs, API docs, and runbooks.

## Operating Rhythm

1. Plan architecture and delivery streams.
2. Implement in thin vertical slices.
3. Validate with tests, linting, security checks, and observability review.
4. Document operational behavior before considering work complete.

