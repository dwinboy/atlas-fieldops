import type { DataFormRead, OperationsSummary, SubmissionRead } from "@/lib/api";

export type FormPerformance = {
  approved: number;
  completion: number;
  correctionNeeded: number;
  enumerators: number;
  form: DataFormRead;
  lastSyncLabel: string;
  lastSubmissionLabel: string;
  offlineRecords: number;
  pendingReview: number;
  qualityScore: number;
  statusLabel: string;
  statusTone: "accent" | "neutral" | "success" | "warning";
  syncedRecords: number;
  totalSubmissions: number;
};

export type FormPerformanceTotals = {
  approved: number;
  correctionNeeded: number;
  offlineRecords: number;
  pendingReview: number;
  submissions: number;
  syncedRecords: number;
};

export type DashboardCommandMetric = {
  detail: string;
  label: string;
  tone: "accent" | "danger" | "neutral" | "success" | "warning";
  value: string;
};

export type DashboardCoverageOverview = {
  coveragePercent: number;
  locatedSubmissions: number;
  totalSubmissions: number;
  uniqueLocations: number;
};

export type DashboardApprovalOverview = {
  approved: number;
  pending: number;
  rejected: number;
  returned: number;
  total: number;
};

export function formatDashboardDateLabel(value?: string): string {
  if (!value) return "No submissions yet";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "No submissions yet";
  return parsed.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function isApprovedSubmission(submission: SubmissionRead): boolean {
  return ["approved", "accepted", "validated"].includes(
    submission.status.toLowerCase(),
  );
}

export function isCorrectionSubmission(submission: SubmissionRead): boolean {
  return [
    "correction_requested",
    "needs_correction",
    "request_correction",
    "rejected",
  ].includes(submission.status.toLowerCase());
}

export function isPendingReviewSubmission(submission: SubmissionRead): boolean {
  return [
    "submitted",
    "pending",
    "pending_review",
    "under_review",
    "in_review",
    "received",
  ].includes(submission.status.toLowerCase());
}

export function isRejectedSubmission(submission: SubmissionRead): boolean {
  return ["rejected", "invalid", "discarded"].includes(
    submission.status.toLowerCase(),
  );
}

export function getFormPerformance(
  form: DataFormRead,
  submissions: SubmissionRead[],
): FormPerformance {
  const formSubmissions = submissions.filter(
    (submission) => submission.form_id === form.id,
  );
  const approved = formSubmissions.filter(isApprovedSubmission).length;
  const correctionNeeded = formSubmissions.filter(isCorrectionSubmission).length;
  const pendingReview = formSubmissions.filter(isPendingReviewSubmission).length;
  const enumerators = new Set(
    formSubmissions.map((submission) => submission.field_officer_id),
  ).size;
  const syncedRecords = formSubmissions.filter(
    (submission) => submission.sync_received_at,
  ).length;
  const offlineRecords = formSubmissions.filter(
    (submission) => submission.offline_created,
  ).length;
  const submissionDates = formSubmissions
    .map((submission) => submission.submitted_at || submission.captured_at)
    .filter(Boolean)
    .sort();
  const lastSubmittedAt = submissionDates[submissionDates.length - 1];
  const syncDates = formSubmissions
    .map((submission) => submission.sync_received_at)
    .filter(Boolean)
    .sort();
  const lastSyncedAt = syncDates[syncDates.length - 1];
  const totalSubmissions = formSubmissions.length;
  const completion = totalSubmissions
    ? Math.round((approved / totalSubmissions) * 100)
    : 0;
  const qualityScore = totalSubmissions
    ? Math.max(
        0,
        Math.round(100 - (correctionNeeded / totalSubmissions) * 100),
      )
    : 0;
  const normalizedStatus = form.status.toLowerCase();
  const receivingData = totalSubmissions > 0;
  const statusLabel =
    normalizedStatus === "published" || normalizedStatus === "live"
      ? "In action"
      : receivingData
        ? "Receiving data"
        : normalizedStatus === "draft"
          ? "Draft"
          : form.status.replaceAll("_", " ");
  const statusTone =
    normalizedStatus === "published" || normalizedStatus === "live"
      ? "success"
      : receivingData
        ? "accent"
        : normalizedStatus === "draft"
          ? "warning"
          : "neutral";

  return {
    approved,
    completion,
    correctionNeeded,
    enumerators,
    form,
    lastSyncLabel: formatDashboardDateLabel(lastSyncedAt),
    lastSubmissionLabel: formatDashboardDateLabel(lastSubmittedAt),
    offlineRecords,
    pendingReview,
    qualityScore,
    statusLabel,
    statusTone,
    syncedRecords,
    totalSubmissions,
  };
}

export function getActiveFormPerformance(
  forms: DataFormRead[],
  submissions: SubmissionRead[],
): FormPerformance[] {
  return forms
    .map((form) => getFormPerformance(form, submissions))
    .filter((item) => {
      const status = item.form.status.toLowerCase();
      return (
        item.form.is_active &&
        (item.totalSubmissions > 0 ||
          ["published", "live", "active", "in_action"].includes(status))
      );
    })
    .sort((left, right) => {
      const rightHasData = right.totalSubmissions ? 1 : 0;
      const leftHasData = left.totalSubmissions ? 1 : 0;
      if (rightHasData !== leftHasData) return rightHasData - leftHasData;
      return right.totalSubmissions - left.totalSubmissions;
    });
}

export function getFormPerformanceTotals(
  formPerformance: FormPerformance[],
): FormPerformanceTotals {
  return formPerformance.reduce(
    (totals, item) => ({
      approved: totals.approved + item.approved,
      correctionNeeded: totals.correctionNeeded + item.correctionNeeded,
      offlineRecords: totals.offlineRecords + item.offlineRecords,
      pendingReview: totals.pendingReview + item.pendingReview,
      syncedRecords: totals.syncedRecords + item.syncedRecords,
      submissions: totals.submissions + item.totalSubmissions,
    }),
    {
      approved: 0,
      correctionNeeded: 0,
      offlineRecords: 0,
      pendingReview: 0,
      submissions: 0,
      syncedRecords: 0,
    },
  );
}

export function getDashboardCoverageOverview(
  submissions: SubmissionRead[],
): DashboardCoverageOverview {
  const locatedSubmissions = submissions.filter(
    (submission) =>
      Number.isFinite(submission.latitude) &&
      Number.isFinite(submission.longitude),
  );
  const uniqueLocations = new Set(
    locatedSubmissions.map(
      (submission) =>
        `${submission.latitude.toFixed(4)},${submission.longitude.toFixed(4)}`,
    ),
  ).size;
  const totalSubmissions = submissions.length;

  return {
    coveragePercent: totalSubmissions
      ? Math.round((locatedSubmissions.length / totalSubmissions) * 100)
      : 0,
    locatedSubmissions: locatedSubmissions.length,
    totalSubmissions,
    uniqueLocations,
  };
}

export function getDashboardApprovalOverview(
  submissions: SubmissionRead[],
  totals: FormPerformanceTotals,
): DashboardApprovalOverview {
  return {
    approved: totals.approved,
    pending: totals.pendingReview,
    rejected: submissions.filter(isRejectedSubmission).length,
    returned: totals.correctionNeeded,
    total: submissions.length || totals.submissions,
  };
}

export function getDashboardQualityScore(
  summary: OperationsSummary | undefined,
  totals: FormPerformanceTotals,
): number | null {
  const hasData =
    totals.submissions > 0 ||
    Boolean(
      summary &&
        (summary.active_programs ||
          summary.beneficiaries ||
          summary.indicators ||
          summary.open_cases ||
          summary.quality_flags),
    );

  if (!hasData) return null;

  const issueCount = (summary?.quality_flags ?? 0) + totals.correctionNeeded;
  return Math.max(0, Math.min(100, 100 - issueCount * 5));
}

export function getDashboardCommandMetrics({
  activeForms,
  activeProjects,
  coveragePercent,
  fieldOfficers,
  indicators,
  pendingReviews,
  qualityScore,
  totalSubmissions,
}: {
  activeForms: number;
  activeProjects: number;
  coveragePercent: number;
  fieldOfficers: number;
  indicators: number;
  pendingReviews: number;
  qualityScore: number | null;
  totalSubmissions: number;
}): DashboardCommandMetric[] {
  return [
    {
      detail: "Project workspaces currently active.",
      label: "Active projects",
      tone: activeProjects ? "success" : "neutral",
      value: activeProjects.toLocaleString(),
    },
    {
      detail: "Published or in-action forms receiving data.",
      label: "Active forms",
      tone: activeForms ? "success" : "neutral",
      value: activeForms.toLocaleString(),
    },
    {
      detail: "Submitted records available for review and analysis.",
      label: "Total submissions",
      tone: totalSubmissions ? "accent" : "neutral",
      value: totalSubmissions.toLocaleString(),
    },
    {
      detail: "Records waiting for reviewer action.",
      label: "Pending reviews",
      tone: pendingReviews ? "warning" : "success",
      value: pendingReviews.toLocaleString(),
    },
    {
      detail: "Estimated trust score from open quality issues.",
      label: "Data quality score",
      tone:
        qualityScore === null
          ? "neutral"
          : qualityScore >= 85
            ? "success"
            : qualityScore >= 65
              ? "warning"
              : "danger",
      value: qualityScore === null ? "Not started" : `${qualityScore}%`,
    },
    {
      detail: "Submissions with usable GPS coordinates.",
      label: "Coverage progress",
      tone: coveragePercent >= 80 ? "success" : coveragePercent ? "warning" : "neutral",
      value: `${coveragePercent}%`,
    },
    {
      detail: "Field officers with synced or submitted work.",
      label: "Field officer activity",
      tone: fieldOfficers ? "accent" : "neutral",
      value: fieldOfficers.toLocaleString(),
    },
    {
      detail: "Configured indicators ready for tracking.",
      label: "Indicator progress",
      tone: indicators ? "success" : "neutral",
      value: indicators.toLocaleString(),
    },
  ];
}
