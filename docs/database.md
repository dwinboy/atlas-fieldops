# Database

The backend uses PostgreSQL 16 with Alembic-managed migrations under `backend/alembic`.
The existing `backend/migrations/001_initial_schema.sql` remains as a human-readable
snapshot only. Docker startup runs Alembic directly from the backend container.

## Tenant Model

Tenancy is shared-schema and organization-scoped:

- `organizations` is the tenant root.
- Tenant-owned tables must include `organization_id UUID NOT NULL`.
- `organization_id` must reference `organizations(id)`.
- Common access paths must use indexes that start with `organization_id`.
- Uniqueness for tenant-owned names or external identifiers must include `organization_id`
  unless the value is intentionally global.
- Repository queries must include the resolved tenant context; API controllers should not
  construct tenant filters directly.

Current tenant-owned tables are `roles`, `memberships`, and `audit_logs`. `users` are
global identities so the same person can belong to multiple organizations through
`memberships`.

## Alembic Commands

Run commands from `backend`:

```bash
cd backend
alembic upgrade head
```

Create a migration after model changes:

```bash
cd backend
alembic revision --autogenerate -m "describe change"
```

Generate SQL for review:

```bash
cd backend
alembic upgrade head --sql
```

Alembic reads `DATABASE_URL` from the runtime environment. Set it in your
local `.env` file or shell before running these commands. Railway should set
the backend service variable to `${{ Postgres.DATABASE_URL }}` or the matching
database service reference.

If Alembic is not installed in the active environment, install it in the backend
environment before running the commands:

```bash
python3 -m pip install "alembic>=1.13"
```

## Migration Review Checklist

- Tables that store tenant data include `organization_id`.
- Foreign keys preserve tenant boundaries where the referenced table is tenant-owned.
- Indexes match expected repository filters and start with `organization_id` for tenant
  queries.
- Downgrades reverse created objects in dependency order.
- Revisions do not hardcode secrets, environment-specific URLs, or tenant identifiers.
