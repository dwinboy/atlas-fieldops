# Architecture Plan

## System Shape

The platform uses a modular service architecture with FastAPI as the first backend service boundary, PostgreSQL as the system of record, Redis for cache and rate-limit state, Kafka for durable async workflows, and OpenTelemetry for full request tracing.

## Tenancy

All business records include `organization_id`. Authorization decisions are scoped by organization, role, and explicit permissions. Shared infrastructure is multi-tenant; data access is tenant-isolated at repository and database-query layers.

## Core Domains

- Identity: users, credentials, sessions, roles, permissions.
- Tenancy: organizations, memberships, tenant-level settings.
- Collection: form definitions, submissions, media attachments, validation state.
- Audit: immutable append-only events for sensitive actions.
- AI: OCR jobs, extraction results, confidence scores, fraud signals.
- Analytics: realtime metrics from Kafka topics and materialized aggregates.

## Data Flow

1. Web and mobile clients call versioned APIs.
2. Backend validates auth and tenant scope.
3. Transactional data is written to PostgreSQL.
4. Domain events are emitted to Kafka.
5. AI and data-pipeline consumers process events asynchronously.
6. Analytics projections feed dashboards and alerts.

## Non-Functional Requirements

- Scale target: 10M+ records/day through horizontal API workers and partitioned ingestion topics.
- High availability: stateless application services, externalized durable stores, Kubernetes readiness/liveness checks.
- Compliance: audit logs, data minimization, encryption-ready boundaries, secret isolation, role-scoped access.
- Observability: traces, metrics, structured logs, SLO dashboards, and alertable health signals.

