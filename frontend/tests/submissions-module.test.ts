import { describe, expect, it } from "vitest";

import { previewSubmissions } from "@/modules/submissions/data";
import {
  applyPreviewReviewAction,
  computeSubmissionsSummary,
  filterSubmissions,
  formatSubmissionStatus,
  qualityTone,
  reviewStageFromStatus,
  slaStatus,
} from "@/modules/submissions/utils";

describe("Submissions module helpers", () => {
  it("computes operational review summary metrics", () => {
    const summary = computeSubmissionsSummary(previewSubmissions);

    expect(summary.total_submissions).toBe(previewSubmissions.length);
    expect(summary.pending_review).toBe(previewSubmissions.filter((submission) => ["under_review", "submitted", "pending_review", "resubmitted"].includes(submission.status)).length);
    expect(summary.approved).toBe(previewSubmissions.filter((submission) => submission.status === "approved").length);
    expect(summary.returned).toBe(previewSubmissions.filter((submission) => ["correction_requested", "needs_correction", "returned"].includes(submission.status)).length);
    expect(summary.quality_alerts).toBe(previewSubmissions.reduce((total, submission) => total + submission.quality_flags.filter((flag) => flag.status === "open").length, 0));
    expect(summary.approval_rate).toBe(Math.round((summary.approved / previewSubmissions.length) * 100));
  });

  it("filters submissions by approved architecture sections", () => {
    expect(filterSubmissions(previewSubmissions, "all")).toHaveLength(previewSubmissions.length);
    expect(filterSubmissions(previewSubmissions, "pending-review")).toHaveLength(previewSubmissions.filter((submission) => ["import_staged", "under_review", "submitted", "pending_review", "resubmitted"].includes(submission.status)).length);
    expect(filterSubmissions(previewSubmissions, "approved")).toHaveLength(previewSubmissions.filter((submission) => submission.status === "approved").length);
    expect(filterSubmissions(previewSubmissions, "returned")).toHaveLength(previewSubmissions.filter((submission) => ["correction_requested", "needs_correction", "returned"].includes(submission.status)).length);
    expect(filterSubmissions(previewSubmissions, "archived")).toHaveLength(previewSubmissions.filter((submission) => submission.status === "archived").length);
  });

  it("maps statuses, quality, and SLA to review states", () => {
    expect(formatSubmissionStatus("under_review")).toBe("Pending Review");
    expect(formatSubmissionStatus("correction_requested")).toBe("Returned for Correction");
    expect(reviewStageFromStatus("approved")).toBe("Approved");
    expect(reviewStageFromStatus("correction_requested")).toBe("Returned for Correction");
    expect(qualityTone(94)).toBe("success");
    expect(qualityTone(68)).toBe("warning");
    expect(slaStatus(new Date(Date.now() - 60_000).toISOString())).toBe("Overdue");
  });

  it("applies preview workflow actions with immutable history context", () => {
    const [first] = previewSubmissions;
    const next = applyPreviewReviewAction(previewSubmissions, first.id, "approve", "Clean record.");
    const updated = next.find((submission) => submission.id === first.id);

    expect(updated?.status).toBe("approved");
    expect(updated?.review_stage).toBe("Approved");
    expect(updated?.approved_by_name).toBe("Reviewer");
    expect(updated?.approved_by_user_id).toBe("preview-reviewer");
    expect(updated?.approved_at).toBeTruthy();
    expect(updated?.review_quality).toBe(first.quality_score);
    expect(updated?.history.at(-1)?.comment).toBe("Clean record.");
    expect(updated?.audit_events.at(-1)?.old_value).toBe("under_review");
  });
});
