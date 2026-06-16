import {
  BookOpenCheck,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  ClipboardCheck,
  ClipboardPenLine,
  CloudUpload,
  DatabaseZap,
  FileChartColumn,
  Fingerprint,
  Gauge,
  GitBranch,
  HeartHandshake,
  KeyRound,
  Landmark,
  MapPinned,
  Network,
  Settings,
  ShieldCheck,
  UserRoundCog,
  UsersRound,
  Workflow,
  type LucideIcon,
} from "lucide-react";

import type { CurrentPrincipal } from "@/lib/api";
import type { WorkspaceView } from "@/stores/workspace";
import {
  hasPermissionAccess,
  hasRoleAccess,
  type PlatformRole,
} from "@/config/permissions";

export type NavigationDomain =
  | "HOME"
  | "OPERATIONS"
  | "ANALYTICS"
  | "PEOPLE"
  | "GOVERNANCE"
  | "SYSTEM"
  | "PLATFORM"
  | "SUPPORT";

export type ViewTone =
  | "daily"
  | "collect"
  | "monitor"
  | "operate"
  | "admin"
  | "support"
  | "platform"
  | "governance";

export type NavigationChild = {
  label: string;
  route: string;
  description: string;
};

export type NavigationItem = {
  id: WorkspaceView;
  label: string;
  hint: string;
  description: string;
  route: string;
  domain: NavigationDomain;
  icon: LucideIcon;
  tone: ViewTone;
  allowedRoles: PlatformRole[];
  requiredPermissions?: string[];
  children?: NavigationChild[];
  keywords?: string[];
  legacyViews?: WorkspaceView[];
  hiddenFromSidebar?: boolean;
};

export type NavigationSection = {
  label: NavigationDomain;
  description: string;
  items: NavigationItem[];
};

export type ViewGuidance = {
  step: string;
  outcome: string;
  next?: WorkspaceView;
  nextLabel?: string;
};

const allManagerRoles: PlatformRole[] = [
  "System Admin",
  "M&E Manager",
  "Data Manager",
  "Supervisor",
  "Field Officer",
  "Viewer/Donor",
];

const operationsRoles: PlatformRole[] = [
  "System Admin",
  "M&E Manager",
  "Data Manager",
  "Supervisor",
];

const formRoles: PlatformRole[] = [
  "System Admin",
  "M&E Manager",
  "Data Manager",
  "Field Officer",
];

const sidebarSections: NavigationSection[] = [
  {
    label: "HOME",
    description: "Manager landing page and operational command summary.",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        hint: "Forms, reviews, quality",
        description:
          "Main landing page for active projects, forms, submissions, reviews, quality, coverage, field activity, metrics, alerts, approvals, and maps.",
        route: "/dashboard",
        domain: "HOME",
        icon: Gauge,
        tone: "daily",
        allowedRoles: [
          "System Admin",
          "M&E Manager",
          "Data Manager",
          "Supervisor",
          "Viewer/Donor",
        ],
        keywords: ["home", "dashboard", "summary", "alerts", "approvals"],
      },
    ],
  },
  {
    label: "OPERATIONS",
    description: "Projects, forms, field execution, and submissions.",
    items: [
      {
        id: "programs",
        label: "Projects",
        hint: "Programs & workspaces",
        description:
          "Create, manage, monitor, and configure programs and projects.",
        route: "/projects",
        domain: "OPERATIONS",
        icon: Network,
        tone: "monitor",
        allowedRoles: ["System Admin", "M&E Manager"],
        legacyViews: ["surveys", "ecosystem", "enterprise"],
        keywords: ["project", "program", "funder", "client", "survey"],
        children: [
          { label: "All Projects", route: "/projects/all", description: "Every project in the organization." },
          { label: "Active Projects", route: "/projects/active", description: "Projects currently being implemented." },
          { label: "Draft Projects", route: "/projects/draft", description: "Projects still being designed." },
          { label: "Closed Projects", route: "/projects/closed", description: "Completed or archived project workspaces." },
          { label: "Project Templates", route: "/projects/templates", description: "Reusable project setup patterns." },
          { label: "Project Entities", route: "/projects/:projectId/beneficiaries", description: "Project entity enrollment and registry scope." },
          { label: "Data Import", route: "/projects/:projectId/data-import", description: "Continue project data from Kobo, ODK, Excel, and other tools." },
        ],
      },
      {
        id: "forms",
        label: "Forms",
        hint: "Build, publish, govern",
        description:
          "Create, manage, publish, version, and govern survey/data collection forms.",
        route: "/forms",
        domain: "OPERATIONS",
        icon: ClipboardPenLine,
        tone: "collect",
        allowedRoles: formRoles,
        legacyViews: ["templates"],
        keywords: ["form", "survey", "question", "template", "publish"],
        children: [
          { label: "All Forms", route: "/forms/all", description: "All forms grouped by project and status." },
          { label: "Draft Forms", route: "/forms/draft", description: "Forms still being built or configured." },
          { label: "Published Forms", route: "/forms/published", description: "Forms available for field collection." },
          { label: "Archived Forms", route: "/forms/archived", description: "Retired forms retained for audit." },
          { label: "Form Templates", route: "/forms/templates", description: "Reusable operational and sector templates." },
          { label: "Reference Data", route: "/forms/reference-data", description: "Form-specific controlled lists and bindings." },
        ],
      },
      {
        id: "officers",
        label: "Field Operations",
        hint: "Assignments & teams",
        description:
          "Manage field work, assignments, supervisors, field officers, targets, visits, and activity tracking.",
        route: "/field-operations",
        domain: "OPERATIONS",
        icon: UserRoundCog,
        tone: "collect",
        allowedRoles: [
          "System Admin",
          "M&E Manager",
          "Supervisor",
          "Field Officer",
        ],
        legacyViews: ["connectivity", "beneficiaries"],
        keywords: ["assignment", "enumerator", "field officer", "work plan"],
        children: [
          { label: "Assignments", route: "/field-operations/assignments", description: "Form, project, and location assignments." },
          { label: "Field Officers", route: "/field-operations/field-officers", description: "Enumerator and collector management." },
          { label: "Supervisors", route: "/field-operations/supervisors", description: "Supervisor teams and responsibilities." },
          { label: "Operational Activities", route: "/field-operations/operational-activities", description: "Supervisor approval and GPS evidence for organization and project field activities." },
          { label: "Work Plans", route: "/field-operations/work-plans", description: "Daily and weekly field activity plans." },
          { label: "Targets", route: "/field-operations/targets", description: "Collection targets and progress tracking." },
          { label: "Field Monitoring", route: "/field-operations/field-monitoring", description: "Device, sync, GPS, and productivity monitoring." },
        ],
      },
      {
        id: "submissions",
        label: "Submissions",
        hint: "Review collected data",
        description:
          "View, review, approve, reject, return, and manage collected data.",
        route: "/submissions",
        domain: "OPERATIONS",
        icon: ClipboardCheck,
        tone: "daily",
        allowedRoles: [
          "System Admin",
          "M&E Manager",
          "Data Manager",
          "Supervisor",
          "Field Officer",
        ],
        legacyViews: ["cases"],
        keywords: ["submission", "review", "approve", "reject", "return"],
        children: [
          { label: "All Submissions", route: "/submissions/all", description: "All collected records." },
          { label: "Pending Review", route: "/submissions/pending-review", description: "Records waiting for review." },
          { label: "Approved", route: "/submissions/approved", description: "Approved and report-ready records." },
          { label: "Rejected", route: "/submissions/rejected", description: "Rejected records." },
          { label: "Returned for Correction", route: "/submissions/returned", description: "Records sent back to field teams." },
          { label: "Archived", route: "/submissions/archived", description: "Archived records retained for audit." },
        ],
      },
      {
        id: "beneficiaries",
        label: "Entities",
        hint: "Registry & history",
        description:
          "Search, import, assign, deduplicate, and track farmers, households, facilities, schools, groups, and other project entities over time.",
        route: "/beneficiaries",
        domain: "OPERATIONS",
        icon: HeartHandshake,
        tone: "collect",
        allowedRoles: [
          "System Admin",
          "M&E Manager",
          "Data Manager",
          "Supervisor",
          "Field Officer",
        ],
        requiredPermissions: ["beneficiaries.view"],
        keywords: ["beneficiary", "entity", "farmer", "household", "registry", "duplicate"],
        children: [
          { label: "Registry", route: "/beneficiaries", description: "Search and manage entity profiles." },
          { label: "Import Entities", route: "/beneficiaries/import", description: "CSV and Excel import into a selected project with duplicate review." },
          { label: "Mobile Registration Forms", route: "/forms/create", description: "Create project-linked registration forms for field officers." },
          { label: "Duplicate Review", route: "/beneficiaries/duplicates", description: "Review and resolve possible duplicate entities." },
        ],
      },
    ],
  },
  {
    label: "ANALYTICS",
    description: "Maps, metrics, reporting, and quality investigation.",
    items: [
      {
        id: "map",
        label: "Mapping",
        hint: "GIS & coverage",
        description:
          "GIS maps, GPS evidence, source records, coverage, layers, boundaries, and spatial validation.",
        route: "/mapping",
        domain: "ANALYTICS",
        icon: MapPinned,
        tone: "monitor",
        allowedRoles: [
          "System Admin",
          "M&E Manager",
          "Data Manager",
          "Supervisor",
          "Viewer/Donor",
        ],
        keywords: ["map", "gis", "gps", "coverage", "boundary"],
        children: [
          { label: "Project Maps", route: "/mapping/project-maps", description: "GPS-derived project extents and source records." },
          { label: "Submission Maps", route: "/mapping/submission-maps", description: "Submitted records plotted by location and quality." },
          { label: "Entity Maps", route: "/mapping/beneficiary-maps", description: "Entity and household locations with privacy controls." },
          { label: "Facility Maps", route: "/mapping/facility-maps", description: "Facilities, schools, clinics, assets, sites, and service points." },
          { label: "Field Officer Maps", route: "/mapping/field-officer-maps", description: "Mobile sync locations, device signals, and supervisor action queues." },
          { label: "Coverage Maps", route: "/mapping/coverage-maps", description: "Project coverage evidence and underlying GPS records." },
          { label: "Metric Maps", route: "/mapping/indicator-maps", description: "Metric progress linked to project geography." },
          { label: "Data Quality Maps", route: "/mapping/data-quality-maps", description: "GPS issues with inspectable source records." },
          { label: "Map Layers", route: "/mapping/layers", description: "Live point layers and source-record inspection." },
          { label: "Boundaries", route: "/mapping/boundaries", description: "GPS-derived extents and boundary source records." },
        ],
      },
      {
        id: "indicators",
        label: "Metrics & Results",
        hint: "Targets, KPIs, results",
        description:
          "Manage metrics, KPIs, baselines, targets, live results frameworks, logframes, and progress tracking.",
        route: "/indicators",
        domain: "ANALYTICS",
        icon: ChartNoAxesCombined,
        tone: "monitor",
        allowedRoles: [
          "System Admin",
          "M&E Manager",
          "Data Manager",
          "Viewer/Donor",
        ],
        keywords: ["metric", "kpi", "indicator", "logframe", "target", "baseline"],
        children: [
          { label: "Metric Library", route: "/indicators/library", description: "Reusable metrics, KPIs, definitions, formulas, and sources." },
          { label: "Results Framework", route: "/indicators/results-framework", description: "Live result structure derived from project metrics." },
          { label: "Logframes", route: "/indicators/logframes", description: "Live logframe rows from metrics, baselines, and targets." },
          { label: "Targets", route: "/indicators/targets", description: "Target values, milestones, and actual-vs-target progress." },
          { label: "Baselines", route: "/indicators/baselines", description: "Baseline values and starting comparison points." },
          { label: "Metric Reports", route: "/indicators/reports", description: "Metric reporting handoff to Reports." },
        ],
      },
      {
        id: "analytics",
        label: "Reports",
        hint: "Outputs & exports",
        description:
          "Generate standard reports, live custom previews, dashboards, schedule readiness, and governed exports.",
        route: "/reports",
        domain: "ANALYTICS",
        icon: FileChartColumn,
        tone: "monitor",
        allowedRoles: [
          "System Admin",
          "M&E Manager",
          "Data Manager",
          "Viewer/Donor",
        ],
        keywords: ["report", "dashboard", "export", "funder", "client", "donor"],
        children: [
          { label: "Standard Reports", route: "/reports/standard", description: "Common operational, M&E, compliance, and sector reports." },
          { label: "Custom Reports", route: "/reports/custom", description: "Ad hoc builder with live report previews." },
          { label: "Dashboards", route: "/reports/dashboards", description: "Dashboard sources and visualization-ready reports." },
          { label: "Scheduled Reports", route: "/reports/scheduled", description: "Recurring schedules and report readiness." },
          { label: "Exports", route: "/reports/exports", description: "Governed exports linked to source reports." },
        ],
      },
      {
        id: "dataQuality",
        label: "Data Quality",
        hint: "Issues & rules",
        description:
          "Monitor, investigate, and resolve data quality issues.",
        route: "/data-quality",
        domain: "ANALYTICS",
        icon: ShieldCheck,
        tone: "governance",
        allowedRoles: operationsRoles,
        keywords: ["quality", "duplicate", "outlier", "missing", "validation"],
        children: [
          { label: "Quality Dashboard", route: "/data-quality/dashboard", description: "Data quality scorecards and trends." },
          { label: "Duplicates", route: "/data-quality/duplicates", description: "Potential duplicate submissions and entities." },
          { label: "Outliers", route: "/data-quality/outliers", description: "Statistical anomalies and unusual responses." },
          { label: "GPS Issues", route: "/data-quality/gps-issues", description: "Coordinates outside boundaries or missing GPS." },
          { label: "Missing Data", route: "/data-quality/missing-data", description: "Required data gaps and incomplete records." },
          { label: "Validation Failures", route: "/data-quality/validation-failures", description: "Failed rules from forms and workflows." },
          { label: "Risk Alerts", route: "/data-quality/risk-alerts", description: "High-risk data and operational alerts." },
          { label: "Quality Rules", route: "/data-quality/rules", description: "Reusable quality checks and severity settings." },
        ],
      },
    ],
  },
  {
    label: "PEOPLE",
    description: "Users, roles, teams, permissions, and organization access.",
    items: [
      {
        id: "organizations",
        label: "Users & Teams",
        hint: "Access & activity",
        description:
          "Manage users, roles, teams, organizations, permissions, and activity.",
        route: "/users-teams",
        domain: "PEOPLE",
        icon: UsersRound,
        tone: "admin",
        allowedRoles: ["System Admin", "M&E Manager"],
        legacyViews: ["workforce"],
        keywords: ["users", "roles", "teams", "permissions"],
        children: [
          { label: "Users", route: "/users-teams/users", description: "User accounts and access status." },
          { label: "Roles", route: "/users-teams/roles", description: "Role definitions and permissions." },
          { label: "Teams", route: "/users-teams/teams", description: "Operational teams and groups." },
          { label: "Organizations", route: "/users-teams/organizations", description: "Organization profile and tenant units." },
          { label: "Permissions", route: "/users-teams/permissions", description: "Permission catalog and overrides." },
          { label: "Activity Logs", route: "/users-teams/activity-logs", description: "User activity and access history." },
        ],
      },
    ],
  },
  {
    label: "GOVERNANCE",
    description: "Audit, policy, approvals, compliance, and stewardship.",
    items: [
      {
        id: "governance",
        label: "Governance",
        hint: "Audit & compliance",
        description:
          "Manage compliance, auditability, approvals, policies, retention rules, consent, and data stewardship.",
        route: "/governance",
        domain: "GOVERNANCE",
        icon: Fingerprint,
        tone: "governance",
        allowedRoles: ["System Admin", "M&E Manager"],
        legacyViews: ["workflows"],
        keywords: ["governance", "audit", "approval", "policy", "consent"],
        children: [
          { label: "Audit Trail", route: "/governance/audit-trail", description: "Immutable activity and change records." },
          { label: "Policies", route: "/governance/policies", description: "Data and operational policies." },
          { label: "Approvals", route: "/governance/approvals", description: "Approval governance and escalation." },
          { label: "Retention Rules", route: "/governance/retention-rules", description: "Data retention and archival policy." },
          { label: "Consent Management", route: "/governance/consent-management", description: "Consent tracking and rules." },
          { label: "Compliance", route: "/governance/compliance", description: "Compliance monitoring and evidence." },
          { label: "Data Stewardship", route: "/governance/data-stewardship", description: "Ownership, lineage, and data responsibility." },
        ],
      },
    ],
  },
  {
    label: "SYSTEM",
    description: "Global settings, reference data, integrations, and backups.",
    items: [
      {
        id: "administration",
        label: "Administration",
        hint: "System settings",
        description:
          "System-wide configuration, master data, integrations, notifications, APIs, backups, and platform settings.",
        route: "/administration",
        domain: "SYSTEM",
        icon: Settings,
        tone: "platform",
        allowedRoles: ["System Admin"],
        legacyViews: ["platform", "data"],
        keywords: ["administration", "settings", "reference data", "api", "backup"],
        children: [
          { label: "Location Hierarchy", route: "/administration/location-hierarchy", description: "Global locations and administrative structure." },
          { label: "Reference Data", route: "/administration/reference-data", description: "System-wide master data." },
          { label: "Notification Settings", route: "/administration/notification-settings", description: "Email, SMS, and in-app notification settings." },
          { label: "API Settings", route: "/administration/api-settings", description: "API keys, access, and developer settings." },
          { label: "Integrations", route: "/administration/integrations", description: "External systems and data connectors." },
          { label: "System Settings", route: "/administration/system-settings", description: "Global platform configuration." },
          { label: "Backup & Recovery", route: "/administration/backup-recovery", description: "Data backup, restore, and recovery settings." },
          { label: "Imports & Migration", route: "/administration/imports-migration", description: "Migration batches, field mapping, validation, history, and rollback." },
          { label: "Mobile Management", route: "/administration/mobile", description: "Devices, app versions, pilots, monitoring, feedback, and field testing in one hub." },
        ],
      },
      {
        id: "help",
        label: "Help Guide",
        hint: "Product guidance",
        description:
          "Beginner-friendly guidance for major Atlas FieldOps workflows.",
        route: "/app/help",
        domain: "SYSTEM",
        icon: BookOpenCheck,
        tone: "support",
        allowedRoles: allManagerRoles,
        keywords: ["help", "guide", "documentation", "how to"],
      },
    ],
  },
];

const supportItems: NavigationItem[] = [];

const legacyItems: NavigationItem[] = [
  {
    id: "platform",
    label: "Platform Console",
    hint: "Global platform control",
    description:
      "Super Admin console for organizations, global users, role templates, feature flags, health, audit, security, integrations, backups, and platform settings.",
    route: "/platform",
    domain: "PLATFORM",
    icon: Landmark,
    tone: "platform",
    allowedRoles: ["Super Admin"],
    hiddenFromSidebar: true,
    keywords: ["platform", "super admin", "tenant", "support"],
  },
  {
    id: "surveys",
    label: "Survey Workspaces",
    hint: "Project survey activity",
    description:
      "Legacy survey management workspace. Canonically belongs under Projects and Forms.",
    route: "/projects/all",
    domain: "OPERATIONS",
    icon: ClipboardCheck,
    tone: "monitor",
    allowedRoles: ["System Admin", "M&E Manager"],
    hiddenFromSidebar: true,
    keywords: ["survey", "baseline", "midline", "endline"],
  },
  {
    id: "templates",
    label: "Form Templates",
    hint: "Reusable form starts",
    description:
      "Legacy template library. Canonically belongs under Forms / Form Templates.",
    route: "/forms/templates",
    domain: "OPERATIONS",
    icon: ClipboardPenLine,
    tone: "collect",
    allowedRoles: formRoles,
    hiddenFromSidebar: true,
    keywords: ["template", "form", "start"],
  },
  {
    id: "data",
    label: "Data Tools",
    hint: "Import & export",
    description:
      "Legacy data interoperability tools. Canonically belongs under Administration, Forms, Reports, or Data Quality depending on task.",
    route: "/administration/reference-data",
    domain: "SYSTEM",
    icon: DatabaseZap,
    tone: "operate",
    allowedRoles: ["System Admin", "M&E Manager", "Data Manager"],
    hiddenFromSidebar: true,
    keywords: ["data", "import", "export", "excel", "csv"],
  },
  {
    id: "workflows",
    label: "Approval Rules",
    hint: "Workflow setup",
    description:
      "Legacy workflow management. Canonically belongs under Governance / Approvals or Forms / Workflow.",
    route: "/governance/approvals",
    domain: "GOVERNANCE",
    icon: Workflow,
    tone: "admin",
    allowedRoles: ["System Admin", "M&E Manager"],
    hiddenFromSidebar: true,
    keywords: ["workflow", "approval", "sla", "correction"],
  },
  {
    id: "workforce",
    label: "Workforce Governance",
    hint: "Teams & delegation",
    description:
      "Legacy workforce governance. Canonically belongs under Users & Teams.",
    route: "/users-teams/teams",
    domain: "PEOPLE",
    icon: UsersRound,
    tone: "admin",
    allowedRoles: ["System Admin", "M&E Manager"],
    hiddenFromSidebar: true,
    keywords: ["workforce", "team", "delegation"],
  },
  {
    id: "connectivity",
    label: "Sync Health",
    hint: "Offline & retry",
    description:
      "Legacy connectivity workspace. Canonically belongs under Field Operations / Field Monitoring.",
    route: "/field-operations/field-monitoring",
    domain: "OPERATIONS",
    icon: CloudUpload,
    tone: "daily",
    allowedRoles: [
      "System Admin",
      "M&E Manager",
      "Supervisor",
      "Field Officer",
    ],
    hiddenFromSidebar: true,
    keywords: ["sync", "offline", "retry", "network"],
  },
  {
    id: "cases",
    label: "Cases",
    hint: "Follow-ups",
    description:
      "Legacy case workspace. Canonically belongs under Submissions or Governance depending on case type.",
    route: "/submissions/returned",
    domain: "OPERATIONS",
    icon: BriefcaseBusiness,
    tone: "operate",
    allowedRoles: ["System Admin", "M&E Manager", "Supervisor"],
    hiddenFromSidebar: true,
    keywords: ["case", "complaint", "incident", "follow-up"],
  },
  {
    id: "ecosystem",
    label: "Platform Ecosystem",
    hint: "System connections",
    description:
      "Legacy ecosystem explanation. Canonically represented by the final domain architecture.",
    route: "/dashboard",
    domain: "HOME",
    icon: GitBranch,
    tone: "operate",
    allowedRoles: ["System Admin", "M&E Manager"],
    hiddenFromSidebar: true,
    keywords: ["ecosystem", "connections", "architecture"],
  },
  {
    id: "enterprise",
    label: "Enterprise Operations",
    hint: "Assets & budgets",
    description:
      "Legacy enterprise workspace. Canonically split across Projects, Governance, and Administration.",
    route: "/projects/all",
    domain: "OPERATIONS",
    icon: BriefcaseBusiness,
    tone: "operate",
    allowedRoles: ["System Admin", "M&E Manager"],
    hiddenFromSidebar: true,
    keywords: ["enterprise", "assets", "budget", "documents"],
  },
];

export const navigationSections = sidebarSections;
export const sidebarNavigationItems = navigationSections.flatMap(
  (section) => section.items,
);
export const navigationItems = [
  ...sidebarNavigationItems,
  ...supportItems,
  ...legacyItems,
];

export const viewGuidance: Record<WorkspaceView, ViewGuidance> = {
  platform: {
    step: "Manage platform console",
    outcome:
      "Use the separate Super Admin console for tenant lifecycle, global identity support, feature flags, system health, audit, security, integrations, backups, and platform settings.",
    next: "administration",
    nextLabel: "Open administration",
  },
  dashboard: {
    step: "Review today",
    outcome:
      "Track active forms, submissions, sync progress, data quality, coverage, metric progress, and approval queues.",
    next: "submissions",
    nextLabel: "Review submissions",
  },
  ecosystem: {
    step: "Understand structure",
    outcome:
      "See how projects, forms, people, submissions, metrics, reports, and controls connect across the platform.",
    next: "programs",
    nextLabel: "Open projects",
  },
  enterprise: {
    step: "Coordinate operations",
    outcome:
      "Review legacy enterprise operations that are now organized across Projects, Governance, and Administration.",
    next: "programs",
    nextLabel: "Open projects",
  },
  governance: {
    step: "Govern data",
    outcome:
      "Manage audit trails, approval governance, policies, consent, retention, compliance, and data stewardship.",
    next: "submissions",
    nextLabel: "Review approvals",
  },
  workforce: {
    step: "Manage teams",
    outcome:
      "Review workforce governance, team structures, delegations, and access responsibilities.",
    next: "organizations",
    nextLabel: "Open users & teams",
  },
  data: {
    step: "Prepare data",
    outcome:
      "Use data import, export, mapping, and interoperability tools from the correct operational context.",
    next: "dataQuality",
    nextLabel: "Check quality",
  },
  dataQuality: {
    step: "Resolve issues",
    outcome:
      "Find duplicates, outliers, missing data, GPS issues, validation failures, and high-risk records before reporting.",
    next: "submissions",
    nextLabel: "Open submissions",
  },
  programs: {
    step: "Plan projects",
    outcome:
      "Create and manage projects with forms, entities, metrics, locations, teams, assignments, submissions, reports, settings, and audit trails.",
    next: "programs",
    nextLabel: "Create project",
  },
  surveys: {
    step: "Manage surveys",
    outcome:
      "Organize survey or collection activity under projects and connect it to forms, field teams, metrics, and reporting.",
    next: "forms",
    nextLabel: "Create forms",
  },
  beneficiaries: {
    step: "Manage records",
    outcome:
      "Keep entity, household, farmer, group, and visit records organized and traceable.",
    next: "submissions",
    nextLabel: "Review submissions",
  },
  indicators: {
    step: "Measure results",
    outcome:
      "Track baselines, targets, formulas, progress, and report-ready performance data.",
    next: "analytics",
    nextLabel: "Open reports",
  },
  cases: {
    step: "Resolve follow-up",
    outcome:
      "Manage complaints, referrals, corrections, incidents, and escalations through closure.",
    next: "submissions",
    nextLabel: "Open submissions",
  },
  map: {
    step: "Verify coverage",
    outcome:
      "Use GPS evidence, boundaries, layers, and coverage maps to understand where field work is happening.",
    next: "dataQuality",
    nextLabel: "Review GPS issues",
  },
  organizations: {
    step: "Control access",
    outcome:
      "Manage users, roles, teams, organizations, permissions, and activity logs.",
    next: "governance",
    nextLabel: "Open governance",
  },
  officers: {
    step: "Manage field work",
    outcome:
      "Coordinate assignments, field officers, supervisors, work plans, targets, and field monitoring.",
    next: "forms",
    nextLabel: "Assign forms",
  },
  forms: {
    step: "Design collection",
    outcome:
      "Create mobile-ready forms with questions, reference data, permissions, workflow, data quality rules, governance, mapping settings, version history, and audit trails.",
    next: "submissions",
    nextLabel: "Review collected data",
  },
  submissions: {
    step: "Validate evidence",
    outcome:
      "Approve clean submissions, reject poor data, or request corrections with a clear audit trail.",
    next: "dataQuality",
    nextLabel: "Check quality",
  },
  templates: {
    step: "Start faster",
    outcome:
      "Choose a professional form template, customize questions, configure controls, and publish it for field teams.",
    next: "forms",
    nextLabel: "Open forms",
  },
  analytics: {
    step: "Report results",
    outcome:
      "Create standard reports, custom reports, dashboards, scheduled reports, and authorized exports.",
    next: "indicators",
    nextLabel: "Open metrics",
  },
  workflows: {
    step: "Configure approvals",
    outcome:
      "Define correction paths, review rules, escalation steps, and operational accountability.",
    next: "governance",
    nextLabel: "Open governance",
  },
  connectivity: {
    step: "Protect offline work",
    outcome:
      "Monitor sync queues, retries, weak connections, and field-device upload status.",
    next: "officers",
    nextLabel: "Open field operations",
  },
  administration: {
    step: "Configure system",
    outcome:
      "Manage location hierarchy, reference data, notifications, APIs, integrations, system settings, backups, and platform-level tools.",
    next: "dashboard",
    nextLabel: "Open dashboard",
  },
  help: {
    step: "Learn workflows",
    outcome:
      "Use beginner-friendly guidance to understand every major Atlas FieldOps workflow.",
    next: "forms",
    nextLabel: "Open forms",
  },
};

export function getNavigationItemByView(
  view: WorkspaceView,
): NavigationItem | undefined {
  return navigationItems.find((item) => item.id === view);
}

export function canAccessNavigationItem(
  item: NavigationItem,
  principal?: CurrentPrincipal | null,
): boolean {
  if (item.id === "help") {
    return !principal?.platform_admin || Boolean(principal.support_mode);
  }

  const roleAccess = hasRoleAccess(item.allowedRoles, principal);
  const permissionAccess = hasPermissionAccess(
    item.requiredPermissions,
    principal,
  );

  if (roleAccess && permissionAccess) {
    return true;
  }

  const explicitViews = principal?.menu_views ?? [];
  if (!explicitViews.length || !permissionAccess) {
    return false;
  }

  const relatedViews = new Set([item.id, ...(item.legacyViews ?? [])]);
  return explicitViews.some((view) => relatedViews.has(view as WorkspaceView));
}

export function getVisibleNavigationSections(
  principal?: CurrentPrincipal | null,
): NavigationSection[] {
  return navigationSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        canAccessNavigationItem(item, principal),
      ),
    }))
    .filter((section) => section.items.length);
}

export function getVisibleNavigationItems(
  principal?: CurrentPrincipal | null,
): NavigationItem[] {
  return navigationItems.filter((item) =>
    canAccessNavigationItem(item, principal),
  );
}

export function isWorkspaceViewAllowed(
  view: WorkspaceView,
  principal?: CurrentPrincipal | null,
): boolean {
  const item = getNavigationItemByView(view);
  return item ? canAccessNavigationItem(item, principal) : false;
}

export function getDefaultWorkspaceView(
  principal?: CurrentPrincipal | null,
): WorkspaceView {
  if (principal?.platform_admin && !principal.support_mode) {
    return "platform";
  }

  const firstVisible = getVisibleNavigationItems(principal).find(
    (item) => !item.hiddenFromSidebar,
  );
  return firstVisible?.id ?? "dashboard";
}

export function getBreadcrumbsForView(
  view: WorkspaceView,
): { label: string; route?: string }[] {
  const item = getNavigationItemByView(view);
  if (!item) {
    return [{ label: "Workspace" }];
  }

  return [
    { label: item.domain },
    { label: item.label, route: item.route },
  ];
}
