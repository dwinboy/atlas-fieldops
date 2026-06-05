import json
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog
from app.models.collection import DataForm, FieldOfficerProfile, OfficerAssignment, Project, Submission
from app.models.operations import Beneficiary, DataQualitySignal, DonorReport, MonitoringIndicator, OperationalTeam
from app.repositories.audit import AuditRepository
from app.schemas.projects import (
    ProjectAuditEventRead,
    ProjectCreate,
    ProjectDetailRead,
    ProjectListItemRead,
    ProjectRelatedRecordRead,
    ProjectSummaryRead,
    ProjectTemplateRead,
)


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
        project = Project(
            organization_id=organization_id,
            name=payload.name,
            slug=payload.project_code,
            region=payload.region or payload.country,
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
            },
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
            description=None,
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

    async def _get_project(self, organization_id: UUID, project_id: UUID) -> Project:
        result = await self.session.execute(
            select(Project).where(Project.organization_id == organization_id, Project.id == project_id, Project.deleted_at.is_(None))
        )
        project = result.scalar_one_or_none()
        if project is None:
            raise ProjectNotFoundError("Project not found")
        return project

    async def _project_item(self, project: Project) -> ProjectListItemRead:
        forms = await self._count(DataForm, project.organization_id, project_id=project.id, is_active=True)
        assignments = await self._count(OfficerAssignment, project.organization_id, project_id=project.id, is_active=True)
        submissions = await self._count(Submission, project.organization_id, project_id=project.id)
        indicators = await self._count(MonitoringIndicator, project.organization_id, project_id=project.id)
        beneficiaries = await self._count(Beneficiary, project.organization_id, project_id=project.id)
        quality_issues = await self._count(DataQualitySignal, project.organization_id, status="open")
        progress = self._progress(forms=forms, assignments=assignments, submissions=submissions, indicators=indicators)
        health_score = self._health_score(progress=progress, quality_issues=quality_issues, submissions=submissions, assignments=assignments, indicators=indicators)
        return ProjectListItemRead(
            id=project.id,
            name=project.name,
            project_code=project.slug,
            status="active" if project.is_active else "closed",
            region=project.region,
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

    async def _related(self, query, *, category: str, fallback_label: str | None = None) -> list[ProjectRelatedRecordRead]:
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
    def _metadata(value: str) -> dict[str, object]:
        try:
            parsed = json.loads(value or "{}")
        except json.JSONDecodeError:
            return {}
        return parsed if isinstance(parsed, dict) else {}

    @staticmethod
    def _optional_str(value: object) -> str | None:
        return None if value is None else str(value)
