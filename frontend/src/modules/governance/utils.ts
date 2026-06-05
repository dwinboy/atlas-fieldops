import type {
  ConsentRecordRead,
  ExportLogRead,
  GovernancePolicyRead,
  GovernanceSummary,
  RetentionPolicyRead,
} from "@/lib/api";
import type { ApprovalRequest, GovernanceHealthCategory, StewardshipAssignment } from "@/modules/governance/data";

export type GovernanceHealth = {
  category: GovernanceHealthCategory;
  components: {
    approvalTimeliness: number;
    auditCoverage: number;
    complianceStatus: number;
    consentCompliance: number;
    policyCompliance: number;
    retentionCompliance: number;
    stewardshipCoverage: number;
  };
  score: number;
};

type HealthInputs = {
  approvals: ApprovalRequest[];
  consentRecords: ConsentRecordRead[];
  exports: ExportLogRead[];
  policies: GovernancePolicyRead[];
  retentionRules: RetentionPolicyRead[];
  stewardship: StewardshipAssignment[];
  summary: GovernanceSummary;
};

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function healthCategory(score: number): GovernanceHealthCategory {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 55) return "Needs Attention";
  return "Critical";
}

export function computeGovernanceHealth({
  approvals,
  consentRecords,
  exports,
  policies,
  retentionRules,
  stewardship,
  summary,
}: HealthInputs): GovernanceHealth {
  const approvedPolicies = policies.filter((policy) =>
    ["approved", "published"].includes(policy.lifecycle_state.toLowerCase()),
  ).length;
  const consentExceptions = consentRecords.filter((record) =>
    ["expired", "missing", "pending", "revoked"].includes(record.status.toLowerCase()),
  ).length;
  const overdueApprovals = approvals.filter((approval) => approval.age_hours > approval.sla_hours).length;
  const riskyExports = exports.filter((event) => !event.anonymized || event.risk_score >= 0.7).length;
  const stewardshipGaps = stewardship.filter((assignment) =>
    assignment.status.toLowerCase().includes("gap"),
  ).length;

  const components = {
    approvalTimeliness: clamp(100 - overdueApprovals * 25),
    auditCoverage: clamp(summary.audit_events > 0 ? 96 : 35),
    complianceStatus: clamp(summary.compliance_score),
    consentCompliance: clamp(consentRecords.length ? 100 - (consentExceptions / consentRecords.length) * 100 : 75),
    policyCompliance: clamp(policies.length ? (approvedPolicies / policies.length) * 100 : 70),
    retentionCompliance: clamp(retentionRules.length ? 95 : 50),
    stewardshipCoverage: clamp(stewardship.length ? 100 - (stewardshipGaps / stewardship.length) * 100 : 65),
  };

  const riskPenalty = Math.min(18, riskyExports * 6 + summary.open_quality_signals * 2);
  const rawScore =
    components.auditCoverage * 0.15 +
    components.complianceStatus * 0.2 +
    components.consentCompliance * 0.15 +
    components.stewardshipCoverage * 0.12 +
    components.policyCompliance * 0.15 +
    components.approvalTimeliness * 0.13 +
    components.retentionCompliance * 0.1 -
    riskPenalty;
  const score = clamp(rawScore);

  return {
    category: healthCategory(score),
    components,
    score,
  };
}

export function toneFromHealth(value: GovernanceHealthCategory): "danger" | "success" | "warning" {
  if (value === "Excellent" || value === "Good") return "success";
  if (value === "Needs Attention") return "warning";
  return "danger";
}

export function severityTone(value: string): "danger" | "neutral" | "success" | "warning" {
  const normalized = value.toLowerCase();
  if (["critical", "high", "non-compliant", "rejected", "escalated"].some((token) => normalized.includes(token))) {
    return "danger";
  }
  if (["medium", "partial", "review", "pending", "warning"].some((token) => normalized.includes(token))) {
    return "warning";
  }
  if (["low", "approved", "compliant", "active", "granted"].some((token) => normalized.includes(token))) {
    return "success";
  }
  return "neutral";
}

export function formatDate(value?: string | null): string {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function toCsv(rows: Record<string, string | number | boolean | null | undefined>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: string | number | boolean | null | undefined) =>
    `"${String(value ?? "").replaceAll('"', '""')}"`;
  return [
    headers.map(escape).join(","),
    ...rows.map((row) => headers.map((header) => escape(row[header])).join(",")),
  ].join("\n");
}
