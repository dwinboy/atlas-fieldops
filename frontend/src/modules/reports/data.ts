export type ReportsSection = "dashboard" | "standard" | "custom" | "dashboards" | "scheduled" | "exports";

export type ReportCategory =
  | "Program Reports"
  | "Project Reports"
  | "Submission Reports"
  | "Indicator Reports"
  | "Data Quality Reports"
  | "Coverage Reports"
  | "Field Operations Reports"
  | "Beneficiary Reports"
  | "Donor Reports";

export type ReportStatus = "Ready" | "Draft" | "Scheduled" | "Generating" | "Needs Data" | "Failed" | "Archived";
export type DashboardStatus = "Active" | "Draft" | "Archived";
export type ExportStatus = "Ready" | "Queued" | "Processing" | "Failed" | "Expired";
export type ReportFormat = "Excel" | "CSV" | "PDF" | "JSON";
export type ScheduleFrequency = "Daily" | "Weekly" | "Monthly" | "Quarterly" | "Custom";
export type VisualizationType = "Table" | "Bar Chart" | "Line Chart" | "Area Chart" | "Pie Chart" | "Donut Chart" | "KPI Card" | "Heat Map" | "Map Link";

export type ReportsSummary = {
  activeDashboards: number;
  exportJobs: number;
  failedReportJobs: number;
  mostViewedReports: number;
  reportsReady: number;
  reportsPendingDelivery: number;
  scheduledReports: number;
  totalReports: number;
};

export type ReportRecord = {
  id: string;
  title: string;
  description: string;
  category: ReportCategory;
  owner: string;
  project: string;
  donor: string;
  period: string;
  status: ReportStatus;
  lastGenerated: string;
  views: number;
  formats: ReportFormat[];
  dataSources: string[];
  filters: string[];
  visualizations: VisualizationType[];
  kpis: string[];
  governance: "Approved" | "Pending approval" | "Restricted export" | "Internal only";
};

export type DashboardRecord = {
  id: string;
  title: string;
  type:
    | "Executive Dashboard"
    | "Project Dashboard"
    | "Donor Dashboard"
    | "Field Operations Dashboard"
    | "Indicator Dashboard"
    | "Data Quality Dashboard";
  owner: string;
  status: DashboardStatus;
  widgets: string[];
  visibility: "Managers" | "Donors" | "Supervisors" | "Data team";
  lastViewed: string;
};

export type ScheduledReportRecord = {
  id: string;
  reportId: string;
  reportTitle: string;
  recipients: string[];
  frequency: ScheduleFrequency;
  time: string;
  timezone: string;
  format: ReportFormat;
  status: "Active" | "Paused" | "Failed";
  lastRun: string;
  nextRun: string;
  failureLog?: string;
};

export type ExportJobRecord = {
  id: string;
  source: "Reports" | "Indicators" | "Submissions" | "Projects" | "Beneficiaries" | "Data Quality";
  name: string;
  requestedBy: string;
  requestedAt: string;
  format: ReportFormat;
  status: ExportStatus;
  rows: number;
  governance: "Approved" | "Needs approval" | "Restricted" | "Expired";
};

export type ReportBuilderStep = {
  id: string;
  label: string;
  description: string;
  status: "Complete" | "Current" | "Pending";
};

export type KpiRecord = {
  id: string;
  label: string;
  value: number;
  target: number;
  unit: string;
  trend: "Up" | "Down" | "Flat";
  periodComparison: string;
  drillDown: string;
};

export type ReportAuditEvent = {
  id: string;
  reportId: string;
  action: string;
  actor: string;
  createdAt: string;
  reason: string;
};

export const reportsSections: {
  id: ReportsSection;
  label: string;
  route: string;
  description: string;
}[] = [
  { id: "dashboard", label: "Overview", route: "/reports", description: "Reporting hub, executive KPIs, recent reports, schedules, exports, and usage analytics." },
  { id: "standard", label: "Standard Reports", route: "/reports/standard", description: "Prebuilt program, project, submission, indicator, quality, coverage, field operations, beneficiary, and donor reports." },
  { id: "custom", label: "Custom Reports", route: "/reports/custom", description: "Build ad hoc reports by selecting data sources, fields, filters, groups, visualizations, preview, and export options." },
  { id: "dashboards", label: "Dashboards", route: "/reports/dashboards", description: "Create and manage interactive dashboards with cards, tables, charts, maps, feeds, and progress widgets." },
  { id: "scheduled", label: "Scheduled Reports", route: "/reports/scheduled", description: "Automate report generation and delivery by email, download center, or API delivery." },
  { id: "exports", label: "Exports", route: "/reports/exports", description: "Track authorized CSV, Excel, PDF, and JSON exports under governance controls." },
];

const todayIso = new Date().toISOString();
const yesterdayIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
const tomorrowIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

export const previewReports: ReportRecord[] = [
  {
    category: "Donor Reports",
    dataSources: ["Projects", "Indicators", "Approved submissions", "Mapping"],
    description: "Quarterly donor package with progress narrative, indicator achievement, coverage maps, and export annexes.",
    donor: "FAO",
    filters: ["Project: Agricultural Resilience Program", "Period: Q2 2026", "Approved submissions only"],
    formats: ["PDF", "Excel"],
    governance: "Approved",
    id: "report-fao-q2",
    kpis: ["Indicator achievement", "Coverage rate", "Data quality score"],
    lastGenerated: todayIso,
    owner: "M&E Manager",
    period: "Apr-Jun 2026",
    project: "Agricultural Resilience Program",
    status: "Ready",
    title: "FAO Q2 agriculture progress",
    views: 184,
    visualizations: ["KPI Card", "Bar Chart", "Map Link", "Table"],
  },
  {
    category: "Indicator Reports",
    dataSources: ["Indicators", "Baselines", "Targets", "Approved submissions"],
    description: "Baseline versus current results for the clean water access outcome indicator set.",
    donor: "UNICEF",
    filters: ["Location: District A", "Indicator type: Outcome", "Period: May 2026"],
    formats: ["PDF", "Excel"],
    governance: "Pending approval",
    id: "report-water-baseline",
    kpis: ["Target achievement", "Baseline shift", "Reporting periods due"],
    lastGenerated: yesterdayIso,
    owner: "Data Manager",
    period: "May 2026",
    project: "Social Protection Response",
    status: "Draft",
    title: "Water access baseline vs current",
    views: 96,
    visualizations: ["Line Chart", "KPI Card", "Table"],
  },
  {
    category: "Submission Reports",
    dataSources: ["Submissions", "Forms", "Data Quality"],
    description: "Operational review summary showing approval queue, returned submissions, reviewer SLA, and quality blockers.",
    donor: "Internal",
    filters: ["Status: Pending review", "Quality severity: High and Critical"],
    formats: ["Excel", "CSV"],
    governance: "Internal only",
    id: "report-review-queue",
    kpis: ["Approval rate", "Average review time", "Quality alerts"],
    lastGenerated: todayIso,
    owner: "Review Lead",
    period: "Current week",
    project: "All active projects",
    status: "Ready",
    title: "Submission review queue summary",
    views: 142,
    visualizations: ["Table", "Donut Chart", "KPI Card"],
  },
  {
    category: "Coverage Reports",
    dataSources: ["Projects", "Field Operations", "Mapping", "Submissions"],
    description: "Geographic coverage summary comparing assigned communities, collected submissions, and uncovered areas.",
    donor: "World Bank",
    filters: ["Country: Cameroon", "Project status: Active", "Target type: Community coverage"],
    formats: ["PDF", "Excel"],
    governance: "Restricted export",
    id: "report-coverage-gaps",
    kpis: ["Coverage rate", "Under-covered communities", "Submission density"],
    lastGenerated: yesterdayIso,
    owner: "Program Manager",
    period: "Q2 2026",
    project: "School Attendance Recovery",
    status: "Needs Data",
    title: "Coverage gap analysis",
    views: 73,
    visualizations: ["Heat Map", "Map Link", "Bar Chart"],
  },
  {
    category: "Field Operations Reports",
    dataSources: ["Field Operations", "Submissions", "Data Quality"],
    description: "Weekly supervisor performance, field officer productivity, assignment progress, and overdue work.",
    donor: "Internal",
    filters: ["Date range: Last 7 days", "Supervisor: All", "Assignment status: Active"],
    formats: ["PDF", "CSV"],
    governance: "Approved",
    id: "report-field-weekly",
    kpis: ["Assignment completion", "Field officer activity", "Review SLA"],
    lastGenerated: todayIso,
    owner: "Operations Lead",
    period: "Current week",
    project: "All active projects",
    status: "Scheduled",
    title: "Field operations weekly brief",
    views: 118,
    visualizations: ["Bar Chart", "Line Chart", "KPI Card", "Table"],
  },
  {
    category: "Data Quality Reports",
    dataSources: ["Data Quality", "Submissions", "Forms", "Mapping"],
    description: "Critical quality flags, duplicates, GPS issues, missing values, and unresolved validation failures.",
    donor: "Internal",
    filters: ["Severity: Critical", "Status: Open", "Approved submissions only: No"],
    formats: ["Excel", "JSON"],
    governance: "Internal only",
    id: "report-quality-risk",
    kpis: ["Data quality score", "Critical issues", "Duplicate risk"],
    lastGenerated: todayIso,
    owner: "Data Quality Officer",
    period: "Current month",
    project: "All active projects",
    status: "Generating",
    title: "Data quality risk report",
    views: 64,
    visualizations: ["Table", "Heat Map", "Donut Chart"],
  },
];

export const previewDashboards: DashboardRecord[] = [
  {
    id: "dash-executive",
    lastViewed: todayIso,
    owner: "Platform Admin",
    status: "Active",
    title: "Executive KPI Dashboard",
    type: "Executive Dashboard",
    visibility: "Managers",
    widgets: ["Total beneficiaries", "Indicator achievement", "Coverage rate", "Risk alerts", "Executive recommendations"],
  },
  {
    id: "dash-donor",
    lastViewed: yesterdayIso,
    owner: "M&E Manager",
    status: "Active",
    title: "Donor Results Dashboard",
    type: "Donor Dashboard",
    visibility: "Donors",
    widgets: ["Approved indicators", "Coverage map", "Disaggregated progress", "Narrative highlights"],
  },
  {
    id: "dash-quality",
    lastViewed: todayIso,
    owner: "Data Manager",
    status: "Draft",
    title: "Data Quality Management Dashboard",
    type: "Data Quality Dashboard",
    visibility: "Data team",
    widgets: ["Quality score", "Critical issues", "GPS flags", "Duplicate trends", "Resolution SLA"],
  },
];

export const previewScheduledReports: ScheduledReportRecord[] = [
  {
    format: "PDF",
    frequency: "Weekly",
    id: "schedule-field-weekly",
    lastRun: todayIso,
    nextRun: tomorrowIso,
    recipients: ["program-managers@atlas.local", "operations@atlas.local"],
    reportId: "report-field-weekly",
    reportTitle: "Field operations weekly brief",
    status: "Active",
    time: "08:00",
    timezone: "Africa/Douala",
  },
  {
    format: "Excel",
    frequency: "Monthly",
    id: "schedule-indicator-monthly",
    lastRun: yesterdayIso,
    nextRun: "2026-07-01T08:00:00.000Z",
    recipients: ["me-team@atlas.local"],
    reportId: "report-water-baseline",
    reportTitle: "Water access baseline vs current",
    status: "Paused",
    time: "09:30",
    timezone: "Europe/Berlin",
  },
  {
    failureLog: "Governance approval is required before sending restricted coordinate annex.",
    format: "PDF",
    frequency: "Quarterly",
    id: "schedule-coverage-quarterly",
    lastRun: yesterdayIso,
    nextRun: "2026-07-05T10:00:00.000Z",
    recipients: ["donor-reports@atlas.local"],
    reportId: "report-coverage-gaps",
    reportTitle: "Coverage gap analysis",
    status: "Failed",
    time: "10:00",
    timezone: "UTC",
  },
];

export const previewExportJobs: ExportJobRecord[] = [
  {
    format: "Excel",
    governance: "Approved",
    id: "EXP-920",
    name: "FAO Q2 indicator annex",
    requestedAt: todayIso,
    requestedBy: "M&E Manager",
    rows: 18420,
    source: "Reports",
    status: "Ready",
  },
  {
    format: "CSV",
    governance: "Approved",
    id: "EXP-919",
    name: "Approved submissions extract",
    requestedAt: todayIso,
    requestedBy: "Data Manager",
    rows: 52890,
    source: "Submissions",
    status: "Processing",
  },
  {
    format: "PDF",
    governance: "Needs approval",
    id: "EXP-918",
    name: "Coverage gap donor package",
    requestedAt: yesterdayIso,
    requestedBy: "Program Manager",
    rows: 34,
    source: "Reports",
    status: "Queued",
  },
  {
    format: "JSON",
    governance: "Restricted",
    id: "EXP-917",
    name: "Quality issues API payload",
    requestedAt: yesterdayIso,
    requestedBy: "Data Quality Officer",
    rows: 482,
    source: "Data Quality",
    status: "Failed",
  },
];

export const previewBuilderSteps: ReportBuilderStep[] = [
  { id: "source", label: "Select Data Source", description: "Projects, Forms, Submissions, Indicators, Beneficiaries, Field Operations, or Data Quality.", status: "Complete" },
  { id: "fields", label: "Choose Fields", description: "Pick the columns, KPIs, and calculated values that answer the reporting question.", status: "Complete" },
  { id: "filters", label: "Add Filters", description: "Apply project, country, form, indicator, date, team, and status filters.", status: "Current" },
  { id: "grouping", label: "Configure Grouping", description: "Group by location, period, project, indicator, field officer, donor, or custom dimensions.", status: "Pending" },
  { id: "visuals", label: "Configure Visualizations", description: "Add tables, charts, KPI cards, heat maps, and map links.", status: "Pending" },
  { id: "preview", label: "Preview", description: "Validate output, governance status, row counts, and export readiness.", status: "Pending" },
  { id: "save", label: "Save or Export", description: "Save the template, share, schedule, export, or send for approval.", status: "Pending" },
];

export const previewKpis: KpiRecord[] = [
  { drillDown: "Beneficiary Reports", id: "kpi-beneficiaries", label: "Total Beneficiaries", periodComparison: "+8% vs last period", target: 55000, trend: "Up", unit: "", value: 48240 },
  { drillDown: "Submission Reports", id: "kpi-approval", label: "Approval Rate", periodComparison: "+3% vs last period", target: 95, trend: "Up", unit: "%", value: 91 },
  { drillDown: "Coverage Reports", id: "kpi-coverage", label: "Coverage Rate", periodComparison: "-2% vs last period", target: 85, trend: "Down", unit: "%", value: 72 },
  { drillDown: "Indicator Reports", id: "kpi-indicator", label: "Indicator Achievement", periodComparison: "+6% vs last period", target: 90, trend: "Up", unit: "%", value: 76 },
  { drillDown: "Data Quality Reports", id: "kpi-quality", label: "Data Quality Score", periodComparison: "Flat", target: 92, trend: "Flat", unit: "%", value: 88 },
  { drillDown: "Field Operations Reports", id: "kpi-completion", label: "Submission Completion", periodComparison: "+5% vs last period", target: 100, trend: "Up", unit: "%", value: 84 },
];

export const previewAuditEvents: ReportAuditEvent[] = [
  { action: "Report generated", actor: "M&E Manager", createdAt: todayIso, id: "audit-report-1", reason: "Quarterly donor package refreshed from approved submissions.", reportId: "report-fao-q2" },
  { action: "Export generated", actor: "Data Manager", createdAt: todayIso, id: "audit-report-2", reason: "Reviewer requested approved submission extract for quality validation.", reportId: "report-review-queue" },
  { action: "Schedule changed", actor: "Program Manager", createdAt: yesterdayIso, id: "audit-report-3", reason: "Weekly delivery moved to Monday morning before management review.", reportId: "report-field-weekly" },
  { action: "Governance approval blocked", actor: "Governance Lead", createdAt: yesterdayIso, id: "audit-report-4", reason: "Restricted coordinate annex requires export approval.", reportId: "report-coverage-gaps" },
];
