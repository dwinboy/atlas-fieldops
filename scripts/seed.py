import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.core.permissions import ScopeType
from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.models.collection import Project
from app.models.operations import Beneficiary, CaseRecord, DonorReport, MonitoringIndicator
from app.repositories.identity import IdentityRepository, OrganizationRepository, RoleRepository
from app.repositories.users import UserRepository
from app.services.identity import OrganizationService
from app.schemas.identity import OrganizationCreate
from sqlalchemy import select


DEFAULT_ORGANIZATION_NAME = "Atlas Demo Organization"
DEFAULT_ORGANIZATION_SLUG = "atlas-demo"
DEFAULT_SUPER_ADMIN_EMAIL = "superadmin@example.com"
DEFAULT_SUPER_ADMIN_PASSWORD = "ChangeMe12345!"


async def seed_operational_demo_data(session, organization_id) -> None:
    existing_program = await session.scalar(
        select(Project).where(Project.organization_id == organization_id, Project.slug == "smallholder-resilience")
    )
    if existing_program is None:
        existing_program = Project(
            organization_id=organization_id,
            name="Smallholder Resilience Program",
            slug="smallholder-resilience",
            region="Northern Corridor",
        )
        session.add(existing_program)
        await session.flush()

    existing_beneficiary = await session.scalar(
        select(Beneficiary).where(
            Beneficiary.organization_id == organization_id,
            Beneficiary.beneficiary_uid == "FARM-0001",
        )
    )
    if existing_beneficiary is None:
        session.add(
            Beneficiary(
                organization_id=organization_id,
                project_id=existing_program.id,
                beneficiary_uid="FARM-0001",
                beneficiary_type="farmer",
                display_name="Amina Okoro",
                sex="female",
                birth_year=1986,
                phone_number="+2348010000001",
                region="Northern Corridor",
                district="Kano East",
                community="Gidan Dala",
                enrollment_status="active",
                vulnerability_score=36,
                duplicate_risk_score=4.2,
                latitude=11.991,
                longitude=8.531,
                profile_json={"primary_crop": "maize", "household_size": 6},
            )
        )

    existing_indicator = await session.scalar(
        select(MonitoringIndicator).where(
            MonitoringIndicator.organization_id == organization_id,
            MonitoringIndicator.code == "AGR.YIELD.MAIZE",
        )
    )
    if existing_indicator is None:
        session.add(
            MonitoringIndicator(
                organization_id=organization_id,
                project_id=existing_program.id,
                code="AGR.YIELD.MAIZE",
                name="Average maize yield improvement",
                description="Tracks yield improvement among enrolled smallholder farmers.",
                unit="percent",
                reporting_frequency="quarterly",
                baseline_value=0,
                target_value=35,
                current_value=18,
                sdg_code="SDG2",
                formula="approved_yield_followups / enrolled_farmers",
            )
        )

    existing_case = await session.scalar(
        select(CaseRecord).where(
            CaseRecord.organization_id == organization_id,
            CaseRecord.case_number == "CASE-0001",
        )
    )
    if existing_case is None:
        session.add(
            CaseRecord(
                organization_id=organization_id,
                project_id=existing_program.id,
                case_number="CASE-0001",
                case_type="correction",
                title="Verify missing GPS accuracy on farm visit",
                priority="high",
                status="open",
                notes="Supervisor should confirm coordinates before report inclusion.",
            )
        )

    existing_report = await session.scalar(
        select(DonorReport).where(
            DonorReport.organization_id == organization_id,
            DonorReport.name == "Q2 Agriculture M&E Update",
        )
    )
    if existing_report is None:
        session.add(
            DonorReport(
                organization_id=organization_id,
                project_id=existing_program.id,
                name="Q2 Agriculture M&E Update",
                donor="FAO",
                report_type="indicator",
                status="draft",
                summary="Draft report connected to live beneficiaries, indicators, cases, and field activity.",
                export_formats=["pdf", "xlsx"],
            )
        )


async def seed_super_admin() -> None:
    organization_name = os.getenv("SEED_ORGANIZATION_NAME", DEFAULT_ORGANIZATION_NAME)
    organization_slug = os.getenv("SEED_ORGANIZATION_SLUG", DEFAULT_ORGANIZATION_SLUG)
    admin_email = os.getenv("SEED_SUPER_ADMIN_EMAIL", DEFAULT_SUPER_ADMIN_EMAIL)
    admin_password = os.getenv("SEED_SUPER_ADMIN_PASSWORD", DEFAULT_SUPER_ADMIN_PASSWORD)

    async with AsyncSessionLocal() as session:
        organizations = OrganizationRepository(session)
        organization = await organizations.get_by_slug(organization_slug)
        if organization is None:
            await OrganizationService(session).create_organization(
                OrganizationCreate(name=organization_name, slug=organization_slug)
            )
            organization = await organizations.get_by_slug(organization_slug)
            if organization is None:
                raise RuntimeError("Organization seed failed; organization was not persisted")

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

        await seed_operational_demo_data(session, organization.id)
        await session.commit()

    print("Seeded super admin:")
    print(f"Organization slug: {organization_slug}")
    print(f"Email: {admin_email}")
    print(f"Password: {admin_password}")


def main() -> None:
    asyncio.run(seed_super_admin())


if __name__ == "__main__":
    main()
