import { describe, expect, it } from "vitest";

import type { DashboardWidget, DataFormRead, DataQualitySignalRead, IndicatorRead, ProjectListItemRead, SubmissionRead } from "@/lib/api";
import type { DashboardApprovalOverview, DashboardCoverageOverview, FormPerformance } from "@/lib/dashboard";
import {
  computeTrend,
  cycleWidgetWidth,
  getFormPerformanceBarData,
  getFormPerformanceTableRows,
  getIndicatorProgressData,
  getIndicatorTableRows,
  getKpiValue,
  getQualitySeverityBarData,
  getQualitySeverityCounts,
  getQualitySignalTableRows,
  getSubmissionsTrend,
  type DashboardWidgetData,
} from "@/modules/reports/DashboardWidgets";
import {
  applyCrossFilterToQualitySignals,
  applyCrossFilterToSubmissions,
  dashboardRangeDays,
  filterDonorReportsByFilters,
  filterFormsByFilters,
  filterIndicatorsByFilters,
  filterQualitySignalsByFilters,
  filterQualitySignalsByPreviousPeriod,
  filterSubmissionsByFilters,
  filterSubmissionsByPreviousPeriod,
  toggleCrossFilter,
  type DashboardCrossFilter,
  type DashboardFilters,
} from "@/modules/reports/dashboardFilters";
import { dataSourceLabels, widgetTypeDataSources, widgetTypeLabels, type WidgetDataSource, type WidgetType } from "@/modules/reports/data";
import type { ReportRecord } from "@/modules/reports/data";

function makeWidget(overrides: Partial<DashboardWidget> = {}): DashboardWidget {
  return {
    id: "widget-1",
    type: "kpi",
    title: "Widget",
    data_source: "submissions",
    reference_id: null,
    metric: null,
    width: 1,
    ...overrides,
  };
}

function makeIndicator(overrides: Partial<IndicatorRead> = {}): IndicatorRead {
  return {
    id: "indicator-1",
    project_id: "project-1",
    survey_id: null,
    code: "IND-1",
    name: "Households reached",
    description: null,
    unit: "households",
    reporting_frequency: "Monthly",
    baseline_value: 0,
    target_value: 1000,
    current_value: 400,
    sdg_code: null,
    formula: null,
    category: null,
    disaggregation_fields: [],
    is_active: true,
    progress_percent: 40,
    calculated_at: null,
    ...overrides,
  };
}

function makeQualitySignal(overrides: Partial<DataQualitySignalRead> = {}): DataQualitySignalRead {
  return {
    id: "signal-1",
    submission_id: "submission-1",
    beneficiary_id: null,
    signal_type: "duplicate",
    severity: "critical",
    confidence: 0.9,
    summary: "Possible duplicate beneficiary",
    status: "open",
    evidence_json: {},
    created_at: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeDonorReport(overrides: Partial<ReportRecord> = {}): ReportRecord {
  return {
    id: "report-1",
    title: "Q2 Donor Report",
    description: "",
    category: "Donor Reports",
    owner: "Donor relations",
    project: "Project A",
    donor: "Donor A",
    period: "Q2 2026",
    status: "Ready",
    lastGenerated: "2026-06-01T00:00:00.000Z",
    views: 10,
    formats: ["PDF"],
    dataSources: [],
    filters: [],
    visualizations: [],
    kpis: [],
    governance: "Approved",
    metrics: {
      projects: 3,
      submissions_total: 120,
      submissions_approved: 100,
      beneficiaries: 450,
      indicators: [],
      period_start: "2026-04-01",
      period_end: "2026-06-30",
      generated_at: "2026-06-01T00:00:00.000Z",
    },
    ...overrides,
  };
}

function makeFormPerformance(overrides: Partial<FormPerformance> = {}): FormPerformance {
  return {
    approved: 8,
    completion: 75,
    correctionNeeded: 1,
    enumerators: 4,
    form: {
      id: "form-1",
      project_id: "project-1",
      survey_id: null,
      name: "Household Survey",
      slug: "household-survey",
      description: null,
      status: "published",
      current_version: 1,
      is_active: true,
    },
    lastSyncLabel: "Today",
    lastSubmissionLabel: "Today",
    offlineRecords: 0,
    pendingReview: 2,
    qualityScore: 88,
    statusLabel: "Active",
    statusTone: "success",
    syncedRecords: 10,
    totalSubmissions: 10,
    ...overrides,
  };
}

function makeSubmission(overrides: Partial<SubmissionRead> = {}): SubmissionRead {
  return {
    id: "submission-1",
    client_submission_id: "client-1",
    project_id: "project-1",
    survey_id: null,
    form_id: "form-1",
    field_officer_id: "officer-1",
    status: "approved",
    server_sequence: 1,
    captured_at: "2026-06-01T09:00:00.000Z",
    submitted_at: "2026-06-01T10:00:00.000Z",
    sync_received_at: "2026-06-01T10:05:00.000Z",
    offline_created: false,
    device_id: "device-1",
    latitude: 6.1,
    longitude: 10.2,
    accuracy: 5,
    payload_json: {},
    ...overrides,
  };
}

function makeForm(overrides: Partial<DataFormRead> = {}): DataFormRead {
  return {
    id: "form-1",
    project_id: "project-1",
    survey_id: null,
    name: "Household Survey",
    slug: "household-survey",
    description: null,
    status: "published",
    current_version: 1,
    is_active: true,
    ...overrides,
  };
}

function makeProject(overrides: Partial<ProjectListItemRead> = {}): ProjectListItemRead {
  return {
    id: "project-1",
    name: "Project A",
    project_code: "PRJ-A",
    status: "active",
    active_forms: 1,
    active_assignments: 1,
    total_submissions: 10,
    indicator_count: 1,
    beneficiary_count: 10,
    progress_percent: 50,
    health_score: 80,
    health_status: "on_track",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

const baseApprovalOverview: DashboardApprovalOverview = { approved: 12, pending: 4, rejected: 2, returned: 1, total: 19 };
const baseCoverage: DashboardCoverageOverview = { coveragePercent: 75, locatedSubmissions: 15, totalSubmissions: 20, uniqueLocations: 6 };

function makeData(overrides: Partial<DashboardWidgetData> = {}): DashboardWidgetData {
  return {
    indicators: [makeIndicator()],
    formPerformance: [makeFormPerformance()],
    approvalOverview: baseApprovalOverview,
    coverage: baseCoverage,
    qualitySignals: [makeQualitySignal()],
    donorReports: [makeDonorReport()],
    submissions: [makeSubmission()],
    ...overrides,
  };
}

describe("cycleWidgetWidth", () => {
  it("cycles 1 -> 2 -> 3 -> 1", () => {
    expect(cycleWidgetWidth(1)).toBe(2);
    expect(cycleWidgetWidth(2)).toBe(3);
    expect(cycleWidgetWidth(3)).toBe(1);
  });

  it("wraps any width at or above 3 back to 1", () => {
    expect(cycleWidgetWidth(4)).toBe(1);
  });
});

describe("widgetTypeDataSources matrix", () => {
  it("gives every widget type at least one valid data source", () => {
    for (const type of Object.keys(widgetTypeLabels) as WidgetType[]) {
      expect(widgetTypeDataSources[type].length).toBeGreaterThan(0);
    }
  });

  it("maps every data source to at least one widget type", () => {
    const sources = Object.keys(dataSourceLabels) as WidgetDataSource[];
    for (const source of sources) {
      const supportingTypes = (Object.keys(widgetTypeDataSources) as WidgetType[]).filter((type) =>
        widgetTypeDataSources[type].includes(source),
      );
      expect(supportingTypes.length).toBeGreaterThan(0);
    }
  });

  it("only lists known widget types and data sources", () => {
    for (const [type, sources] of Object.entries(widgetTypeDataSources)) {
      expect(Object.keys(widgetTypeLabels)).toContain(type);
      for (const source of sources) {
        expect(Object.keys(dataSourceLabels)).toContain(source);
      }
    }
  });
});

describe("getKpiValue", () => {
  it("reads indicator progress for an indicators widget", () => {
    const data = makeData();
    const kpi = getKpiValue(makeWidget({ data_source: "indicators", reference_id: "indicator-1" }), data);

    expect(kpi?.value).toBe("400 households");
    expect(kpi?.detail).toContain("40% of target 1,000 households");
  });

  it("returns null for an indicators widget with no matching reference", () => {
    const data = makeData();
    const kpi = getKpiValue(makeWidget({ data_source: "indicators", reference_id: "missing" }), data);

    expect(kpi).toBeNull();
  });

  it.each([
    ["total", "19"],
    ["approved", "12"],
    ["pending", "4"],
    ["rejected", "2"],
    ["returned", "1"],
  ])("reads the %s submissions metric", (metric, expected) => {
    const data = makeData();
    const kpi = getKpiValue(makeWidget({ data_source: "submissions", metric }), data);

    expect(kpi?.value).toBe(expected);
  });

  it("counts open and critical data quality signals", () => {
    const data = makeData({
      qualitySignals: [
        makeQualitySignal({ id: "s1", severity: "critical", status: "open" }),
        makeQualitySignal({ id: "s2", severity: "low", status: "open" }),
        makeQualitySignal({ id: "s3", severity: "critical", status: "resolved" }),
      ],
    });

    expect(getKpiValue(makeWidget({ data_source: "data_quality", metric: "open" }), data)?.value).toBe("2");
    expect(getKpiValue(makeWidget({ data_source: "data_quality", metric: "critical" }), data)?.value).toBe("2");
  });

  it("reads a donor report metric by reference and metric key", () => {
    const data = makeData();
    const kpi = getKpiValue(
      makeWidget({ data_source: "donor_report", reference_id: "report-1", metric: "beneficiaries" }),
      data,
    );

    expect(kpi?.value).toBe("450");
    expect(kpi?.detail).toBe("Q2 Donor Report");
  });

  it("returns null when the donor report reference does not exist", () => {
    const data = makeData();
    const kpi = getKpiValue(makeWidget({ data_source: "donor_report", reference_id: "missing", metric: "beneficiaries" }), data);

    expect(kpi).toBeNull();
  });

  it.each([
    ["total", "10"],
    ["approved", "8"],
    ["pending", "2"],
    ["quality", "88%"],
  ])("reads the %s form performance metric", (metric, expected) => {
    const data = makeData();
    const kpi = getKpiValue(
      makeWidget({ data_source: "form_performance", reference_id: "form-1", metric }),
      data,
    );

    expect(kpi?.value).toBe(expected);
  });

  it("returns null when the form performance reference does not exist", () => {
    const data = makeData();
    const kpi = getKpiValue(makeWidget({ data_source: "form_performance", reference_id: "missing", metric: "total" }), data);

    expect(kpi).toBeNull();
  });

  it("omits the trend when no previous period data is supplied", () => {
    const data = makeData();
    const kpi = getKpiValue(makeWidget({ data_source: "submissions", metric: "approved" }), data);

    expect(kpi?.trend).toBeUndefined();
  });

  it("computes an upward trend for an increase in approved submissions", () => {
    const data = makeData({ previousApprovalOverview: { approved: 8, pending: 4, rejected: 2, returned: 1, total: 15 } });
    const kpi = getKpiValue(makeWidget({ data_source: "submissions", metric: "approved" }), data);

    expect(kpi?.trend).toEqual({ direction: "up", percent: 50, tone: "success" });
  });

  it("treats a rise in pending submissions as a bad-direction trend", () => {
    const data = makeData({
      approvalOverview: { approved: 12, pending: 8, rejected: 2, returned: 1, total: 23 },
      previousApprovalOverview: { approved: 12, pending: 4, rejected: 2, returned: 1, total: 19 },
    });
    const kpi = getKpiValue(makeWidget({ data_source: "submissions", metric: "pending" }), data);

    expect(kpi?.trend).toEqual({ direction: "up", percent: 100, tone: "danger" });
  });

  it("treats the total submissions metric as neutral regardless of direction", () => {
    const data = makeData({ previousApprovalOverview: { approved: 8, pending: 4, rejected: 2, returned: 1, total: 15 } });
    const kpi = getKpiValue(makeWidget({ data_source: "submissions", metric: "total" }), data);

    expect(kpi?.trend).toEqual({ direction: "up", percent: 27, tone: "neutral" });
  });

  it("computes a favorable trend when open quality issues decrease", () => {
    const data = makeData({
      qualitySignals: [makeQualitySignal({ id: "s1", severity: "low", status: "open" })],
      previousQualitySignals: [
        makeQualitySignal({ id: "p1", severity: "low", status: "open" }),
        makeQualitySignal({ id: "p2", severity: "low", status: "open" }),
      ],
    });
    const kpi = getKpiValue(makeWidget({ data_source: "data_quality", metric: "open" }), data);

    expect(kpi?.trend).toEqual({ direction: "down", percent: 50, tone: "success" });
  });
});

describe("computeTrend", () => {
  it("reports no change when the value is unchanged", () => {
    expect(computeTrend(10, 10, "up")).toEqual({ direction: "flat", percent: 0, tone: "neutral" });
  });

  it("reports no change when both current and previous are zero", () => {
    expect(computeTrend(0, 0, "down")).toEqual({ direction: "flat", percent: 0, tone: "neutral" });
  });

  it("treats an increase from zero as a 100% change", () => {
    expect(computeTrend(5, 0, "up")).toEqual({ direction: "up", percent: 100, tone: "success" });
    expect(computeTrend(5, 0, "down")).toEqual({ direction: "up", percent: 100, tone: "danger" });
  });

  it("marks a decrease as favorable when the good direction is down", () => {
    expect(computeTrend(8, 10, "down")).toEqual({ direction: "down", percent: 20, tone: "success" });
  });

  it("marks a decrease as unfavorable when the good direction is up", () => {
    expect(computeTrend(8, 10, "up")).toEqual({ direction: "down", percent: 20, tone: "danger" });
  });

  it("is always neutral when the good direction is neutral", () => {
    expect(computeTrend(15, 10, "neutral")).toEqual({ direction: "up", percent: 50, tone: "neutral" });
    expect(computeTrend(5, 10, "neutral")).toEqual({ direction: "down", percent: 50, tone: "neutral" });
  });
});

describe("table row helpers", () => {
  it("maps indicators to table rows", () => {
    const rows = getIndicatorTableRows([makeIndicator()]);

    expect(rows).toEqual([
      { id: "indicator-1", cells: ["IND-1", "Households reached", "400 households", "1,000 households", "40%"] },
    ]);
  });

  it("maps form performance to table rows", () => {
    const rows = getFormPerformanceTableRows([makeFormPerformance()]);

    expect(rows).toEqual([{ id: "form-1", cells: ["Household Survey", "10", "2", "88%"] }]);
  });

  it("maps data quality signals to table rows", () => {
    const rows = getQualitySignalTableRows([makeQualitySignal()]);

    expect(rows).toEqual([{ id: "signal-1", cells: ["Possible duplicate beneficiary", "critical", "open"] }]);
  });
});

describe("chart data helpers", () => {
  it("derives indicator progress bars", () => {
    expect(getIndicatorProgressData([makeIndicator()])).toEqual([{ id: "indicator-1", name: "IND-1", responses: 40 }]);
  });

  it("derives form performance bars", () => {
    expect(getFormPerformanceBarData([makeFormPerformance()])).toEqual([{ id: "form-1", name: "Household Survey", responses: 10 }]);
  });

  it("groups data quality signals by severity", () => {
    const signals = [
      makeQualitySignal({ id: "s1", severity: "critical" }),
      makeQualitySignal({ id: "s2", severity: "critical" }),
      makeQualitySignal({ id: "s3", severity: "low" }),
    ];

    const counts = getQualitySeverityCounts(signals);
    expect(counts).toEqual(
      expect.arrayContaining([
        { id: "critical", severity: "Critical", count: 2, color: "hsl(var(--danger))" },
        { id: "low", severity: "Low", count: 1, color: "hsl(var(--success))" },
      ]),
    );

    expect(getQualitySeverityBarData(signals)).toEqual(
      expect.arrayContaining([
        { id: "critical", name: "Critical", responses: 2 },
        { id: "low", name: "Low", responses: 1 },
      ]),
    );
  });
});

describe("getSubmissionsTrend", () => {
  it("buckets submissions by day across the requested window", () => {
    const today = new Date();
    const todayKey = today.toISOString().slice(0, 10);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().slice(0, 10);

    const submissions = [
      makeSubmission({ id: "a", submitted_at: `${todayKey}T08:00:00.000Z` }),
      makeSubmission({ id: "b", submitted_at: `${todayKey}T09:00:00.000Z` }),
      makeSubmission({ id: "c", submitted_at: `${yesterdayKey}T09:00:00.000Z` }),
    ];

    const trend = getSubmissionsTrend(submissions, 7);

    expect(trend).toHaveLength(7);
    expect(trend[trend.length - 1]).toEqual({ date: todayKey, count: 2 });
    expect(trend[trend.length - 2]).toEqual({ date: yesterdayKey, count: 1 });
    expect(trend.slice(0, trend.length - 2).every((point) => point.count === 0)).toBe(true);
  });

  it("ignores submissions outside the requested window", () => {
    const oldSubmission = makeSubmission({ id: "old", submitted_at: "2000-01-01T00:00:00.000Z" });
    const trend = getSubmissionsTrend([oldSubmission], 7);

    expect(trend.every((point) => point.count === 0)).toBe(true);
  });

  it("buckets across a custom window size", () => {
    const today = new Date();
    const todayKey = today.toISOString().slice(0, 10);
    const submissions = [makeSubmission({ id: "a", submitted_at: `${todayKey}T08:00:00.000Z` })];

    expect(getSubmissionsTrend(submissions, 30)).toHaveLength(30);
    expect(getSubmissionsTrend(submissions, 90)).toHaveLength(90);
  });
});

describe("dashboardRangeDays", () => {
  it("converts day-based ranges to numbers", () => {
    expect(dashboardRangeDays("7d")).toBe(7);
    expect(dashboardRangeDays("30d")).toBe(30);
    expect(dashboardRangeDays("90d")).toBe(90);
  });

  it("returns null for the all-time range", () => {
    expect(dashboardRangeDays("all")).toBeNull();
  });
});

describe("filterSubmissionsByFilters", () => {
  const submissions = [
    makeSubmission({ id: "recent-a", project_id: "project-1", submitted_at: "2026-06-10T10:00:00.000Z" }),
    makeSubmission({ id: "recent-b", project_id: "project-2", submitted_at: "2026-06-12T10:00:00.000Z" }),
    makeSubmission({ id: "old", project_id: "project-1", submitted_at: "2000-01-01T10:00:00.000Z" }),
  ];

  it("returns everything for the default 'all projects' / 'all time' filters", () => {
    const filters: DashboardFilters = { projectId: "all", range: "all" };
    expect(filterSubmissionsByFilters(submissions, filters)).toHaveLength(3);
  });

  it("filters by project_id", () => {
    const filters: DashboardFilters = { projectId: "project-1", range: "all" };
    const result = filterSubmissionsByFilters(submissions, filters);

    expect(result.map((s) => s.id)).toEqual(["recent-a", "old"]);
  });

  it("filters by date range using submitted_at", () => {
    const filters: DashboardFilters = { projectId: "all", range: "30d" };
    const result = filterSubmissionsByFilters(submissions, filters);

    expect(result.map((s) => s.id)).toEqual(["recent-a", "recent-b"]);
  });

  it("combines project and date filters", () => {
    const filters: DashboardFilters = { projectId: "project-1", range: "30d" };
    const result = filterSubmissionsByFilters(submissions, filters);

    expect(result.map((s) => s.id)).toEqual(["recent-a"]);
  });

  it("falls back to captured_at when submitted_at is missing", () => {
    const submission = makeSubmission({ id: "draft", submitted_at: null as unknown as string, captured_at: "2026-06-12T10:00:00.000Z" });
    const filters: DashboardFilters = { projectId: "all", range: "30d" };

    expect(filterSubmissionsByFilters([submission], filters).map((s) => s.id)).toEqual(["draft"]);
  });
});

describe("filterIndicatorsByFilters", () => {
  const indicators = [makeIndicator({ id: "ind-1", project_id: "project-1" }), makeIndicator({ id: "ind-2", project_id: "project-2" })];

  it("returns everything for 'all projects'", () => {
    expect(filterIndicatorsByFilters(indicators, { projectId: "all", range: "all" })).toHaveLength(2);
  });

  it("filters by project_id", () => {
    const result = filterIndicatorsByFilters(indicators, { projectId: "project-2", range: "all" });
    expect(result.map((i) => i.id)).toEqual(["ind-2"]);
  });
});

describe("filterFormsByFilters", () => {
  const forms = [makeForm({ id: "form-1", project_id: "project-1" }), makeForm({ id: "form-2", project_id: "project-2" })];

  it("returns everything for 'all projects'", () => {
    expect(filterFormsByFilters(forms, { projectId: "all", range: "all" })).toHaveLength(2);
  });

  it("filters by project_id", () => {
    const result = filterFormsByFilters(forms, { projectId: "project-1", range: "all" });
    expect(result.map((f) => f.id)).toEqual(["form-1"]);
  });
});

describe("filterQualitySignalsByFilters", () => {
  const signals = [
    makeQualitySignal({ id: "recent-with-submission", submission_id: "submission-1", created_at: "2026-06-12T00:00:00.000Z" }),
    makeQualitySignal({ id: "recent-without-submission", submission_id: null, created_at: "2026-06-12T00:00:00.000Z" }),
    makeQualitySignal({ id: "old-with-submission", submission_id: "submission-1", created_at: "2000-01-01T00:00:00.000Z" }),
    makeQualitySignal({ id: "recent-other-submission", submission_id: "submission-2", created_at: "2026-06-12T00:00:00.000Z" }),
  ];

  it("returns everything within range when no project filter is applied", () => {
    const filters: DashboardFilters = { projectId: "all", range: "30d" };
    const result = filterQualitySignalsByFilters(signals, filters, null);

    expect(result.map((s) => s.id)).toEqual(["recent-with-submission", "recent-without-submission", "recent-other-submission"]);
  });

  it("excludes signals tied to submissions outside the allowed set", () => {
    const filters: DashboardFilters = { projectId: "project-1", range: "30d" };
    const allowedSubmissionIds = new Set(["submission-1"]);
    const result = filterQualitySignalsByFilters(signals, filters, allowedSubmissionIds);

    expect(result.map((s) => s.id)).toEqual(["recent-with-submission", "recent-without-submission"]);
  });

  it("filters out signals outside the date range regardless of project filter", () => {
    const filters: DashboardFilters = { projectId: "project-1", range: "30d" };
    const allowedSubmissionIds = new Set(["submission-1"]);
    const result = filterQualitySignalsByFilters(signals, filters, allowedSubmissionIds);

    expect(result.map((s) => s.id)).not.toContain("old-with-submission");
  });
});

describe("filterSubmissionsByPreviousPeriod", () => {
  const submissions = [
    makeSubmission({ id: "current", project_id: "project-1", submitted_at: daysAgoIso(10) }),
    makeSubmission({ id: "previous", project_id: "project-1", submitted_at: daysAgoIso(45) }),
    makeSubmission({ id: "previous-other-project", project_id: "project-2", submitted_at: daysAgoIso(45) }),
    makeSubmission({ id: "too-old", project_id: "project-1", submitted_at: daysAgoIso(90) }),
  ];

  it("returns submissions from the period immediately before the selected range", () => {
    const filters: DashboardFilters = { projectId: "all", range: "30d" };
    const result = filterSubmissionsByPreviousPeriod(submissions, filters);

    expect(result.map((s) => s.id)).toEqual(["previous", "previous-other-project"]);
  });

  it("combines with the project filter", () => {
    const filters: DashboardFilters = { projectId: "project-1", range: "30d" };
    const result = filterSubmissionsByPreviousPeriod(submissions, filters);

    expect(result.map((s) => s.id)).toEqual(["previous"]);
  });

  it("returns an empty array for the all-time range", () => {
    const filters: DashboardFilters = { projectId: "all", range: "all" };
    expect(filterSubmissionsByPreviousPeriod(submissions, filters)).toEqual([]);
  });
});

describe("filterQualitySignalsByPreviousPeriod", () => {
  const signals = [
    makeQualitySignal({ id: "current", submission_id: "submission-1", created_at: daysAgoIso(10) }),
    makeQualitySignal({ id: "previous", submission_id: "submission-1", created_at: daysAgoIso(45) }),
    makeQualitySignal({ id: "previous-no-submission", submission_id: null, created_at: daysAgoIso(45) }),
    makeQualitySignal({ id: "previous-other-submission", submission_id: "submission-2", created_at: daysAgoIso(45) }),
    makeQualitySignal({ id: "too-old", submission_id: "submission-1", created_at: daysAgoIso(90) }),
  ];

  it("returns signals from the period immediately before the selected range", () => {
    const filters: DashboardFilters = { projectId: "all", range: "30d" };
    const result = filterQualitySignalsByPreviousPeriod(signals, filters, null);

    expect(result.map((s) => s.id)).toEqual(["previous", "previous-no-submission", "previous-other-submission"]);
  });

  it("excludes signals tied to submissions outside the allowed set", () => {
    const filters: DashboardFilters = { projectId: "project-1", range: "30d" };
    const allowedSubmissionIds = new Set(["submission-1"]);
    const result = filterQualitySignalsByPreviousPeriod(signals, filters, allowedSubmissionIds);

    expect(result.map((s) => s.id)).toEqual(["previous", "previous-no-submission"]);
  });

  it("returns an empty array for the all-time range", () => {
    const filters: DashboardFilters = { projectId: "all", range: "all" };
    expect(filterQualitySignalsByPreviousPeriod(signals, filters, null)).toEqual([]);
  });
});

describe("filterDonorReportsByFilters", () => {
  const projects = [makeProject({ id: "project-1", name: "Project A" }), makeProject({ id: "project-2", name: "Project B" })];
  const reports = [makeDonorReport({ id: "report-a", project: "Project A" }), makeDonorReport({ id: "report-b", project: "Project B" })];

  it("returns everything for 'all projects'", () => {
    expect(filterDonorReportsByFilters(reports, { projectId: "all", range: "all" }, projects)).toHaveLength(2);
  });

  it("filters by matching the selected project's name", () => {
    const result = filterDonorReportsByFilters(reports, { projectId: "project-2", range: "all" }, projects);
    expect(result.map((r) => r.id)).toEqual(["report-b"]);
  });

  it("returns everything if the selected project cannot be found", () => {
    const result = filterDonorReportsByFilters(reports, { projectId: "missing-project", range: "all" }, projects);
    expect(result).toHaveLength(2);
  });
});

describe("applyCrossFilterToSubmissions", () => {
  const submissions = [
    makeSubmission({ id: "approved", form_id: "form-1", status: "approved" }),
    makeSubmission({ id: "pending", form_id: "form-1", status: "pending_review" }),
    makeSubmission({ id: "rejected", form_id: "form-2", status: "rejected" }),
    makeSubmission({ id: "correction", form_id: "form-2", status: "needs_correction" }),
  ];

  it("returns everything when no cross filter is active", () => {
    expect(applyCrossFilterToSubmissions(submissions, null)).toEqual(submissions);
  });

  it("filters by submission status category", () => {
    const crossFilter: DashboardCrossFilter = { field: "status", value: "approved", label: "Approved" };
    expect(applyCrossFilterToSubmissions(submissions, crossFilter).map((s) => s.id)).toEqual(["approved"]);
  });

  it("treats rejected status as both rejected and returned-for-correction", () => {
    const rejectedFilter: DashboardCrossFilter = { field: "status", value: "rejected", label: "Rejected" };
    expect(applyCrossFilterToSubmissions(submissions, rejectedFilter).map((s) => s.id)).toEqual(["rejected"]);

    const returnedFilter: DashboardCrossFilter = { field: "status", value: "returned", label: "Returned" };
    expect(applyCrossFilterToSubmissions(submissions, returnedFilter).map((s) => s.id)).toEqual(["rejected", "correction"]);
  });

  it("filters by form_id", () => {
    const crossFilter: DashboardCrossFilter = { field: "form", value: "form-2", label: "Form: B" };
    expect(applyCrossFilterToSubmissions(submissions, crossFilter).map((s) => s.id)).toEqual(["rejected", "correction"]);
  });
});

describe("applyCrossFilterToQualitySignals", () => {
  const signals = [
    makeQualitySignal({ id: "critical-1", severity: "critical" }),
    makeQualitySignal({ id: "critical-2", severity: "Critical" }),
    makeQualitySignal({ id: "low-1", severity: "low" }),
  ];

  it("returns everything when no cross filter is active", () => {
    expect(applyCrossFilterToQualitySignals(signals, null)).toEqual(signals);
  });

  it("returns everything for non-severity cross filters", () => {
    const crossFilter: DashboardCrossFilter = { field: "form", value: "form-1", label: "Form: A" };
    expect(applyCrossFilterToQualitySignals(signals, crossFilter)).toEqual(signals);
  });

  it("filters by severity, case-insensitively", () => {
    const crossFilter: DashboardCrossFilter = { field: "severity", value: "critical", label: "Critical severity" };
    expect(applyCrossFilterToQualitySignals(signals, crossFilter).map((s) => s.id)).toEqual(["critical-1", "critical-2"]);
  });
});

describe("toggleCrossFilter", () => {
  it("sets the cross filter when none is active", () => {
    const next: DashboardCrossFilter = { field: "status", value: "approved", label: "Approved" };
    expect(toggleCrossFilter(null, next)).toEqual(next);
  });

  it("clears the cross filter when the same segment is clicked again", () => {
    const current: DashboardCrossFilter = { field: "status", value: "approved", label: "Approved" };
    expect(toggleCrossFilter(current, current)).toBeNull();
  });

  it("replaces the cross filter when a different segment is clicked", () => {
    const current: DashboardCrossFilter = { field: "status", value: "approved", label: "Approved" };
    const next: DashboardCrossFilter = { field: "severity", value: "critical", label: "Critical severity" };
    expect(toggleCrossFilter(current, next)).toEqual(next);
  });
});
