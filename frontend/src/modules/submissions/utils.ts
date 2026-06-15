import type { BadgeProps } from "@/components/ui/badge";
import type { SubmissionRead, UserRead } from "@/lib/api";
import { statusTone as canonicalStatusTone } from "@/lib/statusTones";
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
    .replace("Import Staged", "Import Staged")
    .replace("Under Review", "Pending Review");
}

export function statusTone(status: string): BadgeProps["tone"] {
  return canonicalStatusTone(status);
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
  if (status === "import_staged") return "Import Staged";
  if (["under_review", "submitted", "pending_review"].includes(status)) return "Pending Review";
  return "Draft";
}

export function calculateQualityScore(submission: SubmissionRead): number {
  const payload = submission.payload_json ?? {};
  const mobileIntegrity = mobileIntegrityPayload(payload);
  const mobileScore = typeof mobileIntegrity?.score === "number" ? mobileIntegrity.score : null;
  const values = Object.values(normalizedSubmissionAnswers(payload));
  const completeness = values.length ? Math.round((values.filter((value) => value !== null && value !== undefined && value !== "").length / values.length) * 100) : 60;
  const gpsPenalty = !submission.latitude || !submission.longitude ? 25 : submission.accuracy && submission.accuracy > 20 ? 15 : 0;
  const statusPenalty = submission.status === "rejected" ? 35 : ["correction_requested", "needs_correction"].includes(submission.status) ? 20 : 0;
  const duplicatePenalty = Object.keys(normalizedSubmissionAnswers(payload)).some((key) => key.includes("phone") || key.includes("household") || key.includes("beneficiary")) ? 0 : 5;
  const calculatedScore = Math.max(0, Math.min(100, completeness - gpsPenalty - statusPenalty - duplicatePenalty));
  return mobileScore === null ? calculatedScore : Math.min(calculatedScore, mobileScore);
}

function submissionValidationIssues(submission: SubmissionRead): string[] {
  const payload = submission.payload_json ?? {};
  const rawIssues = payload._validation_issues;
  if (!Array.isArray(rawIssues)) return [];
  return rawIssues.filter((issue): issue is string => typeof issue === "string" && issue.trim().length > 0);
}

function mobileIntegrityPayload(payload: Record<string, unknown>): Record<string, unknown> | null {
  const rawIntegrity = payload._mobile_integrity;
  if (!rawIntegrity || typeof rawIntegrity !== "object" || Array.isArray(rawIntegrity)) return null;
  return rawIntegrity as Record<string, unknown>;
}

function normalizedSubmissionAnswers(payload: Record<string, unknown>): Record<string, unknown> {
  const answers: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (!key.startsWith("_") && key !== "responses") answers[key] = value;
  }
  const responseRows = Array.isArray(payload.responses)
    ? payload.responses
    : Array.isArray(payload._mobile_responses)
      ? payload._mobile_responses
      : [];
  for (const row of responseRows) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const response = row as Record<string, unknown>;
    const key = String(response.variableName ?? response.variable_name ?? response.questionId ?? response.question_id ?? "").trim();
    if (key) answers[key] = response.value;
  }
  return answers;
}

function mobileIntegritySignals(payload: Record<string, unknown>): {
  code: string;
  message: string;
  severity: "Low" | "Medium" | "High" | "Critical";
}[] {
  const integrity = mobileIntegrityPayload(payload);
  const rawSignals = Array.isArray(integrity?.signals) ? integrity.signals : [];
  return rawSignals
    .map((rawSignal) => {
      if (!rawSignal || typeof rawSignal !== "object" || Array.isArray(rawSignal)) return null;
      const signal = rawSignal as Record<string, unknown>;
      const severity = typeof signal.severity === "string" ? signal.severity.toLowerCase() : "";
      return {
        code: typeof signal.code === "string" ? signal.code : "FIELD_INTEGRITY_SIGNAL",
        message: typeof signal.message === "string" ? signal.message : "Mobile field integrity signal needs reviewer attention.",
        severity:
          severity === "critical"
            ? "Critical"
            : severity === "warning" || severity === "high"
              ? "High"
              : severity === "info" || severity === "low"
                ? "Low"
                : "Medium",
      };
    })
    .filter((signal): signal is { code: string; message: string; severity: "Low" | "Medium" | "High" | "Critical" } => Boolean(signal));
}

export function normalizeSubmission(submission: SubmissionRead): SubmissionRecord {
  const qualityScore = calculateQualityScore(submission);
  const dueAt = new Date(new Date(submission.submitted_at || submission.sync_received_at).getTime() + 48 * 60 * 60 * 1000).toISOString();
  const reviewStage = reviewStageFromStatus(submission.status);
  const locationStatus = submission.payload_json?._mobile_location_status;
  const hasUsableGps =
    locationStatus !== "not_required_or_missing" &&
    Number.isFinite(submission.latitude) &&
    Number.isFinite(submission.longitude) &&
    !(submission.latitude === 0 && submission.longitude === 0);
  const gpsStatus = !hasUsableGps ? "missing" : submission.accuracy && submission.accuracy > 15 ? "warning" : "valid";
  const validationIssues = submissionValidationIssues(submission);
  const qualityFlags: SubmissionRecord["quality_flags"] = [];
  const controlMetadata = submission.payload_json?._question_control_metadata;
  validationIssues.forEach((message, index) => {
    qualityFlags.push({
      check: "Form Validation",
      id: `${submission.id}-validation-${index}`,
      message,
      severity: "High",
      status: "open",
    });
  });
  mobileIntegritySignals(submission.payload_json ?? {}).forEach((signal, index) => {
    qualityFlags.push({
      check: `Mobile Integrity: ${signal.code.replaceAll("_", " ")}`,
      id: `${submission.id}-mobile-integrity-${index}`,
      message: signal.message,
      severity: signal.severity,
      status: "open",
    });
  });
  if (controlMetadata && typeof controlMetadata === "object" && !Array.isArray(controlMetadata)) {
    Object.entries(controlMetadata as Record<string, unknown>).forEach(([key, raw], index) => {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
      const entry = raw as Record<string, unknown>;
      const privacy = entry.privacy && typeof entry.privacy === "object" && !Array.isArray(entry.privacy)
        ? entry.privacy as Record<string, unknown>
        : null;
      const governance = entry.governance && typeof entry.governance === "object" && !Array.isArray(entry.governance)
        ? entry.governance as Record<string, unknown>
        : null;
      const label = typeof entry.label === "string" ? entry.label : key;
      if (privacy?.sensitivity === "pii" || privacy?.sensitivity === "restricted") {
        qualityFlags.push({
          check: "Sensitive Data Control",
          id: `${submission.id}-privacy-control-${index}`,
          message: `${label} is marked as sensitive. Reviewer should verify consent, masking, and export restrictions before approval.`,
          severity: "Medium",
          status: "open",
        });
      }
      if (governance?.approvedDataLock || governance?.changeReasonRequired) {
        qualityFlags.push({
          check: "Governance Control",
          id: `${submission.id}-governance-control-${index}`,
          message: `${label} has governance controls. Approved edits should create a change request and require a reason.`,
          severity: "Low",
          status: "open",
        });
      }
    });
  }
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

  const actor =
    submission.submitted_by_name ??
    submission.imported_by_name ??
    submission.field_officer_id ??
    submission.imported_by_user_id ??
    "Uploaded file";

  return {
    ...submission,
    attachments: [],
    audit_events: [
      { action: "Submission Created", actor, created_at: submission.captured_at, new_value: "draft" },
      { action: "Submission Submitted", actor, created_at: submission.submitted_at, new_value: submission.status },
    ],
    duplicate_risk: qualityScore < 55 ? "possible" : "none",
    form_name: submission.form_id.replaceAll("-", " "),
    form_version: submission.server_sequence,
    gps_status: gpsStatus,
    history: [
      { action: "Created", actor, created_at: submission.captured_at },
      { action: "Submitted", actor, created_at: submission.submitted_at },
    ],
    location_name: hasUsableGps ? "GPS evidence captured" : "No GPS captured",
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

export function resolveSubmissionAssignments(
  submission: SubmissionRead,
  users: Map<string, UserRead>,
): { reviewer: string; supervisor: string } {
  const reviewerId = submission.reviewed_by_user_id ?? submission.approved_by_user_id ?? null;
  const reviewer = reviewerId ? users.get(reviewerId)?.full_name ?? "Unassigned reviewer" : "Unassigned reviewer";
  const supervisor = submission.supervisor_id
    ? users.get(submission.supervisor_id)?.full_name ?? "Unassigned supervisor"
    : "Unassigned supervisor";
  return { reviewer, supervisor };
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
  if (section === "pending-review") return submissions.filter((submission) => ["import_staged", "under_review", "submitted", "pending_review", "resubmitted"].includes(submission.status));
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
      approved_at: action === "approve" ? createdAt : action === "reject" ? null : submission.approved_at,
      approved_by_name: action === "approve" ? "Reviewer" : action === "reject" ? null : submission.approved_by_name,
      approved_by_user_id: action === "approve" ? "preview-reviewer" : action === "reject" ? null : submission.approved_by_user_id,
      review_stage: reviewStageFromStatus(nextStatus),
      review_quality: action === "approve" ? submission.quality_score : submission.review_quality,
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
