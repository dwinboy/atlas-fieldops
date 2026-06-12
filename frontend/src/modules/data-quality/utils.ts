import type { BadgeProps } from "@/components/ui/badge";
import type {
  DataQualitySection,
  QualityIssue,
  QualityIssueStatus,
  QualityIssueType,
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
    reconciliationIssues: issues.filter((issue) => issue.type === "Reconciliation").length,
    overallScore: calculateQualityScore(score),
    resolvedIssues: issues.filter((issue) => issue.status === "Resolved" || issue.status === "Closed").length,
    validationFailures: issues.filter((issue) => issue.type === "Validation Failure").length,
  };
}

export function computeQualityScoreFromIssues(issues: QualityIssue[]): QualityScore {
  const open = issues.filter((issue) => issue.status !== "Resolved" && issue.status !== "Closed");
  const impactByType = (type: QualityIssueType) =>
    open.filter((issue) => issue.type === type).reduce((sum, issue) => sum + issue.scoreImpact, 0);
  const clamp = (value: number) => Math.max(0, Math.min(100, value));
  const missingDataImpact = impactByType("Missing Data");
  const duplicateImpact = impactByType("Duplicate");
  const reconciliationImpact = impactByType("Reconciliation");
  return {
    accuracy: clamp(100 - impactByType("Outlier")),
    completeness: clamp(100 - missingDataImpact),
    consistency: clamp(100 - reconciliationImpact),
    consentCompliance: clamp(100 - missingDataImpact),
    duplicateDetection: clamp(100 - duplicateImpact - reconciliationImpact),
    gpsCompliance: clamp(100 - impactByType("GPS Issue")),
    timeliness: clamp(100 - impactByType("Risk Alert")),
    validationSuccess: clamp(100 - impactByType("Validation Failure")),
  };
}

export function rankByField(issues: QualityIssue[], field: "project" | "form"): [string, number][] {
  const open = issues.filter((issue) => issue.status !== "Resolved" && issue.status !== "Closed");
  const impact = new Map<string, number>();
  const seen = new Set<string>();
  for (const issue of issues) seen.add(issue[field]);
  for (const issue of open) impact.set(issue[field], (impact.get(issue[field]) ?? 0) + issue.scoreImpact);
  return Array.from(seen)
    .map((key) => [key, Math.max(0, 100 - (impact.get(key) ?? 0))] as [string, number])
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5);
}

export function rankByIssueType(issues: QualityIssue[]): [string, number][] {
  const open = issues.filter((issue) => issue.status !== "Resolved" && issue.status !== "Closed");
  const impact = new Map<string, number>();
  for (const issue of open) impact.set(issue.type, (impact.get(issue.type) ?? 0) + issue.scoreImpact);
  return Array.from(new Set(open.map((issue) => issue.type)))
    .map((type) => [type, Math.max(0, 100 - (impact.get(type) ?? 0))] as [string, number])
    .sort((left, right) => right[1] - left[1]);
}

export function filterIssuesBySection(issues: QualityIssue[], section: DataQualitySection): QualityIssue[] {
  if (section === "dashboard" || section === "quality-dashboard" || section === "rules") return issues;
  if (section === "duplicates") return issues.filter((issue) => issue.type === "Duplicate");
  if (section === "outliers") return issues.filter((issue) => issue.type === "Outlier");
  if (section === "gps-issues") return issues.filter((issue) => issue.type === "GPS Issue");
  if (section === "missing-data") return issues.filter((issue) => issue.type === "Missing Data");
  if (section === "reconciliation") return issues.filter((issue) => issue.type === "Reconciliation");
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
