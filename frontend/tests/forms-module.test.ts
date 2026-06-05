import { describe, expect, it } from "vitest";

import { previewForms } from "@/modules/forms/data";
import { computeFormsSummary, filterForms, qualityTone, statusTone } from "@/modules/forms/utils";

describe("Forms module helpers", () => {
  it("computes form dashboard metrics from normalized forms", () => {
    const summary = computeFormsSummary(previewForms);

    expect(summary.total_forms).toBe(3);
    expect(summary.draft_forms).toBe(1);
    expect(summary.published_forms).toBe(2);
    expect(summary.active_collection_forms).toBe(2);
    expect(summary.pending_approval_forms).toBe(1);
    expect(summary.forms_with_quality_issues).toBe(2);
  });

  it("filters forms by approved architecture section", () => {
    expect(filterForms(previewForms, "published")).toHaveLength(2);
    expect(filterForms(previewForms, "draft")).toHaveLength(1);
    expect(filterForms(previewForms, "all")).toHaveLength(previewForms.length);
  });

  it("maps status and quality to interface tones", () => {
    expect(statusTone("published")).toBe("success");
    expect(statusTone("draft")).toBe("accent");
    expect(statusTone("archived")).toBe("neutral");
    expect(qualityTone(91)).toBe("success");
    expect(qualityTone(55)).toBe("warning");
  });
});
