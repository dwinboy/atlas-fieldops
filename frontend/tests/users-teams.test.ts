import { describe, expect, it } from "vitest";

import { previewAccessCatalog, previewProfiles, previewRoles, previewTeams, previewUsers, usersTeamsSectionFromPath } from "@/modules/users-teams/data";
import { computeSummaryFromRecords, groupPermissions, matchesUserSetupFilter, normalizeRoleLabel, normalizeTeamCode, resolveTeamCode, statusTone, userSetupIssues } from "@/modules/users-teams/utils";

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

  it("normalizes team codes and generates one when the user leaves it blank", () => {
    expect(normalizeTeamCode("TEAM NORTH WEST")).toBe("team-north-west");
    expect(resolveTeamCode("North West Team", "")).toBe("north-west-team");
    expect(resolveTeamCode("North West Team", "TEAM-NW")).toBe("team-nw");
  });

  it("flags incomplete field access setup without blocking ready users", () => {
    const readyFieldOfficer = previewUsers.find((user) => user.id === "user-grace");
    const donorViewer = previewUsers.find((user) => user.id === "user-donor");

    expect(readyFieldOfficer).toBeDefined();
    expect(donorViewer).toBeDefined();
    expect(userSetupIssues(readyFieldOfficer!, previewProfiles.find((profile) => profile.user_id === "user-grace"))).toEqual([]);
    expect(userSetupIssues(donorViewer!, null)).toEqual([]);
  });

  it("surfaces missing team and supervisor details for field officers", () => {
    const incompleteFieldOfficer = {
      ...previewUsers.find((user) => user.id === "user-grace")!,
      role_assignments: [],
    };

    expect(userSetupIssues(incompleteFieldOfficer, null)).toEqual(
      expect.arrayContaining(["No workforce profile", "No supervisor linked", "No team assigned"]),
    );
  });

  it("matches access-center filters for setup and sign-in status", () => {
    expect(matchesUserSetupFilter(["No team assigned"], true, "needs_setup")).toBe(true);
    expect(matchesUserSetupFilter([], true, "needs_setup")).toBe(false);
    expect(matchesUserSetupFilter([], true, "ready")).toBe(true);
    expect(matchesUserSetupFilter([], false, "inactive")).toBe(true);
    expect(matchesUserSetupFilter([], true, "inactive")).toBe(false);
  });

  it("maps users and teams routes to the correct workspace section", () => {
    expect(usersTeamsSectionFromPath("/users-teams")).toBe("dashboard");
    expect(usersTeamsSectionFromPath("/users-teams/access-center")).toBe("access-center");
    expect(usersTeamsSectionFromPath("/users-teams/users")).toBe("users");
    expect(usersTeamsSectionFromPath("/users-teams/roles")).toBe("roles");
    expect(usersTeamsSectionFromPath("/users-teams/teams")).toBe("teams");
    expect(usersTeamsSectionFromPath("/users-teams/organizations")).toBe("organizations");
    expect(usersTeamsSectionFromPath("/users-teams/permissions")).toBe("permissions");
    expect(usersTeamsSectionFromPath("/users-teams/activity-logs")).toBe("activity-logs");
    expect(usersTeamsSectionFromPath("/users-teams/role-profiles/user-amina")).toBe("users");
  });
});
