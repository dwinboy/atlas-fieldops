import { describe, expect, it } from "vitest";

import { previewForms } from "@/modules/forms/data";
import { computeFormsSummary, filterForms, qualityTone, statusTone } from "@/modules/forms/utils";

describe("Forms module helpers", () => {
  it("computes form dashboard metrics from normalized forms", () => {
    const summary = computeFormsSummary(previewForms);

    expect(summary.total_forms).toBe(previewForms.length);
    expect(summary.draft_forms).toBe(previewForms.filter((form) => form.status === "draft").length);
    expect(summary.published_forms).toBe(previewForms.filter((form) => form.status === "published").length);
    expect(summary.active_collection_forms).toBe(previewForms.filter((form) => form.status === "published" && form.active_assignments > 0).length);
    expect(summary.pending_approval_forms).toBe(previewForms.filter((form) => form.pending_approval).length);
    expect(summary.forms_with_quality_issues).toBe(previewForms.filter((form) => form.has_quality_issues).length);
  });

  it("filters forms by approved architecture section", () => {
    expect(filterForms(previewForms, "published")).toHaveLength(previewForms.filter((form) => form.status === "published").length);
    expect(filterForms(previewForms, "draft")).toHaveLength(previewForms.filter((form) => form.status === "draft").length);
    expect(filterForms(previewForms, "all")).toHaveLength(previewForms.length);
  });

  it("maps status and quality to interface tones", () => {
    expect(statusTone("published")).toBe("success");
    expect(statusTone("draft")).toBe("warning");
    expect(statusTone("archived")).toBe("neutral");
    expect(qualityTone(91)).toBe("success");
    expect(qualityTone(55)).toBe("warning");
  });
});
