import type { BadgeProps } from "@/components/ui/badge";
import type { SubmissionRead } from "@/lib/api";
import {
  previewSubmissions,
  type SubmissionRecord,
  type SubmissionSection,
  type SubmissionWorkflowStage,
  type SubmissionsSummary,
} from "@/modules/submissions/data";

export function formatSubmissionStatus(status: string): string {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replace("Correction Requested", "Returned for Correction")
    .replace("Under Review", "Pending Review");
}

export function statusTone(status: string): BadgeProps["tone"] {
  if (["approved"].includes(status)) return "success";
  if (["rejected"].includes(status)) return "danger";
  if (["under_review", "submitted", "pending_review", "resubmitted"].includes(status)) return "warning";
  if (["correction_requested", "needs_correction", "returned"].includes(status)) return "warning";
  if (["archived"].includes(status)) return "neutral";
  return "accent";
}

export function qualityTone(score: number): BadgeProps["tone"] {
  if (score >= 90) return "success";
  if (score >= 70) return "accent";
  if (score >= 50) return "warning";
  return "danger";
}

export function slaStatus(dueAt: string): "On Time" | "Warning" | "Overdue" {
  const due = new Date(dueAt).getTime();
  const hoursRemaining = (due - Date.now()) / (1000 * 60 * 60);
  if (hoursRemaining < 0) return "Overdue";
  if (hoursRemaining <= 6) return "Warning";
  return "On Time";
}

export function slaTone(status: "On Time" | "Warning" | "Overdue"): BadgeProps["tone"] {
  if (status === "On Time") return "success";
  if (status === "Warning") return "warning";
  return "danger";
}

export function reviewStageFromStatus(status: string): SubmissionWorkflowStage {
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  if (status === "archived") return "Archived";
  if (["correction_requested", "needs_correction", "returned"].includes(status)) return "Returned for Correction";
  if (status === "resubmitted") return "Resubmitted";
  if (["under_review", "submitted", "pending_review"].includes(status)) return "Pending Review";
  return "Draft";
}

export function calculateQualityScore(submission: SubmissionRead): number {
  const payload = submission.payload_json ?? {};
  const values = Object.values(payload);
  const completeness = values.length ? Math.round((values.filter((value) => value !== null && value !== undefined && value !== "").length / values.length) * 100) : 60;
  const gpsPenalty = !submission.latitude || !submission.longitude ? 25 : submission.accuracy && submission.accuracy > 20 ? 15 : 0;
  const statusPenalty = submission.status === "rejected" ? 35 : ["correction_requested", "needs_correction"].includes(submission.status) ? 20 : 0;
  const duplicatePenalty = Object.keys(payload).some((key) => key.includes("phone") || key.includes("household") || key.includes("beneficiary")) ? 0 : 5;
  return Math.max(0, Math.min(100, completeness - gpsPenalty - statusPenalty - duplicatePenalty));
}

export function normalizeSubmission(submission: SubmissionRead): SubmissionRecord {
  const qualityScore = calculateQualityScore(submission);
  const dueAt = new Date(new Date(submission.submitted_at || submission.sync_received_at).getTime() + 48 * 60 * 60 * 1000).toISOString();
  const reviewStage = reviewStageFromStatus(submission.status);
  const gpsStatus = !submission.latitude || !submission.longitude ? "missing" : submission.accuracy && submission.accuracy > 15 ? "warning" : "valid";
  const qualityFlags: SubmissionRecord["quality_flags"] = [];
  if (gpsStatus !== "valid") {
    qualityFlags.push({
      check: "GPS Validation",
      id: `${submission.id}-gps`,
      message: gpsStatus === "missing" ? "Submission has no usable coordinates." : "GPS accuracy is above the preferred threshold.",
      severity: gpsStatus === "missing" ? "Critical" : "Medium",
      status: "open",
    });
  }
  if (qualityScore < 70) {
    qualityFlags.push({
      check: "Quality Score",
      id: `${submission.id}-quality`,
      message: "Automatic quality score is below the review threshold.",
      severity: qualityScore < 50 ? "Critical" : "High",
      status: "open",
    });
  }

  return {
    ...submission,
    attachments: [],
    audit_events: [
      { action: "Submission Created", actor: submission.field_officer_id, created_at: submission.captured_at, new_value: "draft" },
      { action: "Submission Submitted", actor: submission.field_officer_id, created_at: submission.submitted_at, new_value: submission.status },
    ],
    duplicate_risk: qualityScore < 55 ? "possible" : "none",
    form_name: submission.form_id.replaceAll("-", " "),
    form_version: submission.server_sequence,
    gps_status: gpsStatus,
    history: [
      { action: "Created", actor: submission.field_officer_id, created_at: submission.captured_at },
      { action: "Submitted", actor: submission.field_officer_id, created_at: submission.submitted_at },
    ],
    location_name: submission.latitude && submission.longitude ? "Captured GPS location" : "No location captured",
    project_name: submission.project_id?.replaceAll("-", " ") ?? "Unassigned project",
    quality_flags: qualityFlags,
    quality_score: qualityScore,
    review_stage: reviewStage,
    reviewer: "Unassigned reviewer",
    sla_due_at: dueAt,
    supervisor: "Unassigned supervisor",
    workflow: [
      { action_date: submission.submitted_at, reviewer: "System", sla_status: "On Time", stage: "Submitted" },
      { reviewer: "Unassigned reviewer", sla_status: slaStatus(dueAt), stage: reviewStage },
    ],
  };
}

export function computeSubmissionsSummary(submissions: SubmissionRecord[]): SubmissionsSummary {
  const approved = submissions.filter((submission) => submission.status === "approved").length;
  const rejected = submissions.filter((submission) => submission.status === "rejected").length;
  const returned = submissions.filter((submission) => ["correction_requested", "needs_correction", "returned"].includes(submission.status)).length;
  const pendingReview = submissions.filter((submission) => ["under_review", "submitted", "pending_review", "resubmitted"].includes(submission.status)).length;
  const archived = submissions.filter((submission) => submission.status === "archived").length;
  const today = new Date().toDateString();
  const todaysSubmissions = submissions.filter((submission) => new Date(submission.submitted_at).toDateString() === today).length;
  const reviewHours = submissions
    .filter((submission) => submission.status === "approved" || submission.status === "rejected")
    .map((submission) => Math.max(0, (Date.now() - new Date(submission.submitted_at).getTime()) / (1000 * 60 * 60)));
  return {
    approval_rate: submissions.length ? Math.round((approved / submissions.length) * 100) : 0,
    approved,
    archived,
    average_review_hours: reviewHours.length ? Math.round(reviewHours.reduce((total, value) => total + value, 0) / reviewHours.length) : 0,
    pending_review: pendingReview,
    quality_alerts: submissions.reduce((total, submission) => total + submission.quality_flags.filter((flag) => flag.status === "open").length, 0),
    rejected,
    returned,
    todays_submissions: todaysSubmissions,
    total_submissions: submissions.length,
  };
}

export function filterSubmissions(submissions: SubmissionRecord[], section: SubmissionSection): SubmissionRecord[] {
  if (section === "all" || section === "dashboard") return submissions;
  if (section === "pending-review") return submissions.filter((submission) => ["under_review", "submitted", "pending_review", "resubmitted"].includes(submission.status));
  if (section === "approved") return submissions.filter((submission) => submission.status === "approved");
  if (section === "rejected") return submissions.filter((submission) => submission.status === "rejected");
  if (section === "returned") return submissions.filter((submission) => ["correction_requested", "needs_correction", "returned"].includes(submission.status));
  if (section === "archived") return submissions.filter((submission) => submission.status === "archived");
  return submissions;
}

export function applyPreviewReviewAction(
  submissions: SubmissionRecord[],
  submissionId: string,
  action: "approve" | "reject" | "request_correction" | "start_review" | "archive",
  comment: string,
): SubmissionRecord[] {
  const statusByAction = {
    approve: "approved",
    archive: "archived",
    reject: "rejected",
    request_correction: "correction_requested",
    start_review: "under_review",
  } as const;
  return submissions.map((submission) => {
    if (submission.id !== submissionId) return submission;
    const nextStatus = statusByAction[action];
    const createdAt = new Date().toISOString();
    return {
      ...submission,
      archived_at: action === "archive" ? createdAt : submission.archived_at,
      audit_events: [
        ...submission.audit_events,
        {
          action: action === "request_correction" ? "Returned for Correction" : `Submission ${formatSubmissionStatus(nextStatus)}`,
          actor: "Reviewer",
          created_at: createdAt,
          old_value: submission.status,
          new_value: nextStatus,
          reason: comment,
        },
      ],
      history: [
        ...submission.history,
        {
          action: action === "request_correction" ? "Returned for Correction" : formatSubmissionStatus(nextStatus),
          actor: "Reviewer",
          comment,
          created_at: createdAt,
        },
      ],
      payload_json: {
        ...submission.payload_json,
        reviewer_note: comment,
      },
      review_stage: reviewStageFromStatus(nextStatus),
      reviewer: "Reviewer",
      server_sequence: submission.server_sequence + 1,
      status: nextStatus,
      workflow: [
        ...submission.workflow,
        {
          action_date: createdAt,
          comments: comment,
          reviewer: "Reviewer",
          sla_status: slaStatus(submission.sla_due_at),
          stage: reviewStageFromStatus(nextStatus),
        },
      ],
    };
  });
}

export function getPreviewSubmissions(): SubmissionRecord[] {
  return previewSubmissions;
}
