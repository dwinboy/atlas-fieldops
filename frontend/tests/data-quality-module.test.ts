import { describe, expect, it } from "vitest";

import { dataQualitySectionFromPath, previewQualityIssues, previewQualityScores } from "@/modules/data-quality/data";
import {
  buildQualityInvestigationSummary,
  calculateQualityScore,
  countReconciliationIssuesByFilter,
  computeQualitySummary,
  filterProfileConflictsByFocus,
  filterProfileConflictsByDecisionState,
  filterReconciliationIssues,
  formatSignalEvidence,
  filterIssuesBySection,
  issueAttentionNote,
  profileConflictChecklist,
  profileConflictDecisionBlocker,
  profileConflictDecisionState,
  profileConflictFocusDescription,
  preferredIssueDetailTab,
  profileConflictReviewFocus,
  profileConflictSensitiveFieldCount,
  summarizeProfileConflictDecisionStates,
  profileFieldDecisionHint,
  profileFieldSensitivity,
  rankIssuesForAttention,
  requiresProfileConflictDecision,
  isProfileConflictIssue,
  nextInvestigationStatus,
  profileConflictChangesFromEvidence,
  qualityCategory,
  summarizeProfileConflictFocusDecisionStates,
  sortProfileConflictIssuesForReview,
  summarizeProfileConflictFocus,
  signalStatusHistoryFromEvidence,
} from "@/modules/data-quality/utils";

describe("Data Quality module helpers", () => {
  it("calculates platform-wide quality score categories", () => {
    const organizationScore = calculateQualityScore(previewQualityScores.Organization);

    expect(organizationScore).toBe(87);
    expect(qualityCategory(organizationScore)).toBe("Good");
    expect(qualityCategory(72)).toBe("Needs Review");
    expect(qualityCategory(66)).toBe("Critical");
  });

  it("computes data quality dashboard metrics", () => {
    const summary = computeQualitySummary(previewQualityIssues, previewQualityScores.Organization);

    expect(summary.overallScore).toBe(87);
    expect(summary.openQualityIssues).toBe(5);
    expect(summary.criticalIssues).toBe(3);
    expect(summary.duplicateRecords).toBe(1);
    expect(summary.gpsIssues).toBe(1);
    expect(summary.profileConflictsBlocked).toBe(0);
    expect(summary.profileConflictsPending).toBe(0);
    expect(summary.profileConflictsReady).toBe(0);
    expect(summary.validationFailures).toBe(1);
    expect(summary.resolvedIssues).toBe(1);
  });

  it("routes issues to the approved Data Quality submodules", () => {
    expect(filterIssuesBySection(previewQualityIssues, "duplicates")).toHaveLength(1);
    expect(filterIssuesBySection(previewQualityIssues, "outliers")).toHaveLength(1);
    expect(filterIssuesBySection(previewQualityIssues, "gps-issues")).toHaveLength(1);
    expect(filterIssuesBySection(previewQualityIssues, "missing-data")).toHaveLength(1);
    expect(filterIssuesBySection(previewQualityIssues, "risk-alerts")).toHaveLength(1);
  });

  it("maps data quality routes to the correct workspace section", () => {
    expect(dataQualitySectionFromPath("/data-quality")).toBe("dashboard");
    expect(dataQualitySectionFromPath("/data-quality/dashboard")).toBe("quality-dashboard");
    expect(dataQualitySectionFromPath("/data-quality/reconciliation")).toBe("reconciliation");
    expect(dataQualitySectionFromPath("/data-quality/import-cleaning")).toBe("import-cleaning");
    expect(dataQualitySectionFromPath("/data-quality/rules")).toBe("rules");
  });

  it("can focus reconciliation queues on profile conflicts only", () => {
    const profileConflictIssue = {
      ...previewQualityIssues[0],
      evidenceJson: {
        beneficiary_id: "ben-1",
        changes: {
          phone_number: { current: "677412119", proposed: "699553608" },
        },
        signal_type: "profile_conflict",
      },
      type: "Reconciliation" as const,
    };
    const otherReconciliationIssue = {
      ...previewQualityIssues[1],
      evidenceJson: { signal_type: "missing_entity_link" },
      type: "Reconciliation" as const,
    };

    expect(filterReconciliationIssues([profileConflictIssue, otherReconciliationIssue], "profile_conflicts")).toEqual([profileConflictIssue]);
    expect(filterReconciliationIssues([profileConflictIssue, otherReconciliationIssue], "other_reconciliation")).toEqual([otherReconciliationIssue]);
    expect(countReconciliationIssuesByFilter([profileConflictIssue, otherReconciliationIssue])).toEqual({
      all: 2,
      other_reconciliation: 1,
      profile_conflicts: 1,
    });
    expect(filterProfileConflictsByFocus([profileConflictIssue], "Contact")).toEqual([profileConflictIssue]);
    expect(filterProfileConflictsByFocus([profileConflictIssue], "Identity")).toEqual([]);
    expect(filterProfileConflictsByDecisionState([profileConflictIssue], "ready")).toEqual([profileConflictIssue]);
    expect(filterProfileConflictsByDecisionState([{ ...profileConflictIssue, submissionId: "Not linked" }], "blocked")).toEqual([
      { ...profileConflictIssue, submissionId: "Not linked" },
    ]);
    expect(
      summarizeProfileConflictFocus(
        filterProfileConflictsByDecisionState(
          [profileConflictIssue, { ...profileConflictIssue, id: "blocked-profile-conflict", submissionId: "Not linked" }],
          "blocked",
        ),
      ),
    ).toEqual([{ count: 1, focus: "Contact" }]);
  });

  it("supports the investigation lifecycle and issue summary", () => {
    expect(nextInvestigationStatus("Detected")).toBe("Assigned");
    expect(nextInvestigationStatus("Assigned")).toBe("Under Investigation");
    expect(nextInvestigationStatus("Governance Review")).toBe("Resolved");

    const summary = buildQualityInvestigationSummary(previewQualityIssues[0]);
    expect(summary).toContain("Possible duplicate household");
    expect(summary).toContain("SUB-2409");
    expect(summary).toContain("Agricultural Resilience Program");
  });

  it("prioritizes sensitive profile conflicts ahead of generic issues", () => {
    const genericIssue = {
      ...previewQualityIssues[0],
      detectedAt: "2026-06-20T10:00:00Z",
      evidenceJson: { signal_type: "missing_entity_link" },
      scoreImpact: 8,
      severity: "High" as const,
      type: "Reconciliation" as const,
    };
    const profileConflictIssue = {
      ...previewQualityIssues[1],
      detectedAt: "2026-06-20T09:00:00Z",
      evidenceJson: {
        beneficiary_id: "ben-1",
        changes: {
          phone_number: { current: "677412119", proposed: "699553608" },
          community: { current: "Old Quarter", proposed: "River Camp" },
        },
        signal_type: "profile_conflict",
      },
      scoreImpact: 8,
      severity: "High" as const,
      type: "Reconciliation" as const,
    };

    expect(rankIssuesForAttention([genericIssue, profileConflictIssue])[0]).toEqual(profileConflictIssue);
    expect(
      rankIssuesForAttention([
        {
          ...profileConflictIssue,
          id: "blocked-profile-conflict",
          submissionId: "Not linked",
        },
        profileConflictIssue,
      ])[0],
    ).toEqual(profileConflictIssue);
    expect(issueAttentionNote(profileConflictIssue)).toContain("Ready for decision");
    expect(issueAttentionNote(profileConflictIssue)).toContain("2 sensitive fields");
    expect(
      issueAttentionNote({
        ...profileConflictIssue,
        submissionId: "Not linked",
      }),
    ).toContain("Blocked");
    expect(issueAttentionNote(genericIssue)).toBeNull();
    expect(preferredIssueDetailTab(profileConflictIssue)).toBe("Resolution");
    expect(preferredIssueDetailTab(genericIssue)).toBe("Overview");
    expect(requiresProfileConflictDecision(profileConflictIssue)).toBe(true);
    expect(requiresProfileConflictDecision(genericIssue)).toBe(false);
    expect(
      profileConflictDecisionBlocker({
        ...profileConflictIssue,
        submissionId: "Not linked",
      }),
    ).toBe("This conflict cannot be approved yet because the source submission is missing.");
    expect(profileConflictDecisionState(profileConflictIssue)).toEqual({ label: "Ready for decision", tone: "success" });
    expect(
      profileConflictDecisionState({
        ...profileConflictIssue,
        submissionId: "Not linked",
      }),
    ).toEqual({ label: "Blocked", tone: "warning" });
    expect(
      summarizeProfileConflictDecisionStates([
        profileConflictIssue,
        {
          ...profileConflictIssue,
          id: "blocked-profile-conflict",
          submissionId: "Not linked",
        },
      ]),
    ).toEqual({ blocked: 1, ready: 1 });
    expect(
      sortProfileConflictIssuesForReview([
        {
          ...profileConflictIssue,
          id: "blocked-profile-conflict",
          submissionId: "Not linked",
        },
        profileConflictIssue,
      ])[0],
    ).toEqual(profileConflictIssue);
  });

  it("formats profile conflict evidence into reviewable field changes", () => {
    const evidence = {
      beneficiary_id: "ben-1",
      beneficiary_uid: "FRM-2026-00003",
      changes: {
        phone_number: { current: "677412119", proposed: "699553608" },
        community: { current: "Old Quarter", proposed: "River Camp" },
      },
      signal_type: "profile_conflict",
    };

    expect(profileConflictChangesFromEvidence(evidence)).toEqual([
      { current: "677412119", field: "phone_number", proposed: "699553608" },
      { current: "Old Quarter", field: "community", proposed: "River Camp" },
    ]);
    expect(formatSignalEvidence(evidence, 0.9)).toContain("Phone Number: 677412119 -> 699553608");
    expect(
      isProfileConflictIssue({
        ...previewQualityIssues[0],
        evidenceJson: evidence,
        type: "Reconciliation",
      }),
    ).toBe(true);
    expect(
      computeQualitySummary(
        [
          {
            ...previewQualityIssues[0],
            evidenceJson: evidence,
            status: "Assigned",
            type: "Reconciliation",
          },
          {
            ...previewQualityIssues[1],
            evidenceJson: evidence,
            id: "blocked-conflict",
            status: "Assigned",
            submissionId: "Not linked",
            type: "Reconciliation",
          },
        ],
        previewQualityScores.Organization,
      ),
    ).toMatchObject({
      profileConflictsBlocked: 1,
      profileConflictsPending: 2,
      profileConflictsReady: 1,
    });
  });

  it("parses status history from signal evidence", () => {
    const history = signalStatusHistoryFromEvidence({
      statusHistory: [
        {
          changedAt: "2026-06-21T10:00:00Z",
          changedByUserId: "user-1",
          comment: "Verified during manager review.",
          from: "open",
          proposalAction: "approve",
          to: "resolved",
        },
      ],
    });

    expect(history).toEqual([
      {
        changedAt: "2026-06-21T10:00:00Z",
        changedByUserId: "user-1",
        comment: "Verified during manager review.",
        from: "open",
        proposalAction: "approve",
        to: "resolved",
      },
    ]);
  });

  it("marks sensitive beneficiary profile fields for stricter review", () => {
    expect(profileFieldSensitivity("phone_number")).toBe("Sensitive");
    expect(profileFieldSensitivity("enrollment_status")).toBe("Standard");
    expect(profileConflictSensitiveFieldCount(["display_name", "phone_number", "community", "enrollment_status"])).toBe(3);
    expect(profileFieldDecisionHint("latitude")).toContain("coverage and mapping");
    expect(profileConflictReviewFocus(["display_name", "phone_number", "community"])).toEqual(["Identity", "Contact", "Location"]);
    expect(profileConflictChecklist(["display_name", "phone_number", "community"])).toEqual([
      "Confirm the respondent matches the registered beneficiary before changing identity fields.",
      "Verify the updated contact detail with the respondent or supervisor.",
      "Check that the visit location, community, or GPS evidence matches the official beneficiary record.",
    ]);
    expect(profileConflictFocusDescription("Contact")).toBe("Contact conflicts waiting for decision.");
    expect(
      summarizeProfileConflictFocus([
        {
          ...previewQualityIssues[0],
          evidenceJson: {
            beneficiary_id: "ben-1",
            changes: {
              display_name: { current: "John", proposed: "John T." },
              phone_number: { current: "677412119", proposed: "699553608" },
              community: { current: "Old Quarter", proposed: "River Camp" },
            },
            signal_type: "profile_conflict",
          },
          status: "Assigned",
          type: "Reconciliation",
        },
      ]),
    ).toEqual([
      { count: 1, focus: "Identity" },
      { count: 1, focus: "Contact" },
      { count: 1, focus: "Location" },
    ]);
    expect(
      summarizeProfileConflictFocusDecisionStates([
        {
          ...previewQualityIssues[0],
          evidenceJson: {
            beneficiary_id: "ben-1",
            changes: {
              display_name: { current: "John", proposed: "John T." },
              phone_number: { current: "677412119", proposed: "699553608" },
            },
            signal_type: "profile_conflict",
          },
          status: "Assigned",
          submissionId: "SUB-123",
          type: "Reconciliation",
        },
        {
          ...previewQualityIssues[1],
          evidenceJson: {
            beneficiary_id: "ben-1",
            changes: {
              phone_number: { current: "677412119", proposed: "699553608" },
            },
            signal_type: "profile_conflict",
          },
          id: "blocked-focus-conflict",
          status: "Assigned",
          submissionId: "Not linked",
          type: "Reconciliation",
        },
      ]),
    ).toEqual([
      { blocked: 1, count: 2, focus: "Contact", ready: 1 },
      { blocked: 0, count: 1, focus: "Identity", ready: 1 },
    ]);
  });
});
