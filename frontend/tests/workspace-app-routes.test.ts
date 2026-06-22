import { describe, expect, it } from "vitest";

import {
  viewFromWorkspacePath,
  workspaceAppRouteForView,
} from "@/components/WorkspaceApp";

describe("workspace route mapping", () => {
  it("maps survey routes to the survey workspace", () => {
    expect(viewFromWorkspacePath("/surveys")).toBe("surveys");
    expect(viewFromWorkspacePath("/surveys/")).toBe("surveys");
    expect(viewFromWorkspacePath("/projects/all")).toBe("programs");
  });

  it("maps workspace shortcut views to real routes", () => {
    expect(workspaceAppRouteForView("officers")).toBe("/field-operations");
    expect(workspaceAppRouteForView("governance")).toBe("/governance");
  });
});
