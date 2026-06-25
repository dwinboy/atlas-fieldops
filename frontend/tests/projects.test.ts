import { describe, expect, it } from "vitest";

import { previewProjects, projectSectionFromPath, statusGroupFromPath } from "@/modules/projects/data";
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

  it("keeps preview projects tied to their sector packs", () => {
    expect(
      previewProjects.filter((project) => !project.sector_id).map((project) => project.name),
    ).toEqual([]);
  });

  it("maps project routes to the correct workspace section", () => {
    expect(projectSectionFromPath("/projects")).toBe("dashboard");
    expect(projectSectionFromPath("/projects/all")).toBe("all");
    // Active/Draft/Closed are now status filters inside the single "All Projects" view,
    // so their legacy routes resolve to "all" (and preselect a status group below).
    expect(projectSectionFromPath("/projects/active")).toBe("all");
    expect(projectSectionFromPath("/projects/draft")).toBe("all");
    expect(projectSectionFromPath("/projects/closed")).toBe("all");
    expect(projectSectionFromPath("/projects/templates")).toBe("templates");
  });

  it("derives the status filter group from legacy status routes", () => {
    expect(statusGroupFromPath("/projects/all")).toBe("");
    expect(statusGroupFromPath("/projects/active")).toBe("active");
    expect(statusGroupFromPath("/projects/draft")).toBe("draft");
    expect(statusGroupFromPath("/projects/closed")).toBe("closed");
  });
});
