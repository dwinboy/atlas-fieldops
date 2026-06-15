"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Download,
  Eye,
  FileBarChart,
  FileImage,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  LineChart,
  Mail,
  Pencil,
  PieChart,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Share2,
  ShieldCheck,
  Table2,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { DataTable, type TableColumn } from "@/components/DataTable";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpHint } from "@/components/ui/help-hint";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  ApiError,
  createCustomDashboard,
  createReport,
  deleteCustomDashboard,
  exportReportCsv,
  generateReport,
  listCustomDashboards,
  listDataQualitySignals,
  listForms,
  listIndicators,
  listProjects,
  listReports,
  listSubmissions,
  updateCustomDashboard,
  type CurrentPrincipal,
  type CustomDashboardCreate,
  type CustomDashboardRead,
  type DonorReportIndicatorMetric,
  type DonorReportMetrics,
  type DonorReportRead,
  type ProjectListItemRead,
} from "@/lib/api";
import {
  getActiveFormPerformance,
  getDashboardApprovalOverview,
  getDashboardCoverageOverview,
  getFormPerformanceTotals,
} from "@/lib/dashboard";
import { useSectorTerminology } from "@/lib/sectorTerminology";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardBuilder, colSpanClasses } from "@/modules/reports/DashboardBuilder";
import {
  DashboardFilterBar,
  defaultDashboardFilters,
  dashboardRangeDays,
  filterDonorReportsByFilters,
  filterFormsByFilters,
  filterIndicatorsByFilters,
  filterQualitySignalsByFilters,
  filterSubmissionsByFilters,
  type DashboardFilters,
} from "@/modules/reports/dashboardFilters";
import { DashboardWidgetBody, type DashboardWidgetData } from "@/modules/reports/DashboardWidgets";
import { widgetTypeIcons, type WidgetType } from "@/modules/reports/data";
import { progressTone } from "@/modules/indicators/utils";
import {
  previewAuditEvents,
  previewBuilderSteps,
  previewDashboards,
  previewExportJobs,
  previewKpis,
  previewReports,
  previewScheduledReports,
  reportsSections,
  type DashboardRecord,
  type ExportJobRecord,
  type KpiRecord,
  type ReportBuilderStep,
  type ReportAuditEvent,
  type ReportRecord,
  type ReportsSection,
  type ScheduledReportRecord,
  type VisualizationType,
} from "@/modules/reports/data";
import {
  canExportReport,
  computeReportsSummary,
  exportStatusTone,
  filterReportsBySection,
  formatTone,
  governanceTone,
  kpiAchievement,
  kpiTone,
  reportStatusTone,
  scheduleTone,
  summarizeReportQuery,
  toCsv,
} from "@/modules/reports/utils";
import { useWorkspaceStore } from "@/stores/workspace";

type ReportsModuleProps = {
  principal?: CurrentPrincipal | null;
  token: string | null;
};

type ReportDetailTab = "Overview" | "Data Sources" | "Filters" | "Visualizations" | "Schedules" | "Exports" | "History" | "Audit Trail";

const detailTabs: ReportDetailTab[] = ["Overview", "Data Sources", "Filters", "Visualizations", "Schedules", "Exports", "History", "Audit Trail"];

const visualizationIcons: Record<VisualizationType, LucideIcon> = {
  "Area Chart": LineChart,
  "Bar Chart": BarChart3,
  "Donut Chart": PieChart,
  "Heat Map": LayoutDashboard,
  "KPI Card": FileBarChart,
  "Line Chart": LineChart,
  "Map Link": LayoutDashboard,
  "Pie Chart": PieChart,
  Table: Table2,
};

function isPreview(token: string | null): boolean {
  return !token || token === "preview-token";
}

const EMPTY_ARRAY: never[] = [];

function reportSectionFromPath(pathname: string | null): ReportsSection {
  const match = reportsSections.find((section) => section.route === pathname);
  return match?.id ?? "dashboard";
}

const REPORT_TYPE_OPTIONS = [
  { value: "indicator", label: "Indicator progress" },
  { value: "donor", label: "Donor package" },
  { value: "beneficiary", label: "Entity / beneficiary summary" },
  { value: "submission", label: "Submission summary" },
  { value: "custom", label: "Custom" },
];

const emptyReportDraft = {
  name: "",
  donor: "",
  reportType: "indicator",
  projectId: "",
  periodStart: "",
  periodEnd: "",
  summary: "",
};

function titleCase(value: string): string {
  return value
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return "Current period";
  if (start && end) return `${new Date(start).toLocaleDateString()} - ${new Date(end).toLocaleDateString()}`;
  return new Date(start ?? end ?? "").toLocaleDateString();
}

function mapApiReport(row: DonorReportRead, ownerRole: string): ReportRecord {
  const rawStatus = titleCase(row.status || "Draft");
  const normalizedStatus: ReportRecord["status"] = rawStatus.includes("Ready")
    ? "Ready"
    : rawStatus.includes("Need")
      ? "Needs Data"
      : rawStatus.includes("Fail")
        ? "Failed"
        : "Draft";
  const metrics = row.metrics_json && Object.keys(row.metrics_json).length > 0 ? (row.metrics_json as DonorReportMetrics) : undefined;
  const dataSources = [row.project_id ? "Project" : "Organization", "Approved submissions"];
  if (metrics && metrics.indicators.length > 0) dataSources.push("Indicators");
  const kpis = metrics && metrics.indicators.length > 0
    ? metrics.indicators.map((indicator) => `${indicator.code} achievement`)
    : ["Generate this report to compute KPIs"];
  return {
    category: row.donor ? "Donor Reports" : "Project Reports",
    dataSources,
    description: row.summary ?? "Imported report package generated from approved Atlas FieldOps evidence.",
    donor: row.donor ?? "Internal",
    filters: [row.project_id ? "Project linked" : "All assigned projects", row.survey_id ? "Survey linked" : "Organization-level", "Approved data default"],
    formats: row.export_formats.map((format) => titleCase(format) as ReportRecord["formats"][number]).filter((format) => ["Excel", "CSV", "PDF", "JSON"].includes(format)),
    governance: normalizedStatus === "Ready" ? "Approved" : "Pending approval",
    id: row.id,
    kpis,
    lastGenerated: row.generated_at,
    metrics,
    owner: ownerRole,
    period: formatDateRange(row.period_start, row.period_end),
    project: row.project_id ? "Linked project" : "Organization-wide",
    status: normalizedStatus,
    title: row.name,
    views: 0,
    visualizations: ["Table", "KPI Card"],
  };
}

function messageFromError(error: unknown): string {
  if (error instanceof ApiError) {
    try {
      const parsed = JSON.parse(error.message) as { detail?: unknown };
      if (typeof parsed.detail === "string") return parsed.detail;
      if (Array.isArray(parsed.detail)) return parsed.detail.map((item) => item?.msg ?? "Invalid field").join(" ");
    } catch {
      return error.message;
    }
  }
  return "Check your reporting permission and try again.";
}

function downloadCsv(filename: string, rows: Record<string, string | number | boolean | null | undefined>[]): void {
  const csv = toCsv(rows);
  if (!csv) return;
  downloadCsvText(filename, csv);
}

function downloadCsvText(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function dashboardTypeForCategory(category: ReportRecord["category"]): DashboardRecord["type"] {
  if (category === "Donor Reports") return "Donor Dashboard";
  if (category === "Indicator Reports") return "Indicator Dashboard";
  if (category === "Data Quality Reports") return "Data Quality Dashboard";
  if (category === "Field Operations Reports") return "Field Operations Dashboard";
  return "Project Dashboard";
}

function deriveLiveDashboards(reports: ReportRecord[]): DashboardRecord[] {
  const grouped = new Map<ReportRecord["category"], ReportRecord[]>();
  for (const report of reports) {
    grouped.set(report.category, [...(grouped.get(report.category) ?? []), report]);
  }
  return Array.from(grouped.entries()).map(([category, categoryReports]) => {
    const readyReports = categoryReports.filter((report) => report.status === "Ready").length;
    return {
      id: `dash-${category.toLowerCase().replaceAll(" ", "-")}`,
      lastViewed: categoryReports[0]?.lastGenerated ?? new Date().toISOString(),
      owner: categoryReports[0]?.owner ?? "Report owner",
      status: readyReports > 0 ? "Active" : "Draft",
      title: `${category.replace(" Reports", "")} dashboard`,
      type: dashboardTypeForCategory(category),
      visibility: category === "Donor Reports" ? "Donors" : category === "Data Quality Reports" ? "Data team" : "Managers",
      widgets: Array.from(new Set(categoryReports.flatMap((report) => report.kpis.concat(report.visualizations)))).slice(0, 5),
    };
  });
}

function estimateReportRows(report: ReportRecord): number {
  if (report.metrics) return Math.max(report.metrics.submissions_approved, report.metrics.submissions_total, report.metrics.indicators.length);
  return Math.max(report.views, report.kpis.length, 1);
}

function preferredExportFormat(formats: ReportRecord["formats"]): ExportJobRecord["format"] {
  if (formats.includes("CSV")) return "CSV";
  if (formats.includes("Excel")) return "Excel";
  if (formats.includes("PDF")) return "PDF";
  if (formats.includes("JSON")) return "JSON";
  return "CSV";
}

function deriveLiveExportJobs(reports: ReportRecord[]): ExportJobRecord[] {
  return reports.map((report) => ({
    format: preferredExportFormat(report.formats),
    governance: canExportReport(report) ? "Approved" : report.governance === "Restricted export" ? "Restricted" : "Needs approval",
    id: `EXP-${report.id.slice(0, 8).toUpperCase()}`,
    name: `${report.title} export`,
    reportId: report.id,
    requestedAt: report.lastGenerated ?? new Date().toISOString(),
    requestedBy: report.owner,
    rows: estimateReportRows(report),
    source: "Reports",
    status: canExportReport(report) ? "Ready" : report.status === "Failed" ? "Failed" : "Queued",
  }));
}

function deriveLiveScheduledReports(reports: ReportRecord[]): ScheduledReportRecord[] {
  return reports
    .filter((report) => report.status === "Scheduled")
    .map((report) => ({
      format: preferredExportFormat(report.formats),
      frequency: "Monthly",
      id: `SCH-${report.id.slice(0, 8).toUpperCase()}`,
      lastRun: report.lastGenerated ?? new Date().toISOString(),
      nextRun: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      recipients: [report.donor === "Internal" ? "management-team" : report.donor],
      reportId: report.id,
      reportTitle: report.title,
      status: "Active",
      time: "08:00",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }));
}

function deriveLiveKpis(reports: ReportRecord[]): KpiRecord[] {
  const ready = reports.filter((report) => report.status === "Ready").length;
  const exportReady = reports.filter(canExportReport).length;
  const generated = reports.filter((report) => report.lastGenerated).length;
  const indicatorProgress = reports.flatMap((report) => report.metrics?.indicators.map((indicator) => indicator.progress_percent) ?? []);
  const averageProgress = indicatorProgress.length
    ? Math.round(indicatorProgress.reduce((total, value) => total + value, 0) / indicatorProgress.length)
    : 0;
  return [
    { drillDown: "Standard Reports", id: "live-total-reports", label: "Total Reports", periodComparison: "Live workspace", target: Math.max(reports.length, 1), trend: "Flat", unit: "", value: reports.length },
    { drillDown: "Ready Reports", id: "live-ready-reports", label: "Ready Reports", periodComparison: "Approved for use", target: Math.max(reports.length, 1), trend: "Flat", unit: "", value: ready },
    { drillDown: "Exports", id: "live-export-ready", label: "Export Ready", periodComparison: "Governance passed", target: Math.max(reports.length, 1), trend: "Flat", unit: "", value: exportReady },
    { drillDown: "Generated Reports", id: "live-generated", label: "Generated Reports", periodComparison: "Metrics computed", target: Math.max(reports.length, 1), trend: "Flat", unit: "", value: generated },
    { drillDown: "Indicator Reports", id: "live-progress", label: "Indicator Progress", periodComparison: indicatorProgress.length ? "Computed from report metrics" : "Generate reports to compute", target: 100, trend: "Flat", unit: "%", value: averageProgress },
  ];
}

function deriveLiveBuilderSteps(reports: ReportRecord[]): ReportBuilderStep[] {
  const hasReports = reports.length > 0;
  const hasGeneratedMetrics = reports.some((report) => report.metrics);
  const hasExports = reports.some((report) => report.formats.length > 0);
  return [
    { id: "source", label: "Select Data Source", description: hasReports ? "Use the existing report library as the live source catalog." : "Create a standard report first so the builder has approved data sources.", status: hasReports ? "Complete" : "Current" },
    { id: "fields", label: "Choose Fields", description: "Choose report columns, KPI values, governance status, projects, periods, owners, and computed metrics.", status: hasReports ? "Current" : "Pending" },
    { id: "filters", label: "Add Filters", description: "Filter by project, donor, period, status, governance approval, data source, or visualization type.", status: "Pending" },
    { id: "visuals", label: "Configure Visualizations", description: hasGeneratedMetrics ? "Generated report metrics are available for KPI cards and progress tables." : "Generate reports to unlock live KPI and indicator metric previews.", status: hasGeneratedMetrics ? "Complete" : "Pending" },
    { id: "preview", label: "Preview", description: "Validate row counts, governance rules, export readiness, and missing-data warnings before sharing.", status: "Pending" },
    { id: "save", label: "Save or Export", description: hasExports ? "Export-ready formats are configured on at least one report." : "Add export formats to reports before delivery.", status: hasExports ? "Complete" : "Pending" },
  ];
}

export function ReportsModule({ token }: ReportsModuleProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<ReportsSection>(() => reportSectionFromPath(pathname));
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<ReportDetailTab>("Overview");
  const [actionResult, setActionResult] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState(emptyReportDraft);
  const setActiveView = useWorkspaceStore((state) => state.setActiveView);
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const queryClient = useQueryClient();
  const preview = isPreview(token);
  const terminology = useSectorTerminology(token);

  const reportsQuery = useQuery({
    queryKey: ["reports-module", token],
    queryFn: () => listReports(token ?? ""),
    enabled: Boolean(token && !preview),
  });
  const projectsQuery = useQuery({
    queryKey: ["reports-module", "projects", token],
    queryFn: () => listProjects(token ?? ""),
    enabled: Boolean(token && !preview),
  });

  const reports = useMemo(
    () => (preview ? previewReports : (reportsQuery.data ?? []).map((row) => mapApiReport(row, terminology.reportOwnerRole))),
    [preview, reportsQuery.data, terminology.reportOwnerRole],
  );

  const generateReportMutation = useMutation({
    mutationFn: (reportId: string) => generateReport(token ?? "", reportId),
    onSuccess: async (report) => {
      await queryClient.invalidateQueries({ queryKey: ["reports-module", token] });
      setActionResult(`${report.name} metrics were recalculated from approved submissions.`);
      pushToast({ title: "Report generated", description: `${report.name} is up to date.`, tone: "success" });
    },
    onError: (error) => {
      const description = messageFromError(error);
      pushToast({ title: "Could not generate report", description, tone: "danger" });
    },
  });

  const createReportMutation = useMutation({
    mutationFn: () =>
      createReport(token ?? "", {
        name: createDraft.name.trim(),
        donor: createDraft.donor.trim() || null,
        report_type: createDraft.reportType,
        project_id: createDraft.projectId || null,
        period_start: createDraft.periodStart || null,
        period_end: createDraft.periodEnd || null,
        summary: createDraft.summary.trim() || null,
      }),
    onSuccess: async (report) => {
      await queryClient.invalidateQueries({ queryKey: ["reports-module", token] });
      setCreateOpen(false);
      setCreateDraft(emptyReportDraft);
      selectReportSection("standard");
      pushToast({
        title: "Report created",
        description: `${report.name} is ready. Generate it to compute KPIs from approved submissions.`,
        tone: "success",
      });
      generateReportMutation.mutate(report.id);
    },
    onError: (error) => {
      pushToast({ title: "Could not create report", description: messageFromError(error), tone: "danger" });
    },
  });

  function openCreateReport(): void {
    setCreateDraft(emptyReportDraft);
    setCreateOpen(true);
  }

  async function exportReportData(report: ReportRecord): Promise<void> {
    try {
      const csv = await exportReportCsv(token ?? "", report.id);
      downloadCsvText(`atlas-report-${report.id}-data.csv`, csv);
      pushToast({ title: "Report data exported", description: `${report.title} computed metrics CSV is ready.`, tone: "success" });
    } catch (error) {
      pushToast({ title: "Could not export report data", description: messageFromError(error), tone: "danger" });
    }
  }
  const dashboards = useMemo(() => (preview ? previewDashboards : deriveLiveDashboards(reports)), [preview, reports]);
  const exportJobs = useMemo(() => (preview ? previewExportJobs : deriveLiveExportJobs(reports)), [preview, reports]);
  const scheduledReports = useMemo(() => (preview ? previewScheduledReports : deriveLiveScheduledReports(reports)), [preview, reports]);
  const reportAuditEvents = useMemo(() => (preview ? previewAuditEvents : []), [preview]);
  const kpis = useMemo(() => (preview ? previewKpis : deriveLiveKpis(reports)), [preview, reports]);
  const builderSteps = useMemo(() => (preview ? previewBuilderSteps : deriveLiveBuilderSteps(reports)), [preview, reports]);
  const summary = useMemo(
    () =>
      computeReportsSummary({
        dashboards,
        exports: exportJobs,
        reports,
        schedules: scheduledReports,
      }),
    [dashboards, exportJobs, reports, scheduledReports],
  );
  const visibleReports = useMemo(() => filterReportsBySection(reports, activeSection), [activeSection, reports]);
  const selectedReport = reports.find((report) => report.id === selectedReportId) ?? null;

  useEffect(() => {
    const routeSection = reportSectionFromPath(pathname);
    if (routeSection !== activeSection) {
      setActiveSection(routeSection);
      setSelectedReportId(null);
    }
  }, [activeSection, pathname]);

  function selectReportSection(section: ReportsSection): void {
    setActiveSection(section);
    setSelectedReportId(null);
    const route = reportsSections.find((item) => item.id === section)?.route;
    if (route && route !== pathname) router.push(route);
  }

  function openReport(report: ReportRecord, tab: ReportDetailTab = "Overview"): void {
    setSelectedReportId(report.id);
    setActiveDetailTab(tab);
    setActionResult(`${report.title} opened. ${summarizeReportQuery(report)}`);
  }

  function exportReports(): void {
    downloadCsv(
      "atlas-reports.csv",
      reports.map((report) => ({
        category: report.category,
        donor: report.donor,
        exportReady: canExportReport(report),
        formats: report.formats.join("; "),
        governance: report.governance,
        lastGenerated: report.lastGenerated,
        owner: report.owner,
        period: report.period,
        project: report.project,
        status: report.status,
        title: report.title,
      })),
    );
    setActionResult("Report index export prepared. Production exports must pass Governance export controls and audit logging.");
    pushToast({ title: "Reports exported", description: "The reporting index CSV is ready.", tone: "success" });
  }

  function runReport(report: ReportRecord): void {
    const result = canExportReport(report)
      ? `${report.title} is ready to run with ${report.dataSources.join(", ")} and export formats ${report.formats.join(", ")}.`
      : `${report.title} needs review before export. Check status, governance approval, and missing data warnings.`;
    setActionResult(result);
  }

  return (
    <section className="space-y-3">
      <div className="rounded-xl border bg-panel p-3.5 shadow-line">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="monitor">ANALYTICS</Badge>
              <Badge tone={summary.failedReportJobs ? "warning" : "success"}>{summary.failedReportJobs} failed jobs</Badge>
              <Badge tone="accent">Route /reports</Badge>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
              <HelpHint label="About Reports" title="Reports">
                Central reporting and analytics hub for standard reports, custom reports, dashboards, schedules, governed exports, donor packages, executive KPIs, and reusable visualizations.
              </HelpHint>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={preview} onClick={openCreateReport} type="button" variant="primary">
              <FileText aria-hidden="true" /> Create report
            </Button>
            <Button onClick={() => selectReportSection("custom")} type="button" variant="secondary">
              <Settings2 aria-hidden="true" /> Build custom report
            </Button>
            <Button onClick={exportReports} type="button" variant="secondary">
              <Download aria-hidden="true" /> Export index
            </Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5 pb-1">
          {reportsSections.map((section) => (
            <button
              className={cn(
                "min-w-36 rounded-lg border px-2.5 py-1.5 text-left transition hover:border-primary/40 hover:bg-primary/5",
                activeSection === section.id ? "border-primary/50 bg-primary/10 shadow-line" : "bg-background",
              )}
              key={section.id}
              onClick={() => selectReportSection(section.id)}
              type="button"
            >
              <span className="flex items-center gap-1.5 text-xs font-semibold">
                {section.label}
              </span>
              <span className="mt-0.5 block text-[10px] leading-4 text-muted-foreground">{section.route}</span>
            </button>
          ))}
        </div>
      </div>

      {actionResult ? (
        <section className="rounded-2xl border border-success/30 bg-success/10 p-4" aria-live="polite">
          <div className="flex items-start gap-3">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 text-success" size={18} />
            <div>
              <h2 className="text-sm font-semibold">Reports workspace update</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{actionResult}</p>
            </div>
          </div>
        </section>
      ) : null}

      {selectedReport ? (
        <ReportDetail
          auditEvents={reportAuditEvents.filter((event) => event.reportId === selectedReport.id)}
          exports={exportJobs}
          generating={generateReportMutation.isPending && generateReportMutation.variables === selectedReport.id}
          onBack={() => setSelectedReportId(null)}
          onExportData={exportReportData}
          onGenerate={(report) => generateReportMutation.mutate(report.id)}
          preview={preview}
          report={selectedReport}
          schedules={scheduledReports.filter((schedule) => schedule.reportId === selectedReport.id)}
          selectedTab={activeDetailTab}
          setSelectedTab={setActiveDetailTab}
        />
      ) : null}

      {!selectedReport && activeSection === "dashboard" ? (
        <ReportsDashboard
          dashboards={dashboards}
          exports={exportJobs}
          kpis={kpis}
          onOpenReport={openReport}
          onOpenSection={selectReportSection}
          reports={reports}
          schedules={scheduledReports}
          summary={summary}
        />
      ) : null}
      {!selectedReport && activeSection === "standard" ? (
        <StandardReports
          generatingId={generateReportMutation.isPending ? generateReportMutation.variables ?? null : null}
          onCreate={openCreateReport}
          onExportData={exportReportData}
          onGenerate={(report) => generateReportMutation.mutate(report.id)}
          onOpenReport={openReport}
          onRunReport={runReport}
          preview={preview}
          reports={visibleReports}
          syncing={reportsQuery.isFetching}
        />
      ) : null}
      {!selectedReport && activeSection === "custom" ? (
        <CustomReportBuilder builderSteps={builderSteps} onOpenReport={openReport} onOpenReports={() => selectReportSection("standard")} reports={reports} />
      ) : null}
      {!selectedReport && activeSection === "dashboards" ? (
        <DashboardsSection
          dashboards={dashboards}
          onOpenReport={openReport}
          onOpenReports={() => selectReportSection("standard")}
          preview={preview}
          projects={projectsQuery.data ?? EMPTY_ARRAY}
          reports={reports}
          token={token}
        />
      ) : null}
      {!selectedReport && activeSection === "scheduled" ? (
        <ScheduledReportsSection onOpenReport={openReport} reports={reports} schedules={scheduledReports} />
      ) : null}
      {!selectedReport && activeSection === "exports" ? (
        <ExportsSection exports={exportJobs} onExportData={exportReportData} onOpenReport={openReport} reports={reports} />
      ) : null}

      <section className="rounded-xl border bg-panel p-3.5 shadow-line">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold">Module boundaries</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Reports consume approved data from Projects, Forms, Submissions, Indicators, Mapping, Data Quality, and Field Operations. Definitions, reviews, GIS analysis, and issue resolution remain in their owning modules.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setActiveView("indicators")} type="button" variant="secondary">
              <BarChart3 aria-hidden="true" /> Indicators
            </Button>
            <Button onClick={() => setActiveView("submissions")} type="button" variant="secondary">
              <FileSpreadsheet aria-hidden="true" /> Submissions
            </Button>
            <Button onClick={() => setActiveView("governance")} type="button" variant="secondary">
              <ShieldCheck aria-hidden="true" /> Governance
            </Button>
          </div>
        </div>
      </section>

      <Modal
        contentClassName="max-w-2xl"
        description="Create a report package from approved Atlas FieldOps evidence. After it is created, the platform computes KPIs from approved submissions and indicators automatically."
        onOpenChange={setCreateOpen}
        open={createOpen}
        title="Create report"
      >
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm font-medium md:col-span-2">
            Report name
            <Input
              className="mt-2"
              onChange={(event) => setCreateDraft((current) => ({ ...current, name: event.target.value }))}
              placeholder="e.g. Q2 2026 Agricultural Resilience donor report"
              value={createDraft.name}
            />
          </label>
          <label className="text-sm font-medium">
            Report type
            <Select
              className="mt-2"
              onChange={(event) => setCreateDraft((current) => ({ ...current, reportType: event.target.value }))}
              value={createDraft.reportType}
            >
              {REPORT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Select>
          </label>
          <label className="text-sm font-medium">
            Donor (optional)
            <Input
              className="mt-2"
              onChange={(event) => setCreateDraft((current) => ({ ...current, donor: event.target.value }))}
              placeholder="Leave blank for an internal report"
              value={createDraft.donor}
            />
          </label>
          <label className="text-sm font-medium md:col-span-2">
            Project scope
            <Select
              className="mt-2"
              onChange={(event) => setCreateDraft((current) => ({ ...current, projectId: event.target.value }))}
              value={createDraft.projectId}
            >
              <option value="">Organization-wide (all assigned projects)</option>
              {(projectsQuery.data ?? []).map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </Select>
          </label>
          <label className="text-sm font-medium">
            Period start
            <Input
              className="mt-2"
              onChange={(event) => setCreateDraft((current) => ({ ...current, periodStart: event.target.value }))}
              type="date"
              value={createDraft.periodStart}
            />
          </label>
          <label className="text-sm font-medium">
            Period end
            <Input
              className="mt-2"
              onChange={(event) => setCreateDraft((current) => ({ ...current, periodEnd: event.target.value }))}
              type="date"
              value={createDraft.periodEnd}
            />
          </label>
          <label className="text-sm font-medium md:col-span-2">
            Summary (optional)
            <Textarea
              className="mt-2"
              onChange={(event) => setCreateDraft((current) => ({ ...current, summary: event.target.value }))}
              placeholder="Narrative context for reviewers and donors."
              rows={3}
              value={createDraft.summary}
            />
          </label>
        </div>
        {createDraft.periodStart && createDraft.periodEnd && createDraft.periodEnd < createDraft.periodStart ? (
          <p className="mt-2 text-xs text-danger">Period end must be on or after period start.</p>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => setCreateOpen(false)} type="button" variant="secondary">Cancel</Button>
          <Button
            disabled={
              createReportMutation.isPending ||
              createDraft.name.trim().length < 2 ||
              Boolean(
                createDraft.periodStart &&
                  createDraft.periodEnd &&
                  createDraft.periodEnd < createDraft.periodStart,
              )
            }
            onClick={() => createReportMutation.mutate()}
            type="button"
            variant="primary"
          >
            {createReportMutation.isPending ? "Creating…" : "Create & generate"}
          </Button>
        </div>
      </Modal>
    </section>
  );
}

function ReportsDashboard({
  dashboards,
  exports,
  kpis,
  onOpenReport,
  onOpenSection,
  reports,
  schedules,
  summary,
}: {
  dashboards: DashboardRecord[];
  exports: ExportJobRecord[];
  kpis: KpiRecord[];
  onOpenReport: (report: ReportRecord) => void;
  onOpenSection: (section: ReportsSection) => void;
  reports: ReportRecord[];
  schedules: ScheduledReportRecord[];
  summary: ReturnType<typeof computeReportsSummary>;
}) {
  const cards: { icon: LucideIcon; label: string; section: ReportsSection; value: number; tone: BadgeProps["tone"] }[] = [
    { icon: FileText, label: "Total Reports", section: "standard", value: summary.totalReports, tone: "accent" },
    { icon: CalendarClock, label: "Scheduled Reports", section: "scheduled", value: summary.scheduledReports, tone: "success" },
    { icon: CheckCircle2, label: "Reports Ready", section: "standard", value: summary.reportsReady, tone: summary.reportsReady ? "success" : "neutral" },
    { icon: Download, label: "Export Jobs", section: "exports", value: summary.exportJobs, tone: "accent" },
    { icon: LayoutDashboard, label: "Active Dashboards", section: "dashboards", value: summary.activeDashboards, tone: "monitor" },
    { icon: Eye, label: "Most Viewed Reports", section: "standard", value: summary.mostViewedReports, tone: "neutral" },
    { icon: Mail, label: "Reports Pending Delivery", section: "scheduled", value: summary.reportsPendingDelivery, tone: summary.reportsPendingDelivery ? "warning" : "success" },
    { icon: Archive, label: "Failed Report Jobs", section: "exports", value: summary.failedReportJobs, tone: summary.failedReportJobs ? "danger" : "success" },
  ];

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <MetricCard icon={card.icon} key={card.label} label={card.label} onClick={() => onOpenSection(card.section)} tone={card.tone} value={card.value} />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel action={<Button onClick={() => onOpenSection("standard")} size="sm" variant="secondary">View all</Button>} title="Recent Reports">
          <div className="space-y-3">
            {reports.slice(0, 4).map((report) => (
              <button className="w-full rounded-xl border bg-background p-3 text-left transition hover:border-primary/40 hover:bg-primary/5" key={report.id} onClick={() => onOpenReport(report)} type="button">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{report.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{report.category} · {report.period}</p>
                  </div>
                  <Badge tone={reportStatusTone(report.status)}>{report.status}</Badge>
                </div>
              </button>
            ))}
          </div>
        </Panel>
        <Panel action={<Button onClick={() => onOpenSection("dashboards")} size="sm" variant="secondary">Open dashboards</Button>} title="Executive KPI Snapshot">
          {kpis.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {kpis.slice(0, 6).map((kpi) => (
                <div className="rounded-xl border bg-background p-3" key={kpi.id}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{kpi.label}</p>
                    <Badge tone={kpiTone(kpi)}>{kpiAchievement(kpi)}%</Badge>
                  </div>
                  <p className="mt-2 text-2xl font-semibold">{kpi.value.toLocaleString()}{kpi.unit}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{kpi.periodComparison} · {kpi.drillDown}</p>
                </div>
              ))}
            </div>
          ) : (
            <Timeline records={[]} />
          )}
        </Panel>
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <Panel title="Scheduled Report Calendar">
          <Timeline records={schedules.map((schedule) => ({ badge: schedule.frequency, label: schedule.reportTitle, meta: `${schedule.nextRun} · ${schedule.time} ${schedule.timezone}`, tone: scheduleTone(schedule.status) }))} />
        </Panel>
        <Panel title="Export Activity">
          <Timeline records={exports.map((job) => ({ badge: job.format, label: job.name, meta: `${job.status} · ${job.rows.toLocaleString()} rows`, tone: exportStatusTone(job.status) }))} />
        </Panel>
        <Panel title="Report Usage Analytics">
          <Timeline records={reports.slice().sort((left, right) => right.views - left.views).slice(0, 5).map((report) => ({ badge: `${report.views}`, label: report.title, meta: `${report.category} · ${report.owner}`, tone: report.views >= 100 ? "success" : "neutral" }))} />
        </Panel>
      </div>
      <Panel action={<Button onClick={() => onOpenSection("dashboards")} size="sm" variant="secondary">Manage dashboards</Button>} title="Popular Dashboards">
        {dashboards.length > 0 ? (
          <div className="grid gap-3 lg:grid-cols-3">
            {dashboards.map((dashboard) => (
              <DashboardCard dashboard={dashboard} key={dashboard.id} />
            ))}
          </div>
        ) : (
          <Timeline records={[]} />
        )}
      </Panel>
    </div>
  );
}

function StandardReports({
  generatingId,
  onCreate,
  onExportData,
  onGenerate,
  onOpenReport,
  onRunReport,
  preview,
  reports,
  syncing,
}: {
  generatingId: string | null;
  onCreate: () => void;
  onExportData: (report: ReportRecord) => void;
  onGenerate: (report: ReportRecord) => void;
  onOpenReport: (report: ReportRecord, tab?: ReportDetailTab) => void;
  onRunReport: (report: ReportRecord) => void;
  preview: boolean;
  reports: ReportRecord[];
  syncing: boolean;
}) {
  const columns: TableColumn<ReportRecord>[] = [
    {
      header: "Report",
      key: "title",
      render: (report) => (
        <button className="text-left font-medium text-primary hover:underline" onClick={() => onOpenReport(report)} type="button">
          {report.title}
          <span className="mt-1 block text-xs font-normal text-muted-foreground">{report.description}</span>
        </button>
      ),
      value: (report) => `${report.title} ${report.description} ${report.category}`,
    },
    { header: "Category", key: "category", render: (report) => report.category, value: (report) => report.category },
    {
      header: "Owner",
      key: "owner",
      render: (report) => (
        <div>
          <p>{report.owner}</p>
          <p className="text-xs text-muted-foreground">{report.project}</p>
        </div>
      ),
      value: (report) => `${report.owner} ${report.project}`,
    },
    { header: "Status", key: "status", render: (report) => <Badge tone={reportStatusTone(report.status)}>{report.status}</Badge>, value: (report) => report.status },
    {
      header: "Formats",
      key: "formats",
      render: (report) => (
        <div className="flex flex-wrap gap-1.5">
          {report.formats.map((format) => <Badge key={format} tone={formatTone(format)}>{format}</Badge>)}
        </div>
      ),
      value: (report) => report.formats.join(" "),
    },
    {
      header: "Actions",
      key: "actions",
      render: (report) => (
        <div className="flex flex-wrap justify-end gap-1.5">
          <Button onClick={() => onRunReport(report)} size="sm" variant="secondary"><Play aria-hidden="true" /> Run</Button>
          {!preview ? (
            <Button disabled={generatingId === report.id} onClick={() => onGenerate(report)} size="sm" variant="secondary">
              <RefreshCw aria-hidden="true" /> {generatingId === report.id ? "Generating…" : "Generate"}
            </Button>
          ) : null}
          {!preview ? (
            <Button onClick={() => onExportData(report)} size="sm" variant="secondary"><Download aria-hidden="true" /> Export data</Button>
          ) : null}
          <Button onClick={() => onOpenReport(report, "Exports")} size="sm" variant="secondary"><Download aria-hidden="true" /> Export</Button>
        </div>
      ),
      align: "right",
    },
  ];

  return (
    <div className="space-y-3">
      <SectionHeader
        action={<Button disabled={preview} onClick={onCreate} type="button"><Plus aria-hidden="true" /> New report</Button>}
        description="Prebuilt program, project, submission, indicator, data quality, coverage, field operations, beneficiary, and donor reports with run, export, schedule, and share actions."
        route="/reports/standard"
        title="Standard Reports"
      />
      <DataTable
        columns={columns}
        emptyAction={preview ? undefined : { label: "Create report", onClick: onCreate }}
        emptyDescription="Reports compute KPIs from approved submissions and indicators. Create one scoped to a project and period, then generate it."
        emptyLabel="No standard reports yet"
        rows={reports}
        searchLabel="Search standard reports, categories, owners, projects"
        title={syncing ? "Standard reports syncing" : "Standard reports"}
      />
    </div>
  );
}

function CustomReportBuilder({
  builderSteps,
  onOpenReport,
  onOpenReports,
  reports,
}: {
  builderSteps: ReportBuilderStep[];
  onOpenReport: (report: ReportRecord, tab?: ReportDetailTab) => void;
  onOpenReports: () => void;
  reports: ReportRecord[];
}) {
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const [dataSource, setDataSource] = useState("Submissions");
  const [visualization, setVisualization] = useState("KPI Card");
  const [savedFilterName, setSavedFilterName] = useState("");
  const [fieldQuery, setFieldQuery] = useState("");
  const [filterQuery, setFilterQuery] = useState("");
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const dataSources = ["Projects", "Forms", "Submissions", "Indicators", "Beneficiaries", "Field Operations", "Data Quality"];
  const fields = ["Project", "Form", "Submission date", "Status", "Location", "Indicator", "Quality score", "Field officer", "Supervisor", "Approved value"];
  const filters = ["Project", "Country", "Region", "District", "Location", "Form", "Indicator", "Period", "Team", "Status"];
  const sourceKey = dataSource.toLowerCase().replace(/s$/, "");
  const matchingReports = useMemo(
    () =>
      reports.filter((report) => {
        const searchable = [
          report.category,
          report.description,
          report.project,
          ...report.dataSources,
          ...report.filters,
          ...report.kpis,
        ].join(" ").toLowerCase();
        if (dataSource === "Field Operations") return report.category === "Field Operations Reports" || searchable.includes("field");
        if (dataSource === "Data Quality") return report.category === "Data Quality Reports" || searchable.includes("quality");
        if (dataSource === "Beneficiaries") return report.category === "Beneficiary Reports" || searchable.includes("beneficiar");
        return searchable.includes(sourceKey);
      }),
    [dataSource, reports, sourceKey],
  );
  const previewRows = matchingReports.map((report) => ({
    exportReady: canExportReport(report) ? "Yes" : "Needs review",
    governance: report.governance,
    metrics: report.metrics ? "Computed" : "Not generated",
    period: report.period,
    project: report.project,
    status: report.status,
    title: report.title,
  }));
  const previewColumns: TableColumn<ReportRecord>[] = [
    {
      header: "Report",
      key: "title",
      render: (report) => (
        <button className="text-left font-medium text-primary hover:underline" onClick={() => onOpenReport(report)} type="button">
          {report.title}
          <span className="mt-1 block text-xs font-normal text-muted-foreground">{report.project} · {report.period}</span>
        </button>
      ),
      value: (report) => `${report.title} ${report.project} ${report.period}`,
    },
    { header: "Status", key: "status", render: (report) => <Badge tone={reportStatusTone(report.status)}>{report.status}</Badge>, value: (report) => report.status },
    { header: "Governance", key: "governance", render: (report) => <Badge tone={governanceTone(report.governance)}>{report.governance}</Badge>, value: (report) => report.governance },
    { header: "Metrics", key: "metrics", render: (report) => (report.metrics ? "Computed" : "Not generated"), value: (report) => (report.metrics ? "Computed" : "Not generated") },
    {
      header: "Action",
      key: "action",
      render: (report) => <Button onClick={() => onOpenReport(report, "Overview")} size="sm" variant="secondary">Open</Button>,
      align: "right",
    },
  ];

  function toggleItem(setter: (updater: (current: string[]) => string[]) => void, item: string): void {
    setter((current) => (current.includes(item) ? current.filter((entry) => entry !== item) : [...current, item]));
  }

  function exportBuilderConfig(): void {
    downloadCsv("atlas-custom-report-config.csv", [
      {
        dataSource,
        fields: selectedFields.join("; "),
        filters: selectedFilters.join("; "),
        savedFilterSet: savedFilterName || "Unsaved",
        visualization,
      },
    ]);
    pushToast({ description: "The custom report configuration CSV is ready.", title: "Report configuration exported", tone: "success" });
  }

  function exportBuilderPreview(): void {
    downloadCsv("atlas-custom-report-preview.csv", previewRows);
    pushToast({ description: `${previewRows.length} matching report rows were exported.`, title: "Report preview exported", tone: "success" });
  }

  function shareBuilderPackage(): void {
    downloadCsv("atlas-custom-report-share-package.csv", [
      {
        dataSource,
        exportReadyReports: matchingReports.filter(canExportReport).length,
        fields: selectedFields.join("; "),
        filters: selectedFilters.join("; "),
        matchingReports: matchingReports.length,
        savedFilterSet: savedFilterName || "Unsaved",
        shareStatus: "Prepared for manager review",
        visualization,
      },
    ]);
    pushToast({ description: "A share package was prepared with the current report setup, readiness, and selected controls.", title: "Share package ready", tone: "success" });
  }

  return (
    <div className="space-y-3">
      <SectionHeader
        action={<Button onClick={onOpenReports} variant="secondary"><FileText aria-hidden="true" /> Browse report library</Button>}
        description="Build ad hoc analytics by selecting data sources, fields, filters, grouping, visualizations, preview rules, and governed export options."
        route="/reports/custom"
        title="Custom Reports"
      />
      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Panel title="Report Builder Steps">
          {builderSteps.length > 0 ? (
            <div className="space-y-1.5">
              {builderSteps.map((step, index) => (
                <div className="rounded-lg border bg-background/80 px-2.5 py-2" key={step.id}>
                  <div className="flex items-start gap-2">
                    <Badge tone={step.status === "Complete" ? "success" : step.status === "Current" ? "accent" : "neutral"}>{index + 1}</Badge>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold leading-5">{step.label}</p>
                      <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Timeline records={[]} />
          )}
        </Panel>
        <div className="space-y-3">
          <Panel title="Configure Report">
            <div className="grid gap-4 lg:grid-cols-3">
              <label className="space-y-1.5 text-sm font-medium">
                Data source
                <Select value={dataSource} onChange={(event) => setDataSource(event.target.value)}>
                  {dataSources.map((source) => <option key={source} value={source}>{source}</option>)}
                </Select>
              </label>
              <label className="space-y-1.5 text-sm font-medium">
                Visualization
                <Select value={visualization} onChange={(event) => setVisualization(event.target.value)}>
                  {(["Table", "Bar Chart", "Line Chart", "Area Chart", "Pie Chart", "Donut Chart", "KPI Card", "Heat Map", "Map Link"] as VisualizationType[]).map((type) => <option key={type} value={type}>{type}</option>)}
                </Select>
              </label>
              <label className="space-y-1.5 text-sm font-medium">
                Saved filter set
                <Input onChange={(event) => setSavedFilterName(event.target.value)} placeholder="Q2 approved data" value={savedFilterName} />
              </label>
            </div>
          </Panel>
          <div className="grid gap-5 lg:grid-cols-2">
            <BuilderPanel items={fields} onQueryChange={setFieldQuery} onToggle={(item) => toggleItem(setSelectedFields, item)} query={fieldQuery} selected={selectedFields} title="Choose Fields" />
            <BuilderPanel items={filters} onQueryChange={setFilterQuery} onToggle={(item) => toggleItem(setSelectedFilters, item)} query={filterQuery} selected={selectedFilters} title="Add Filters" />
          </div>
          <Panel title="Preview">
            <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
              <div className="rounded-xl border bg-background p-4">
                <div className="flex items-center gap-2">
                  {renderVisualizationIcon(visualization as VisualizationType, "text-primary")}
                  <h3 className="text-sm font-semibold">{dataSource} report preview</h3>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">Data source</p>
                    <p className="mt-2 text-xl font-semibold">{dataSource}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">Matching reports</p>
                    <p className="mt-2 text-xl font-semibold">{matchingReports.length}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">Export ready</p>
                    <p className="mt-2 text-xl font-semibold">{matchingReports.filter(canExportReport).length}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <DataTable
                    columns={previewColumns}
                    emptyDescription="Create or generate a standard report that uses this data source, then return here to build a custom view from it."
                    emptyLabel="No matching reports for this source"
                    rows={matchingReports}
                    searchLabel="Search matching reports"
                    title="Live report preview"
                  />
                </div>
              </div>
              <div className="rounded-xl border bg-background p-4">
                <h3 className="text-sm font-semibold">Save or Export</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Selected fields: {selectedFields.length}. Filters: {selectedFilters.length}. Save the setup, share with a role, schedule delivery, or send restricted exports to Governance for approval.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={shareBuilderPackage} size="sm" variant="secondary"><Share2 aria-hidden="true" /> Share</Button>
                  <Button onClick={exportBuilderConfig} size="sm" variant="secondary"><Download aria-hidden="true" /> Export setup</Button>
                  <Button disabled={previewRows.length === 0} onClick={exportBuilderPreview} size="sm"><Download aria-hidden="true" /> Export preview</Button>
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function DashboardsSection({
  dashboards,
  onOpenReport,
  onOpenReports,
  preview,
  projects,
  reports,
  token,
}: {
  dashboards: DashboardRecord[];
  onOpenReport: (report: ReportRecord, tab?: ReportDetailTab) => void;
  onOpenReports: () => void;
  preview: boolean;
  projects: ProjectListItemRead[];
  reports: ReportRecord[];
  token: string | null;
}) {
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const queryClient = useQueryClient();
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingDashboard, setEditingDashboard] = useState<CustomDashboardRead | null>(null);
  const [viewingDashboard, setViewingDashboard] = useState<CustomDashboardRead | null>(null);
  const [filters, setFilters] = useState<DashboardFilters>(defaultDashboardFilters);
  const [exporting, setExporting] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const customDashboardsQuery = useQuery({
    queryKey: ["custom-dashboards", token],
    queryFn: () => listCustomDashboards(token ?? ""),
    enabled: Boolean(token && !preview),
  });
  const indicatorsQuery = useQuery({
    queryKey: ["custom-dashboards", "indicators", token],
    queryFn: () => listIndicators(token ?? ""),
    enabled: Boolean(token && !preview),
  });
  const formsQuery = useQuery({
    queryKey: ["custom-dashboards", "forms", token],
    queryFn: () => listForms(token ?? ""),
    enabled: Boolean(token && !preview),
  });
  const submissionsQuery = useQuery({
    queryKey: ["custom-dashboards", "submissions", token],
    queryFn: () => listSubmissions(token ?? ""),
    enabled: Boolean(token && !preview),
  });
  const qualitySignalsQuery = useQuery({
    queryKey: ["custom-dashboards", "quality-signals", token],
    queryFn: () => listDataQualitySignals(token ?? ""),
    enabled: Boolean(token && !preview),
  });

  const customDashboards = customDashboardsQuery.data ?? EMPTY_ARRAY;
  const indicators = indicatorsQuery.data ?? EMPTY_ARRAY;
  const forms = formsQuery.data ?? EMPTY_ARRAY;
  const submissions = submissionsQuery.data ?? EMPTY_ARRAY;
  const qualitySignals = qualitySignalsQuery.data ?? EMPTY_ARRAY;

  const allDonorReports = useMemo(() => reports.filter((report) => report.metrics), [reports]);

  const filteredSubmissions = useMemo(() => filterSubmissionsByFilters(submissions, filters), [submissions, filters]);
  const filteredForms = useMemo(() => filterFormsByFilters(forms, filters), [forms, filters]);
  const filteredIndicators = useMemo(() => filterIndicatorsByFilters(indicators, filters), [indicators, filters]);
  const filteredDonorReports = useMemo(
    () => filterDonorReportsByFilters(allDonorReports, filters, projects),
    [allDonorReports, filters, projects],
  );
  const allowedSubmissionIds = useMemo(
    () => (filters.projectId === "all" ? null : new Set(submissions.filter((submission) => submission.project_id === filters.projectId).map((submission) => submission.id))),
    [submissions, filters.projectId],
  );
  const filteredQualitySignals = useMemo(
    () => filterQualitySignalsByFilters(qualitySignals, filters, allowedSubmissionIds),
    [qualitySignals, filters, allowedSubmissionIds],
  );

  const formPerformance = useMemo(() => getActiveFormPerformance(filteredForms, filteredSubmissions), [filteredForms, filteredSubmissions]);
  const formTotals = useMemo(() => getFormPerformanceTotals(formPerformance), [formPerformance]);
  const approvalOverview = useMemo(() => getDashboardApprovalOverview(filteredSubmissions, formTotals), [filteredSubmissions, formTotals]);
  const coverage = useMemo(() => getDashboardCoverageOverview(filteredSubmissions), [filteredSubmissions]);

  const widgetData: DashboardWidgetData = useMemo(
    () => ({
      approvalOverview,
      coverage,
      donorReports: filteredDonorReports,
      formPerformance,
      indicators: filteredIndicators,
      qualitySignals: filteredQualitySignals,
      submissions: filteredSubmissions,
      trendDays: dashboardRangeDays(filters.range) ?? 14,
    }),
    [approvalOverview, coverage, filteredDonorReports, formPerformance, filteredIndicators, filteredQualitySignals, filteredSubmissions, filters.range],
  );

  const isLoadingWidgetData =
    !preview &&
    Boolean(token) &&
    (customDashboardsQuery.isLoading ||
      indicatorsQuery.isLoading ||
      formsQuery.isLoading ||
      submissionsQuery.isLoading ||
      qualitySignalsQuery.isLoading);

  async function handleExportImage(dashboard: CustomDashboardRead): Promise<void> {
    if (!gridRef.current) return;
    setExporting(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(gridRef.current, { backgroundColor: "#ffffff" });
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `${dashboard.name}.png`;
      link.click();
    } catch (error) {
      pushToast({ description: messageFromError(error), title: "Could not export dashboard image", tone: "danger" });
    } finally {
      setExporting(false);
    }
  }

  async function handleExportPdf(dashboard: CustomDashboardRead): Promise<void> {
    if (!gridRef.current) return;
    setExporting(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
      const canvas = await html2canvas(gridRef.current, { backgroundColor: "#ffffff" });
      const pdf = new jsPDF({
        orientation: canvas.width >= canvas.height ? "landscape" : "portrait",
        unit: "px",
        format: [canvas.width, canvas.height],
      });
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(`${dashboard.name}.pdf`);
    } catch (error) {
      pushToast({ description: messageFromError(error), title: "Could not export dashboard PDF", tone: "danger" });
    } finally {
      setExporting(false);
    }
  }

  const createMutation = useMutation({
    mutationFn: (payload: CustomDashboardCreate) => createCustomDashboard(token ?? "", payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["custom-dashboards", token] });
      setBuilderOpen(false);
      pushToast({ description: "Your dashboard has been saved.", title: "Dashboard created", tone: "success" });
    },
    onError: (error) => pushToast({ description: messageFromError(error), title: "Could not create dashboard", tone: "danger" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CustomDashboardCreate }) => updateCustomDashboard(token ?? "", id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["custom-dashboards", token] });
      setBuilderOpen(false);
      setEditingDashboard(null);
      pushToast({ description: "Your changes have been saved.", title: "Dashboard updated", tone: "success" });
    },
    onError: (error) => pushToast({ description: messageFromError(error), title: "Could not update dashboard", tone: "danger" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCustomDashboard(token ?? "", id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["custom-dashboards", token] });
      pushToast({ description: "The dashboard was removed.", title: "Dashboard deleted", tone: "success" });
    },
    onError: (error) => pushToast({ description: messageFromError(error), title: "Could not delete dashboard", tone: "danger" }),
  });

  function openCreateBuilder(): void {
    setEditingDashboard(null);
    setBuilderOpen(true);
  }

  function openEditBuilder(dashboard: CustomDashboardRead): void {
    setEditingDashboard(dashboard);
    setBuilderOpen(true);
  }

  function handleSave(payload: CustomDashboardCreate): void {
    if (editingDashboard) {
      updateMutation.mutate({ id: editingDashboard.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function handleDelete(dashboard: CustomDashboardRead): void {
    if (typeof window !== "undefined" && !window.confirm(`Delete "${dashboard.name}"? This cannot be undone.`)) return;
    deleteMutation.mutate(dashboard.id);
  }

  const columns: TableColumn<ReportRecord>[] = [
    {
      header: "Source Report",
      key: "report",
      render: (report) => (
        <button className="text-left font-medium text-primary hover:underline" onClick={() => onOpenReport(report)} type="button">
          {report.title}
          <span className="mt-1 block text-xs font-normal text-muted-foreground">{report.category} · {report.project}</span>
        </button>
      ),
      value: (report) => `${report.title} ${report.category} ${report.project}`,
    },
    { header: "Dashboard Type", key: "type", render: (report) => dashboardTypeForCategory(report.category), value: (report) => dashboardTypeForCategory(report.category) },
    { header: "Status", key: "status", render: (report) => <Badge tone={reportStatusTone(report.status)}>{report.status}</Badge>, value: (report) => report.status },
    { header: "Widgets", key: "widgets", render: (report) => report.kpis.slice(0, 3).join(", ") || "Report summary", value: (report) => report.kpis.join(" ") },
    {
      header: "Action",
      key: "action",
      render: (report) => <Button onClick={() => onOpenReport(report, "Visualizations")} size="sm" variant="secondary">Open visuals</Button>,
      align: "right",
    },
  ];

  return (
    <div className="space-y-3">
      <SectionHeader
        action={<Button onClick={openCreateBuilder} type="button"><Plus aria-hidden="true" /> Create Dashboard</Button>}
        description="Interactive analytics dashboards with KPI cards, tables, charts, maps, activity feeds, progress widgets, responsive layouts, and role-based visibility."
        route="/reports/dashboards"
        title="Dashboards"
      />
      {preview ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {dashboards.map((dashboard) => <DashboardCard dashboard={dashboard} key={dashboard.id} />)}
        </div>
      ) : customDashboardsQuery.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div className="space-y-3 rounded-2xl border bg-background p-4 shadow-line" key={index}>
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-8 w-24" />
            </div>
          ))}
        </div>
      ) : customDashboards.length ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {customDashboards.map((dashboard) => (
            <CustomDashboardCard
              dashboard={dashboard}
              key={dashboard.id}
              onDelete={() => handleDelete(dashboard)}
              onEdit={() => openEditBuilder(dashboard)}
              onView={() => {
                setFilters(defaultDashboardFilters);
                setViewingDashboard(dashboard);
              }}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed bg-background p-6 text-center text-sm text-muted-foreground">
          No dashboards yet. Create one to combine indicators, submissions, donor metrics, and data quality signals into a single view.
        </div>
      )}
      <Panel action={<Button onClick={onOpenReports} size="sm" variant="secondary">Open reports</Button>} title="Dashboard builder capabilities">
        <div className="grid gap-3 md:grid-cols-4">
          {["Drag and drop layout", "Role-based visibility", "Cross-filtering", "Reusable widgets", "Fullscreen visualizations", "Export image", "Map links", "Responsive dashboards"].map((item) => (
            <div className="rounded-xl border bg-background p-3 text-sm" key={item}>{item}</div>
          ))}
        </div>
      </Panel>
      <Panel title="Dashboard source reports">
        <DataTable
          columns={columns}
          emptyDescription="Create or generate reports with KPI cards, charts, or map links to make them available as dashboard sources."
          emptyLabel="No dashboard source reports yet"
          rows={reports.filter((report) => report.visualizations.some((visual) => visual.includes("Chart") || visual === "KPI Card" || visual === "Map Link"))}
          searchLabel="Search dashboard source reports"
          title="Reports powering dashboards"
        />
      </Panel>
      {!preview ? (
        <DashboardBuilder
          dashboard={editingDashboard}
          data={widgetData}
          onOpenChange={setBuilderOpen}
          onSave={handleSave}
          open={builderOpen}
          saving={createMutation.isPending || updateMutation.isPending}
        />
      ) : null}
      {viewingDashboard ? (
        <Modal contentClassName="max-w-6xl" onOpenChange={() => setViewingDashboard(null)} open={Boolean(viewingDashboard)} title={viewingDashboard.name}>
          <div className="max-h-[75vh] overflow-y-auto p-5 product-scrollbar">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <DashboardFilterBar filters={filters} onChange={setFilters} projects={projects} />
              <div className="flex gap-2">
                <Button disabled={exporting} onClick={() => handleExportImage(viewingDashboard)} size="sm" variant="secondary">
                  <FileImage aria-hidden="true" /> Export PNG
                </Button>
                <Button disabled={exporting} onClick={() => handleExportPdf(viewingDashboard)} size="sm" variant="secondary">
                  <FileText aria-hidden="true" /> Export PDF
                </Button>
              </div>
            </div>
            {isLoadingWidgetData ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[0, 1, 2].map((index) => (
                  <Skeleton className="h-32 rounded-xl" key={index} />
                ))}
              </div>
            ) : viewingDashboard.widgets.length ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" ref={gridRef}>
                {viewingDashboard.widgets.map((widget) => {
                  const TypeIcon = widgetTypeIcons[widget.type as WidgetType];
                  return (
                    <div className={cn("rounded-xl border bg-background p-3", colSpanClasses[widget.width])} key={widget.id}>
                      <div className="mb-2 flex items-center gap-1.5">
                        {TypeIcon ? <TypeIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" /> : null}
                        <p className="text-sm font-semibold">{widget.title}</p>
                      </div>
                      <DashboardWidgetBody data={widgetData} widget={widget} />
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">This dashboard has no widgets yet. Edit it to add some.</p>
            )}
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function CustomDashboardCard({
  dashboard,
  onDelete,
  onEdit,
  onView,
}: {
  dashboard: CustomDashboardRead;
  onDelete: () => void;
  onEdit: () => void;
  onView: () => void;
}) {
  const accentClass = dashboard.status === "active" ? "border-l-success" : dashboard.status === "draft" ? "border-l-warning" : "border-l-border";

  return (
    <article className={cn("rounded-2xl border border-l-4 bg-background p-4 shadow-line", accentClass)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <button className="text-left text-sm font-semibold text-primary hover:underline" onClick={onView} type="button">
            {dashboard.name}
          </button>
          <p className="mt-1 text-xs text-muted-foreground">{dashboard.dashboard_type} · {dashboard.visibility}</p>
        </div>
        <Badge tone={dashboard.status === "active" ? "success" : dashboard.status === "draft" ? "warning" : "neutral"}>{dashboard.status}</Badge>
      </div>
      {dashboard.description ? <p className="mt-2 text-xs text-muted-foreground">{dashboard.description}</p> : null}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {dashboard.widgets.length ? (
          <>
            {dashboard.widgets.slice(0, 4).map((widget) => {
              const TypeIcon = widgetTypeIcons[widget.type as WidgetType];
              return (
                <Badge className="gap-1" key={widget.id} tone="neutral">
                  {TypeIcon ? <TypeIcon aria-hidden="true" className="h-3 w-3" /> : null}
                  {widget.title}
                </Badge>
              );
            })}
            {dashboard.widgets.length > 4 ? <Badge tone="neutral">+{dashboard.widgets.length - 4} more</Badge> : null}
          </>
        ) : (
          <Badge tone="neutral">No widgets yet</Badge>
        )}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Updated {new Date(dashboard.updated_at).toLocaleDateString()}</p>
      <div className="mt-3 flex gap-2">
        <Button onClick={onView} size="sm" variant="secondary">
          <Eye aria-hidden="true" /> View
        </Button>
        <Button onClick={onEdit} size="sm" variant="secondary">
          <Pencil aria-hidden="true" /> Edit
        </Button>
        <Button onClick={onDelete} size="sm" variant="ghost">
          <Trash2 aria-hidden="true" /> Delete
        </Button>
      </div>
    </article>
  );
}

function ScheduledReportsSection({
  onOpenReport,
  reports,
  schedules,
}: {
  onOpenReport: (report: ReportRecord, tab?: ReportDetailTab) => void;
  reports: ReportRecord[];
  schedules: ScheduledReportRecord[];
}) {
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const [scheduleRows, setScheduleRows] = useState<ScheduledReportRecord[]>(schedules);
  function createSchedule(): void {
    const report = reports.find(canExportReport) ?? reports[0];
    const nextRun = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const schedule: ScheduledReportRecord = {
      format: report?.formats[0] ?? "PDF",
      frequency: "Weekly",
      id: `schedule-draft-${Date.now()}`,
      lastRun: new Date().toISOString(),
      nextRun: nextRun.toISOString(),
      recipients: ["managers@example.org"],
      reportId: report?.id ?? "draft-report",
      reportTitle: report?.title ?? "Draft report schedule",
      status: report && canExportReport(report) ? "Active" : "Paused",
      time: "08:00",
      timezone: "Africa/Douala",
    };
    setScheduleRows((current) => [schedule, ...current]);
    pushToast({ description: "Draft schedule added. Review recipients, format, and governance before production delivery.", title: "Schedule created", tone: "success" });
  }
  const columns: TableColumn<ScheduledReportRecord>[] = [
    { header: "Report", key: "report", render: (schedule) => <div><p className="font-medium">{schedule.reportTitle}</p><p className="text-xs text-muted-foreground">{schedule.id}</p></div>, value: (schedule) => schedule.reportTitle },
    { header: "Frequency", key: "frequency", render: (schedule) => `${schedule.frequency} · ${schedule.time} ${schedule.timezone}`, value: (schedule) => schedule.frequency },
    { header: "Recipients", key: "recipients", render: (schedule) => schedule.recipients.join(", "), value: (schedule) => schedule.recipients.join(" ") },
    { header: "Next Run", key: "nextRun", render: (schedule) => new Date(schedule.nextRun).toLocaleString(), value: (schedule) => schedule.nextRun },
    { header: "Status", key: "status", render: (schedule) => <Badge tone={scheduleTone(schedule.status)}>{schedule.status}</Badge>, value: (schedule) => schedule.status },
  ];
  const candidateColumns: TableColumn<ReportRecord>[] = [
    {
      header: "Report",
      key: "report",
      render: (report) => (
        <button className="text-left font-medium text-primary hover:underline" onClick={() => onOpenReport(report, "Overview")} type="button">
          {report.title}
          <span className="mt-1 block text-xs font-normal text-muted-foreground">{report.project} · {report.period}</span>
        </button>
      ),
      value: (report) => `${report.title} ${report.project} ${report.period}`,
    },
    { header: "Readiness", key: "readiness", render: (report) => <Badge tone={canExportReport(report) ? "success" : "warning"}>{canExportReport(report) ? "Ready to schedule" : "Review first"}</Badge>, value: (report) => (canExportReport(report) ? "Ready" : "Review") },
    { header: "Governance", key: "governance", render: (report) => <Badge tone={governanceTone(report.governance)}>{report.governance}</Badge>, value: (report) => report.governance },
    { header: "Formats", key: "formats", render: (report) => report.formats.join(", ") || "No format", value: (report) => report.formats.join(" ") },
    {
      header: "Action",
      key: "action",
      render: (report) => <Button onClick={() => onOpenReport(report, "Schedules")} size="sm" variant="secondary">Review</Button>,
      align: "right",
    },
  ];

  return (
    <div className="space-y-3">
      <SectionHeader
        action={<Button onClick={createSchedule} type="button"><CalendarClock aria-hidden="true" /> Create Schedule</Button>}
        description="Automate report generation and delivery by daily, weekly, monthly, quarterly, or custom schedules with delivery tracking and failure logs."
        route="/reports/scheduled"
        title="Scheduled Reports"
      />
      <DataTable columns={columns} emptyLabel="No scheduled reports yet" rows={scheduleRows} searchLabel="Search schedules, recipients, frequency" title="Scheduled report delivery" />
      <Panel title="Schedule readiness">
        <DataTable
          columns={candidateColumns}
          emptyDescription="Create a standard report first, generate it, then return here to prepare delivery scheduling."
          emptyLabel="No reports available for scheduling"
          rows={reports}
          searchLabel="Search reports to schedule"
          title="Reports that can be scheduled"
        />
      </Panel>
      <Panel title="Failure logs and delivery control">
        <Timeline records={scheduleRows.filter((schedule) => schedule.failureLog).map((schedule) => ({ badge: schedule.status, label: schedule.reportTitle, meta: schedule.failureLog ?? "", tone: scheduleTone(schedule.status) }))} />
      </Panel>
    </div>
  );
}

function ExportsSection({
  exports,
  onExportData,
  onOpenReport,
  reports,
}: {
  exports: ExportJobRecord[];
  onExportData: (report: ReportRecord) => void;
  onOpenReport: (report: ReportRecord, tab?: ReportDetailTab) => void;
  reports: ReportRecord[];
}) {
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const [exportRows, setExportRows] = useState<ExportJobRecord[]>(exports);
  const reportById = useMemo(() => new Map(reports.map((report) => [report.id, report])), [reports]);
  function createExport(): void {
    const report = reports.find(canExportReport) ?? reports[0];
    const job: ExportJobRecord = {
      format: report?.formats[0] ?? "Excel",
      governance: report && canExportReport(report) ? "Approved" : "Needs approval",
      id: `export-draft-${Date.now()}`,
      name: report ? `${report.title} export` : "Draft export job",
      reportId: report?.id,
      requestedAt: new Date().toISOString(),
      requestedBy: "Current user",
      rows: report ? Math.max(report.metrics?.submissions_total ?? 0, report.metrics?.submissions_approved ?? 0, 1) : 0,
      source: "Reports",
      status: report && canExportReport(report) ? "Ready" : "Queued",
    };
    setExportRows((current) => [job, ...current]);
    pushToast({ description: "Export job added. Governance status reflects whether the source report is ready for export.", title: "Export created", tone: "success" });
  }

  function sourceReport(job: ExportJobRecord): ReportRecord | null {
    if (job.reportId) return reportById.get(job.reportId) ?? null;
    return reports.find((report) => job.name.toLowerCase().startsWith(report.title.toLowerCase())) ?? null;
  }

  const columns: TableColumn<ExportJobRecord>[] = [
    { header: "Export", key: "name", render: (job) => <div><p className="font-medium">{job.name}</p><p className="text-xs text-muted-foreground">{job.id} · {job.source}</p></div>, value: (job) => `${job.name} ${job.source}` },
    { header: "Requested", key: "requested", render: (job) => <div><p>{job.requestedBy}</p><p className="text-xs text-muted-foreground">{new Date(job.requestedAt).toLocaleString()}</p></div>, value: (job) => `${job.requestedBy} ${job.requestedAt}` },
    { header: "Format", key: "format", render: (job) => <Badge tone={formatTone(job.format)}>{job.format}</Badge>, value: (job) => job.format },
    { header: "Rows", key: "rows", render: (job) => job.rows.toLocaleString(), value: (job) => String(job.rows) },
    { header: "Status", key: "status", render: (job) => <Badge tone={exportStatusTone(job.status)}>{job.status}</Badge>, value: (job) => job.status },
    { header: "Governance", key: "governance", render: (job) => <Badge tone={governanceTone(job.governance)}>{job.governance}</Badge>, value: (job) => job.governance },
    {
      header: "Actions",
      key: "actions",
      render: (job) => {
        const report = sourceReport(job);
        return (
          <div className="flex flex-wrap justify-end gap-1.5">
            <Button disabled={!report} onClick={() => report ? onOpenReport(report, "Exports") : undefined} size="sm" variant="secondary">
              <Eye aria-hidden="true" /> Source
            </Button>
            <Button disabled={!report || !canExportReport(report)} onClick={() => report ? onExportData(report) : undefined} size="sm" variant="secondary">
              <Download aria-hidden="true" /> CSV
            </Button>
          </div>
        );
      },
      align: "right",
    },
  ];
  return (
    <div className="space-y-3">
      <SectionHeader
        action={<Button onClick={createExport} type="button"><Download aria-hidden="true" /> Create Export</Button>}
        description="Manage Excel, CSV, PDF, and JSON export jobs from reports, indicators, submissions, projects, beneficiaries, and data quality with governance approval checks."
        route="/reports/exports"
        title="Exports"
      />
      <DataTable columns={columns} emptyLabel="No export jobs yet" rows={exportRows} searchLabel="Search exports, sources, requester, status" title="Export center" />
    </div>
  );
}

function ReportDetail({
  auditEvents,
  exports,
  generating,
  onBack,
  onExportData,
  onGenerate,
  preview,
  report,
  schedules,
  selectedTab,
  setSelectedTab,
}: {
  auditEvents: ReportAuditEvent[];
  exports: ExportJobRecord[];
  generating: boolean;
  onBack: () => void;
  onExportData: (report: ReportRecord) => void;
  onGenerate: (report: ReportRecord) => void;
  preview: boolean;
  report: ReportRecord;
  schedules: ScheduledReportRecord[];
  selectedTab: ReportDetailTab;
  setSelectedTab: (tab: ReportDetailTab) => void;
}) {
  const pushToast = useWorkspaceStore((state) => state.pushToast);

  function exportReportDefinition(): void {
    downloadCsv(`atlas-report-${report.id}.csv`, [
      {
        category: report.category,
        dataSources: report.dataSources.join("; "),
        donor: report.donor,
        filters: report.filters.join("; "),
        formats: report.formats.join("; "),
        governance: report.governance,
        kpis: report.kpis.join("; "),
        owner: report.owner,
        period: report.period,
        project: report.project,
        status: report.status,
        title: report.title,
        visualizations: report.visualizations.join("; "),
      },
    ]);
    pushToast({ description: `${report.title} is ready as a CSV definition export.`, title: "Report exported", tone: "success" });
  }

  return (
    <section className="space-y-3 rounded-xl border bg-panel p-3.5 shadow-line">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={reportStatusTone(report.status)}>{report.status}</Badge>
            <Badge tone={governanceTone(report.governance)}>{report.governance}</Badge>
            <Badge tone="neutral">{report.period}</Badge>
          </div>
          <h2 className="mt-3 text-xl font-semibold">{report.title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{report.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onBack} type="button" variant="secondary">Back to Reports</Button>
          {!preview ? (
            <Button disabled={generating} onClick={() => onGenerate(report)} type="button" variant="secondary">
              <RefreshCw aria-hidden="true" /> {generating ? "Generating…" : "Generate"}
            </Button>
          ) : null}
          {!preview ? (
            <Button onClick={() => onExportData(report)} type="button" variant="secondary"><Download aria-hidden="true" /> Export data (CSV)</Button>
          ) : null}
          <Button disabled={!canExportReport(report)} onClick={exportReportDefinition} type="button"><Download aria-hidden="true" /> Export</Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 border-b pb-2">
        {detailTabs.map((tab) => (
          <button
            className={cn("rounded-full px-2.5 py-1 text-xs transition", selectedTab === tab ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}
            key={tab}
            onClick={() => setSelectedTab(tab)}
            type="button"
          >
            {tab}
          </button>
        ))}
      </div>
      {selectedTab === "Overview" ? <DetailOverview report={report} /> : null}
      {selectedTab === "Data Sources" ? <ChipGrid items={report.dataSources} title="Data Sources" /> : null}
      {selectedTab === "Filters" ? <ChipGrid items={report.filters} title="Filters" /> : null}
      {selectedTab === "Visualizations" ? <VisualizationGrid visualizations={report.visualizations} /> : null}
      {selectedTab === "Schedules" ? <Timeline records={schedules.map((schedule) => ({ badge: schedule.frequency, label: schedule.reportTitle, meta: `${schedule.nextRun} · ${schedule.status}`, tone: scheduleTone(schedule.status) }))} /> : null}
      {selectedTab === "Exports" ? <Timeline records={exports.filter((job) => job.name.toLowerCase().includes(report.title.split(" ")[0].toLowerCase()) || job.source === "Reports").map((job) => ({ badge: job.format, label: job.name, meta: `${job.status} · ${job.governance}`, tone: exportStatusTone(job.status) }))} /> : null}
      {selectedTab === "History" ? <Timeline records={[{ badge: report.status, label: "Report refreshed", meta: `${report.lastGenerated ? new Date(report.lastGenerated).toLocaleString() : "Not yet generated"} · ${report.owner}`, tone: reportStatusTone(report.status) }, { badge: "Viewed", label: `${report.views} report views`, meta: "Usage analytics captured for report prioritization.", tone: "neutral" }]} /> : null}
      {selectedTab === "Audit Trail" ? <Timeline records={auditEvents.map((event) => ({ badge: event.action, label: event.actor, meta: `${new Date(event.createdAt).toLocaleString()} · ${event.reason}`, tone: "governance" }))} /> : null}
    </section>
  );
}

function DetailOverview({ report }: { report: ReportRecord }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        <Panel title="Report definition">
          <div className="grid gap-3 md:grid-cols-2">
            {[
              ["Category", report.category],
              ["Project", report.project],
              ["Donor", report.donor],
              ["Owner", report.owner],
              ["Period", report.period],
              ["Governance", report.governance],
            ].map(([label, value]) => (
              <div className="rounded-xl border bg-background p-3" key={label}>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
                <p className="mt-2 text-sm font-medium">{value}</p>
              </div>
            ))}
          </div>
        </Panel>
        <ComputedMetricsPanel report={report} />
      </div>
      <Panel title="Run readiness">
        <div className="space-y-3">
          {[
            ["Approved data available", report.status === "Ready" || report.status === "Scheduled"],
            ["Governance export allowed", canExportReport(report)],
            ["Visualizations configured", report.visualizations.length > 0],
            ["Formats selected", report.formats.length > 0],
          ].map(([label, passed]) => (
            <div className="flex items-center justify-between gap-3 rounded-xl border bg-background p-3" key={String(label)}>
              <span className="text-sm">{label}</span>
              <Badge tone={passed ? "success" : "warning"}>{passed ? "Passed" : "Review"}</Badge>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function formatMetricValue(value: number, unit: string): string {
  const formatted = Number.isFinite(value) ? value.toLocaleString() : "—";
  return unit ? `${formatted} ${unit}` : formatted;
}

function ComputedMetricsPanel({ report }: { report: ReportRecord }) {
  const metrics = report.metrics;
  if (!metrics) {
    return (
      <Panel title="Computed metrics">
        <div className="rounded-xl border border-dashed bg-muted/20 p-5 text-sm text-muted-foreground">
          Generate this report to compute metrics from approved submissions.
        </div>
      </Panel>
    );
  }

  const counters: [string, string][] = [
    ["Projects", metrics.projects.toLocaleString()],
    ["Submissions (approved / total)", `${metrics.submissions_approved.toLocaleString()} / ${metrics.submissions_total.toLocaleString()}`],
    ["Beneficiaries", metrics.beneficiaries.toLocaleString()],
    ["Generated", metrics.generated_at ? new Date(metrics.generated_at).toLocaleString() : "—"],
  ];

  const columns: TableColumn<DonorReportIndicatorMetric>[] = [
    {
      header: "Indicator",
      key: "name",
      render: (indicator) => (
        <div>
          <p className="font-medium">{indicator.name}</p>
          <p className="text-xs text-muted-foreground">{indicator.code}</p>
        </div>
      ),
      value: (indicator) => `${indicator.name} ${indicator.code}`,
    },
    { header: "Baseline", key: "baseline", render: (indicator) => formatMetricValue(indicator.baseline_value, indicator.unit), value: (indicator) => String(indicator.baseline_value) },
    { header: "Current", key: "current", render: (indicator) => formatMetricValue(indicator.current_value, indicator.unit), value: (indicator) => String(indicator.current_value) },
    { header: "Target", key: "target", render: (indicator) => formatMetricValue(indicator.target_value, indicator.unit), value: (indicator) => String(indicator.target_value) },
    {
      header: "Progress",
      key: "progress",
      render: (indicator) => <Badge tone={progressTone(indicator.progress_percent)}>{indicator.progress_percent}%</Badge>,
      value: (indicator) => String(indicator.progress_percent),
    },
  ];

  return (
    <Panel title="Computed metrics">
      <div className="grid gap-3 md:grid-cols-4">
        {counters.map(([label, value]) => (
          <div className="rounded-xl border bg-background p-3" key={label}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
            <p className="mt-2 text-sm font-medium">{value}</p>
          </div>
        ))}
      </div>
      {metrics.indicators.length > 0 ? (
        <div className="mt-4">
          <DataTable columns={columns} emptyLabel="No indicators linked to this report" rows={metrics.indicators} searchLabel="Search indicators" title="Indicator progress" />
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">No indicators are linked to this report&apos;s project yet.</p>
      )}
    </Panel>
  );
}

function DashboardCard({ dashboard }: { dashboard: DashboardRecord }) {
  return (
    <article className="rounded-2xl border bg-background p-4 shadow-line">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{dashboard.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{dashboard.type} · {dashboard.visibility}</p>
        </div>
        <Badge tone={dashboard.status === "Active" ? "success" : dashboard.status === "Draft" ? "warning" : "neutral"}>{dashboard.status}</Badge>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {dashboard.widgets.slice(0, 4).map((widget) => <Badge key={widget} tone="neutral">{widget}</Badge>)}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Owner: {dashboard.owner} · Last viewed {new Date(dashboard.lastViewed).toLocaleDateString()}</p>
    </article>
  );
}

function MetricCard({ icon: Icon, label, onClick, tone, value }: { icon: LucideIcon; label: string; onClick: () => void; tone: BadgeProps["tone"]; value: number }) {
  return (
    <button className="rounded-xl border bg-panel p-3 text-left shadow-line transition hover:border-primary/40 hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary/30" onClick={onClick} type="button">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-xl bg-primary/10 p-2 text-primary">
          <Icon aria-hidden="true" size={18} />
        </span>
        <Badge tone={tone}>Reports</Badge>
      </div>
      <p className="mt-4 text-2xl font-semibold">{value.toLocaleString()}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </button>
  );
}

function Panel({ action, children, title }: { action?: ReactNode; children: ReactNode; title: string }) {
  return (
    <section className="rounded-xl border bg-panel p-3.5 shadow-line">
      <div className="mb-4 flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function SectionHeader({ action, description, route, title }: { action?: ReactNode; description: string; route: string; title: string }) {
  return (
    <div className="rounded-xl border bg-panel p-3.5 shadow-line">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="monitor">ANALYTICS</Badge>
            <Badge tone="accent">{route}</Badge>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold">{title}</h2>
            <HelpHint label={`About ${title}`} title={title}>{description}</HelpHint>
          </div>
        </div>
        {action}
      </div>
    </div>
  );
}

function Timeline({ records }: { records: { badge: string; label: string; meta: string; tone: BadgeProps["tone"] }[] }) {
  if (!records.length) {
    return <div className="rounded-xl border border-dashed bg-muted/20 p-5 text-sm text-muted-foreground">No records yet.</div>;
  }
  return (
    <div className="space-y-3">
      {records.map((record, index) => (
        <div className="flex gap-3 rounded-xl border bg-background p-3" key={`${record.label}-${index}`}>
          <Badge tone={record.tone}>{record.badge}</Badge>
          <div>
            <p className="text-sm font-medium">{record.label}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{record.meta}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function BuilderPanel({
  items,
  onQueryChange,
  onToggle,
  query,
  selected,
  title,
}: {
  items: string[];
  onQueryChange: (value: string) => void;
  onToggle: (item: string) => void;
  query: string;
  selected: string[];
  title: string;
}) {
  const visibleItems = items.filter((item) => item.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <Panel title={title}>
      <div className="mb-3 flex items-center gap-2">
        <Search aria-hidden="true" className="text-muted-foreground" size={15} />
        <Input onChange={(event) => onQueryChange(event.target.value)} placeholder={`Search ${title.toLowerCase()}`} value={query} />
      </div>
      <div className="flex flex-wrap gap-2">
        {visibleItems.map((item) => (
          <button
            className={cn("rounded-full border px-2.5 py-1 text-xs transition", selected.includes(item) ? "border-primary bg-primary/10 text-primary" : "bg-background hover:border-primary/40 hover:bg-primary/5")}
            key={item}
            onClick={() => onToggle(item)}
            type="button"
          >
            {item}
          </button>
        ))}
        {visibleItems.length === 0 ? <p className="text-xs text-muted-foreground">No matches found.</p> : null}
      </div>
    </Panel>
  );
}

function ChipGrid({ items, title }: { items: string[]; title: string }) {
  return (
    <Panel title={title}>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <div className="rounded-xl border bg-background p-3 text-sm" key={item}>{item}</div>
        ))}
      </div>
    </Panel>
  );
}

function VisualizationGrid({ visualizations }: { visualizations: VisualizationType[] }) {
  return (
    <Panel title="Visualization Engine">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visualizations.map((visualization) => (
          <div className="rounded-xl border bg-background p-4" key={visualization}>
            <div className="flex items-center gap-2">
              {renderVisualizationIcon(visualization, "text-primary")}
              <p className="text-sm font-semibold">{visualization}</p>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">Supports tooltips, drill-down, fullscreen, export image, and reusable dashboard widgets.</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function renderVisualizationIcon(visualization: VisualizationType, className?: string) {
  const Icon = visualizationIcons[visualization];
  return <Icon aria-hidden="true" className={className} size={18} />;
}
