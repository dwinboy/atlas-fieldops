import { describe, expect, it } from "vitest";

import { previewDashboards, previewExportJobs, previewKpis, previewReports, previewScheduledReports } from "@/modules/reports/data";
import {
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
