from __future__ import annotations

import asyncio
import logging
from logging.config import fileConfig

from alembic import context
from sqlalchemy import Connection, MetaData, pool
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings
from app.models.audit import AuditLog
from app.models.base import Base
from app.models.governance import (
    ConsentRecord,
    DataAccessLog,
    DataVersion,
    ExportLog,
    GovernancePolicy,
    LineageEvent,
    MasterDataEntry,
    RetentionPolicy,
    ValidationRule,
)
from app.models.identity import Membership, Organization, Role, User
from app.models.marketing import MarketingLead
from app.models.operations import (
    AccessDelegation,
    AccessRequest,
    ApprovalMatrix,
    ClearanceLevel,
    Department,
    DeviceRegistry,
    OperationalTeam,
    OperationalZone,
    PolicyRule,
    SessionLog,
    WorkforceProfile,
)

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Keep these imports referenced so Base.metadata is fully populated for autogenerate.
_TENANT_AWARE_MODELS = (
    AuditLog,
    AccessDelegation,
    AccessRequest,
    ApprovalMatrix,
    ClearanceLevel,
    ConsentRecord,
    DataAccessLog,
    DataVersion,
    Department,
    DeviceRegistry,
    ExportLog,
    GovernancePolicy,
    LineageEvent,
    MasterDataEntry,
    Membership,
    MarketingLead,
    OperationalTeam,
    OperationalZone,
    Organization,
    PolicyRule,
    RetentionPolicy,
    Role,
    SessionLog,
    User,
    ValidationRule,
    WorkforceProfile,
)

target_metadata: MetaData = Base.metadata
logger = logging.getLogger(__name__)


def _database_url() -> str:
    return settings.database_url


config.set_main_option("sqlalchemy.url", _database_url())


def _include_object(
    object_: object,
    name: str | None,
    type_: str,
    reflected: bool,
    compare_to: object | None,
) -> bool:
    if type_ == "table" and name == "alembic_version":
        return False
    return True


def run_migrations_offline() -> None:
    context.configure(
        url=_database_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=_include_object,
        include_schemas=True,
        version_table="alembic_version",
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        include_object=_include_object,
        include_schemas=True,
        version_table="alembic_version",
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    url = make_url(_database_url())
    logger.info(
        "database_migration_connecting",
        extra={"host": url.host, "database": url.database},
    )
    connectable = create_async_engine(
        _database_url(),
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
