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

type SignalEvidenceChange = {
  current: string;
  field: string;
  proposed: string;
};

export type SignalStatusHistoryEntry = {
  changedAt: string;
  changedByUserId: string;
  comment: string;
  from: string;
  proposalAction: string;
  to: string;
};

export type ProfileFieldSensitivity = "Sensitive" | "Standard";
export type ProfileConflictReviewFocus = "Identity" | "Contact" | "Location" | "General";
export type ProfileConflictFocusFilter = "all" | ProfileConflictReviewFocus;
export type ProfileConflictDecisionFilter = "all" | "ready" | "blocked";
export type ReconciliationFocusFilter = "all" | "other_reconciliation" | "profile_conflicts";

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function humanizeFieldLabel(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function evidenceValueText(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  if (Array.isArray(value)) return value.map((item) => String(item)).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

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
  const profileConflictDecisionCounts = summarizeProfileConflictDecisionStates(issues);
  return {
    criticalIssues: issues.filter((issue) => issue.severity === "Critical").length,
    duplicateRecords: issues.filter((issue) => issue.type === "Duplicate").length,
    gpsIssues: issues.filter((issue) => issue.type === "GPS Issue").length,
    highRiskSubmissions: issues.filter((issue) => issue.type === "Risk Alert" || issue.severity === "Critical").length,
    missingDataRecords: issues.filter((issue) => issue.type === "Missing Data").length,
    openInvestigations: issues.filter((issue) => issue.status === "Assigned" || issue.status === "Under Investigation" || issue.status === "Escalated" || issue.status === "Governance Review").length,
    openQualityIssues: issues.filter((issue) => issue.status !== "Resolved" && issue.status !== "Closed").length,
    profileConflictsBlocked: profileConflictDecisionCounts.blocked,
    profileConflictsPending: issues.filter((issue) => issue.status !== "Resolved" && issue.status !== "Closed" && isProfileConflictIssue(issue)).length,
    profileConflictsReady: profileConflictDecisionCounts.ready,
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

export function filterReconciliationIssues(issues: QualityIssue[], filter: ReconciliationFocusFilter): QualityIssue[] {
  if (filter === "profile_conflicts") return issues.filter((issue) => isProfileConflictIssue(issue));
  if (filter === "other_reconciliation") return issues.filter((issue) => !isProfileConflictIssue(issue));
  return issues;
}

export function countReconciliationIssuesByFilter(issues: QualityIssue[]): Record<ReconciliationFocusFilter, number> {
  return {
    all: issues.length,
    other_reconciliation: filterReconciliationIssues(issues, "other_reconciliation").length,
    profile_conflicts: filterReconciliationIssues(issues, "profile_conflicts").length,
  };
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

export function rankIssuesForAttention(issues: QualityIssue[]): QualityIssue[] {
  const severityWeight: Record<QualitySeverity, number> = {
    Critical: 4,
    High: 3,
    Medium: 2,
    Low: 1,
  };
  return [...issues].sort((left, right) => {
    const leftOpen = left.status !== "Resolved" && left.status !== "Closed";
    const rightOpen = right.status !== "Resolved" && right.status !== "Closed";
    if (leftOpen !== rightOpen) return leftOpen ? -1 : 1;

    const decisionRank = (issue: QualityIssue): number => {
      const state = profileConflictDecisionState(issue)?.label;
      if (state === "Ready for decision") return 0;
      if (state === "Blocked") return 1;
      return 2;
    };
    const decisionGap = decisionRank(left) - decisionRank(right);
    if (decisionGap !== 0) return decisionGap;

    const leftSensitive =
      profileConflictChangesFromEvidence(left.evidenceJson).filter((change) => profileFieldSensitivity(change.field) === "Sensitive").length;
    const rightSensitive =
      profileConflictChangesFromEvidence(right.evidenceJson).filter((change) => profileFieldSensitivity(change.field) === "Sensitive").length;
    if (leftSensitive !== rightSensitive) return rightSensitive - leftSensitive;

    const leftConflict = isProfileConflictIssue(left) ? 1 : 0;
    const rightConflict = isProfileConflictIssue(right) ? 1 : 0;
    if (leftConflict !== rightConflict) return rightConflict - leftConflict;

    const severityGap = severityWeight[right.severity] - severityWeight[left.severity];
    if (severityGap !== 0) return severityGap;

    const impactGap = right.scoreImpact - left.scoreImpact;
    if (impactGap !== 0) return impactGap;

    return new Date(right.detectedAt).getTime() - new Date(left.detectedAt).getTime();
  });
}

export function issueAttentionNote(issue: QualityIssue): string | null {
  if (!isProfileConflictIssue(issue)) return null;
  const changes = profileConflictChangesFromEvidence(issue.evidenceJson);
  const focus = profileConflictReviewFocus(changes.map((change) => change.field));
  const sensitiveCount = profileConflictSensitiveFieldCount(changes.map((change) => change.field));
  const decisionLabel = profileConflictDecisionState(issue)?.label;
  const focusLabel = focus.join(" + ");
  const focusSummary = focus.length === 1 ? `${focusLabel} conflict` : `${focusLabel} conflicts`;
  if (sensitiveCount > 0) {
    return `${decisionLabel ? `${decisionLabel} · ` : ""}${focusSummary} · ${sensitiveCount} sensitive field${sensitiveCount === 1 ? "" : "s"}`;
  }
  return `${decisionLabel ? `${decisionLabel} · ` : ""}${focusSummary}`;
}

export function preferredIssueDetailTab(issue: QualityIssue): "Overview" | "Resolution" {
  return isProfileConflictIssue(issue) ? "Resolution" : "Overview";
}

export function requiresProfileConflictDecision(issue: QualityIssue): boolean {
  return isProfileConflictIssue(issue) && profileConflictChangesFromEvidence(issue.evidenceJson).length > 0;
}

export function profileConflictDecisionBlocker(issue: QualityIssue): string | null {
  if (!requiresProfileConflictDecision(issue)) return null;
  const missingBeneficiary = !evidenceValueText(issue.evidenceJson?.beneficiary_id);
  const missingSubmission = issue.submissionId === "Not linked";
  if (missingBeneficiary && missingSubmission) {
    return "This conflict cannot be approved yet because the linked beneficiary and source submission are missing.";
  }
  if (missingBeneficiary) {
    return "This conflict cannot be approved yet because the linked beneficiary is missing.";
  }
  if (missingSubmission) {
    return "This conflict cannot be approved yet because the source submission is missing.";
  }
  return null;
}

export function profileConflictDecisionState(issue: QualityIssue): { label: string; tone: BadgeProps["tone"] } | null {
  if (!requiresProfileConflictDecision(issue)) return null;
  if (profileConflictDecisionBlocker(issue)) {
    return { label: "Blocked", tone: "warning" };
  }
  return { label: "Ready for decision", tone: "success" };
}

export function summarizeProfileConflictDecisionStates(issues: QualityIssue[]): { blocked: number; ready: number } {
  let blocked = 0;
  let ready = 0;
  for (const issue of issues) {
    if (issue.status === "Resolved" || issue.status === "Closed" || !requiresProfileConflictDecision(issue)) continue;
    if (profileConflictDecisionBlocker(issue)) blocked += 1;
    else ready += 1;
  }
  return { blocked, ready };
}

export function sortProfileConflictIssuesForReview(issues: QualityIssue[]): QualityIssue[] {
  const stateRank = (issue: QualityIssue): number => {
    const state = profileConflictDecisionState(issue)?.label;
    if (state === "Ready for decision") return 0;
    if (state === "Blocked") return 1;
    return 2;
  };

  return [...issues].sort((left, right) => {
    const rankGap = stateRank(left) - stateRank(right);
    if (rankGap !== 0) return rankGap;

    const leftSensitive = profileConflictSensitiveFieldCount(profileConflictChangesFromEvidence(left.evidenceJson).map((change) => change.field));
    const rightSensitive = profileConflictSensitiveFieldCount(profileConflictChangesFromEvidence(right.evidenceJson).map((change) => change.field));
    if (leftSensitive !== rightSensitive) return rightSensitive - leftSensitive;

    return new Date(right.detectedAt).getTime() - new Date(left.detectedAt).getTime();
  });
}

export function filterProfileConflictsByDecisionState(
  issues: QualityIssue[],
  decisionFilter: ProfileConflictDecisionFilter,
): QualityIssue[] {
  if (decisionFilter === "all") return issues;
  return issues.filter((issue) => {
    const state = profileConflictDecisionState(issue);
    if (!state) return false;
    return decisionFilter === "ready" ? state.label === "Ready for decision" : state.label === "Blocked";
  });
}

export function buildQualityInvestigationSummary(issue: QualityIssue): string {
  return `${issue.title} affects ${issue.submissionId} in ${issue.project}. Severity is ${issue.severity}, status is ${issue.status}, and the recommended action is: ${issue.recommendedAction}`;
}

export function profileConflictChangesFromEvidence(evidenceJson?: Record<string, unknown>): SignalEvidenceChange[] {
  const changes = asRecord(evidenceJson?.changes);
  return Object.entries(changes)
    .map(([field, rawValue]) => {
      const change = asRecord(rawValue);
      return {
        current: evidenceValueText(change.current) || "Empty",
        field,
        proposed: evidenceValueText(change.proposed) || "Empty",
      };
    })
    .filter((change) => change.current !== "Empty" || change.proposed !== "Empty");
}

export function profileFieldSensitivity(field: string): ProfileFieldSensitivity {
  const normalized = field.trim().toLowerCase();
  if ([
    "display_name",
    "birth_year",
    "phone_number",
    "latitude",
    "longitude",
    "region",
    "district",
    "community",
  ].includes(normalized)) {
    return "Sensitive";
  }
  return "Standard";
}

export function profileConflictSensitiveFieldCount(fields: string[]): number {
  return fields.filter((field) => profileFieldSensitivity(field) === "Sensitive").length;
}

export function profileFieldDecisionHint(field: string): string {
  const normalized = field.trim().toLowerCase();
  if (normalized === "phone_number") return "Confirm the contact detail with the respondent or supervisor.";
  if (normalized === "display_name" || normalized === "birth_year") return "Check identity documents or prior registration before replacing the official record.";
  if (["latitude", "longitude", "region", "district", "community"].includes(normalized)) {
    return "Verify the visit location so coverage and mapping stay accurate.";
  }
  return "Approve only if the new submission should become the official beneficiary profile.";
}

export function profileConflictReviewFocus(fields: string[]): ProfileConflictReviewFocus[] {
  const focus = new Set<ProfileConflictReviewFocus>();
  for (const field of fields.map((value) => value.trim().toLowerCase())) {
    if (field === "display_name" || field === "birth_year") focus.add("Identity");
    else if (field === "phone_number") focus.add("Contact");
    else if (["latitude", "longitude", "region", "district", "community"].includes(field)) focus.add("Location");
  }
  if (!focus.size) focus.add("General");
  return Array.from(focus);
}

export function profileConflictFocusDescription(focus: ProfileConflictReviewFocus): string {
  if (focus === "Identity") return "Identity conflicts waiting for decision.";
  if (focus === "Contact") return "Contact conflicts waiting for decision.";
  if (focus === "Location") return "Location or GPS conflicts waiting for decision.";
  return "Other beneficiary profile conflicts waiting for decision.";
}

export function profileConflictChecklist(fields: string[]): string[] {
  const focus = profileConflictReviewFocus(fields);
  const checklist: string[] = [];
  if (focus.includes("Identity")) {
    checklist.push("Confirm the respondent matches the registered beneficiary before changing identity fields.");
  }
  if (focus.includes("Contact")) {
    checklist.push("Verify the updated contact detail with the respondent or supervisor.");
  }
  if (focus.includes("Location")) {
    checklist.push("Check that the visit location, community, or GPS evidence matches the official beneficiary record.");
  }
  if (!checklist.length || focus.includes("General")) {
    checklist.push("Approve only if this submission should replace the official beneficiary profile.");
  }
  return checklist;
}

export function summarizeProfileConflictFocus(issues: QualityIssue[]): Array<{ focus: ProfileConflictReviewFocus; count: number }> {
  const counts = new Map<ProfileConflictReviewFocus, number>();
  for (const issue of issues) {
    if (issue.status === "Resolved" || issue.status === "Closed" || !isProfileConflictIssue(issue)) continue;
    const focusList = profileConflictReviewFocus(profileConflictChangesFromEvidence(issue.evidenceJson).map((change) => change.field));
    for (const focus of focusList) {
      counts.set(focus, (counts.get(focus) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([focus, count]) => ({ count, focus }))
    .sort((left, right) => right.count - left.count);
}

export function summarizeProfileConflictFocusDecisionStates(
  issues: QualityIssue[],
): Array<{ blocked: number; count: number; focus: ProfileConflictReviewFocus; ready: number }> {
  const counts = new Map<ProfileConflictReviewFocus, { blocked: number; count: number; ready: number }>();
  for (const issue of issues) {
    if (issue.status === "Resolved" || issue.status === "Closed" || !isProfileConflictIssue(issue)) continue;
    const decisionState = profileConflictDecisionState(issue)?.label;
    const focusList = profileConflictReviewFocus(profileConflictChangesFromEvidence(issue.evidenceJson).map((change) => change.field));
    for (const focus of focusList) {
      const current = counts.get(focus) ?? { blocked: 0, count: 0, ready: 0 };
      current.count += 1;
      if (decisionState === "Ready for decision") current.ready += 1;
      if (decisionState === "Blocked") current.blocked += 1;
      counts.set(focus, current);
    }
  }
  return Array.from(counts.entries())
    .map(([focus, state]) => ({ focus, ...state }))
    .sort((left, right) => right.count - left.count);
}

export function filterProfileConflictsByFocus(
  issues: QualityIssue[],
  focusFilter: ProfileConflictFocusFilter,
): QualityIssue[] {
  if (focusFilter === "all") return issues;
  return issues.filter((issue) =>
    profileConflictReviewFocus(profileConflictChangesFromEvidence(issue.evidenceJson).map((change) => change.field)).includes(focusFilter),
  );
}

export function isProfileConflictIssue(issue: QualityIssue): boolean {
  const signalType = evidenceValueText(issue.evidenceJson?.signal_type).toLowerCase();
  return signalType === "profile_conflict" || profileConflictChangesFromEvidence(issue.evidenceJson).length > 0;
}

export function formatSignalEvidence(evidenceJson: Record<string, unknown> | undefined, confidence: number): string[] {
  const changes = profileConflictChangesFromEvidence(evidenceJson);
  const rows = changes.map((change) => `${humanizeFieldLabel(change.field)}: ${change.current} -> ${change.proposed}`);
  for (const [key, value] of Object.entries(evidenceJson ?? {})) {
    if (key === "changes" || key === "beneficiary_id" || key === "signal_type" || key === "submission_id") continue;
    const text = evidenceValueText(value);
    if (!text) continue;
    rows.push(`${humanizeFieldLabel(key)}: ${text}`);
  }
  return rows.length ? rows : [`Confidence: ${Math.round(confidence * 100)}%`];
}

export function signalStatusHistoryFromEvidence(evidenceJson?: Record<string, unknown>): SignalStatusHistoryEntry[] {
  const history = evidenceJson?.statusHistory;
  if (!Array.isArray(history)) return [];
  return history
    .map((entry) => {
      const value = asRecord(entry);
      return {
        changedAt: evidenceValueText(value.changedAt),
        changedByUserId: evidenceValueText(value.changedByUserId),
        comment: evidenceValueText(value.comment),
        from: evidenceValueText(value.from),
        proposalAction: evidenceValueText(value.proposalAction),
        to: evidenceValueText(value.to),
      };
    })
    .filter((entry) => entry.changedAt || entry.comment || entry.to);
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
