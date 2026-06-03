from __future__ import annotations

import asyncio
import os
from dataclasses import dataclass

from sqlalchemy import select

from app.core.permissions import ROLE_DEFINITIONS, ScopeType
from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.models.identity import Membership, Organization, Role, User, UserAccessGrant


@dataclass(frozen=True)
class BootstrapConfig:
    organization_name: str
    organization_slug: str
    email: str
    password: str
    full_name: str


def _required_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"{name} is required")
    return value


def _config() -> BootstrapConfig:
    password = _required_env("SUPER_ADMIN_PASSWORD")
    if len(password) < 12:
        raise RuntimeError("SUPER_ADMIN_PASSWORD must be at least 12 characters")

    email = _required_env("SUPER_ADMIN_EMAIL").lower()
    return BootstrapConfig(
        organization_name=os.environ.get("BOOTSTRAP_ORGANIZATION_NAME", "Atlas FieldOps").strip()
        or "Atlas FieldOps",
        organization_slug=os.environ.get("BOOTSTRAP_ORGANIZATION_SLUG", "atlas").strip().lower()
        or "atlas",
        email=email,
        password=password,
        full_name=os.environ.get("SUPER_ADMIN_FULL_NAME", "Atlas Super Admin").strip()
        or "Atlas Super Admin",
    )


async def bootstrap_super_admin() -> None:
    config = _config()

    async with AsyncSessionLocal() as session:
        async with session.begin():
            result = await session.execute(
                select(Organization).where(
                    Organization.slug == config.organization_slug,
                    Organization.deleted_at.is_(None),
                )
            )
            organization = result.scalar_one_or_none()
            if organization is None:
                organization = Organization(name=config.organization_name, slug=config.organization_slug)
                session.add(organization)
                await session.flush()
            else:
                organization.name = config.organization_name
                organization.is_active = True

            roles: dict[str, Role] = {}
            for definition in ROLE_DEFINITIONS.values():
                role_result = await session.execute(
                    select(Role).where(
                        Role.organization_id == organization.id,
                        Role.name == definition.name,
                        Role.deleted_at.is_(None),
                    )
                )
                role = role_result.scalar_one_or_none()
                permissions = ",".join(sorted(permission.value for permission in definition.permissions))
                if role is None:
                    role = Role(
                        organization_id=organization.id,
                        name=definition.name,
                        label=definition.label,
                        description=definition.description,
                        scope_type=definition.scope_type.value,
                        is_system=True,
                        permissions=permissions,
                    )
                    session.add(role)
                    await session.flush()
                else:
                    role.label = definition.label
                    role.description = definition.description
                    role.scope_type = definition.scope_type.value
                    role.is_system = True
                    role.permissions = permissions
                roles[definition.name] = role

            super_admin_role = roles["super_admin"]
            user_result = await session.execute(
                select(User).where(User.email == config.email, User.deleted_at.is_(None))
            )
            user = user_result.scalar_one_or_none()
            if user is None:
                user = User(
                    email=config.email,
                    password_hash=hash_password(config.password),
                    full_name=config.full_name,
                )
                session.add(user)
                await session.flush()
            else:
                user.full_name = config.full_name
                user.password_hash = hash_password(config.password)
                user.is_active = True

            membership_result = await session.execute(
                select(Membership).where(
                    Membership.organization_id == organization.id,
                    Membership.user_id == user.id,
                    Membership.deleted_at.is_(None),
                )
            )
            membership = membership_result.scalar_one_or_none()
            if membership is None:
                membership = Membership(
                    organization_id=organization.id,
                    user_id=user.id,
                    role_id=super_admin_role.id,
                )
                session.add(membership)
            else:
                membership.role_id = super_admin_role.id
                membership.is_active = True

            grant_result = await session.execute(
                select(UserAccessGrant).where(
                    UserAccessGrant.organization_id == organization.id,
                    UserAccessGrant.user_id == user.id,
                    UserAccessGrant.scope_type == ScopeType.GLOBAL.value,
                    UserAccessGrant.deleted_at.is_(None),
                )
            )
            grant = grant_result.scalar_one_or_none()
            if grant is None:
                session.add(
                    UserAccessGrant(
                        organization_id=organization.id,
                        user_id=user.id,
                        scope_type=ScopeType.GLOBAL.value,
                    )
                )

    print("Super admin bootstrap complete")
    print(f"Login email: {config.email}")
    print(f"Organization slug: {config.organization_slug}")


if __name__ == "__main__":
    asyncio.run(bootstrap_super_admin())
