import type { BadgeProps } from "@/components/ui/badge";
import type {
  DashboardRecord,
  ExportJobRecord,
  ExportStatus,
  KpiRecord,
  ReportFormat,
  ReportRecord,
  ReportsSection,
  ReportsSummary,
  ReportStatus,
  ScheduledReportRecord,
} from "@/modules/reports/data";

export function computeReportsSummary({
  dashboards,
  exports,
  reports,
  schedules,
}: {
  dashboards: DashboardRecord[];
  exports: ExportJobRecord[];
  reports: ReportRecord[];
  schedules: ScheduledReportRecord[];
}): ReportsSummary {
  return {
    activeDashboards: dashboards.filter((dashboard) => dashboard.status === "Active").length,
    exportJobs: exports.length,
    failedReportJobs: exports.filter((job) => job.status === "Failed").length + schedules.filter((schedule) => schedule.status === "Failed").length,
    mostViewedReports: reports.filter((report) => report.views >= 100).length,
    reportsReady: reports.filter((report) => report.status === "Ready").length,
    reportsPendingDelivery: schedules.filter((schedule) => schedule.status !== "Active" || schedule.failureLog).length,
    scheduledReports: schedules.length,
    totalReports: reports.length,
  };
}

export function reportStatusTone(status: ReportStatus): BadgeProps["tone"] {
  if (status === "Ready" || status === "Scheduled") return "success";
  if (status === "Draft" || status === "Generating" || status === "Needs Data") return "warning";
  if (status === "Failed") return "danger";
  return "neutral";
}

export function exportStatusTone(status: ExportStatus): BadgeProps["tone"] {
  if (status === "Ready") return "success";
  if (status === "Queued" || status === "Processing") return "warning";
  if (status === "Failed") return "danger";
  return "neutral";
}

export function scheduleTone(status: ScheduledReportRecord["status"]): BadgeProps["tone"] {
  if (status === "Active") return "success";
  if (status === "Failed") return "danger";
  return "warning";
}

export function governanceTone(status: ReportRecord["governance"] | ExportJobRecord["governance"]): BadgeProps["tone"] {
  if (status === "Approved") return "success";
  if (status === "Pending approval" || status === "Needs approval") return "warning";
  if (status === "Restricted export" || status === "Restricted") return "danger";
  return "neutral";
}

export function formatTone(format: ReportFormat): BadgeProps["tone"] {
  if (format === "PDF") return "danger";
  if (format === "Excel") return "success";
  if (format === "CSV") return "accent";
  return "neutral";
}

export function kpiAchievement(kpi: KpiRecord): number {
  if (kpi.target <= 0) return 0;
  return Math.max(0, Math.min(999, Math.round((kpi.value / kpi.target) * 100)));
}

export function kpiTone(kpi: KpiRecord): BadgeProps["tone"] {
  const achievement = kpiAchievement(kpi);
  if (achievement >= 90) return "success";
  if (achievement >= 70) return "warning";
  return "danger";
}

export function filterReportsBySection(reports: ReportRecord[], section: ReportsSection): ReportRecord[] {
  if (section === "dashboard" || section === "standard") return reports;
  if (section === "custom") return reports.filter((report) => report.category !== "Donor Reports");
  if (section === "dashboards") return reports.filter((report) => report.visualizations.some((visual) => visual.includes("Chart") || visual === "KPI Card" || visual === "Map Link"));
  if (section === "scheduled") return reports.filter((report) => report.status === "Scheduled");
  if (section === "exports") return reports.filter((report) => report.formats.length > 0);
  return reports;
}

export function summarizeReportQuery(report: ReportRecord): string {
  const sourceText = report.dataSources.join(" + ");
  const filterText = report.filters.length ? report.filters.join("; ") : "No filters";
  const visualText = report.visualizations.join(", ");
  return `${sourceText} with ${filterText}. Output uses ${visualText}.`;
}

export function canExportReport(report: ReportRecord): boolean {
  return report.status === "Ready" && (report.governance === "Approved" || report.governance === "Internal only");
}

/**
 * Build the machine-readable export package for a generated report. Returns
 * null when the report has not been generated yet (no computed metrics), so the
 * UI can prompt the user to generate it before exporting.
 */
export function buildReportMetricsExport(report: ReportRecord): Record<string, unknown> | null {
  if (!report.metrics) return null;
  return {
    id: report.id,
    title: report.title,
    donor: report.donor,
    category: report.category,
    period: report.period,
    governance: report.governance,
    generatedAt: report.lastGenerated,
    metrics: report.metrics,
  };
}

export function toCsv(rows: Record<string, string | number | boolean | null | undefined>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return [
    headers.map(escape).join(","),
    ...rows.map((row) => headers.map((header) => escape(row[header])).join(",")),
  ].join("\n");
}
