import { describe, expect, it } from "vitest";

import { canAssignForm, formEditActionLabel, formsWorkspaceBoundaryRoute } from "@/modules/forms/FormsModule";
import { formsSectionFromPath } from "@/modules/forms/data";

describe("forms route helpers", () => {
  it("routes form detail boundary actions to owning workspaces", () => {
    expect(formsWorkspaceBoundaryRoute("data-quality")).toBe("/data-quality");
    expect(formsWorkspaceBoundaryRoute("mapping")).toBe("/mapping");
    expect(formsWorkspaceBoundaryRoute("submissions")).toBe("/submissions");
  });

  it("maps form workspace routes to the correct section", () => {
    expect(formsSectionFromPath("/forms")).toBe("dashboard");
    expect(formsSectionFromPath("/forms/all")).toBe("all");
    expect(formsSectionFromPath("/forms/analytics")).toBe("analytics");
    expect(formsSectionFromPath("/forms/draft")).toBe("draft");
    expect(formsSectionFromPath("/forms/published")).toBe("published");
    expect(formsSectionFromPath("/forms/archived")).toBe("archived");
    expect(formsSectionFromPath("/forms/templates")).toBe("templates");
    expect(formsSectionFromPath("/forms/reference-data")).toBe("reference-data");
    expect(formsSectionFromPath("/forms/governance-dashboard")).toBe("governance-dashboard");
    expect(formsSectionFromPath("/forms/preview-farmer-registration/data")).toBeNull();
  });

  it("only allows assignment handoff for published forms", () => {
    expect(canAssignForm({ status: "published" })).toBe(true);
    expect(canAssignForm({ status: "draft" })).toBe(false);
    expect(canAssignForm({ status: "archived" })).toBe(false);
  });

  it("uses version-safe edit labels", () => {
    expect(formEditActionLabel({ status: "published" })).toBe("New Version");
    expect(formEditActionLabel({ status: "draft" })).toBe("Edit");
    expect(formEditActionLabel({ status: "archived" })).toBe("Edit");
  });
});
