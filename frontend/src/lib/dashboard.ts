import type { DataFormRead, SubmissionRead } from "@/lib/api";

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

function isApprovedSubmission(submission: SubmissionRead): boolean {
  return ["approved", "accepted", "validated"].includes(
    submission.status.toLowerCase(),
  );
}

function isCorrectionSubmission(submission: SubmissionRead): boolean {
  return [
    "correction_requested",
    "needs_correction",
    "request_correction",
    "rejected",
  ].includes(submission.status.toLowerCase());
}

function isPendingReviewSubmission(submission: SubmissionRead): boolean {
  return [
    "submitted",
    "pending",
    "pending_review",
    "under_review",
    "in_review",
    "received",
  ].includes(submission.status.toLowerCase());
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
