import { describe, expect, it } from "vitest";

import { previewAccessCatalog, previewRoles, previewTeams, previewUsers, usersTeamsSectionFromPath } from "@/modules/users-teams/data";
import { computeSummaryFromRecords, groupPermissions, normalizeRoleLabel, statusTone } from "@/modules/users-teams/utils";

describe("users-teams utilities", () => {
  it("summarizes identity records for the people dashboard", () => {
    const summary = computeSummaryFromRecords(previewUsers, previewRoles, previewTeams);

    expect(summary.total_users).toBe(4);
    expect(summary.active_users).toBe(3);
    expect(summary.inactive_users).toBe(1);
    expect(summary.roles).toBe(3);
    expect(summary.teams).toBe(2);
  });

  it("groups permission catalog items by module", () => {
    const groups = groupPermissions(previewAccessCatalog);

    expect(groups.map((group) => group.group)).toContain("users");
    expect(groups.find((group) => group.group === "users")?.items).toHaveLength(3);
  });

  it("formats role and status labels for enterprise tables", () => {
    expect(normalizeRoleLabel("field_officer")).toBe("Field Officer");
    expect(statusTone("high_risk")).toBe("danger");
    expect(statusTone(true)).toBe("success");
  });

  it("maps users and teams routes to the correct workspace section", () => {
    expect(usersTeamsSectionFromPath("/users-teams")).toBe("dashboard");
    expect(usersTeamsSectionFromPath("/users-teams/users")).toBe("users");
    expect(usersTeamsSectionFromPath("/users-teams/roles")).toBe("roles");
    expect(usersTeamsSectionFromPath("/users-teams/teams")).toBe("teams");
    expect(usersTeamsSectionFromPath("/users-teams/organizations")).toBe("organizations");
    expect(usersTeamsSectionFromPath("/users-teams/permissions")).toBe("permissions");
    expect(usersTeamsSectionFromPath("/users-teams/activity-logs")).toBe("activity-logs");
    expect(usersTeamsSectionFromPath("/users-teams/role-profiles/user-amina")).toBe("users");
  });
});
