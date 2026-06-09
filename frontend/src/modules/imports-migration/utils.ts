import type {
  ImportAnalysisResponse,
  ImportJobRead,
  ImportPreviewResponse,
  ImportReadinessScoreRead,
} from "@/lib/api";
import { importTypes } from "@/modules/imports-migration/data";

/**
 * Maps an import job status string to the badge tone for the UI.
 */
export function importJobStatusTone(
  status: string,
): "danger" | "neutral" | "success" | "warning" {
  if (
    status === "completed" ||
    status === "validated" ||
    status === "ready" ||
    status.startsWith("completed")
  )
    return "success";
  if (
    status === "failed" ||
    status === "needs_fixes" ||
    status.includes("error")
  )
    return "danger";
  if (status === "processing" || status === "draft") return "warning";
  return "neutral";
}

/**
 * Maps an import job status string to a plain-English label.
 */
export function importJobStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    completed: "Completed",
    completed_with_errors: "Completed with errors",
    draft: "Draft",
    failed: "Failed",
    needs_fixes: "Needs fixes",
    processing: "Processing",
    ready: "Ready",
    validated: "Validated",
  };
  return labels[status] ?? status.replaceAll("_", " ");
}

/**
 * Returns the human-readable label for a dataset_type identifier.
 */
export function prettyImportType(value: string): string {
  return (
    importTypes.find((item) => item.id === value)?.label ??
    value.replaceAll("_", " ")
  );
}

/**
 * Formats a record count using the locale number format.
 */
export function formatImportCount(value?: number): string {
  return new Intl.NumberFormat().format(value ?? 0);
}

/**
 * Returns true if the import job can be rolled back.
 * A job is rollback-able when the rollback_available flag is set and the
 * status is either completed or completed_with_errors.
 */
export function isJobRollbackable(job: ImportJobRead): boolean {
  return (
    job.rollback_available === true &&
    (job.status === "completed" || job.status === "completed_with_errors")
  );
}

/**
 * Groups validation issues by their severity level.
 */
export function groupValidationIssuesBySeverity(
  issues: ImportPreviewResponse["issues"],
): Record<string, ImportPreviewResponse["issues"]> {
  const groups: Record<string, ImportPreviewResponse["issues"]> = {};
  for (const issue of issues) {
    const key = issue.severity ?? "unknown";
    if (!groups[key]) groups[key] = [];
    groups[key].push(issue);
  }
  return groups;
}

/**
 * Derives a readiness category from a numeric score (0-100).
 */
export function computeReadinessCategory(
  score: number,
): ImportReadinessScoreRead["category"] {
  if (score >= 90) return "Ready";
  if (score >= 70) return "Needs Review";
  if (score >= 50) return "Needs Fixes";
  return "Not Ready";
}

/**
 * Builds a single-line summary string from an ImportJobRead record.
 */
export function summarizeImportJob(job: ImportJobRead): string {
  const typeName = prettyImportType(job.dataset_type);
  const total = formatImportCount(job.total_rows);
  const errors = job.error_rows ?? 0;
  const duplicates = job.duplicate_rows ?? 0;
  const source = job.source_name;

  const parts = [
    `${typeName} import from "${source}"`,
    `${total} rows`,
    errors > 0 ? `${errors} error${errors === 1 ? "" : "s"}` : null,
    duplicates > 0
      ? `${duplicates} duplicate${duplicates === 1 ? "" : "s"}`
      : null,
  ].filter(Boolean);

  return parts.join(" • ");
}

/**
 * Extracts distinct column names from an array of preview rows.
 */
export function extractColumnNames(
  rows: Record<string, unknown>[],
): string[] {
  if (!rows.length) return [];
  const nameSet = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      nameSet.add(key);
    }
  }
  return Array.from(nameSet);
}

/**
 * Returns the count of total issues, errors, and warnings from an analysis.
 */
export function countAnalysisIssues(analysis: ImportAnalysisResponse): {
  total: number;
  errors: number;
  warnings: number;
  duplicateGroups: number;
} {
  const errors = analysis.validation_issues.filter(
    (i) => i.severity === "error",
  ).length;
  const warnings = analysis.validation_issues.filter(
    (i) => i.severity === "warning",
  ).length;
  return {
    duplicateGroups: analysis.duplicate_groups.length,
    errors,
    total: errors + warnings,
    warnings,
  };
}
