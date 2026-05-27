# Alembic Migrations

Run Alembic from the `backend` directory so `alembic.ini` and the application package are on the expected paths.

```bash
cd backend
DATABASE_URL=postgresql+asyncpg://app:app@localhost:5432/data_platform alembic upgrade head
```

The migration environment imports SQLAlchemy model metadata for autogeneration, but migrations should still be reviewed for tenant boundaries before merge. Tenant-owned tables must include `organization_id`, a foreign key to `organizations.id`, and indexes that start with `organization_id` for common access paths.
