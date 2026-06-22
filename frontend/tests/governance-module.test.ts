import { describe, expect, it } from "vitest";

import {
  governanceSectionFromPath,
  previewApprovals,
  previewConsentRecords,
  previewExports,
  previewPolicies,
  previewRetention,
  previewStewardship,
  previewSummary,
} from "@/modules/governance/data";
import { computeGovernanceHealth, severityTone, toneFromHealth } from "@/modules/governance/utils";

describe("Governance module helpers", () => {
  it("computes a bounded governance health score from audit, compliance, consent, policy, approval, and retention signals", () => {
    const health = computeGovernanceHealth({
      approvals: previewApprovals,
      consentRecords: previewConsentRecords,
      exports: previewExports,
      policies: previewPolicies,
      retentionRules: previewRetention,
      stewardship: previewStewardship,
      summary: previewSummary,
    });

    expect(health.score).toBeGreaterThanOrEqual(0);
    expect(health.score).toBeLessThanOrEqual(100);
    expect(["Excellent", "Good", "Needs Attention", "Critical"]).toContain(health.category);
    expect(health.components.auditCoverage).toBe(96);
  });

  it("degrades governance health when critical prerequisites are absent", () => {
    const health = computeGovernanceHealth({
      approvals: [],
      consentRecords: [],
      exports: [],
      policies: [],
      retentionRules: [],
      stewardship: [],
      summary: {
        ...previewSummary,
        audit_events: 0,
        compliance_score: 35,
        open_quality_signals: 8,
      },
    });

    expect(health.category).toBe("Critical");
    expect(health.components.auditCoverage).toBe(35);
    expect(health.components.retentionCompliance).toBe(50);
  });

  it("maps governance status and severity labels to interface tones", () => {
    expect(severityTone("Critical")).toBe("danger");
    expect(severityTone("Partially Compliant")).toBe("warning");
    expect(severityTone("Approved")).toBe("success");
    expect(toneFromHealth("Needs Attention")).toBe("warning");
  });

  it("maps governance routes to the correct workspace section", () => {
    expect(governanceSectionFromPath("/governance")).toBe("dashboard");
    expect(governanceSectionFromPath("/governance/policies")).toBe("policies");
    expect(governanceSectionFromPath("/governance/retention-rules")).toBe("retention-rules");
    expect(governanceSectionFromPath("/governance/consent-management")).toBe("consent-management");
  });
});
