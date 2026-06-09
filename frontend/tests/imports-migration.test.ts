import { describe, expect, it } from "vitest";

import type { ImportJobRead } from "@/lib/api";
import {
  previewImportJobs,
  previewSmartAnalysis,
  previewValidation,
  sampleRows,
} from "@/modules/imports-migration/data";
import {
  computeReadinessCategory,
  countAnalysisIssues,
  extractColumnNames,
  formatImportCount,
  groupValidationIssuesBySeverity,
  importJobStatusLabel,
  importJobStatusTone,
  isJobRollbackable,
  prettyImportType,
  summarizeImportJob,
} from "@/modules/imports-migration/utils";

describe("importJobStatusTone", () => {
  it("returns success for completed and validated statuses", () => {
    expect(importJobStatusTone("completed")).toBe("success");
    expect(importJobStatusTone("validated")).toBe("success");
    expect(importJobStatusTone("ready")).toBe("success");
    expect(importJobStatusTone("completed_with_errors")).toBe("success");
  });

  it("returns danger for failed and error statuses", () => {
    expect(importJobStatusTone("failed")).toBe("danger");
    expect(importJobStatusTone("needs_fixes")).toBe("danger");
    expect(importJobStatusTone("some_error_state")).toBe("danger");
  });

  it("returns warning for in-progress statuses", () => {
    expect(importJobStatusTone("processing")).toBe("warning");
    expect(importJobStatusTone("draft")).toBe("warning");
  });

  it("returns neutral for unknown statuses", () => {
    expect(importJobStatusTone("unknown_status")).toBe("neutral");
    expect(importJobStatusTone("pending")).toBe("neutral");
  });
});

describe("importJobStatusLabel", () => {
  it("returns a plain-English label for known statuses", () => {
    expect(importJobStatusLabel("completed")).toBe("Completed");
    expect(importJobStatusLabel("completed_with_errors")).toBe(
      "Completed with errors",
    );
    expect(importJobStatusLabel("needs_fixes")).toBe("Needs fixes");
    expect(importJobStatusLabel("draft")).toBe("Draft");
  });

  it("converts underscores for unknown statuses", () => {
    expect(importJobStatusLabel("some_unknown_status")).toBe(
      "some unknown status",
    );
  });
});

describe("prettyImportType", () => {
  it("maps known dataset types to human-readable labels", () => {
    expect(prettyImportType("entity_registry")).toBe(
      "Beneficiary / Entity Registry",
    );
    expect(prettyImportType("projects")).toBe("Project");
    expect(prettyImportType("submissions")).toBe("Submissions");
    expect(prettyImportType("indicators")).toBe("Indicators");
  });

  it("converts underscores for unknown types", () => {
    expect(prettyImportType("custom_dataset_type")).toBe(
      "custom dataset type",
    );
  });
});

describe("formatImportCount", () => {
  it("formats numbers with locale grouping separators", () => {
    expect(formatImportCount(1263)).toBe("1,263");
    expect(formatImportCount(0)).toBe("0");
    expect(formatImportCount(1000000)).toBe("1,000,000");
  });

  it("defaults to 0 when value is undefined", () => {
    expect(formatImportCount(undefined)).toBe("0");
  });
});

describe("isJobRollbackable", () => {
  it("returns true when rollback_available is true and job is completed", () => {
    const job = previewImportJobs.find(
      (j) => j.rollback_available && j.status === "completed_with_errors",
    );
    expect(job).toBeDefined();
    if (job) expect(isJobRollbackable(job)).toBe(true);
  });

  it("returns false when rollback_available is false", () => {
    const job = previewImportJobs.find((j) => !j.rollback_available);
    expect(job).toBeDefined();
    if (job) expect(isJobRollbackable(job)).toBe(false);
  });

  it("returns false for non-completed statuses", () => {
    const job: ImportJobRead = {
      dataset_type: "entity_registry",
      duplicate_rows: 0,
      error_rows: 0,
      id: "test-job-draft",
      rollback_available: true,
      source_format: "csv",
      source_name: "test.csv",
      status: "draft",
      total_rows: 10,
      valid_rows: 10,
    };
    expect(isJobRollbackable(job)).toBe(false);
  });
});

describe("groupValidationIssuesBySeverity", () => {
  it("groups issues by severity level", () => {
    const groups = groupValidationIssuesBySeverity(previewValidation.issues);
    expect(groups["error"]).toHaveLength(1);
    expect(groups["warning"]).toHaveLength(1);
    expect(groups["unknown"]).toBeUndefined();
  });

  it("returns an empty object when there are no issues", () => {
    expect(groupValidationIssuesBySeverity([])).toEqual({});
  });
});

describe("computeReadinessCategory", () => {
  it("returns Ready for scores of 90 and above", () => {
    expect(computeReadinessCategory(100)).toBe("Ready");
    expect(computeReadinessCategory(90)).toBe("Ready");
  });

  it("returns Needs Review for scores between 70 and 89", () => {
    expect(computeReadinessCategory(82)).toBe("Needs Review");
    expect(computeReadinessCategory(70)).toBe("Needs Review");
  });

  it("returns Needs Fixes for scores between 50 and 69", () => {
    expect(computeReadinessCategory(55)).toBe("Needs Fixes");
    expect(computeReadinessCategory(50)).toBe("Needs Fixes");
  });

  it("returns Not Ready for scores below 50", () => {
    expect(computeReadinessCategory(0)).toBe("Not Ready");
    expect(computeReadinessCategory(49)).toBe("Not Ready");
  });

  it("aligns with the readiness score from preview analysis", () => {
    const { score, category } = previewSmartAnalysis.readiness;
    expect(computeReadinessCategory(score)).toBe(category);
  });
});

describe("summarizeImportJob", () => {
  it("builds a readable summary for a completed import job", () => {
    const job = previewImportJobs[0];
    const summary = summarizeImportJob(job);
    expect(summary).toContain("Beneficiary / Entity Registry");
    expect(summary).toContain("1,263");
    expect(summary).toContain("3 errors");
    expect(summary).toContain("12 duplicates");
  });

  it("omits errors and duplicates when there are none", () => {
    const job = previewImportJobs[1];
    const summary = summarizeImportJob(job);
    expect(summary).not.toContain("error");
    expect(summary).not.toContain("duplicate");
  });
});

describe("extractColumnNames", () => {
  it("extracts unique column names from sample rows", () => {
    const columns = extractColumnNames(sampleRows);
    expect(columns).toContain("farmer_name");
    expect(columns).toContain("mobile");
    expect(columns).toContain("district");
    expect(columns).toContain("improved_seed");
    expect(columns).toContain("monitoring_date");
  });

  it("returns an empty array for empty input", () => {
    expect(extractColumnNames([])).toEqual([]);
  });
});

describe("countAnalysisIssues", () => {
  it("counts errors, warnings, and duplicate groups correctly", () => {
    const counts = countAnalysisIssues(previewSmartAnalysis);
    expect(counts.errors).toBe(1);
    expect(counts.warnings).toBe(1);
    expect(counts.total).toBe(2);
    expect(counts.duplicateGroups).toBe(2);
  });
});
