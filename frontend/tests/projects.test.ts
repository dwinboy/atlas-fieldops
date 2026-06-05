import { describe, expect, it } from "vitest";

import { previewProjects } from "@/modules/projects/data";
import { computeProjectSummary, filterProjects, healthTone, projectCodeFromName } from "@/modules/projects/utils";

describe("projects utilities", () => {
  it("summarizes project portfolio metrics", () => {
    const summary = computeProjectSummary(previewProjects);

    expect(summary.total_projects).toBe(3);
    expect(summary.active_projects).toBe(2);
    expect(summary.draft_projects).toBe(1);
    expect(summary.active_forms).toBe(9);
    expect(summary.attention_projects).toBe(1);
  });

  it("filters projects by approved architecture sections", () => {
    expect(filterProjects(previewProjects, "active")).toHaveLength(2);
    expect(filterProjects(previewProjects, "draft")).toHaveLength(1);
    expect(filterProjects(previewProjects, "closed")).toHaveLength(0);
  });

  it("formats project codes and health tones", () => {
    expect(projectCodeFromName("Community Health Access Project")).toBe("COMMUNITY-HEALTH-ACCESS-PROJECT");
    expect(healthTone("Excellent")).toBe("success");
    expect(healthTone("Critical")).toBe("danger");
  });
});

