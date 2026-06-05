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

    expect(summary.total_submissions).toBe(3);
    expect(summary.pending_review).toBe(1);
    expect(summary.approved).toBe(1);
    expect(summary.returned).toBe(1);
    expect(summary.quality_alerts).toBe(2);
    expect(summary.approval_rate).toBe(33);
  });

  it("filters submissions by approved architecture sections", () => {
    expect(filterSubmissions(previewSubmissions, "all")).toHaveLength(3);
    expect(filterSubmissions(previewSubmissions, "pending-review")).toHaveLength(1);
    expect(filterSubmissions(previewSubmissions, "approved")).toHaveLength(1);
    expect(filterSubmissions(previewSubmissions, "returned")).toHaveLength(1);
    expect(filterSubmissions(previewSubmissions, "archived")).toHaveLength(0);
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
    expect(updated?.history.at(-1)?.comment).toBe("Clean record.");
    expect(updated?.audit_events.at(-1)?.old_value).toBe("under_review");
  });
});
