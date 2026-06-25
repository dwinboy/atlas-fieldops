from datetime import UTC, datetime
import json
import re
from uuid import UUID

from typing import Any

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog
from app.models.collection import DataForm, DataFormVersion, FieldOfficerProfile, OfficerAssignment, Project, Submission, Survey
from app.models.operations import Beneficiary, DataQualitySignal, DonorReport, MonitoringIndicator, OperationalTeam
from app.repositories.audit import AuditRepository
from app.schemas.projects import (
    ProjectAuditEventRead,
    ProjectCreate,
    ProjectDetailRead,
    ProjectListItemRead,
    ProjectRelatedRecordRead,
    ProjectSectorInstallRead,
    ProjectSectorPackRead,
    ProjectSummaryRead,
    ProjectTemplateRead,
    ProjectUpdate,
)
from app.services.sector_packs import apply_sector_pack, get_sector_pack, list_sector_packs, sector_summary



def _as_dict(value: object) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _as_list(value: object) -> list[Any]:
    return value if isinstance(value, list) else []

class ProjectNotFoundError(Exception):
    pass


class ProjectConflictError(Exception):
    pass


class ProjectsService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.audit = AuditRepository(session)

    async def summary(self, organization_id: UUID) -> ProjectSummaryRead:
        projects = await self.list_projects(organization_id)
        total_projects = len(projects)
        active_projects = len([project for project in projects if project.status == "active"])
        closed_projects = len([project for project in projects if project.status in {"closed", "archived", "completed"}])
        draft_projects = max(total_projects - active_projects - closed_projects, 0)
        total_submissions = await self._count(Submission, organization_id)
        total_beneficiaries = await self._count(Beneficiary, organization_id)
        active_forms = await self._count(DataForm, organization_id, is_active=True)
        active_field_officers = await self._count(FieldOfficerProfile, organization_id, is_active=True)
        indicator_values = await self.session.execute(
            select(func.avg(MonitoringIndicator.current_value / func.nullif(MonitoringIndicator.target_value, 0) * 100)).where(
                MonitoringIndicator.organization_id == organization_id,
                MonitoringIndicator.deleted_at.is_(None),
                MonitoringIndicator.target_value > 0,
            )
        )
        indicator_rate = float(indicator_values.scalar() or 0)
        return ProjectSummaryRead(
            total_projects=total_projects,
            active_projects=active_projects,
            draft_projects=draft_projects,
            closed_projects=closed_projects,
            total_beneficiaries=total_beneficiaries,
            total_submissions=total_submissions,
            active_forms=active_forms,
            active_field_officers=active_field_officers,
            project_completion_rate=round(sum(project.progress_percent for project in projects) / total_projects, 1) if total_projects else 0,
            indicator_achievement_rate=round(min(indicator_rate, 100), 1),
            attention_projects=len([project for project in projects if project.health_score < 70]),
            risk_alerts=await self._count(DataQualitySignal, organization_id, status="open"),
        )

    async def create_project(self, organization_id: UUID, actor_user_id: UUID, payload: ProjectCreate) -> ProjectListItemRead:
        existing = await self.session.execute(
            select(Project).where(
                Project.organization_id == organization_id,
                Project.slug == payload.project_code,
                Project.deleted_at.is_(None),
            )
        )
        if existing.scalar_one_or_none() is not None:
            raise ProjectConflictError("Project code already exists")
        settings = apply_sector_pack(payload.settings_json, payload.sector_id)
        project = Project(
            organization_id=organization_id,
            name=payload.name,
            slug=payload.project_code,
            description=payload.description,
            program_type=payload.program_type,
            category=payload.category,
            donor=payload.donor,
            implementing_organization=payload.implementing_organization,
            country=payload.country,
            region=payload.region or payload.country,
            district=payload.district,
            community=payload.community,
            owner=payload.owner,
            status=payload.status,
            start_date=payload.start_date,
            end_date=payload.end_date,
            settings_json=settings,
            is_active=payload.status in {"approved", "active"},
        )
        self.session.add(project)
        await self.session.flush()
        await self.audit.append(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="project.created",
            resource_type="project",
            resource_id=str(project.id),
            metadata={
                "project_code": payload.project_code,
                "status": payload.status,
                "donor": payload.donor,
                "country": payload.country,
                "program_type": payload.program_type,
                "sector_id": payload.sector_id,
            },
        )
        await self.session.commit()
        return await self.get_project_item(organization_id, project.id)

    async def update_project(self, organization_id: UUID, actor_user_id: UUID, project_id: UUID, payload: ProjectUpdate) -> ProjectListItemRead:
        project = await self._get_project(organization_id, project_id)
        if payload.project_code and payload.project_code != project.slug:
            existing = await self.session.execute(
                select(Project).where(
                    Project.organization_id == organization_id,
                    Project.slug == payload.project_code,
                    Project.id != project_id,
                    Project.deleted_at.is_(None),
                )
            )
            if existing.scalar_one_or_none() is not None:
                raise ProjectConflictError("Project code already exists")
            project.slug = payload.project_code
        if payload.name is not None:
            project.name = payload.name
        if payload.description is not None:
            project.description = payload.description
        if payload.program_type is not None:
            project.program_type = payload.program_type
        if payload.category is not None:
            project.category = payload.category
        if payload.donor is not None:
            project.donor = payload.donor
        if payload.implementing_organization is not None:
            project.implementing_organization = payload.implementing_organization
        if payload.country is not None:
            project.country = payload.country
        if payload.country is not None or payload.region is not None:
            project.region = payload.region or payload.country
        if payload.district is not None:
            project.district = payload.district
        if payload.community is not None:
            project.community = payload.community
        if payload.owner is not None:
            project.owner = payload.owner
        if payload.start_date is not None:
            project.start_date = payload.start_date
        if payload.end_date is not None:
            project.end_date = payload.end_date
        if payload.settings_json is not None:
            project.settings_json = payload.settings_json
        if payload.sector_id is not None:
            project.settings_json = apply_sector_pack(project.settings_json, payload.sector_id)
        if payload.status is not None:
            project.status = payload.status
            project.is_active = payload.status in {"approved", "active"}
        await self.audit.append(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="project.updated",
            resource_type="project",
            resource_id=str(project.id),
            metadata=payload.model_dump(exclude_none=True, mode="json"),
        )
        await self.session.commit()
        return await self.get_project_item(organization_id, project.id)

    async def list_projects(self, organization_id: UUID) -> list[ProjectListItemRead]:
        result = await self.session.execute(
            select(Project)
            .where(Project.organization_id == organization_id, Project.deleted_at.is_(None))
            .order_by(Project.updated_at.desc())
        )
        return [await self._project_item(row) for row in result.scalars()]

    async def get_project_item(self, organization_id: UUID, project_id: UUID) -> ProjectListItemRead:
        project = await self._get_project(organization_id, project_id)
        return await self._project_item(project)

    async def get_project_detail(self, organization_id: UUID, project_id: UUID) -> ProjectDetailRead:
        project = await self._get_project(organization_id, project_id)
        item = await self._project_item(project)
        forms = await self._related(
            select(DataForm.id, DataForm.name, DataForm.status, DataForm.updated_at)
            .where(DataForm.organization_id == organization_id, DataForm.project_id == project_id, DataForm.deleted_at.is_(None))
            .order_by(DataForm.updated_at.desc()),
            category="form",
        )
        indicators = await self._related(
            select(MonitoringIndicator.id, MonitoringIndicator.name, MonitoringIndicator.is_active, MonitoringIndicator.updated_at)
            .where(MonitoringIndicator.organization_id == organization_id, MonitoringIndicator.project_id == project_id, MonitoringIndicator.deleted_at.is_(None))
            .order_by(MonitoringIndicator.code),
            category="indicator",
        )
        teams = await self._related(
            select(OperationalTeam.id, OperationalTeam.name, OperationalTeam.is_active, OperationalTeam.updated_at)
            .where(OperationalTeam.organization_id == organization_id, OperationalTeam.project_id == project_id, OperationalTeam.deleted_at.is_(None))
            .order_by(OperationalTeam.name),
            category="team",
        )
        assignments = await self._related(
            select(OfficerAssignment.id, OfficerAssignment.region, OfficerAssignment.is_active, OfficerAssignment.updated_at)
            .where(OfficerAssignment.organization_id == organization_id, OfficerAssignment.project_id == project_id, OfficerAssignment.deleted_at.is_(None))
            .order_by(OfficerAssignment.updated_at.desc()),
            category="assignment",
            fallback_label="Field assignment",
        )
        submissions = await self._related(
            select(Submission.id, Submission.client_submission_id, Submission.status, Submission.updated_at)
            .where(Submission.organization_id == organization_id, Submission.project_id == project_id, Submission.deleted_at.is_(None))
            .order_by(Submission.updated_at.desc())
            .limit(25),
            category="submission",
        )
        reports = await self._related(
            select(DonorReport.id, DonorReport.name, DonorReport.status, DonorReport.updated_at)
            .where(DonorReport.organization_id == organization_id, DonorReport.project_id == project_id, DonorReport.deleted_at.is_(None))
            .order_by(DonorReport.updated_at.desc()),
            category="report",
        )
        locations = [
            ProjectRelatedRecordRead(id=project.id, label=project.region or "All assigned areas", category="coverage", status="active", metric="Project coverage scope")
        ]
        audit_trail = await self.audit_trail(organization_id, project_id)
        return ProjectDetailRead(
            **item.model_dump(),
            description=project.description,
            program_type=project.program_type,
            category=project.category,
            implementing_organization=project.implementing_organization,
            settings_json=project.settings_json or {},
            forms=forms,
            indicators=indicators,
            locations=locations,
            teams=teams,
            assignments=assignments,
            submissions=submissions,
            reports=reports,
            audit_trail=audit_trail,
        )

    async def audit_trail(self, organization_id: UUID, project_id: UUID) -> list[ProjectAuditEventRead]:
        result = await self.session.execute(
            select(AuditLog)
            .where(
                AuditLog.organization_id == organization_id,
                AuditLog.resource_id == str(project_id),
            )
            .order_by(AuditLog.created_at.desc())
            .limit(100)
        )
        events: list[ProjectAuditEventRead] = []
        for row in result.scalars():
            metadata = self._metadata(row.metadata_json)
            events.append(
                ProjectAuditEventRead(
                    id=row.id,
                    user=str(row.actor_user_id) if row.actor_user_id else None,
                    action=row.action,
                    resource_type=row.resource_type,
                    old_value=self._optional_str(metadata.get("old_value")),
                    new_value=self._optional_str(metadata.get("new_value")),
                    reason=self._optional_str(metadata.get("reason")),
                    created_at=row.created_at,
                )
            )
        return events

    async def templates(self) -> list[ProjectTemplateRead]:
        return [
            ProjectTemplateRead(id="baseline-survey", name="Baseline Survey Project", template_type="Baseline Survey", description="Project setup for baseline surveys with forms, indicators, field teams, and governance controls.", forms=2, indicators=8, governance_controls=5),
            ProjectTemplateRead(id="monitoring-program", name="Monitoring Program", template_type="Monitoring Program", description="Recurring monitoring setup with field assignments, review workflow, dashboards, and quality rules.", forms=3, indicators=12, governance_controls=6),
            ProjectTemplateRead(id="evaluation-program", name="Evaluation Program", template_type="Evaluation Program", description="Evaluation project structure for midline, endline, comparison reporting, and auditability.", forms=4, indicators=15, governance_controls=7),
            ProjectTemplateRead(id="multi-country-program", name="Multi-Country Program", template_type="Multi-Country Program", description="Cross-country project structure with location hierarchy, teams, approvals, and country reporting.", forms=5, indicators=18, governance_controls=8),
        ]

    async def sector_packs(self) -> list[ProjectSectorPackRead]:
        return [ProjectSectorPackRead.model_validate(pack) for pack in list_sector_packs()]

    async def install_sector_forms(self, organization_id: UUID, actor_user_id: UUID, project_id: UUID) -> ProjectSectorInstallRead:
        project = await self._get_project(organization_id, project_id)
        pack = self._project_sector_pack(project)
        if pack is None:
            return ProjectSectorInstallRead(project_id=project_id, message="Select a sector pack before installing starter forms.")
        survey = await self._sector_survey(organization_id, actor_user_id, project, pack)
        installed = 0
        skipped = 0
        form_definitions = self._sector_form_definitions(pack)
        for form_definition in form_definitions:
            name = str(form_definition.get("name") or form_definition.get("title") or "Sector Starter Form")
            slug = self._starter_slug(project.slug, name)
            existing = await self.session.execute(
                select(DataForm.id).where(
                    DataForm.organization_id == organization_id,
                    DataForm.slug == slug,
                    DataForm.deleted_at.is_(None),
                )
            )
            if existing.scalar_one_or_none() is not None:
                skipped += 1
                continue
            form = DataForm(
                organization_id=organization_id,
                project_id=project.id,
                survey_id=survey.id,
                created_by_user_id=actor_user_id,
                name=name,
                slug=slug,
                description=str(form_definition.get("description") or f"Sector starter form for {pack['name']}. Review questions, mappings, validation, and permissions before publishing."),
                status="draft",
                current_version=1,
                controls_json=self._sector_form_controls(pack, form_definition),
                is_active=True,
            )
            self.session.add(form)
            await self.session.flush()
            self.session.add(
                DataFormVersion(
                    organization_id=organization_id,
                    form_id=form.id,
                    version=1,
                    schema_json=self._sector_form_schema(pack, form_definition),
                    offline_compatible=True,
                    published_at=None,
                )
            )
            installed += 1
        project.settings_json = self._mark_sector_install(project.settings_json, "forms")
        await self.audit.append(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="project.sector_forms_installed",
            resource_type="project",
            resource_id=str(project.id),
            metadata={"sector_id": pack["id"], "installed": installed, "skipped": skipped},
        )
        await self.session.commit()
        return ProjectSectorInstallRead(
            project_id=project.id,
            sector_id=str(pack["id"]),
            installed_forms=installed,
            skipped_forms=skipped,
            message=f"{installed} starter form(s) installed for {pack['name']}. {skipped} already existed.",
        )

    async def _sector_survey(
        self,
        organization_id: UUID,
        actor_user_id: UUID,
        project: Project,
        pack: dict[str, Any],
    ) -> Survey:
        code = self._starter_slug(project.slug, f"{pack['id']}-starter-instruments")[:120]
        existing = await self.session.execute(
            select(Survey).where(
                Survey.organization_id == organization_id,
                Survey.project_id == project.id,
                Survey.code == code,
                Survey.deleted_at.is_(None),
            )
        )
        survey = existing.scalar_one_or_none()
        if survey is not None:
            return survey
        survey = Survey(
            organization_id=organization_id,
            project_id=project.id,
            created_by_user_id=actor_user_id,
            owner_user_id=actor_user_id,
            manager_user_id=actor_user_id,
            title=f"{pack['name']} Starter Instruments",
            code=code,
            description="Project-level survey container for sector starter forms. Review, edit, approve, and publish each form before field rollout.",
            survey_type="sector_starter_pack",
            status="draft",
            start_date=project.start_date.date() if project.start_date else None,
            end_date=project.end_date.date() if project.end_date else None,
            geographic_scope=project.region or project.country,
            target_population=str(((pack.get("recommended_settings") or {}).get("beneficiary") or {}).get("primaryEntityType") or "Beneficiaries") if isinstance(pack.get("recommended_settings"), dict) else "Beneficiaries",
            governance_json={
                "source": "sector_pack",
                "sector_id": pack.get("id"),
                "sector_name": pack.get("name"),
                "approvedDataOnly": True,
            },
            is_active=True,
        )
        self.session.add(survey)
        await self.session.flush()
        return survey

    async def install_sector_indicators(self, organization_id: UUID, actor_user_id: UUID, project_id: UUID) -> ProjectSectorInstallRead:
        project = await self._get_project(organization_id, project_id)
        pack = self._project_sector_pack(project)
        if pack is None:
            return ProjectSectorInstallRead(project_id=project_id, message="Select a sector pack before installing indicator templates.")
        installed = 0
        skipped = 0
        for index, indicator_definition in enumerate(self._sector_indicator_definitions(pack), start=1):
            name = str(indicator_definition.get("name") or f"Sector indicator {index}")
            code = self._indicator_code(pack["id"], project.slug, name, index)
            existing = await self.session.execute(
                select(MonitoringIndicator.id).where(
                    MonitoringIndicator.organization_id == organization_id,
                    MonitoringIndicator.code == code,
                    MonitoringIndicator.deleted_at.is_(None),
                )
            )
            if existing.scalar_one_or_none() is not None:
                skipped += 1
                continue
            self.session.add(
                MonitoringIndicator(
                    organization_id=organization_id,
                    project_id=project.id,
                    survey_id=None,
                    code=code,
                    name=name,
                    description=str(indicator_definition.get("definition") or f"Sector indicator template from {pack['name']}. Set baseline, target, formula, and disaggregation before reporting."),
                    unit=str(indicator_definition.get("unit") or "count"),
                    reporting_frequency=str(indicator_definition.get("frequency") or "monthly"),
                    baseline_value=0,
                    target_value=0,
                    current_value=0,
                    formula=json.dumps(
                        {
                            "dataSource": indicator_definition.get("data_source"),
                            "disaggregation": indicator_definition.get("disaggregation", []),
                            "approvalRule": indicator_definition.get("approval_rule"),
                        },
                        ensure_ascii=False,
                    ),
                    is_active=True,
                )
            )
            installed += 1
        project.settings_json = self._mark_sector_install(project.settings_json, "indicators")
        await self.audit.append(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="project.sector_indicators_installed",
            resource_type="project",
            resource_id=str(project.id),
            metadata={"sector_id": pack["id"], "installed": installed, "skipped": skipped},
        )
        await self.session.commit()
        return ProjectSectorInstallRead(
            project_id=project.id,
            sector_id=str(pack["id"]),
            installed_indicators=installed,
            skipped_indicators=skipped,
            message=f"{installed} indicator template(s) installed for {pack['name']}. {skipped} already existed.",
        )

    async def install_sector_reports(self, organization_id: UUID, actor_user_id: UUID, project_id: UUID) -> ProjectSectorInstallRead:
        project = await self._get_project(organization_id, project_id)
        pack = self._project_sector_pack(project)
        if pack is None:
            return ProjectSectorInstallRead(project_id=project_id, message="Select a sector pack before installing report templates.")
        installed = 0
        skipped = 0
        for report_definition in self._sector_report_definitions(pack):
            name = str(report_definition.get("name") or "Sector report")
            existing = await self.session.execute(
                select(DonorReport.id).where(
                    DonorReport.organization_id == organization_id,
                    DonorReport.project_id == project.id,
                    DonorReport.name == name,
                    DonorReport.deleted_at.is_(None),
                )
            )
            if existing.scalar_one_or_none() is not None:
                skipped += 1
                continue
            self.session.add(
                DonorReport(
                    organization_id=organization_id,
                    project_id=project.id,
                    survey_id=None,
                    name=name,
                    donor=project.donor,
                    report_type="sector",
                    status="draft",
                    summary=str(report_definition.get("description") or f"Draft sector report package from {pack['name']}. Connect approved indicators, maps, data quality notes, and narrative before issuing."),
                    export_formats=list(report_definition.get("outputs", ["pdf", "xlsx"])) if isinstance(report_definition.get("outputs"), list) else ["pdf", "xlsx"],
                )
            )
            installed += 1
        project.settings_json = self._mark_sector_install(project.settings_json, "reports")
        await self.audit.append(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="project.sector_reports_installed",
            resource_type="project",
            resource_id=str(project.id),
            metadata={"sector_id": pack["id"], "installed": installed, "skipped": skipped},
        )
        await self.session.commit()
        return ProjectSectorInstallRead(
            project_id=project.id,
            sector_id=str(pack["id"]),
            installed_reports=installed,
            skipped_reports=skipped,
            message=f"{installed} report template(s) installed for {pack['name']}. {skipped} already existed.",
        )

    async def _get_project(self, organization_id: UUID, project_id: UUID) -> Project:
        result = await self.session.execute(
            select(Project).where(Project.organization_id == organization_id, Project.id == project_id, Project.deleted_at.is_(None))
        )
        project = result.scalar_one_or_none()
        if project is None:
            raise ProjectNotFoundError("Project not found")
        return project

    @staticmethod
    def _slug(value: str) -> str:
        text = re.sub(r"[^a-z0-9-]+", "-", value.strip().lower())
        return text.strip("-") or "item"

    def _starter_slug(self, project_slug: str, name: str) -> str:
        return f"{self._slug(project_slug)}-{self._slug(name)}"

    def _indicator_code(self, sector_id: object, project_slug: str, name: str, index: int) -> str:
        sector_prefix = re.sub(r"[^A-Z0-9]+", "", str(sector_id).upper())[:4] or "SEC"
        project_prefix = re.sub(r"[^A-Z0-9]+", "", project_slug.upper())[:8] or "PROJECT"
        name_prefix = re.sub(r"[^A-Z0-9]+", "_", name.upper()).strip("_")[:24] or f"IND{index}"
        return f"{project_prefix}.{sector_prefix}.{name_prefix}"

    def _project_sector_pack(self, project: Project) -> dict[str, Any] | None:
        sector_id, _ = sector_summary(project.settings_json)
        pack = get_sector_pack(sector_id)
        sector_settings = (
            project.settings_json.get("sector")
            if isinstance(project.settings_json, dict)
            else None
        )
        if not isinstance(sector_settings, dict):
            return pack
        if pack is None:
            pack = {
                "id": sector_settings.get("id") or "custom",
                "name": sector_settings.get("name") or "Custom Sector",
                "sector": sector_settings.get("sector") or "Custom",
                "description": "Custom organization sector pack.",
                "terminology": {},
                "entity_types": [],
                "form_templates": [],
                "indicator_templates": [],
                "dashboard_widgets": [],
                "report_templates": [],
                "validation_rules": [],
                "data_quality_rules": [],
                "workflows": [],
                "mobile_guidance": [],
                "governance_defaults": {},
                "recommended_settings": project.settings_json,
            }
        mapping = {
            "dashboardWidgets": "dashboard_widgets",
            "dataQualityRules": "data_quality_rules",
            "entityTypes": "entity_types",
            "formDefinitions": "form_definitions",
            "formTemplates": "form_templates",
            "indicatorDefinitions": "indicator_definitions",
            "indicatorTemplates": "indicator_templates",
            "mobileGuidance": "mobile_guidance",
            "reportDefinitions": "report_definitions",
            "reportTemplates": "report_templates",
            "validationRules": "validation_rules",
            "workflows": "workflows",
        }
        for source_key, target_key in mapping.items():
            value = sector_settings.get(source_key)
            if isinstance(value, list):
                pack[target_key] = value
        terminology = sector_settings.get("terminology")
        if isinstance(terminology, dict):
            pack["terminology"] = terminology
        for key in ("id", "name", "sector"):
            if sector_settings.get(key):
                pack[key] = sector_settings[key]
        return pack

    def _sector_form_schema(self, pack: dict[str, Any], form_definition: dict[str, Any]) -> dict[str, Any]:
        form_name = str(form_definition.get("name") or "Sector Starter Form")
        fields = list(form_definition.get("questions", [])) if isinstance(form_definition.get("questions"), list) else []
        sections = list(form_definition.get("sections", [])) if isinstance(form_definition.get("sections"), list) else []
        if not fields:
            fields = self._fallback_sector_questions(pack, form_name)
        schema_sections = sections or [
            {
                "id": "section-identification",
                "title": "Identification and consent",
                "description": "Confirm consent, entity identity, and collection location.",
                "question_ids": [str(field.get("id")) for field in fields if isinstance(field, dict) and field.get("id")],
            }
        ]
        return {
            "title": form_name,
            "description": str(form_definition.get("description") or f"Starter {form_name} instrument for {pack['name']}."),
            "version": 1,
            "language": "English",
            "sector": {"id": pack["id"], "name": pack["name"]},
            "formType": form_definition.get("form_type"),
            "entityType": form_definition.get("entity_type"),
            "indicatorMappings": form_definition.get("indicator_mappings", []),
            "profileMappings": form_definition.get("profile_mappings", {}),
            "sections": [
                {
                    **section,
                    "fields": [
                        field
                        for field in fields
                        if isinstance(field, dict)
                        and str(field.get("id")) in set(section.get("question_ids", []))
                    ],
                }
                for section in schema_sections
            ],
        }

    def _sector_form_controls(self, pack: dict[str, Any], form_definition: dict[str, Any]) -> dict[str, Any]:
        form_name = str(form_definition.get("name") or "Sector Starter Form")
        recommended = _as_dict(pack.get("recommended_settings"))
        beneficiary = _as_dict(recommended.get("beneficiary"))
        creates_entity = bool(form_definition.get("creates_entity"))
        updates_entity = bool(form_definition.get("updates_entity"))
        requires_existing_entity = bool(form_definition.get("requires_existing_entity"))
        respondent_identity_mode = (
            "existing_or_new"
            if creates_entity and updates_entity
            else "new_registration"
            if creates_entity
            else "existing_beneficiary"
            if requires_existing_entity
            else "existing_or_new"
            if updates_entity
            else "anonymous_allowed"
        )
        search_required = respondent_identity_mode == "existing_beneficiary"
        questions = [
            question
            for question in _as_list(form_definition.get("questions"))
            if isinstance(question, dict)
        ]
        question_ids_by_variable = {
            str(question.get("variableName") or question.get("code") or question.get("id")).strip().lower(): str(question.get("id"))
            for question in questions
            if str(question.get("id") or "").strip()
        }
        prefill_source_fields = {
            "entity_name": "name",
            "phone_number": "phone",
            "gps_location": "gps",
            "location_name": "village",
        }
        prefill_mappings = [
            {
                "sourceEntityField": source_field,
                "targetQuestionId": question_ids_by_variable[variable_name],
                "lockBehavior": "ReadOnly"
                if beneficiary.get("profileUpdateRule", "Require review for sensitive changes") == "Require review for sensitive changes"
                else "EditableWithReason",
            }
            for variable_name, source_field in prefill_source_fields.items()
            if variable_name in question_ids_by_variable
        ]
        return {
            "entity_controls": {
                "linked_to_entity": True,
                "entity_type": form_definition.get("entity_type") or beneficiary.get("primaryEntityType", "Beneficiary"),
                "creates_new_entity": creates_entity or respondent_identity_mode == "existing_or_new",
                "updates_existing_entity": updates_entity,
                "requires_existing_entity": requires_existing_entity,
                "allows_anonymous": False,
                "submission_frequency": form_definition.get("submission_frequency") or ("once_per_project" if "Baseline" in form_name or "Registration" in form_name else "monthly"),
                "matching_fields": beneficiary.get("duplicateFields", ["Phone", "Name + Village", "GPS"]),
                "duplicate_action": "review",
                "prefill_profile": respondent_identity_mode in {"existing_beneficiary", "existing_or_new"},
                "prefill_mappings": prefill_mappings,
                "profile_update_mode": beneficiary.get("profileUpdateRule", "Require review for sensitive changes"),
            },
            "governance": pack.get("governance_defaults", {}),
            "validation": form_definition.get("validation_rules", pack.get("validation_rules", [])),
            "data_quality": form_definition.get("data_quality_rules", pack.get("data_quality_rules", [])),
            "beneficiary_mapping": form_definition.get("profile_mappings", {}),
            "indicator_mapping": form_definition.get("indicator_mappings", []),
            "instrument": {
                "respondent_identity": {
                    "allow_anonymous": respondent_identity_mode == "anonymous_allowed",
                    "allow_new_registration": respondent_identity_mode in {"new_registration", "existing_or_new"},
                    "beneficiary_search_required": search_required,
                    "mode": respondent_identity_mode,
                },
                "sector_pack": {
                    "id": pack["id"],
                    "name": pack["name"],
                    "form_template": form_name,
                    "validation_rules": pack.get("validation_rules", []),
                    "data_quality_rules": pack.get("data_quality_rules", []),
                    "mobile_guidance": pack.get("mobile_guidance", []),
                }
            },
        }

    def _sector_form_definitions(self, pack: dict[str, Any]) -> list[dict[str, Any]]:
        template_names = [str(name) for name in pack.get("form_templates", [])]
        definitions = pack.get("form_definitions")
        if isinstance(definitions, list) and definitions:
            valid_definitions = [definition for definition in definitions if isinstance(definition, dict)]
            definition_names = [str(definition.get("name") or "") for definition in valid_definitions]
            if template_names and definition_names == template_names:
                return valid_definitions
            if not template_names:
                return valid_definitions
        return [{"name": name} for name in template_names]

    def _sector_indicator_definitions(self, pack: dict[str, Any]) -> list[dict[str, Any]]:
        template_names = [str(name) for name in pack.get("indicator_templates", [])]
        definitions = pack.get("indicator_definitions")
        if isinstance(definitions, list) and definitions:
            valid_definitions = [definition for definition in definitions if isinstance(definition, dict)]
            definition_names = [str(definition.get("name") or "") for definition in valid_definitions]
            if template_names and definition_names == template_names:
                return valid_definitions
            if not template_names:
                return valid_definitions
        return [{"name": name} for name in template_names]

    def _sector_report_definitions(self, pack: dict[str, Any]) -> list[dict[str, Any]]:
        template_names = [str(name) for name in pack.get("report_templates", [])]
        definitions = pack.get("report_definitions")
        if isinstance(definitions, list) and definitions:
            valid_definitions = [definition for definition in definitions if isinstance(definition, dict)]
            definition_names = [str(definition.get("name") or "") for definition in valid_definitions]
            if template_names and definition_names == template_names:
                return valid_definitions
            if not template_names:
                return valid_definitions
        return [{"name": name} for name in template_names]

    def _fallback_sector_questions(self, pack: dict[str, Any], form_name: str) -> list[dict[str, Any]]:
        entity_type = str(((pack.get("recommended_settings") or {}).get("beneficiary") or {}).get("primaryEntityType") or "Beneficiary") if isinstance(pack.get("recommended_settings"), dict) else "Beneficiary"
        return [
            {"id": "consent", "label": "Consent captured", "type": "consent", "required": True, "variableName": "consent_captured", "helpText": "Confirm informed consent before collecting data."},
            {"id": "entity_name", "label": f"{entity_type} name", "type": "short_text", "required": True, "variableName": "entity_name", "helpText": f"Official {entity_type.lower()} name or identifier."},
            {"id": "location", "label": "Village or location", "type": "short_text", "required": True, "variableName": "location_name", "helpText": "Use the project location naming convention."},
            {"id": "gps", "label": "GPS location", "type": "gps", "required": True, "variableName": "gps_location", "helpText": "Capture location evidence where field policy requires it."},
            {"id": "notes", "label": "Field notes", "type": "long_text", "required": False, "variableName": "field_notes", "helpText": "Add relevant observations for the supervisor or reviewer."},
        ]

    @staticmethod
    def _mark_sector_install(settings: dict[str, Any] | None, key: str) -> dict[str, Any]:
        next_settings = dict(settings or {})
        sector = next_settings.get("sector")
        if not isinstance(sector, dict):
            sector = {}
        installed = sector.get("installed")
        if not isinstance(installed, dict):
            installed = {}
        installed[key] = {"installed": True, "installedAt": datetime.now(UTC).isoformat()}
        sector["installed"] = installed
        next_settings["sector"] = sector
        return next_settings

    async def _project_item(self, project: Project) -> ProjectListItemRead:
        forms = await self._count(DataForm, project.organization_id, project_id=project.id, is_active=True)
        assignments = await self._count(OfficerAssignment, project.organization_id, project_id=project.id, is_active=True)
        submissions = await self._count(Submission, project.organization_id, project_id=project.id)
        indicators = await self._count(MonitoringIndicator, project.organization_id, project_id=project.id)
        beneficiaries = await self._count(Beneficiary, project.organization_id, project_id=project.id)
        quality_issues = await self._count(DataQualitySignal, project.organization_id, status="open")
        progress = self._progress(forms=forms, assignments=assignments, submissions=submissions, indicators=indicators)
        health_score = self._health_score(progress=progress, quality_issues=quality_issues, submissions=submissions, assignments=assignments, indicators=indicators)
        sector_id, sector_name = sector_summary(project.settings_json)
        return ProjectListItemRead(
            id=project.id,
            name=project.name,
            project_code=project.slug,
            sector_id=sector_id,
            sector_name=sector_name,
            status=project.status or ("active" if project.is_active else "closed"),
            donor=project.donor,
            country=project.country,
            region=project.region,
            owner=project.owner,
            start_date=project.start_date,
            end_date=project.end_date,
            active_forms=forms,
            active_assignments=assignments,
            total_submissions=submissions,
            indicator_count=indicators,
            beneficiary_count=beneficiaries,
            progress_percent=progress,
            health_score=health_score,
            health_status=self._health_status(health_score),
            created_at=project.created_at,
            updated_at=project.updated_at,
        )

    async def _count(self, model: type[object], organization_id: UUID, **filters: object) -> int:
        conditions = [getattr(model, "organization_id") == organization_id]
        if hasattr(model, "deleted_at"):
            conditions.append(getattr(model, "deleted_at").is_(None))
        for key, value in filters.items():
            conditions.append(getattr(model, key) == value)
        result = await self.session.execute(select(func.count()).select_from(model).where(*conditions))
        return int(result.scalar_one())

    async def _related(self, query: Select[Any], *, category: str, fallback_label: str | None = None) -> list[ProjectRelatedRecordRead]:
        result = await self.session.execute(query)
        records: list[ProjectRelatedRecordRead] = []
        for row in result.all():
            record_id, label, status, updated_at = row
            if isinstance(status, bool):
                status_value = "active" if status else "inactive"
            else:
                status_value = str(status or "active")
            records.append(
                ProjectRelatedRecordRead(
                    id=record_id,
                    label=str(label or fallback_label or category.title()),
                    status=status_value,
                    category=category,
                    updated_at=updated_at,
                )
            )
        return records

    @staticmethod
    def _progress(*, forms: int, assignments: int, submissions: int, indicators: int) -> float:
        readiness = sum([forms > 0, assignments > 0, submissions > 0, indicators > 0])
        return round((readiness / 4) * 100, 1)

    @staticmethod
    def _health_score(*, progress: float, quality_issues: int, submissions: int, assignments: int, indicators: int) -> float:
        score = progress
        if submissions and quality_issues:
            score -= min(quality_issues * 2, 20)
        if not assignments:
            score -= 10
        if not indicators:
            score -= 10
        return round(max(min(score, 100), 0), 1)

    @staticmethod
    def _health_status(score: float) -> str:
        if score >= 85:
            return "Excellent"
        if score >= 70:
            return "Good"
        if score >= 45:
            return "Needs Attention"
        return "Critical"

    @staticmethod
    def _metadata(value: str) -> dict[str, Any]:
        try:
            parsed = json.loads(value or "{}")
        except json.JSONDecodeError:
            return {}
        return parsed if isinstance(parsed, dict) else {}

    @staticmethod
    def _optional_str(value: object) -> str | None:
        return None if value is None else str(value)
