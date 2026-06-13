import type { ProjectDetailRead, ProjectListItemRead, ProjectSummaryRead, ProjectTemplateRead } from "@/lib/api";

export const projectSections = [
  { id: "dashboard", label: "Overview", route: "/projects" },
  { id: "all", label: "All Projects", route: "/projects/all" },
  { id: "active", label: "Active", route: "/projects/active" },
  { id: "draft", label: "Draft", route: "/projects/draft" },
  { id: "closed", label: "Closed", route: "/projects/closed" },
  { id: "templates", label: "Templates", route: "/projects/templates" },
] as const;

export type ProjectSection = (typeof projectSections)[number]["id"];

export const projectTabs = [
  "Overview",
  "Entities",
  "Forms & Metrics",
  "Locations & Teams",
  "Submissions & Reports",
  "Data Quality & Governance",
  "Settings",
] as const;

export type ProjectTab = (typeof projectTabs)[number];

export const previewProjects: ProjectListItemRead[] = [
  {
    active_assignments: 14,
    active_forms: 5,
    beneficiary_count: 3240,
    country: "Nigeria",
    created_at: new Date().toISOString(),
    donor: "Global Resilience Fund",
    health_score: 88,
    health_status: "Excellent",
    id: "project-agri",
    indicator_count: 12,
    name: "Agricultural Resilience Program",
    owner: "Amina Okoro",
    progress_percent: 82,
    project_code: "AGRI-RES-2026",
    region: "North Region",
    status: "active",
    total_submissions: 18420,
    updated_at: new Date().toISOString(),
  },
  {
    active_assignments: 8,
    active_forms: 3,
    beneficiary_count: 890,
    country: "Ghana",
    created_at: new Date().toISOString(),
    donor: "Health Systems Trust",
    health_score: 72,
    health_status: "Good",
    id: "project-health",
    indicator_count: 9,
    name: "Community Health Access Project",
    owner: "Data Manager",
    progress_percent: 64,
    project_code: "CHA-2026",
    region: "Eastern Region",
    status: "active",
    total_submissions: 6260,
    updated_at: new Date().toISOString(),
  },
  {
    active_assignments: 0,
    active_forms: 1,
    beneficiary_count: 0,
    country: "Cameroon",
    created_at: new Date().toISOString(),
    donor: "Education Fund",
    health_score: 42,
    health_status: "Critical",
    id: "project-edu",
    indicator_count: 4,
    name: "Education Attendance Assessment",
    owner: "Operations Manager",
    progress_percent: 25,
    project_code: "EDU-BASE-2026",
    region: "Littoral",
    status: "draft",
    total_submissions: 0,
    updated_at: new Date().toISOString(),
  },
];

export const previewSummary: ProjectSummaryRead = {
  active_field_officers: 36,
  active_forms: 9,
  active_projects: 2,
  attention_projects: 1,
  closed_projects: 0,
  draft_projects: 1,
  indicator_achievement_rate: 74,
  project_completion_rate: 57,
  risk_alerts: 3,
  total_beneficiaries: 4130,
  total_projects: 3,
  total_submissions: 24680,
};

export const previewDetail: ProjectDetailRead = {
  ...previewProjects[0],
  assignments: [
    { category: "assignment", id: "assign-1", label: "North District baseline collection", metric: "72% complete", status: "active", updated_at: new Date().toISOString() },
    { category: "assignment", id: "assign-2", label: "Market access verification", metric: "In progress", status: "active", updated_at: new Date().toISOString() },
  ],
  audit_trail: [
    { action: "project.created", created_at: new Date().toISOString(), id: "audit-1", resource_type: "project", user: "Amina Okoro" },
    { action: "project.form_attached", created_at: new Date().toISOString(), id: "audit-2", resource_type: "form", user: "Amina Okoro" },
  ],
  category: "Agriculture",
  description: "Multi-district resilience project tracking farmer registration, seasonal yield, market access, and household outcomes.",
  forms: [
    { category: "form", id: "form-1", label: "Farmer Registration Survey", metric: "12,400 responses", status: "published", updated_at: new Date().toISOString() },
    { category: "form", id: "form-2", label: "Seasonal Yield Survey", metric: "Draft v2", status: "draft", updated_at: new Date().toISOString() },
  ],
  implementing_organization: "Atlas FieldOps Demo",
  indicators: [
    { category: "output", id: "ind-1", label: "Registered farmers", metric: "82% of target", status: "active", updated_at: new Date().toISOString() },
    { category: "outcome", id: "ind-2", label: "Average crop yield", metric: "68% achievement", status: "active", updated_at: new Date().toISOString() },
  ],
  locations: [
    { category: "coverage", id: "loc-1", label: "North Region", metric: "18 districts", status: "active" },
    { category: "coverage", id: "loc-2", label: "Market corridors", metric: "7 routes", status: "active" },
  ],
  program_type: "Operations Program",
  reports: [
    { category: "report", id: "report-1", label: "Quarterly Operations Update", metric: "Ready for review", status: "draft", updated_at: new Date().toISOString() },
  ],
  submissions: [
    { category: "submission", id: "sub-1", label: "Recent synced submissions", metric: "18,420 records", status: "approved", updated_at: new Date().toISOString() },
  ],
  teams: [
    { category: "team", id: "team-1", label: "Survey Team A", metric: "14 members", status: "active", updated_at: new Date().toISOString() },
    { category: "team", id: "team-2", label: "Data Quality Team", metric: "4 members", status: "active", updated_at: new Date().toISOString() },
  ],
};

export const previewTemplates: ProjectTemplateRead[] = [
  {
    description: "Assessment project with household forms, enumerator teams, metric baselines, and governance setup.",
    forms: 2,
    governance_controls: 5,
    id: "baseline-survey",
    indicators: 8,
    name: "Assessment Survey Project",
    status: "published",
    template_type: "Assessment Survey",
  },
  {
    description: "Recurring operations project with assignments, quality checks, metrics, and scheduled reporting.",
    forms: 3,
    governance_controls: 6,
    id: "monitoring-program",
    indicators: 12,
    name: "Operations Program",
    status: "published",
    template_type: "Operations Program",
  },
  {
    description: "Review project for comparisons, reporting, and auditability.",
    forms: 4,
    governance_controls: 7,
    id: "evaluation-program",
    indicators: 15,
    name: "Review Program",
    status: "published",
    template_type: "Review Program",
  },
];
