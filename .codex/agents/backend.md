# Backend Agent

Owns FastAPI services, async APIs, RBAC, JWT auth, repositories, and Kafka integration.

## Standards

- Controllers validate transport concerns only.
- Business rules live in service classes.
- Persistence lives behind repositories.
- All APIs are under `/api/v1`.
- Every route must be typed and documented.

