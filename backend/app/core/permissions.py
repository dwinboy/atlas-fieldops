from dataclasses import dataclass, field
from enum import StrEnum


class Permission(StrEnum):
    ORGANIZATION_READ = "organization.read"
    ORGANIZATION_MANAGE = "organization.manage"
    ORGANIZATION_HIERARCHY_MANAGE = "organization.hierarchy.manage"
    USER_READ = "users.view"
    USER_MANAGE = "users.manage"
    USER_CREATE = "users.create"
    USER_EDIT = "users.edit"
    USER_DELETE = "users.delete"
    ROLE_READ = "roles.view"
    ROLE_MANAGE = "roles.manage"
    AUDIT_READ = "audit.view"
    FORM_READ = "forms.view"
    FORM_CREATE = "forms.create"
    FORM_EDIT = "forms.edit"
    FORM_PUBLISH = "forms.publish"
    FORM_MANAGE = "forms.edit"
    FORM_DELETE = "forms.delete"
    OFFICER_READ = "officers.view"
    OFFICER_MANAGE = "officers.manage"
    SUBMISSION_READ = "submissions.view"
    SUBMISSION_CREATE = "submissions.create"
    SUBMISSION_EDIT = "submissions.edit"
    SUBMISSION_APPROVE = "submissions.approve"
    SUBMISSION_REJECT = "submissions.reject"
    SUBMISSION_REVIEW = "submissions.review"
    SYNC_MOBILE = "sync.mobile"
    BENEFICIARY_READ = "beneficiaries.view"
    BENEFICIARY_CREATE = "beneficiaries.create"
    BENEFICIARY_EDIT = "beneficiaries.edit"
    BENEFICIARY_MANAGE = "beneficiaries.manage"
    PROGRAM_READ = "projects.view"
    PROGRAM_CREATE = "projects.create"
    PROGRAM_EDIT = "projects.edit"
    PROGRAM_ARCHIVE = "projects.archive"
    PROGRAM_MANAGE = "projects.manage"
    SURVEY_READ = "surveys.view"
    SURVEY_CREATE = "surveys.create"
    SURVEY_MANAGE = "surveys.manage"
    SURVEY_ASSIGN_ENUMERATORS = "surveys.assign_enumerators"
    SURVEY_REVIEW_DATA = "surveys.review_data"
    SURVEY_APPROVE_DATA = "surveys.approve_data"
    INDICATOR_READ = "indicators.view"
    INDICATOR_MANAGE = "indicators.manage"
    CASE_READ = "cases.view"
    CASE_MANAGE = "cases.manage"
    REPORT_READ = "reports.view"
    REPORT_GENERATE = "reports.generate"
    REPORT_EXPORT = "reports.export"
    REPORT_MANAGE = "reports.manage"
    ANALYTICS_VIEW = "analytics.view"
    ANALYTICS_EXPORT = "analytics.export"
    DATA_IMPORT = "data.import"
    DATA_EXPORT = "data.export"
    DATA_BULK_EDIT = "data.bulk_edit"
    BUDGET_MANAGE = "budgets.manage"
    GPS_VIEW = "gps.view"
    WORKFLOW_MANAGE = "workflows.manage"
    WORKFLOW_APPROVE_DISTRICT = "workflows.approve.district"
    WORKFLOW_APPROVE_REGIONAL = "workflows.approve.regional"
    WORKFLOW_APPROVE_NATIONAL = "workflows.approve.national"


PERMISSION_ALIASES: dict[str, Permission] = {
    "organization:read": Permission.ORGANIZATION_READ,
    "organization:manage": Permission.ORGANIZATION_MANAGE,
    "user:read": Permission.USER_READ,
    "user:manage": Permission.USER_MANAGE,
    "role:read": Permission.ROLE_READ,
    "role:manage": Permission.ROLE_MANAGE,
    "audit:read": Permission.AUDIT_READ,
    "form:read": Permission.FORM_READ,
    "form:manage": Permission.FORM_EDIT,
    "officer:read": Permission.OFFICER_READ,
    "officer:manage": Permission.OFFICER_MANAGE,
    "submission:read": Permission.SUBMISSION_READ,
    "submission:create": Permission.SUBMISSION_CREATE,
    "submission:review": Permission.SUBMISSION_REVIEW,
    "sync:mobile": Permission.SYNC_MOBILE,
    "beneficiary:read": Permission.BENEFICIARY_READ,
    "beneficiary:manage": Permission.BENEFICIARY_MANAGE,
    "program:read": Permission.PROGRAM_READ,
    "program:manage": Permission.PROGRAM_MANAGE,
    "survey:read": Permission.SURVEY_READ,
    "survey:create": Permission.SURVEY_CREATE,
    "survey:manage": Permission.SURVEY_MANAGE,
    "survey:assign_enumerators": Permission.SURVEY_ASSIGN_ENUMERATORS,
    "survey:review_data": Permission.SURVEY_REVIEW_DATA,
    "survey:approve_data": Permission.SURVEY_APPROVE_DATA,
    "indicator:read": Permission.INDICATOR_READ,
    "indicator:manage": Permission.INDICATOR_MANAGE,
    "case:read": Permission.CASE_READ,
    "case:manage": Permission.CASE_MANAGE,
    "report:read": Permission.REPORT_READ,
    "report:manage": Permission.REPORT_MANAGE,
    "data:import": Permission.DATA_IMPORT,
    "data:export": Permission.DATA_EXPORT,
    "data:bulk_edit": Permission.DATA_BULK_EDIT,
}


class ScopeType(StrEnum):
    GLOBAL = "global"
    ORGANIZATION = "organization"
    COUNTRY = "country"
    REGION = "region"
    DISTRICT = "district"
    FIELD_TEAM = "field_team"
    PROJECT = "project"
    OWN = "own"


class WorkflowAction(StrEnum):
    SUBMIT = "submit"
    REVIEW = "review"
    APPROVE_DISTRICT = "approve_district"
    APPROVE_REGIONAL = "approve_regional"
    VERIFY_NATIONAL = "verify_national"
    REQUEST_CORRECTION = "request_correction"
    EXPORT = "export"


@dataclass(frozen=True)
class AccessScope:
    scope_type: ScopeType
    geography_ids: frozenset[str] = field(default_factory=frozenset)
    project_ids: frozenset[str] = field(default_factory=frozenset)
    organization_unit_ids: frozenset[str] = field(default_factory=frozenset)


@dataclass(frozen=True)
class RoleDefinition:
    name: str
    label: str
    description: str
    scope_type: ScopeType
    permissions: frozenset[Permission]
    workflow_actions: frozenset[WorkflowAction]
    menu_views: frozenset[str]


def _p(*permissions: Permission) -> frozenset[Permission]:
    return frozenset(permissions)


def _w(*actions: WorkflowAction) -> frozenset[WorkflowAction]:
    return frozenset(actions)


FULL_PLATFORM_PERMISSIONS = frozenset(Permission)

READ_ONLY_PERMISSIONS = _p(
    Permission.ORGANIZATION_READ,
    Permission.PROGRAM_READ,
    Permission.SURVEY_READ,
    Permission.BENEFICIARY_READ,
    Permission.INDICATOR_READ,
    Permission.SUBMISSION_READ,
    Permission.FORM_READ,
    Permission.REPORT_READ,
    Permission.ANALYTICS_VIEW,
    Permission.GPS_VIEW,
)

OPERATIONS_MENU = frozenset(
    {
        "dashboard",
        "ecosystem",
        "enterprise",
        "governance",
        "workforce",
        "data",
        "programs",
        "surveys",
        "beneficiaries",
        "indicators",
        "submissions",
        "templates",
        "forms",
        "officers",
        "cases",
        "map",
        "organizations",
        "analytics",
        "workflows",
        "connectivity",
    }
)


ROLE_DEFINITIONS: dict[str, RoleDefinition] = {
    "super_admin": RoleDefinition(
        "super_admin",
        "Super Admin",
        "Platform-wide governance across tenants.",
        ScopeType.GLOBAL,
        FULL_PLATFORM_PERMISSIONS,
        frozenset(WorkflowAction),
        OPERATIONS_MENU,
    ),
    "owner": RoleDefinition(
        "owner",
        "Organization Owner",
        "Owns tenant configuration, users, roles, workflows, and data.",
        ScopeType.ORGANIZATION,
        FULL_PLATFORM_PERMISSIONS,
        frozenset(WorkflowAction),
        OPERATIONS_MENU,
    ),
    "organization_owner": RoleDefinition(
        "organization_owner",
        "Organization Owner",
        "Owns tenant configuration, users, roles, workflows, and data.",
        ScopeType.ORGANIZATION,
        FULL_PLATFORM_PERMISSIONS,
        frozenset(WorkflowAction),
        OPERATIONS_MENU,
    ),
    "system_admin": RoleDefinition(
        "system_admin",
        "System Admin",
        "Manages organization settings, users, roles, integrations, imports, and operational configuration.",
        ScopeType.ORGANIZATION,
        FULL_PLATFORM_PERMISSIONS - _p(Permission.USER_DELETE),
        frozenset(WorkflowAction),
        OPERATIONS_MENU,
    ),
    "national_admin": RoleDefinition(
        "national_admin",
        "National Admin",
        "Manages country-level operations, verification, reporting, and escalation.",
        ScopeType.COUNTRY,
        FULL_PLATFORM_PERMISSIONS - _p(Permission.ROLE_MANAGE, Permission.USER_DELETE),
        _w(WorkflowAction.REVIEW, WorkflowAction.APPROVE_REGIONAL, WorkflowAction.VERIFY_NATIONAL, WorkflowAction.EXPORT),
        OPERATIONS_MENU - {"organizations"},
    ),
    "regional_manager": RoleDefinition(
        "regional_manager",
        "Regional Manager",
        "Runs regional teams, approval queues, analytics, and project coverage.",
        ScopeType.REGION,
        _p(
            Permission.ORGANIZATION_READ,
            Permission.USER_READ,
            Permission.USER_CREATE,
            Permission.ROLE_READ,
            Permission.OFFICER_READ,
            Permission.SUBMISSION_READ,
            Permission.SUBMISSION_REVIEW,
            Permission.SUBMISSION_APPROVE,
            Permission.SUBMISSION_REJECT,
            Permission.BENEFICIARY_READ,
            Permission.BENEFICIARY_EDIT,
            Permission.PROGRAM_READ,
            Permission.SURVEY_READ,
            Permission.SURVEY_MANAGE,
            Permission.SURVEY_ASSIGN_ENUMERATORS,
            Permission.SURVEY_REVIEW_DATA,
            Permission.SURVEY_APPROVE_DATA,
            Permission.INDICATOR_READ,
            Permission.CASE_READ,
            Permission.CASE_MANAGE,
            Permission.FORM_READ,
            Permission.REPORT_READ,
            Permission.ANALYTICS_VIEW,
            Permission.ANALYTICS_EXPORT,
            Permission.DATA_EXPORT,
            Permission.GPS_VIEW,
            Permission.WORKFLOW_APPROVE_REGIONAL,
        ),
        _w(WorkflowAction.REVIEW, WorkflowAction.APPROVE_REGIONAL, WorkflowAction.REQUEST_CORRECTION, WorkflowAction.EXPORT),
        OPERATIONS_MENU - {"enterprise"},
    ),
    "district_supervisor": RoleDefinition(
        "district_supervisor",
        "District Supervisor",
        "Reviews field officer work and handles district correction cycles.",
        ScopeType.DISTRICT,
        _p(
            Permission.ORGANIZATION_READ,
            Permission.USER_READ,
            Permission.USER_CREATE,
            Permission.ROLE_READ,
            Permission.OFFICER_READ,
            Permission.SUBMISSION_READ,
            Permission.SUBMISSION_REVIEW,
            Permission.SUBMISSION_APPROVE,
            Permission.SUBMISSION_REJECT,
            Permission.BENEFICIARY_READ,
            Permission.BENEFICIARY_EDIT,
            Permission.PROGRAM_READ,
            Permission.SURVEY_READ,
            Permission.SURVEY_REVIEW_DATA,
            Permission.SURVEY_APPROVE_DATA,
            Permission.CASE_READ,
            Permission.CASE_MANAGE,
            Permission.FORM_READ,
            Permission.REPORT_READ,
            Permission.ANALYTICS_VIEW,
            Permission.GPS_VIEW,
            Permission.WORKFLOW_APPROVE_DISTRICT,
        ),
        _w(WorkflowAction.REVIEW, WorkflowAction.APPROVE_DISTRICT, WorkflowAction.REQUEST_CORRECTION),
        frozenset({"dashboard", "programs", "beneficiaries", "submissions", "officers", "cases", "map", "analytics", "organizations", "connectivity"}),
    ),
    "field_officer": RoleDefinition(
        "field_officer",
        "Field Officer / Enumerator",
        "Collects assigned forms, syncs offline submissions, and fixes corrections.",
        ScopeType.OWN,
        _p(
            Permission.ORGANIZATION_READ,
            Permission.OFFICER_READ,
            Permission.PROGRAM_READ,
            Permission.SURVEY_READ,
            Permission.FORM_READ,
            Permission.SURVEY_REVIEW_DATA,
            Permission.SUBMISSION_CREATE,
            Permission.SUBMISSION_EDIT,
            Permission.BENEFICIARY_READ,
            Permission.CASE_READ,
            Permission.SYNC_MOBILE,
            Permission.GPS_VIEW,
        ),
        _w(WorkflowAction.SUBMIT),
        frozenset({"dashboard", "surveys", "forms", "beneficiaries", "cases", "connectivity"}),
    ),
    "data_analyst": RoleDefinition(
        "data_analyst",
        "Data Analyst",
        "Analyzes approved operational data and manages imports/exports.",
        ScopeType.PROJECT,
        READ_ONLY_PERMISSIONS | _p(Permission.DATA_IMPORT, Permission.DATA_EXPORT, Permission.DATA_BULK_EDIT, Permission.ANALYTICS_EXPORT, Permission.REPORT_EXPORT),
        _w(WorkflowAction.EXPORT),
        frozenset({"dashboard", "data", "surveys", "beneficiaries", "indicators", "map", "analytics", "connectivity"}),
    ),
    "data_manager": RoleDefinition(
        "data_manager",
        "Data Manager",
        "Manages data quality, imports, exports, reconciliation, review queues, and approved datasets.",
        ScopeType.PROJECT,
        READ_ONLY_PERMISSIONS
        | _p(
            Permission.USER_READ,
            Permission.ROLE_READ,
            Permission.OFFICER_READ,
            Permission.SUBMISSION_REVIEW,
            Permission.SUBMISSION_APPROVE,
            Permission.SUBMISSION_REJECT,
            Permission.SURVEY_REVIEW_DATA,
            Permission.SURVEY_APPROVE_DATA,
            Permission.BENEFICIARY_EDIT,
            Permission.DATA_IMPORT,
            Permission.DATA_EXPORT,
            Permission.DATA_BULK_EDIT,
            Permission.ANALYTICS_EXPORT,
            Permission.REPORT_EXPORT,
        ),
        _w(WorkflowAction.REVIEW, WorkflowAction.REQUEST_CORRECTION, WorkflowAction.EXPORT),
        frozenset({"dashboard", "data", "surveys", "beneficiaries", "submissions", "map", "analytics", "connectivity"}),
    ),
    "me_manager": RoleDefinition(
        "me_manager",
        "M&E Manager",
        "Owns indicators, reports, quality monitoring, and evaluation workflows.",
        ScopeType.PROJECT,
        READ_ONLY_PERMISSIONS
        | _p(
            Permission.USER_READ,
            Permission.USER_CREATE,
            Permission.USER_MANAGE,
            Permission.ROLE_READ,
            Permission.OFFICER_MANAGE,
            Permission.SURVEY_CREATE,
            Permission.SURVEY_MANAGE,
            Permission.SURVEY_ASSIGN_ENUMERATORS,
            Permission.SURVEY_REVIEW_DATA,
            Permission.SURVEY_APPROVE_DATA,
            Permission.INDICATOR_MANAGE,
            Permission.REPORT_GENERATE,
            Permission.REPORT_EXPORT,
            Permission.ANALYTICS_EXPORT,
            Permission.DATA_EXPORT,
        ),
        _w(WorkflowAction.REVIEW, WorkflowAction.EXPORT),
        frozenset({"dashboard", "data", "programs", "surveys", "beneficiaries", "indicators", "submissions", "map", "analytics", "organizations", "connectivity"}),
    ),
    "project_manager": RoleDefinition(
        "project_manager",
        "Project Manager",
        "Manages assigned projects, officers, beneficiaries, forms, and review health.",
        ScopeType.PROJECT,
        READ_ONLY_PERMISSIONS
        | _p(
            Permission.PROGRAM_MANAGE,
            Permission.SURVEY_CREATE,
            Permission.SURVEY_MANAGE,
            Permission.SURVEY_ASSIGN_ENUMERATORS,
            Permission.USER_READ,
            Permission.USER_CREATE,
            Permission.ROLE_READ,
            Permission.FORM_CREATE,
            Permission.FORM_EDIT,
            Permission.BENEFICIARY_CREATE,
            Permission.BENEFICIARY_EDIT,
            Permission.OFFICER_READ,
            Permission.SUBMISSION_REVIEW,
            Permission.CASE_MANAGE,
        ),
        _w(WorkflowAction.REVIEW, WorkflowAction.REQUEST_CORRECTION),
        frozenset({"dashboard", "programs", "surveys", "beneficiaries", "forms", "templates", "submissions", "officers", "cases", "map", "analytics", "organizations", "connectivity"}),
    ),
    "finance_officer": RoleDefinition(
        "finance_officer",
        "Finance Officer",
        "Views project progress and manages budget-linked operational reporting.",
        ScopeType.PROJECT,
        _p(Permission.ORGANIZATION_READ, Permission.PROGRAM_READ, Permission.SURVEY_READ, Permission.REPORT_READ, Permission.REPORT_EXPORT, Permission.ANALYTICS_VIEW, Permission.BUDGET_MANAGE),
        _w(WorkflowAction.EXPORT),
        frozenset({"dashboard", "programs", "surveys", "analytics"}),
    ),
    "compliance_auditor": RoleDefinition(
        "compliance_auditor",
        "Compliance Auditor",
        "Reviews audit logs, workflow decisions, exports, and high-risk records.",
        ScopeType.ORGANIZATION,
        READ_ONLY_PERMISSIONS | _p(Permission.SURVEY_REVIEW_DATA, Permission.AUDIT_READ, Permission.REPORT_EXPORT),
        _w(WorkflowAction.REVIEW, WorkflowAction.EXPORT),
        frozenset({"dashboard", "ecosystem", "data", "surveys", "beneficiaries", "submissions", "cases", "map", "analytics", "workflows"}),
    ),
    "donor_viewer": RoleDefinition(
        "donor_viewer",
        "Donor / External Viewer",
        "Read-only access to assigned projects, reports, indicators, and dashboards.",
        ScopeType.PROJECT,
        _p(Permission.PROGRAM_READ, Permission.SURVEY_READ, Permission.INDICATOR_READ, Permission.REPORT_READ, Permission.ANALYTICS_VIEW),
        _w(),
        frozenset({"dashboard", "programs", "surveys", "indicators", "analytics"}),
    ),
}

ROLE_ALIASES = {
    "admin": "national_admin",
    "system admin": "system_admin",
    "system-admin": "system_admin",
    "system_admin": "system_admin",
    "organization_admin": "organization_owner",
    "organization owner": "organization_owner",
    "org_owner": "organization_owner",
    "manager": "project_manager",
    "m&e manager": "me_manager",
    "m_e_manager": "me_manager",
    "monitoring and evaluation manager": "me_manager",
    "data manager": "data_manager",
    "data-manager": "data_manager",
    "supervisor": "district_supervisor",
    "field supervisor": "district_supervisor",
    "collector": "field_officer",
    "enumerator": "field_officer",
    "field officer": "field_officer",
    "field-officer": "field_officer",
    "field officer / enumerator": "field_officer",
}


def canonical_role(role: str) -> str:
    normalized = role.strip().lower().replace("-", "_")
    normalized = " ".join(normalized.replace("_", " ").split())
    return ROLE_ALIASES.get(normalized, normalized.replace(" ", "_"))


def normalize_permission(permission: str | Permission) -> Permission | None:
    if isinstance(permission, Permission):
        return permission
    try:
        return Permission(permission)
    except ValueError:
        return PERMISSION_ALIASES.get(permission)


ROLE_PERMISSIONS: dict[str, set[Permission]] = {
    name: set(definition.permissions) for name, definition in ROLE_DEFINITIONS.items()
}
for alias, canonical in ROLE_ALIASES.items():
    ROLE_PERMISSIONS[alias] = set(ROLE_DEFINITIONS[canonical].permissions)


PLATFORM_ONLY_ROLES = frozenset({"super_admin"})

ROLE_CREATION_RULES: dict[str, frozenset[str]] = {
    "super_admin": frozenset(ROLE_DEFINITIONS),
    "owner": frozenset(ROLE_DEFINITIONS) - PLATFORM_ONLY_ROLES - frozenset({"owner", "organization_owner"}),
    "organization_owner": frozenset(ROLE_DEFINITIONS) - PLATFORM_ONLY_ROLES - frozenset({"owner", "organization_owner"}),
    "system_admin": frozenset(ROLE_DEFINITIONS) - PLATFORM_ONLY_ROLES - frozenset({"owner", "organization_owner", "system_admin"}),
    "national_admin": frozenset(
        {
            "regional_manager",
            "district_supervisor",
            "field_officer",
            "data_analyst",
            "data_manager",
            "me_manager",
            "project_manager",
            "finance_officer",
            "compliance_auditor",
            "donor_viewer",
        }
    ),
    "regional_manager": frozenset({"district_supervisor", "field_officer", "data_analyst", "project_manager"}),
    "district_supervisor": frozenset({"field_officer"}),
    "project_manager": frozenset({"district_supervisor", "field_officer", "data_analyst"}),
    "data_manager": frozenset({"data_analyst", "field_officer"}),
    "me_manager": frozenset({"district_supervisor", "field_officer", "data_manager", "data_analyst", "donor_viewer"}),
}

ROLE_ARCHITECTURE_GROUPS: dict[str, str] = {
    "super_admin": "Platform",
    "owner": "Organization",
    "organization_owner": "Organization",
    "system_admin": "Organization",
    "national_admin": "Organization",
    "regional_manager": "Organization",
    "me_manager": "Project",
    "project_manager": "Project",
    "data_manager": "Project",
    "data_analyst": "Project",
    "district_supervisor": "Field Operations",
    "field_officer": "Field Operations",
    "finance_officer": "Support",
    "compliance_auditor": "Governance",
    "donor_viewer": "Viewer",
}

ROLE_COMMON_USAGE: dict[str, str] = {
    "super_admin": "Atlas platform operations only.",
    "owner": "First account for an organization; controls tenant ownership.",
    "organization_owner": "First account for an organization; controls tenant ownership.",
    "system_admin": "Day-to-day tenant administration, users, roles, settings, and integrations.",
    "national_admin": "Country-level program administration and verification.",
    "regional_manager": "Regional teams, coverage, and escalation.",
    "me_manager": "Forms, indicators, approvals, reporting, and field data quality.",
    "project_manager": "Project setup, teams, assignments, and operational follow-up.",
    "data_manager": "Data review, cleaning, imports, exports, and approved datasets.",
    "data_analyst": "Analysis, dashboards, and controlled imports/exports.",
    "district_supervisor": "Supervises field officers and reviews their submissions.",
    "field_officer": "Mobile/offline data collection for assigned work only.",
    "finance_officer": "Budget-linked progress and report viewing.",
    "compliance_auditor": "Audit, governance, and compliance review.",
    "donor_viewer": "Read-only approved project information.",
}


def role_architecture_group(role_name: str) -> str:
    return ROLE_ARCHITECTURE_GROUPS.get(canonical_role(role_name), "Custom")


def role_common_usage(role_name: str) -> str:
    return ROLE_COMMON_USAGE.get(canonical_role(role_name), "Custom organization role.")


def can_manage_platform_roles(roles: list[str]) -> bool:
    return "super_admin" in {canonical_role(role) for role in roles}


def is_assignable_role(role_name: str, actor_roles: list[str]) -> bool:
    target_role = canonical_role(role_name)
    if can_manage_platform_roles(actor_roles):
        return target_role in ROLE_DEFINITIONS
    return any(target_role in ROLE_CREATION_RULES.get(canonical_role(role), frozenset()) for role in actor_roles)


def assignable_role_definitions(actor_roles: list[str]) -> dict[str, RoleDefinition]:
    return {name: definition for name, definition in ROLE_DEFINITIONS.items() if is_assignable_role(name, actor_roles)}


SCOPE_ORDER = [
    ScopeType.GLOBAL,
    ScopeType.ORGANIZATION,
    ScopeType.COUNTRY,
    ScopeType.REGION,
    ScopeType.DISTRICT,
    ScopeType.FIELD_TEAM,
    ScopeType.PROJECT,
    ScopeType.OWN,
]


def is_scope_allowed_for_role(role_name: str, scope_type: ScopeType) -> bool:
    definition = ROLE_DEFINITIONS.get(canonical_role(role_name))
    if definition is None:
        return False
    return SCOPE_ORDER.index(scope_type) >= SCOPE_ORDER.index(definition.scope_type)


def permissions_for_roles(roles: list[str]) -> set[Permission]:
    permissions: set[Permission] = set()
    for role in roles:
        permissions.update(ROLE_PERMISSIONS.get(canonical_role(role), set()))
    return permissions


def menu_views_for_roles(roles: list[str]) -> set[str]:
    views: set[str] = set()
    for role in roles:
        definition = ROLE_DEFINITIONS.get(canonical_role(role))
        if definition is not None:
            views.update(definition.menu_views)
    return views


def workflow_actions_for_roles(roles: list[str]) -> set[WorkflowAction]:
    actions: set[WorkflowAction] = set()
    for role in roles:
        definition = ROLE_DEFINITIONS.get(canonical_role(role))
        if definition is not None:
            actions.update(definition.workflow_actions)
    return actions


def default_scope_for_roles(roles: list[str]) -> ScopeType:
    scopes = [
        ROLE_DEFINITIONS[canonical_role(role)].scope_type
        for role in roles
        if canonical_role(role) in ROLE_DEFINITIONS
    ]
    if not scopes:
        return ScopeType.OWN
    return min(scopes, key=lambda scope: SCOPE_ORDER.index(scope))


def has_permission(roles: list[str], permission: Permission | str) -> bool:
    normalized = normalize_permission(permission)
    return normalized is not None and normalized in permissions_for_roles(roles)


def is_scope_authorized(
    *,
    scope: AccessScope,
    target_geography_id: str | None = None,
    target_project_id: str | None = None,
    target_organization_unit_id: str | None = None,
) -> bool:
    if scope.scope_type in {ScopeType.GLOBAL, ScopeType.ORGANIZATION}:
        return True
    if target_project_id is not None and target_project_id in scope.project_ids:
        return True
    if target_geography_id is not None and target_geography_id in scope.geography_ids:
        return True
    if target_organization_unit_id is not None and target_organization_unit_id in scope.organization_unit_ids:
        return True
    return scope.scope_type == ScopeType.OWN
