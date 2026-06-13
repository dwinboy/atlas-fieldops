import { describe, expect, it } from "vitest";

import { previewDashboards, previewExportJobs, previewKpis, previewReports, previewScheduledReports } from "@/modules/reports/data";
import {
  buildReportMetricsExport,
  canExportReport,
  computeReportsSummary,
  filterReportsBySection,
  kpiAchievement,
  summarizeReportQuery,
} from "@/modules/reports/utils";

describe("Reports module helpers", () => {
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
