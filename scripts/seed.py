import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.core.permissions import ScopeType
from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.repositories.identity import IdentityRepository, OrganizationRepository, RoleRepository
from app.repositories.users import UserRepository
from app.services.identity import OrganizationService
from app.schemas.identity import OrganizationCreate


DEFAULT_ORGANIZATION_NAME = "Atlas Demo Organization"
DEFAULT_ORGANIZATION_SLUG = "atlas-demo"
DEFAULT_SUPER_ADMIN_EMAIL = "superadmin@example.com"
DEFAULT_SUPER_ADMIN_PASSWORD = "ChangeMe12345!"


async def seed_super_admin() -> None:
    organization_name = os.getenv("SEED_ORGANIZATION_NAME", DEFAULT_ORGANIZATION_NAME)
    organization_slug = os.getenv("SEED_ORGANIZATION_SLUG", DEFAULT_ORGANIZATION_SLUG)
    admin_email = os.getenv("SEED_SUPER_ADMIN_EMAIL", DEFAULT_SUPER_ADMIN_EMAIL)
    admin_password = os.getenv("SEED_SUPER_ADMIN_PASSWORD", DEFAULT_SUPER_ADMIN_PASSWORD)

    async with AsyncSessionLocal() as session:
        organizations = OrganizationRepository(session)
        organization = await organizations.get_by_slug(organization_slug)
        if organization is None:
            organization = await OrganizationService(session).create_organization(
                OrganizationCreate(name=organization_name, slug=organization_slug)
            )

        existing_identity = await UserRepository(session).find_for_login(
            email=admin_email,
            organization_slug=organization_slug,
        )
        if existing_identity is None:
            role = await RoleRepository(session).get_by_name(organization_id=organization.id, name="super_admin")
            if role is None:
                raise RuntimeError("super_admin role is missing; run migrations and organization seed first")
            identity = IdentityRepository(session)
            user = await identity.create_user(
                email=admin_email,
                password_hash=hash_password(admin_password),
                full_name="Super Admin",
            )
            await identity.add_membership(organization_id=organization.id, user_id=user.id, role_id=role.id)
            await identity.add_access_grant(
                organization_id=organization.id,
                user_id=user.id,
                scope_type=ScopeType.GLOBAL,
            )

        await session.commit()

    print("Seeded super admin:")
    print(f"Organization slug: {organization_slug}")
    print(f"Email: {admin_email}")
    print(f"Password: {admin_password}")


def main() -> None:
    asyncio.run(seed_super_admin())


if __name__ == "__main__":
    main()
