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
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  LineChart,
  Mail,
  PieChart,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Share2,
  ShieldCheck,
  Table2,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { DataTable, type TableColumn } from "@/components/DataTable";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpHint } from "@/components/ui/help-hint";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  ApiError,
  createReport,
  exportReportCsv,
  generateReport,
  listProjects,
  listReports,
  type CurrentPrincipal,
  type DonorReportIndicatorMetric,
  type DonorReportMetrics,
  type DonorReportRead,
} from "@/lib/api";
import { useSectorTerminology } from "@/lib/sectorTerminology";
import { cn } from "@/lib/utils";
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

export function ReportsModule({ token }: ReportsModuleProps) {
  const [activeSection, setActiveSection] = useState<ReportsSection>("dashboard");
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
      setActiveSection("standard");
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
  const dashboards = useMemo(() => (preview ? previewDashboards : []), [preview]);
  const exportJobs = useMemo(() => (preview ? previewExportJobs : []), [preview]);
  const scheduledReports = useMemo(() => (preview ? previewScheduledReports : []), [preview]);
  const reportAuditEvents = useMemo(() => (preview ? previewAuditEvents : []), [preview]);
  const kpis = useMemo(() => (preview ? previewKpis : []), [preview]);
  const builderSteps = useMemo(() => (preview ? previewBuilderSteps : []), [preview]);
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
            <Button onClick={() => setActiveSection("custom")} type="button" variant="secondary">
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
              onClick={() => {
                setActiveSection(section.id);
                setSelectedReportId(null);
              }}
              type="button"
            >
              <span className="flex items-center gap-1.5 text-xs font-semibold">
                {section.label}
                {section.status === "planned" ? <Badge tone={activeSection === section.id ? "neutral" : "accent"}>Planned</Badge> : null}
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
          onOpenSection={setActiveSection}
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
        preview ? (
          <CustomReportBuilder builderSteps={builderSteps} onOpenReports={() => setActiveSection("standard")} />
        ) : (
          <ComingSoonSection
            action={<Button onClick={() => setActiveSection("standard")} type="button" variant="secondary"><FileText aria-hidden="true" /> Open Standard Reports</Button>}
            sectionId="custom"
          />
        )
      ) : null}
      {!selectedReport && activeSection === "dashboards" ? (
        preview ? (
          <DashboardsSection dashboards={dashboards} onOpenReports={() => setActiveSection("standard")} />
        ) : (
          <ComingSoonSection
            action={<Button onClick={() => setActiveSection("standard")} type="button" variant="secondary"><FileText aria-hidden="true" /> Open Standard Reports</Button>}
            sectionId="dashboards"
          />
        )
      ) : null}
      {!selectedReport && activeSection === "scheduled" ? (
        preview ? (
          <ScheduledReportsSection schedules={scheduledReports} />
        ) : (
          <ComingSoonSection
            action={<Button onClick={() => setActiveSection("standard")} type="button" variant="secondary"><FileText aria-hidden="true" /> Open Standard Reports</Button>}
            sectionId="scheduled"
          />
        )
      ) : null}
      {!selectedReport && activeSection === "exports" ? (
        preview ? (
          <ExportsSection exports={exportJobs} />
        ) : (
          <ComingSoonSection
            action={<Button onClick={() => setActiveSection("standard")} type="button" variant="secondary"><RefreshCw aria-hidden="true" /> Generate &amp; export reports</Button>}
            sectionId="exports"
          />
        )
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
  const cards = [
    { icon: FileText, label: "Total Reports", value: summary.totalReports, tone: "accent" as BadgeProps["tone"] },
    { icon: CalendarClock, label: "Scheduled Reports", value: summary.scheduledReports, tone: "success" as BadgeProps["tone"] },
    { icon: CheckCircle2, label: "Reports Ready", value: summary.reportsReady, tone: summary.reportsReady ? "success" as BadgeProps["tone"] : "neutral" as BadgeProps["tone"] },
    { icon: Download, label: "Export Jobs", value: summary.exportJobs, tone: "accent" as BadgeProps["tone"] },
    { icon: LayoutDashboard, label: "Active Dashboards", value: summary.activeDashboards, tone: "monitor" as BadgeProps["tone"] },
    { icon: Eye, label: "Most Viewed Reports", value: summary.mostViewedReports, tone: "neutral" as BadgeProps["tone"] },
    { icon: Mail, label: "Reports Pending Delivery", value: summary.reportsPendingDelivery, tone: summary.reportsPendingDelivery ? "warning" as BadgeProps["tone"] : "success" as BadgeProps["tone"] },
    { icon: Archive, label: "Failed Report Jobs", value: summary.failedReportJobs, tone: summary.failedReportJobs ? "danger" as BadgeProps["tone"] : "success" as BadgeProps["tone"] },
  ];

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <MetricCard icon={card.icon} key={card.label} label={card.label} tone={card.tone} value={card.value} />
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

function CustomReportBuilder({ builderSteps, onOpenReports }: { builderSteps: typeof previewBuilderSteps; onOpenReports: () => void }) {
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

  return (
    <div className="space-y-3">
      <SectionHeader
        action={<Button onClick={onOpenReports} variant="secondary"><FileText aria-hidden="true" /> Browse report library</Button>}
        description="Build ad hoc analytics by selecting data sources, fields, filters, grouping, visualizations, preview rules, and governed export options."
        route="/reports/custom"
        title="Custom Reports"
      />
      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <Panel title="Report Builder Steps">
          {builderSteps.length > 0 ? (
            <div className="space-y-3">
              {builderSteps.map((step, index) => (
                <div className="rounded-xl border bg-background p-3" key={step.id}>
                  <div className="flex items-center gap-2">
                    <Badge tone={step.status === "Complete" ? "success" : step.status === "Current" ? "accent" : "neutral"}>{index + 1}</Badge>
                    <p className="text-sm font-semibold">{step.label}</p>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{step.description}</p>
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
                    <p className="text-xs text-muted-foreground">Fields selected</p>
                    <p className="mt-2 text-xl font-semibold">{selectedFields.length}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">Filters applied</p>
                    <p className="mt-2 text-xl font-semibold">{selectedFilters.length}</p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">Live row counts and calculated values will appear here once this builder is connected to a reporting data source.</p>
              </div>
              <div className="rounded-xl border bg-background p-4">
                <h3 className="text-sm font-semibold">Save or Export</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Save as a template, share with a role, schedule delivery, or send restricted exports to Governance for approval.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={() => pushToast({ description: "Connect a sharing service to share this report with a role or workspace. This control is a preview for now.", title: "Sharing isn't available yet", tone: "warning" })} size="sm" variant="secondary"><Share2 aria-hidden="true" /> Share</Button>
                  <Button onClick={exportBuilderConfig} size="sm"><Download aria-hidden="true" /> Export</Button>
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function DashboardsSection({ dashboards, onOpenReports }: { dashboards: DashboardRecord[]; onOpenReports: () => void }) {
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  return (
    <div className="space-y-3">
      <SectionHeader
        action={<Button onClick={() => pushToast({ description: "Connect a dashboard-authoring service to create custom dashboards. This control is a preview for now.", title: "Creating dashboards isn't available yet", tone: "warning" })} type="button"><Plus aria-hidden="true" /> Create Dashboard</Button>}
        description="Interactive analytics dashboards with KPI cards, tables, charts, maps, activity feeds, progress widgets, responsive layouts, and role-based visibility."
        route="/reports/dashboards"
        title="Dashboards"
      />
      <div className="grid gap-4 lg:grid-cols-3">
        {dashboards.map((dashboard) => <DashboardCard dashboard={dashboard} key={dashboard.id} />)}
      </div>
      <Panel action={<Button onClick={onOpenReports} size="sm" variant="secondary">Open reports</Button>} title="Dashboard builder capabilities">
        <div className="grid gap-3 md:grid-cols-4">
          {["Drag and drop layout", "Role-based visibility", "Cross-filtering", "Reusable widgets", "Fullscreen visualizations", "Export image", "Map links", "Responsive dashboards"].map((item) => (
            <div className="rounded-xl border bg-background p-3 text-sm" key={item}>{item}</div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function ScheduledReportsSection({ schedules }: { schedules: ScheduledReportRecord[] }) {
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const columns: TableColumn<ScheduledReportRecord>[] = [
    { header: "Report", key: "report", render: (schedule) => <div><p className="font-medium">{schedule.reportTitle}</p><p className="text-xs text-muted-foreground">{schedule.id}</p></div>, value: (schedule) => schedule.reportTitle },
    { header: "Frequency", key: "frequency", render: (schedule) => `${schedule.frequency} · ${schedule.time} ${schedule.timezone}`, value: (schedule) => schedule.frequency },
    { header: "Recipients", key: "recipients", render: (schedule) => schedule.recipients.join(", "), value: (schedule) => schedule.recipients.join(" ") },
    { header: "Next Run", key: "nextRun", render: (schedule) => new Date(schedule.nextRun).toLocaleString(), value: (schedule) => schedule.nextRun },
    { header: "Status", key: "status", render: (schedule) => <Badge tone={scheduleTone(schedule.status)}>{schedule.status}</Badge>, value: (schedule) => schedule.status },
  ];

  return (
    <div className="space-y-3">
      <SectionHeader
        action={<Button onClick={() => pushToast({ description: "Connect a report-scheduling service to automate report generation and delivery. This control is a preview for now.", title: "Creating schedules isn't available yet", tone: "warning" })} type="button"><CalendarClock aria-hidden="true" /> Create Schedule</Button>}
        description="Automate report generation and delivery by daily, weekly, monthly, quarterly, or custom schedules with delivery tracking and failure logs."
        route="/reports/scheduled"
        title="Scheduled Reports"
      />
      <DataTable columns={columns} emptyLabel="No scheduled reports yet" rows={schedules} searchLabel="Search schedules, recipients, frequency" title="Scheduled report delivery" />
      <Panel title="Failure logs and delivery control">
        <Timeline records={schedules.filter((schedule) => schedule.failureLog).map((schedule) => ({ badge: schedule.status, label: schedule.reportTitle, meta: schedule.failureLog ?? "", tone: scheduleTone(schedule.status) }))} />
      </Panel>
    </div>
  );
}

function ExportsSection({ exports }: { exports: ExportJobRecord[] }) {
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const columns: TableColumn<ExportJobRecord>[] = [
    { header: "Export", key: "name", render: (job) => <div><p className="font-medium">{job.name}</p><p className="text-xs text-muted-foreground">{job.id} · {job.source}</p></div>, value: (job) => `${job.name} ${job.source}` },
    { header: "Requested", key: "requested", render: (job) => <div><p>{job.requestedBy}</p><p className="text-xs text-muted-foreground">{new Date(job.requestedAt).toLocaleString()}</p></div>, value: (job) => `${job.requestedBy} ${job.requestedAt}` },
    { header: "Format", key: "format", render: (job) => <Badge tone={formatTone(job.format)}>{job.format}</Badge>, value: (job) => job.format },
    { header: "Rows", key: "rows", render: (job) => job.rows.toLocaleString(), value: (job) => String(job.rows) },
    { header: "Status", key: "status", render: (job) => <Badge tone={exportStatusTone(job.status)}>{job.status}</Badge>, value: (job) => job.status },
    { header: "Governance", key: "governance", render: (job) => <Badge tone={governanceTone(job.governance)}>{job.governance}</Badge>, value: (job) => job.governance },
  ];
  return (
    <div className="space-y-3">
      <SectionHeader
        action={<Button onClick={() => pushToast({ description: "Connect an export-job service to generate Excel, CSV, PDF, or JSON exports. This control is a preview for now.", title: "Creating export jobs isn't available yet", tone: "warning" })} type="button"><Download aria-hidden="true" /> Create Export</Button>}
        description="Manage Excel, CSV, PDF, and JSON export jobs from reports, indicators, submissions, projects, beneficiaries, and data quality with governance approval checks."
        route="/reports/exports"
        title="Exports"
      />
      <DataTable columns={columns} emptyLabel="No export jobs yet" rows={exports} searchLabel="Search exports, sources, requester, status" title="Export center" />
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

function MetricCard({ icon: Icon, label, tone, value }: { icon: LucideIcon; label: string; tone: BadgeProps["tone"]; value: number }) {
  return (
    <article className="rounded-xl border bg-panel p-3 shadow-line">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-xl bg-primary/10 p-2 text-primary">
          <Icon aria-hidden="true" size={18} />
        </span>
        <Badge tone={tone}>Reports</Badge>
      </div>
      <p className="mt-4 text-2xl font-semibold">{value.toLocaleString()}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </article>
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

function ComingSoonSection({ action, sectionId }: { action?: ReactNode; sectionId: ReportsSection }) {
  const meta = reportsSections.find((section) => section.id === sectionId);
  if (!meta) return null;
  return (
    <div className="space-y-3">
      <SectionHeader action={action} description={meta.description} route={meta.route} title={meta.label} />
      <div className="rounded-xl border border-dashed bg-muted/20 p-6 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">On our roadmap</p>
        <p className="mt-2 leading-6">{meta.label} is planned for a future release and isn&apos;t available in this workspace yet. {meta.description}</p>
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
