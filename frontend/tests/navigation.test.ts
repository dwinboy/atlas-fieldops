import { describe, expect, it } from "vitest";

import {
  getDefaultWorkspaceView,
  getVisibleNavigationSections,
  isWorkspaceViewAllowed,
} from "@/config/navigation";
import type { CurrentPrincipal } from "@/lib/api";

function makePrincipal(
  overrides: Partial<CurrentPrincipal>,
): CurrentPrincipal {
  return {
    organization_id: "org-1",
    roles: [],
    user_id: "user-1",
    ...overrides,
  };
}

function visibleLabels(principal: CurrentPrincipal): string[] {
  return getVisibleNavigationSections(principal).flatMap((section) =>
    section.items.map((item) => item.label),
  );
}

describe("platform navigation architecture", () => {
  it("shows every primary module to system admins and opens administration first", () => {
    const principal = makePrincipal({
      platform_admin: true,
      roles: ["system_admin"],
    });

    expect(visibleLabels(principal)).toEqual([
      "Dashboard",
      "Projects",
      "Forms",
      "Field Operations",
      "Submissions",
      "Mapping",
      "Indicators",
      "Reports",
      "Data Quality",
      "Users & Teams",
      "Governance",
      "Administration",
    ]);
    expect(getDefaultWorkspaceView(principal)).toBe("administration");
  });

  it("keeps field officers focused on assigned form work and own submissions", () => {
    const principal = makePrincipal({ roles: ["field_officer"] });

    expect(visibleLabels(principal)).toEqual([
      "Forms",
      "Field Operations",
      "Submissions",
    ]);
    expect(isWorkspaceViewAllowed("administration", principal)).toBe(false);
    expect(isWorkspaceViewAllowed("analytics", principal)).toBe(false);
  });

  it("maps legacy menu view grants into the new enterprise modules", () => {
    const principal = makePrincipal({
      menu_views: ["data", "templates"],
      roles: [],
    });

    expect(visibleLabels(principal)).toEqual(["Forms", "Administration"]);
  });
});

