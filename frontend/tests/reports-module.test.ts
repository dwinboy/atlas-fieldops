import { describe, expect, it } from "vitest";

import { reportWorkspaceBoundaryRoute } from "@/modules/reports/ReportsModule";
import { previewDashboards, previewExportJobs, previewKpis, previewReports, previewScheduledReports } from "@/modules/reports/data";
import {
  buildReportMetricsExport,
  canExportReport,
  computeReportsSummary,
  deriveReportKpis,
  filterReportsBySection,
  kpiAchievement,
  summarizeReportQuery,
} from "@/modules/reports/utils";

describe("Reports module helpers", () => {
  it("routes boundary actions to the owning workspaces", () => {
    expect(reportWorkspaceBoundaryRoute("indicators")).toBe("/indicators");
    expect(reportWorkspaceBoundaryRoute("submissions")).toBe("/submissions");
    expect(reportWorkspaceBoundaryRoute("governance")).toBe("/governance");
  });

  it("computes the reporting hub metrics", () => {
    const summary = computeReportsSummary({
      dashboards: previewDashboards,
      exports: previewExportJobs,
      reports: previewReports,
      schedules: previewScheduledReports,
    });

    expect(summary.totalReports).toBe(6);
    expect(summary.scheduledReports).toBe(3);
    expect(summary.exportJobs).toBe(4);
    expect(summary.activeDashboards).toBe(2);
    expect(summary.failedReportJobs).toBe(2);
    expect(summary.mostViewedReports).toBe(3);
  });

  it("enforces report export readiness from status and governance", () => {
    expect(canExportReport(previewReports[0])).toBe(true);
    expect(canExportReport(previewReports[1])).toBe(false);
    expect(canExportReport(previewReports[3])).toBe(false);
  });

  it("calculates KPI target achievement for executive reporting", () => {
    expect(kpiAchievement(previewKpis[1])).toBe(96);
    expect(kpiAchievement(previewKpis[2])).toBe(85);
    expect(kpiAchievement({ ...previewKpis[0], target: 0 })).toBe(0);
  });

  it("builds a JSON metrics export only once a report has been generated", () => {
    // Without computed metrics a report cannot be exported as a metrics package.
    expect(buildReportMetricsExport({ ...previewReports[0], metrics: undefined })).toBeNull();

    const metrics = {
      projects: 2,
      submissions_total: 100,
      submissions_approved: 90,
      beneficiaries: 50,
      indicators: [],
      period_start: null,
      period_end: null,
      generated_at: "2026-06-01T00:00:00Z",
    };
    const payload = buildReportMetricsExport({ ...previewReports[0], metrics });
    expect(payload).not.toBeNull();
    expect(payload?.id).toBe(previewReports[0].id);
    expect(payload?.metrics).toEqual(metrics);
  });

  it("derives executive KPIs from generated report metrics, keeping the highest value per indicator", () => {
    const baseMetrics = {
      projects: 1,
      submissions_total: 10,
      submissions_approved: 8,
      beneficiaries: 5,
      period_start: null,
      period_end: null,
      generated_at: "2026-06-01T00:00:00Z",
    };
    const reportA = {
      ...previewReports[0],
      metrics: {
        ...baseMetrics,
        indicators: [
          { code: "IND.A", name: "Reach", unit: "", baseline_value: 0, target_value: 100, current_value: 40, progress_percent: 40 },
          { code: "IND.B", name: "Coverage", unit: "%", baseline_value: 0, target_value: 100, current_value: 90, progress_percent: 90 },
        ],
      },
    };
    const reportB = {
      ...previewReports[1],
      metrics: {
        ...baseMetrics,
        // Same indicator IND.A appears with a higher computed value.
        indicators: [{ code: "IND.A", name: "Reach", unit: "", baseline_value: 0, target_value: 100, current_value: 70, progress_percent: 70 }],
      },
    };

    const kpis = deriveReportKpis([reportA, reportB]);
    expect(kpis.map((kpi) => kpi.drillDown)).toEqual(["IND.B", "IND.A"]); // sorted by value desc
    expect(kpis.find((kpi) => kpi.drillDown === "IND.A")?.value).toBe(70); // highest value kept
    expect(deriveReportKpis([{ ...previewReports[0], metrics: undefined }])).toEqual([]);
  });

  it("filters and summarizes report builder query context", () => {
    const scheduled = filterReportsBySection(previewReports, "scheduled");
    const exportable = filterReportsBySection(previewReports, "exports");
    const summary = summarizeReportQuery(previewReports[0]);

    expect(scheduled.map((report) => report.title)).toEqual(["Field operations weekly brief"]);
    expect(exportable.length).toBe(previewReports.length);
    expect(summary).toContain("Projects + Indicators + Approved submissions + Mapping");
    expect(summary).toContain("Approved submissions only");
  });
});
