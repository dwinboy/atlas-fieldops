import { describe, expect, it } from "vitest";

import { previewQualityIssues, previewQualityScores } from "@/modules/data-quality/data";
import {
  buildQualityInvestigationSummary,
  calculateQualityScore,
  computeQualitySummary,
  filterIssuesBySection,
  nextInvestigationStatus,
  qualityCategory,
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

  it("supports the investigation lifecycle and issue summary", () => {
    expect(nextInvestigationStatus("Detected")).toBe("Assigned");
    expect(nextInvestigationStatus("Assigned")).toBe("Under Investigation");
    expect(nextInvestigationStatus("Governance Review")).toBe("Resolved");

    const summary = buildQualityInvestigationSummary(previewQualityIssues[0]);
    expect(summary).toContain("Possible duplicate household");
    expect(summary).toContain("SUB-2409");
    expect(summary).toContain("Agricultural Resilience Program");
  });
});
