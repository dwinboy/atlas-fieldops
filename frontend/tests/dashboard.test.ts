import { describe, expect, it } from "vitest";

import type { DataFormRead, SubmissionRead } from "@/lib/api";
import {
  getActiveFormPerformance,
  getDashboardApprovalOverview,
  getDashboardCommandMetrics,
  getDashboardCoverageOverview,
  getDashboardQualityScore,
  getFormPerformanceTotals,
} from "@/lib/dashboard";

function makeForm(
  id: string,
  status: string,
  isActive = true,
): DataFormRead {
  return {
    current_version: 1,
    description: `${id} purpose`,
    id,
    is_active: isActive,
    name: id,
    project_id: "project-1",
    slug: id,
    status,
    survey_id: "survey-1",
  };
}

function makeSubmission(
  id: string,
  formId: string,
  status: string,
  synced = true,
): SubmissionRead {
  return {
    accuracy: 6,
    captured_at: "2026-06-01T09:00:00.000Z",
    client_submission_id: `client-${id}`,
    device_id: "device-1",
    field_officer_id: "officer-1",
    form_id: formId,
    id,
    latitude: 6.1,
    longitude: 10.2,
    offline_created: true,
    payload_json: { name: "Sample" },
    project_id: "project-1",
    server_sequence: 1,
    status,
    submitted_at: "2026-06-01T10:00:00.000Z",
    survey_id: "survey-1",
    sync_received_at: synced ? "2026-06-01T10:05:00.000Z" : "",
  };
}

describe("dashboard form activity", () => {
  it("shows forms that are live or already receiving data", () => {
    const forms = [
      makeForm("published-form", "published"),
      makeForm("draft-with-data", "draft"),
      makeForm("draft-empty", "draft"),
      makeForm("inactive-live", "published", false),
    ];
    const submissions = [
      makeSubmission("sub-1", "draft-with-data", "submitted"),
    ];

    const activity = getActiveFormPerformance(forms, submissions);

    expect(activity.map((item) => item.form.id)).toEqual([
      "draft-with-data",
      "published-form",
    ]);
    expect(activity[0]?.statusLabel).toBe("Receiving data");
    expect(activity[1]?.statusLabel).toBe("In action");
  });

  it("calculates response, sync, review, and approval totals", () => {
    const forms = [makeForm("household-survey", "published")];
    const submissions = [
      makeSubmission("sub-1", "household-survey", "approved"),
      makeSubmission("sub-2", "household-survey", "pending_review", false),
      makeSubmission("sub-3", "household-survey", "needs_correction"),
    ];

    const activity = getActiveFormPerformance(forms, submissions);
    const totals = getFormPerformanceTotals(activity);

    expect(activity[0]?.totalSubmissions).toBe(3);
    expect(activity[0]?.syncedRecords).toBe(2);
    expect(activity[0]?.pendingReview).toBe(1);
    expect(activity[0]?.correctionNeeded).toBe(1);
    expect(activity[0]?.completion).toBe(33);
    expect(totals).toMatchObject({
      approved: 1,
      correctionNeeded: 1,
      pendingReview: 1,
      submissions: 3,
      syncedRecords: 2,
    });
  });

  it("builds architecture dashboard metrics from live summaries", () => {
    const totals = {
      approved: 8,
      correctionNeeded: 1,
      offlineRecords: 2,
      pendingReview: 3,
      submissions: 12,
      syncedRecords: 10,
    };

    const metrics = getDashboardCommandMetrics({
      activeForms: 4,
      activeProjects: 2,
      coveragePercent: 75,
      fieldOfficers: 6,
      indicators: 5,
      pendingReviews: totals.pendingReview,
      qualityScore: getDashboardQualityScore(
        {
          active_programs: 2,
          beneficiaries: 30,
          indicators: 5,
          offline_ready: true,
          open_cases: 0,
          quality_flags: 1,
          sync_health_percent: 92,
        },
        totals,
      ),
      totalSubmissions: totals.submissions,
    });

    expect(metrics.map((metric) => metric.label)).toEqual([
      "Active projects",
      "Active forms",
      "Total submissions",
      "Pending reviews",
      "Data quality score",
      "Coverage progress",
      "Field officer activity",
      "Indicator progress",
    ]);
    expect(metrics[4]?.value).toBe("90%");
    expect(metrics[5]).toMatchObject({
      tone: "warning",
      value: "75%",
    });
  });

  it("summarizes approval and map coverage without demo data", () => {
    const submissions = [
      makeSubmission("sub-1", "household-survey", "approved"),
      makeSubmission("sub-2", "household-survey", "pending_review", false),
      makeSubmission("sub-3", "household-survey", "rejected"),
      {
        ...makeSubmission("sub-4", "household-survey", "needs_correction"),
        latitude: Number.NaN,
        longitude: Number.NaN,
      },
    ];
    const forms = [makeForm("household-survey", "published")];
    const totals = getFormPerformanceTotals(
      getActiveFormPerformance(forms, submissions),
    );

    expect(getDashboardApprovalOverview(submissions, totals)).toMatchObject({
      approved: 1,
      pending: 1,
      rejected: 1,
      returned: 2,
      total: 4,
    });
    expect(getDashboardCoverageOverview(submissions)).toMatchObject({
      coveragePercent: 75,
      locatedSubmissions: 3,
      totalSubmissions: 4,
    });
  });
});
