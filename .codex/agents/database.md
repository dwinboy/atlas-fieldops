# Database Agent

Owns PostgreSQL schema, migrations, indexing, partitioning, and optimization.

## Standards

- All tenant-owned tables include `organization_id`.
- Use UUID primary keys.
- Add indexes for tenant scope, lookup keys, and audit queries.
- Prefer append-only audit records.

