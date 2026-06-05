import type { BadgeProps } from "@/components/ui/badge";
import type {
  DataQualitySection,
  QualityIssue,
  QualityIssueStatus,
  QualityScore,
  QualitySeverity,
  QualitySummary,
} from "@/modules/data-quality/data";

export function calculateQualityScore(score: QualityScore): number {
  const values = [
    score.accuracy,
    score.completeness,
    score.consistency,
    score.consentCompliance,
    score.duplicateDetection,
    score.gpsCompliance,
    score.timeliness,
    score.validationSuccess,
  ];
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function qualityCategory(score: number): "Excellent" | "Good" | "Needs Review" | "Critical" {
  if (score >= 95) return "Excellent";
  if (score >= 85) return "Good";
  if (score >= 70) return "Needs Review";
  return "Critical";
}

export function scoreTone(score: number): BadgeProps["tone"] {
  if (score >= 95) return "success";
  if (score >= 85) return "accent";
  if (score >= 70) return "warning";
  return "danger";
}

export function severityTone(severity: QualitySeverity): BadgeProps["tone"] {
  if (severity === "Critical") return "danger";
  if (severity === "High") return "warning";
  if (severity === "Medium") return "accent";
  return "neutral";
}

export function statusTone(status: QualityIssueStatus): BadgeProps["tone"] {
  if (status === "Resolved" || status === "Closed") return "success";
  if (status === "Escalated" || status === "Governance Review") return "danger";
  if (status === "Assigned" || status === "Under Investigation") return "warning";
  return "neutral";
}

export function computeQualitySummary(issues: QualityIssue[], score: QualityScore): QualitySummary {
  return {
    criticalIssues: issues.filter((issue) => issue.severity === "Critical").length,
    duplicateRecords: issues.filter((issue) => issue.type === "Duplicate").length,
    gpsIssues: issues.filter((issue) => issue.type === "GPS Issue").length,
    highRiskSubmissions: issues.filter((issue) => issue.type === "Risk Alert" || issue.severity === "Critical").length,
    missingDataRecords: issues.filter((issue) => issue.type === "Missing Data").length,
    openInvestigations: issues.filter((issue) => issue.status === "Assigned" || issue.status === "Under Investigation" || issue.status === "Escalated" || issue.status === "Governance Review").length,
    openQualityIssues: issues.filter((issue) => issue.status !== "Resolved" && issue.status !== "Closed").length,
    overallScore: calculateQualityScore(score),
    resolvedIssues: issues.filter((issue) => issue.status === "Resolved" || issue.status === "Closed").length,
    validationFailures: issues.filter((issue) => issue.type === "Validation Failure").length,
  };
}

export function filterIssuesBySection(issues: QualityIssue[], section: DataQualitySection): QualityIssue[] {
  if (section === "dashboard" || section === "quality-dashboard" || section === "rules") return issues;
  if (section === "duplicates") return issues.filter((issue) => issue.type === "Duplicate");
  if (section === "outliers") return issues.filter((issue) => issue.type === "Outlier");
  if (section === "gps-issues") return issues.filter((issue) => issue.type === "GPS Issue");
  if (section === "missing-data") return issues.filter((issue) => issue.type === "Missing Data");
  if (section === "validation-failures") return issues.filter((issue) => issue.type === "Validation Failure");
  if (section === "risk-alerts") return issues.filter((issue) => issue.type === "Risk Alert");
  return issues;
}

export function nextInvestigationStatus(status: QualityIssueStatus): QualityIssueStatus {
  if (status === "Detected") return "Assigned";
  if (status === "Assigned") return "Under Investigation";
  if (status === "Under Investigation") return "Resolved";
  if (status === "Escalated") return "Governance Review";
  if (status === "Governance Review") return "Resolved";
  if (status === "Resolved") return "Closed";
  return "Closed";
}

export function averageResolutionImpact(issues: QualityIssue[]): number {
  const open = issues.filter((issue) => issue.status !== "Resolved" && issue.status !== "Closed");
  if (!open.length) return 0;
  return Math.round(open.reduce((sum, issue) => sum + issue.scoreImpact, 0) / open.length);
}

export function buildQualityInvestigationSummary(issue: QualityIssue): string {
  return `${issue.title} affects ${issue.submissionId} in ${issue.project}. Severity is ${issue.severity}, status is ${issue.status}, and the recommended action is: ${issue.recommendedAction}`;
}

export function toCsv(rows: Record<string, string | number | boolean | null | undefined>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return [
    headers.map(escape).join(","),
    ...rows.map((row) => headers.map((header) => escape(row[header])).join(",")),
  ].join("\n");
}
