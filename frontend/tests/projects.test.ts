import { describe, expect, it } from "vitest";

import { previewProjects } from "@/modules/projects/data";
import { computeProjectSummary, filterProjects, healthTone, projectCodeFromName } from "@/modules/projects/utils";

describe("projects utilities", () => {
  it("summarizes project portfolio metrics", () => {
    const summary = computeProjectSummary(previewProjects);

    expect(summary.total_projects).toBe(previewProjects.length);
    expect(summary.active_projects).toBe(previewProjects.filter((project) => project.status === "active").length);
    expect(summary.draft_projects).toBe(previewProjects.filter((project) => !["active", "closed", "archived", "completed"].includes(project.status)).length);
    expect(summary.active_forms).toBe(previewProjects.reduce((sum, project) => sum + project.active_forms, 0));
    expect(summary.attention_projects).toBe(previewProjects.filter((project) => project.health_score < 70).length);
  });

  it("filters projects by approved architecture sections", () => {
    expect(filterProjects(previewProjects, "active")).toHaveLength(previewProjects.filter((project) => project.status === "active").length);
    expect(filterProjects(previewProjects, "draft")).toHaveLength(previewProjects.filter((project) => ["draft", "planning"].includes(project.status)).length);
    expect(filterProjects(previewProjects, "closed")).toHaveLength(previewProjects.filter((project) => ["closed", "completed", "archived"].includes(project.status)).length);
  });

  it("formats project codes and health tones", () => {
    expect(projectCodeFromName("Community Health Access Project")).toBe("COMMUNITY-HEALTH-ACCESS-PROJECT");
    expect(healthTone("Excellent")).toBe("success");
    expect(healthTone("Critical")).toBe("danger");
  });
});
