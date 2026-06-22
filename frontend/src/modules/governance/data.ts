import type {
  ConsentRecordRead,
  DataVersionRead,
  ExportLogRead,
  GovernancePolicyRead,
  GovernanceSummary,
  LineageEventRead,
  MasterDataEntryRead,
  RetentionPolicyRead,
  ValidationRuleRead,
} from "@/lib/api";

export type GovernanceSection =
  | "dashboard"
  | "audit-trail"
  | "policies"
  | "approvals"
  | "retention-rules"
  | "consent-management"
  | "compliance"
  | "data-stewardship";

export type GovernanceHealthCategory = "Excellent" | "Good" | "Needs Attention" | "Critical";

export type GovernanceRisk = {
  id: string;
  name: string;
  category: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  likelihood: string;
  impact: string;
  owner: string;
  mitigation: string;
};

export type GovernanceAuditEvent = {
  id: string;
  module: string;
  user: string;
  timestamp: string;
  action: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  old_value: string;
  new_value: string;
  reason: string;
  ip_address: string;
  device: string;
  organization: string;
};

export type ApprovalRequest = {
  id: string;
  approval_type: string;
  stage: "Submitted" | "Review" | "Approved" | "Rejected" | "Escalated";
  owner: string;
  sla_hours: number;
  age_hours: number;
  comments_required: boolean;
};

export type ComplianceCheck = {
  id: string;
  framework: string;
  requirement: string;
  status: "Compliant" | "Partially Compliant" | "Non-Compliant";
  owner: string;
  evidence: string;
  review_date: string;
};

export type StewardshipAssignment = {
  id: string;
  steward: string;
  asset: string;
  role: string;
  status: string;
  responsibilities: string;
};

const nowIso = new Date().toISOString();

export const governanceSections: {
  id: GovernanceSection;
  label: string;
  route: string;
  description: string;
}[] = [
  { id: "dashboard", label: "Overview", route: "/governance", description: "Executive governance health, risks, approvals, compliance, audit, consent, and stewardship." },
  { id: "audit-trail", label: "Audit Trail", route: "/governance/audit-trail", description: "Immutable cross-module activity and change records." },
  { id: "policies", label: "Policies", route: "/governance/policies", description: "Data governance, privacy, retention, access, security, quality, and compliance policies." },
  { id: "approvals", label: "Approvals", route: "/governance/approvals", description: "Governance approval workflows, reviewer queues, SLA, escalation, and comments." },
  { id: "retention-rules", label: "Retention Rules", route: "/governance/retention-rules", description: "Data lifecycle, archival, deletion, anonymization, and legal hold rules." },
  { id: "consent-management", label: "Consent", route: "/governance/consent-management", description: "Consent templates, collection coverage, exceptions, expiry, and compliance." },
  { id: "compliance", label: "Compliance", route: "/governance/compliance", description: "Regulatory, donor, safeguarding, and internal compliance evidence." },
  { id: "data-stewardship", label: "Data Stewardship", route: "/governance/data-stewardship", description: "Ownership and accountability for project, form, indicator, submission, and location data." },
];

export function governanceSectionFromPath(pathname: string): GovernanceSection {
  const match = governanceSections.find((section) => section.route !== "/governance" && pathname.startsWith(section.route));
  return match?.id ?? "dashboard";
}

export const previewSummary: GovernanceSummary = {
  policies: 5,
  validation_rules: 8,
  retention_policies: 4,
  open_quality_signals: 3,
  audit_events: 1846,
  lineage_events: 14,
  export_events: 9,
  consent_records: 1284,
  compliance_score: 86,
  attention_items: [
    "Two export requests need governance review",
    "Consent evidence is missing for 11 participant records",
    "One retention policy is due for annual review",
  ],
};

export const previewPolicies: GovernancePolicyRead[] = [
  { id: "policy-privacy", name: "Participant Data Protection", policy_type: "Data Privacy", lifecycle_state: "approved", version: 3, enforcement_level: "blocking", rules_json: { masking: true, consent_required: true }, approved_at: nowIso, created_at: nowIso },
  { id: "policy-export", name: "Approved Data Export", policy_type: "Data Export", lifecycle_state: "reviewed", version: 2, enforcement_level: "warning", rules_json: { approval_required: true }, approved_at: null, created_at: nowIso },
  { id: "policy-quality", name: "Minimum Data Quality Threshold", policy_type: "Quality Assurance", lifecycle_state: "approved", version: 1, enforcement_level: "warning", rules_json: { minimum_score: 80 }, approved_at: nowIso, created_at: nowIso },
];

export const previewRetention: RetentionPolicyRead[] = [
  { id: "ret-submissions", record_type: "submissions", retention_years: 10, archive_after_days: 365, legal_hold: false, purge_allowed: false, anonymize_on_export: true, created_at: nowIso },
  { id: "ret-attachments", record_type: "attachments", retention_years: 7, archive_after_days: 180, legal_hold: false, purge_allowed: false, anonymize_on_export: true, created_at: nowIso },
  { id: "ret-audit", record_type: "audit_logs", retention_years: 15, archive_after_days: 3650, legal_hold: true, purge_allowed: false, anonymize_on_export: false, created_at: nowIso },
];

export const previewRules: ValidationRuleRead[] = [
  { id: "rule-consent", rule_code: "consent-required", name: "Consent required before approval", target_entity: "submissions", severity: "critical", expression: "consent == true", version: 1, is_active: true, created_at: nowIso },
  { id: "rule-gps", rule_code: "gps-boundary-check", name: "GPS must be inside assigned boundary", target_entity: "submissions", severity: "high", expression: "within_boundary == true", version: 2, is_active: true, created_at: nowIso },
];

export const previewExports: ExportLogRead[] = [
  { id: "export-submissions", dataset_type: "submissions", export_format: "xlsx", status: "review_required", anonymized: false, record_count: 4820, risk_score: 0.78, created_at: nowIso },
  { id: "export-indicators", dataset_type: "indicators", export_format: "csv", status: "approved", anonymized: true, record_count: 92, risk_score: 0.16, created_at: nowIso },
];

export const previewConsentRecords: ConsentRecordRead[] = [
  { id: "consent-1", beneficiary_id: "beneficiary-1", subject_identifier: "BEN-00142", consent_type: "digital", status: "granted", captured_at: nowIso, created_at: nowIso },
  { id: "consent-2", beneficiary_id: "beneficiary-2", subject_identifier: "BEN-00183", consent_type: "guardian", status: "pending", captured_at: null, created_at: nowIso },
  { id: "consent-3", beneficiary_id: "beneficiary-3", subject_identifier: "BEN-00209", consent_type: "written", status: "expired", captured_at: nowIso, created_at: nowIso },
];

export const previewLineage: LineageEventRead[] = [
  { id: "lineage-1", source_type: "submission", source_id: "SUB-1042", target_type: "indicator", target_id: "FCS", transformation: "approved aggregation", lineage_json: {}, created_at: nowIso },
  { id: "lineage-2", source_type: "form", source_id: "FORM-BASE", target_type: "report", target_id: "Q2-DONOR", transformation: "report package", lineage_json: {}, created_at: nowIso },
];

export const previewAuditEvents: GovernanceAuditEvent[] = [
  {
    action: "Form published",
    device: "Chrome / macOS",
    id: "audit-form-published",
    ip_address: "102.89.14.22",
    module: "Forms",
    new_value: "Version 3 published",
    old_value: "Version 3 draft",
    organization: "Atlas Demo",
    reason: "Baseline field work launch",
    severity: "Medium",
    timestamp: nowIso,
    user: "M&E Manager",
  },
  {
    action: "Export requested",
    device: "Edge / Windows",
    id: "audit-export-request",
    ip_address: "41.202.13.9",
    module: "Reports",
    new_value: "Non-anonymized export queued",
    old_value: "No export",
    organization: "Atlas Demo",
    reason: "Donor reporting package",
    severity: "Critical",
    timestamp: nowIso,
    user: "Data Manager",
  },
  {
    action: "Retention rule updated",
    device: "Firefox / Linux",
    id: "audit-retention-update",
    ip_address: "196.24.7.18",
    module: "Governance",
    new_value: "10 years",
    old_value: "7 years",
    organization: "Atlas Demo",
    reason: "New donor compliance requirement",
    severity: "High",
    timestamp: nowIso,
    user: "Compliance Officer",
  },
];

export const previewVersions: DataVersionRead[] = [
  { id: "version-1", entity_type: "policy", entity_id: "policy-privacy", version_number: 3, change_type: "policy_update", field_changes_json: { masking: "enabled" }, rollback_available: true, created_at: nowIso },
  { id: "version-2", entity_type: "retention_rule", entity_id: "ret-submissions", version_number: 2, change_type: "annual_review", field_changes_json: { retention_years: 10 }, rollback_available: false, created_at: nowIso },
];

export const previewMasterData: MasterDataEntryRead[] = [
  { id: "master-1", category: "classification", code: "restricted", label: "Restricted", status: "active", version: 1, order_index: 0, language: "en", created_at: nowIso },
  { id: "master-2", category: "classification", code: "highly-sensitive", label: "Highly Sensitive", status: "active", version: 1, order_index: 0, language: "en", created_at: nowIso },
];

export const previewApprovals: ApprovalRequest[] = [
  { id: "approval-export", approval_type: "Data Export Approval", stage: "Review", owner: "Governance Lead", sla_hours: 24, age_hours: 18, comments_required: true },
  { id: "approval-form", approval_type: "Form Approval", stage: "Submitted", owner: "M&E Manager", sla_hours: 48, age_hours: 9, comments_required: true },
  { id: "approval-policy", approval_type: "Policy Approval", stage: "Escalated", owner: "Compliance Officer", sla_hours: 72, age_hours: 80, comments_required: true },
];

export const previewComplianceChecks: ComplianceCheck[] = [
  { id: "gdpr-consent", framework: "GDPR", requirement: "Consent and purpose limitation", status: "Partially Compliant", owner: "Privacy Lead", evidence: "Consent register", review_date: nowIso },
  { id: "donor-export", framework: "Donor Policies", requirement: "Approved anonymized exports", status: "Compliant", owner: "Reporting Lead", evidence: "Export audit logs", review_date: nowIso },
  { id: "safeguarding", framework: "Safeguarding Standards", requirement: "Restricted sensitive data", status: "Compliant", owner: "Safeguarding Officer", evidence: "Classification rules", review_date: nowIso },
];

export const previewStewardship: StewardshipAssignment[] = [
  { id: "steward-project", steward: "M&E Manager", asset: "Agricultural Resilience Program", role: "Project Steward", status: "active", responsibilities: "Project data ownership, indicator traceability, approval readiness" },
  { id: "steward-form", steward: "Data Manager", asset: "Farmer Registration Survey Form", role: "Form Steward", status: "active", responsibilities: "Form versions, quality rules, reference bindings, data exports" },
  { id: "steward-location", steward: "GIS Lead", asset: "Administrative boundaries", role: "Location Steward", status: "coverage gap", responsibilities: "Boundary updates, GPS validation, location hierarchy stewardship" },
];

export const previewRisks: GovernanceRisk[] = [
  { id: "risk-consent", name: "Missing participant consent evidence", category: "Privacy Risk", severity: "High", likelihood: "Likely", impact: "Data cannot be used in donor reports", owner: "Privacy Lead", mitigation: "Block approval where consent is missing and assign cleanup queue" },
  { id: "risk-export", name: "Non-anonymized export request", category: "Security Risk", severity: "Critical", likelihood: "Possible", impact: "Sensitive data exposure", owner: "Governance Lead", mitigation: "Require governance approval and field masking before export" },
  { id: "risk-quality", name: "Open high-severity quality rules", category: "Data Quality Risk", severity: "Medium", likelihood: "Likely", impact: "Indicator confidence reduced", owner: "Data Manager", mitigation: "Resolve open quality flags before report package generation" },
];
