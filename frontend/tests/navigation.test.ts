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
  it("keeps Super Admin in the separate platform console by default", () => {
    const principal = makePrincipal({
      platform_admin: true,
      roles: ["super_admin"],
    });

    expect(visibleLabels(principal)).toEqual([]);
    expect(getDefaultWorkspaceView(principal)).toBe("platform");
    expect(isWorkspaceViewAllowed("platform", principal)).toBe(true);
    expect(isWorkspaceViewAllowed("administration", principal)).toBe(false);
  });

  it("shows every primary organization module to system admins and opens dashboard first", () => {
    const principal = makePrincipal({
      roles: ["system_admin"],
      permissions: [
        "projects.manage",
        "forms.edit",
        "officers.manage",
        "submissions.review",
        "beneficiaries.manage",
        "gps.view",
        "indicators.manage",
        "reports.manage",
        "data.bulk_edit",
        "users.manage",
        "roles.manage",
        "audit.view",
        "organization.manage",
      ],
    });

    expect(visibleLabels(principal)).toEqual([
      "Dashboard",
      "Projects",
      "Forms",
      "Field Operations",
      "Submissions",
      "Entities",
      "Mapping",
      "Metrics & Results",
      "Reports",
      "Data Quality",
      "Users & Teams",
      "Governance",
      "Administration",
      "Help Guide",
    ]);
    expect(getDefaultWorkspaceView(principal)).toBe("dashboard");
    expect(isWorkspaceViewAllowed("platform", principal)).toBe(false);
  });

  it("shows field officers exactly the modules their permissions cover", () => {
    // Navigation now follows the owner-managed permission set, not role labels. The
    // default field_officer permissions include read access to projects, entities, and
    // GPS, so those modules appear; owners can trim the role to narrow this.
    const principal = makePrincipal({
      roles: ["field_officer"],
      permissions: [
        "organization.read",
        "officers.view",
        "projects.view",
        "surveys.view",
        "forms.view",
        "surveys.review_data",
        "submissions.create",
        "submissions.edit",
        "beneficiaries.view",
        "cases.view",
        "sync.mobile",
        "gps.view",
        "operations.activities.view",
        "operations.evidence.attach",
      ],
    });

    expect(visibleLabels(principal)).toEqual([
      "Projects",
      "Forms",
      "Field Operations",
      "Submissions",
      "Entities",
      "Mapping",
      "Help Guide",
    ]);
    expect(isWorkspaceViewAllowed("administration", principal)).toBe(false);
    expect(isWorkspaceViewAllowed("analytics", principal)).toBe(false);
  });

  it("hides a module once its permission is removed and shows it once granted", () => {
    const base: Partial<CurrentPrincipal> = {
      roles: ["data_manager"],
      permissions: ["submissions.review", "data.export"],
    };

    // Without indicators.view the metrics module stays hidden...
    expect(isWorkspaceViewAllowed("indicators", makePrincipal(base))).toBe(false);

    // ...granting it (as an owner would in Users & Teams → Roles) reveals it.
    const granted = makePrincipal({
      ...base,
      permissions: [...(base.permissions ?? []), "indicators.view"],
    });
    expect(isWorkspaceViewAllowed("indicators", granted)).toBe(true);
  });

  it("maps legacy menu view grants into the new enterprise modules", () => {
    const principal = makePrincipal({
      menu_views: ["data", "templates"],
      roles: [],
    });

    expect(visibleLabels(principal)).toEqual([
      "Forms",
      "Administration",
      "Help Guide",
    ]);
  });
});
