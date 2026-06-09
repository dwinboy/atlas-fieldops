"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Eye,
  FileClock,
  GitBranch,
  History,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Stamp,
  UsersRound,
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { DataTable, type TableColumn } from "@/components/DataTable";
import { GovernanceCommandCenter } from "@/components/GovernanceCommandCenter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpHint } from "@/components/ui/help-hint";
import {
  getGovernanceSummary,
  listConsentRecords,
  listDataVersions,
  listExportLogs,
  listGovernancePolicies,
  listLineageEvents,
  listMasterDataEntries,
  listRetentionPolicies,
  listValidationRules,
  type ConsentRecordRead,
  type CurrentPrincipal,
  type DataVersionRead,
  type ExportLogRead,
  type GovernancePolicyRead,
  type GovernanceSummary,
  type LineageEventRead,
  type MasterDataEntryRead,
  type RetentionPolicyRead,
  type ValidationRuleRead,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  governanceSections,
  previewApprovals,
  previewAuditEvents,
  previewComplianceChecks,
  previewConsentRecords,
  previewExports,
  previewLineage,
  previewMasterData,
  previewPolicies,
  previewRetention,
  previewRisks,
  previewRules,
  previewStewardship,
  previewSummary,
  previewVersions,
  type ApprovalRequest,
  type ComplianceCheck,
  type GovernanceAuditEvent,
  type GovernanceRisk,
  type GovernanceSection,
  type StewardshipAssignment,
} from "@/modules/governance/data";
import {
  computeGovernanceHealth,
  formatDate,
  severityTone,
  toCsv,
  toneFromHealth,
} from "@/modules/governance/utils";

type GovernanceModuleProps = {
  principal?: CurrentPrincipal | null;
  token: string | null;
};

function isPreview(token: string | null): boolean {
  return !token || token === "preview-token";
}

function downloadCsv(filename: string, rows: Record<string, string | number | boolean | null | undefined>[]): void {
  const csv = toCsv(rows);
  if (!csv) return;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function MetricCard({
  icon,
  label,
  tone = "neutral",
  value,
}: {
  icon: ReactNode;
  label: string;
  tone?: "danger" | "neutral" | "success" | "warning";
  value: string | number;
}) {
  return (
    <article className="surface-premium rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
        </div>
        <span
          className={cn(
            "rounded-xl border p-2",
            tone === "danger" && "border-danger/20 bg-danger/10 text-danger",
            tone === "success" && "border-success/20 bg-success/10 text-success",
            tone === "warning" && "border-warning/20 bg-warning/10 text-warning",
            tone === "neutral" && "border-border bg-muted text-muted-foreground",
          )}
        >
          {icon}
        </span>
      </div>
    </article>
  );
}

function SectionPanel({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <section className="rounded-xl border bg-panel p-3.5 shadow-line">
      <div className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">{title}</h2>
          <HelpHint label={`About ${title}`} title={title}>{description}</HelpHint>
        </div>
      </div>
      {children}
    </section>
  );
}

function buildAuditEvents({
  exports,
  lineage,
  policies,
  retention,
  versions,
}: {
  exports: ExportLogRead[];
  lineage: LineageEventRead[];
  policies: GovernancePolicyRead[];
  retention: RetentionPolicyRead[];
  versions: DataVersionRead[];
}): GovernanceAuditEvent[] {
  const generated: GovernanceAuditEvent[] = [
    ...policies.map((policy) => ({
      action: `Policy ${policy.lifecycle_state}`,
      device: "Web workspace",
      id: `policy-${policy.id}`,
      ip_address: "Captured server-side",
      module: "Governance",
      new_value: `${policy.name} v${policy.version}`,
      old_value: "Previous policy version",
      organization: "Current organization",
      reason: "Policy lifecycle change",
      severity: policy.enforcement_level === "blocking" ? "High" as const : "Medium" as const,
      timestamp: policy.created_at,
      user: "Governance user",
    })),
    ...retention.map((rule) => ({
      action: "Retention rule active",
      device: "Web workspace",
      id: `retention-${rule.id}`,
      ip_address: "Captured server-side",
      module: "Governance",
      new_value: `${rule.retention_years} years`,
      old_value: "Not available",
      organization: "Current organization",
      reason: rule.legal_hold ? "Legal hold enabled" : "Retention compliance",
      severity: rule.legal_hold ? "High" as const : "Low" as const,
      timestamp: rule.created_at,
      user: "System",
    })),
    ...exports.map((event) => ({
      action: "Export governance event",
      device: "Web workspace",
      id: `export-${event.id}`,
      ip_address: "Captured server-side",
      module: "Reports",
      new_value: `${event.dataset_type} ${event.export_format}`,
      old_value: "No export",
      organization: "Current organization",
      reason: event.anonymized ? "Anonymized export" : "Approval required",
      severity: !event.anonymized || event.risk_score >= 0.7 ? "Critical" as const : "Medium" as const,
      timestamp: event.created_at,
      user: "Data exporter",
    })),
    ...lineage.map((event) => ({
      action: "Lineage recorded",
      device: "System processor",
      id: `lineage-${event.id}`,
      ip_address: "Internal",
      module: "Analytics",
      new_value: `${event.target_type}:${event.target_id}`,
      old_value: `${event.source_type}:${event.source_id}`,
      organization: "Current organization",
      reason: event.transformation,
      severity: "Low" as const,
      timestamp: event.created_at,
      user: "System",
    })),
    ...versions.map((version) => ({
      action: "Version change",
      device: "Web workspace",
      id: `version-${version.id}`,
      ip_address: "Captured server-side",
      module: "Governance",
      new_value: `${version.entity_type} v${version.version_number}`,
      old_value: version.change_type,
      organization: "Current organization",
      reason: version.rollback_available ? "Rollback available" : "Recorded immutable change",
      severity: "Medium" as const,
      timestamp: version.created_at,
      user: "Governance user",
    })),
  ];

  return generated;
}

export function GovernanceModule({ principal, token }: GovernanceModuleProps) {
  const [activeSection, setActiveSection] = useState<GovernanceSection>("dashboard");
  const [workbenchOpen, setWorkbenchOpen] = useState(false);
  const preview = isPreview(token);
  const enabled = Boolean(token && !preview);
  const canManageGovernance = Boolean(
    principal?.platform_admin ||
      principal?.permissions?.some((permission) =>
        ["governance.manage", "workflow.manage", "audit.read"].includes(permission),
      ),
  );

  const summaryQuery = useQuery({ queryKey: ["governance", "summary", token], queryFn: () => getGovernanceSummary(token ?? ""), enabled });
  const policiesQuery = useQuery({ queryKey: ["governance", "policies", token], queryFn: () => listGovernancePolicies(token ?? ""), enabled });
  const retentionQuery = useQuery({ queryKey: ["governance", "retention", token], queryFn: () => listRetentionPolicies(token ?? ""), enabled });
  const rulesQuery = useQuery({ queryKey: ["governance", "rules", token], queryFn: () => listValidationRules(token ?? ""), enabled });
  const versionsQuery = useQuery({ queryKey: ["governance", "versions", token], queryFn: () => listDataVersions(token ?? ""), enabled });
  const lineageQuery = useQuery({ queryKey: ["governance", "lineage", token], queryFn: () => listLineageEvents(token ?? ""), enabled });
  const exportsQuery = useQuery({ queryKey: ["governance", "exports", token], queryFn: () => listExportLogs(token ?? ""), enabled });
  const consentQuery = useQuery({ queryKey: ["governance", "consent", token], queryFn: () => listConsentRecords(token ?? ""), enabled });
  const masterDataQuery = useQuery({ queryKey: ["governance", "master-data", token], queryFn: () => listMasterDataEntries(token ?? ""), enabled });

  const summary: GovernanceSummary = preview
    ? previewSummary
    : (summaryQuery.data ?? {
        audit_events: 0,
        attention_items: [],
        compliance_score: 100,
        consent_records: 0,
        export_events: 0,
        lineage_events: 0,
        open_quality_signals: 0,
        policies: 0,
        retention_policies: 0,
        validation_rules: 0,
      });
  const policies = useMemo(() => (preview ? previewPolicies : (policiesQuery.data ?? [])), [policiesQuery.data, preview]);
  const retentionRules = useMemo(() => (preview ? previewRetention : (retentionQuery.data ?? [])), [preview, retentionQuery.data]);
  const validationRules = useMemo(() => (preview ? previewRules : (rulesQuery.data ?? [])), [preview, rulesQuery.data]);
  const versions = useMemo(() => (preview ? previewVersions : (versionsQuery.data ?? [])), [preview, versionsQuery.data]);
  const lineage = useMemo(() => (preview ? previewLineage : (lineageQuery.data ?? [])), [lineageQuery.data, preview]);
  const exports = useMemo(() => (preview ? previewExports : (exportsQuery.data ?? [])), [exportsQuery.data, preview]);
  const consentRecords = useMemo(() => (preview ? previewConsentRecords : (consentQuery.data ?? [])), [consentQuery.data, preview]);
  const masterData = useMemo(() => (preview ? previewMasterData : (masterDataQuery.data ?? [])), [masterDataQuery.data, preview]);
  const approvals = useMemo(() => (preview ? previewApprovals : []), [preview]);
  const complianceChecks = useMemo(() => (preview ? previewComplianceChecks : []), [preview]);
  const stewardship = useMemo(() => (preview ? previewStewardship : []), [preview]);
  const risks = useMemo(() => (preview ? previewRisks : []), [preview]);
  const auditEvents = useMemo(
    () => buildAuditEvents({ exports, lineage, policies, retention: retentionRules, versions }),
    [exports, lineage, policies, retentionRules, versions],
  );
  const health = computeGovernanceHealth({
    approvals,
    consentRecords,
    exports,
    policies,
    retentionRules,
    stewardship,
    summary,
  });
  const consentExceptions = consentRecords.filter((record) =>
    ["expired", "pending", "missing", "revoked"].includes(record.status.toLowerCase()),
  ).length;
  const policyViolations = validationRules.filter((rule) =>
    ["critical", "high"].includes(rule.severity.toLowerCase()),
  ).length;
  const complianceAlerts = complianceChecks.filter((check) => check.status !== "Compliant").length;
  const pendingApprovals = approvals.filter((approval) => !["Approved", "Rejected"].includes(approval.stage)).length;

  const auditColumns: TableColumn<GovernanceAuditEvent>[] = [
    { key: "event", header: "Event", value: (event) => `${event.action} ${event.module}`, render: (event) => <div><p className="font-medium">{event.action}</p><p className="text-xs text-muted-foreground">{event.id}</p></div> },
    { key: "module", header: "Module", value: (event) => event.module, render: (event) => <Badge tone="governance">{event.module}</Badge> },
    { key: "user", header: "User", value: (event) => event.user, render: (event) => event.user },
    { key: "severity", header: "Severity", value: (event) => event.severity, render: (event) => <Badge tone={severityTone(event.severity)}>{event.severity}</Badge> },
    { key: "time", header: "Timestamp", value: (event) => event.timestamp, render: (event) => formatDate(event.timestamp) },
    { key: "reason", header: "Reason", value: (event) => event.reason, render: (event) => event.reason },
  ];

  const policyColumns: TableColumn<GovernancePolicyRead>[] = [
    { key: "name", header: "Policy", value: (policy) => `${policy.name} ${policy.policy_type}`, render: (policy) => <div><p className="font-medium">{policy.name}</p><p className="text-xs text-muted-foreground">{policy.policy_type}</p></div> },
    { key: "state", header: "Status", value: (policy) => policy.lifecycle_state, render: (policy) => <Badge tone={severityTone(policy.lifecycle_state)}>{policy.lifecycle_state}</Badge> },
    { key: "version", header: "Version", value: (policy) => String(policy.version), render: (policy) => `v${policy.version}` },
    { key: "enforcement", header: "Enforcement", value: (policy) => policy.enforcement_level, render: (policy) => <Badge tone={policy.enforcement_level === "blocking" ? "danger" : "warning"}>{policy.enforcement_level}</Badge> },
    { key: "approved", header: "Approved", value: (policy) => policy.approved_at ?? "", render: (policy) => formatDate(policy.approved_at) },
  ];

  const approvalColumns: TableColumn<ApprovalRequest>[] = [
    { key: "type", header: "Approval", value: (approval) => approval.approval_type, render: (approval) => <div><p className="font-medium">{approval.approval_type}</p><p className="text-xs text-muted-foreground">{approval.owner}</p></div> },
    { key: "stage", header: "Stage", value: (approval) => approval.stage, render: (approval) => <Badge tone={severityTone(approval.stage)}>{approval.stage}</Badge> },
    { key: "sla", header: "SLA", value: (approval) => String(approval.sla_hours), render: (approval) => `${approval.age_hours}/${approval.sla_hours}h` },
    { key: "comments", header: "Comments", value: (approval) => String(approval.comments_required), render: (approval) => approval.comments_required ? "Required" : "Optional" },
    { key: "actions", header: "Actions", align: "right", render: () => <div className="flex justify-end gap-2"><Button disabled={!canManageGovernance} size="sm" variant="secondary">Review</Button><Button disabled={!canManageGovernance} size="sm" variant="ghost">Escalate</Button></div> },
  ];

  const retentionColumns: TableColumn<RetentionPolicyRead>[] = [
    { key: "record", header: "Record Type", value: (rule) => rule.record_type, render: (rule) => <p className="font-medium">{rule.record_type}</p> },
    { key: "period", header: "Retention", value: (rule) => String(rule.retention_years), render: (rule) => `${rule.retention_years} years` },
    { key: "archive", header: "Archive After", value: (rule) => String(rule.archive_after_days), render: (rule) => `${rule.archive_after_days} days` },
    { key: "hold", header: "Legal Hold", value: (rule) => String(rule.legal_hold), render: (rule) => <Badge tone={rule.legal_hold ? "warning" : "success"}>{rule.legal_hold ? "Enabled" : "No hold"}</Badge> },
    { key: "action", header: "Lifecycle Action", value: (rule) => String(rule.purge_allowed), render: (rule) => rule.purge_allowed ? "Delete allowed" : rule.anonymize_on_export ? "Anonymize exports" : "Archive only" },
  ];

  const consentColumns: TableColumn<ConsentRecordRead>[] = [
    { key: "subject", header: "Subject", value: (record) => record.subject_identifier, render: (record) => <div><p className="font-medium">{record.subject_identifier}</p><p className="text-xs text-muted-foreground">{record.beneficiary_id ?? "No beneficiary link"}</p></div> },
    { key: "type", header: "Type", value: (record) => record.consent_type, render: (record) => record.consent_type },
    { key: "status", header: "Status", value: (record) => record.status, render: (record) => <Badge tone={severityTone(record.status)}>{record.status}</Badge> },
    { key: "captured", header: "Captured", value: (record) => record.captured_at ?? "", render: (record) => formatDate(record.captured_at) },
  ];

  const complianceColumns: TableColumn<ComplianceCheck>[] = [
    { key: "framework", header: "Framework", value: (check) => check.framework, render: (check) => <p className="font-medium">{check.framework}</p> },
    { key: "requirement", header: "Requirement", value: (check) => check.requirement, render: (check) => check.requirement },
    { key: "status", header: "Status", value: (check) => check.status, render: (check) => <Badge tone={severityTone(check.status)}>{check.status}</Badge> },
    { key: "owner", header: "Owner", value: (check) => check.owner, render: (check) => check.owner },
    { key: "evidence", header: "Evidence", value: (check) => check.evidence, render: (check) => check.evidence },
  ];

  const stewardshipColumns: TableColumn<StewardshipAssignment>[] = [
    { key: "asset", header: "Asset", value: (assignment) => `${assignment.asset} ${assignment.role}`, render: (assignment) => <div><p className="font-medium">{assignment.asset}</p><p className="text-xs text-muted-foreground">{assignment.role}</p></div> },
    { key: "steward", header: "Steward", value: (assignment) => assignment.steward, render: (assignment) => assignment.steward },
    { key: "status", header: "Status", value: (assignment) => assignment.status, render: (assignment) => <Badge tone={severityTone(assignment.status)}>{assignment.status}</Badge> },
    { key: "responsibilities", header: "Responsibilities", value: (assignment) => assignment.responsibilities, render: (assignment) => assignment.responsibilities },
  ];

  const riskColumns: TableColumn<GovernanceRisk>[] = [
    { key: "risk", header: "Risk", value: (risk) => `${risk.name} ${risk.category}`, render: (risk) => <div><p className="font-medium">{risk.name}</p><p className="text-xs text-muted-foreground">{risk.category}</p></div> },
    { key: "severity", header: "Severity", value: (risk) => risk.severity, render: (risk) => <Badge tone={severityTone(risk.severity)}>{risk.severity}</Badge> },
    { key: "owner", header: "Owner", value: (risk) => risk.owner, render: (risk) => risk.owner },
    { key: "mitigation", header: "Mitigation", value: (risk) => risk.mitigation, render: (risk) => risk.mitigation },
  ];

  if (workbenchOpen) {
    return (
      <section className="space-y-3">
        <div className="rounded-xl border bg-panel p-3.5 shadow-line">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <Badge tone="governance">Governance workbench</Badge>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">Policy and control operations</h1>
                <HelpHint label="About policy and control operations" title="Policy and control operations">
                  Use this focused workbench for creating policies, retention controls, validation rules, export governance, and master data controls.
                </HelpHint>
              </div>
            </div>
            <Button onClick={() => setWorkbenchOpen(false)} variant="secondary">
              <Eye aria-hidden="true" />
              Return to overview
            </Button>
          </div>
        </div>
        <GovernanceCommandCenter token={token ?? "preview-token"} />
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="rounded-xl border bg-panel p-3.5 shadow-line">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="governance">GOVERNANCE</Badge>
              <Badge tone={toneFromHealth(health.category)}>
                {health.score}% {health.category}
              </Badge>
              {preview ? <Badge tone="neutral">Preview data</Badge> : null}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">Governance</h1>
              <HelpHint label="About Governance" title="Governance">
                Centralize auditability, policies, approvals, retention, consent, compliance, data stewardship, risk, and export controls without mixing them into project or form operations.
              </HelpHint>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setWorkbenchOpen(true)} variant="primary">
              <ShieldCheck aria-hidden="true" />
              Open workbench
            </Button>
            <Button
              onClick={() =>
                downloadCsv("atlas-governance-audit.csv", auditEvents.map((event) => ({
                  action: event.action,
                  module: event.module,
                  user: event.user,
                  timestamp: event.timestamp,
                  severity: event.severity,
                  reason: event.reason,
                })))
              }
              variant="secondary"
            >
              <Download aria-hidden="true" />
              Export audit
            </Button>
          </div>
        </div>
        <div className="mt-3 flex gap-1.5 overflow-x-auto product-scrollbar">
          {governanceSections.map((section) => (
            <button
              className={cn(
                "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition",
                activeSection === section.id ? "border-primary bg-primary text-primary-foreground" : "bg-panel hover:bg-muted",
              )}
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              type="button"
            >
              {section.label}
            </button>
          ))}
        </div>
      </div>

      {activeSection === "dashboard" ? (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={<ShieldAlert aria-hidden="true" />} label="Open Governance Issues" tone={summary.attention_items.length ? "warning" : "success"} value={summary.attention_items.length} />
            <MetricCard icon={<History aria-hidden="true" />} label="Audit Events Today" tone="success" value={summary.audit_events} />
            <MetricCard icon={<AlertTriangle aria-hidden="true" />} label="Policy Violations" tone={policyViolations ? "danger" : "success"} value={policyViolations} />
            <MetricCard icon={<Scale aria-hidden="true" />} label="Compliance Alerts" tone={complianceAlerts ? "warning" : "success"} value={complianceAlerts} />
            <MetricCard icon={<ClipboardCheck aria-hidden="true" />} label="Pending Approvals" tone={pendingApprovals ? "warning" : "success"} value={pendingApprovals} />
            <MetricCard icon={<Archive aria-hidden="true" />} label="Active Retention Rules" tone="success" value={retentionRules.length} />
            <MetricCard icon={<ShieldCheck aria-hidden="true" />} label="Consent Exceptions" tone={consentExceptions ? "danger" : "success"} value={consentExceptions} />
            <MetricCard icon={<UsersRound aria-hidden="true" />} label="Stewardship Assignments" tone="success" value={stewardship.length} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <SectionPanel description="The governance health engine combines audit coverage, compliance, consent, stewardship, policy compliance, approval timeliness, and retention readiness." title="Governance health score">
              <div className="grid gap-4 lg:grid-cols-[180px_1fr]">
                <div className="rounded-2xl border bg-muted/30 p-5 text-center">
                  <p className="text-5xl font-semibold tracking-tight">{health.score}</p>
                  <Badge className="mt-3" tone={toneFromHealth(health.category)}>{health.category}</Badge>
                </div>
                <div className="space-y-3">
                  {Object.entries(health.components).map(([key, value]) => (
                    <div key={key}>
                      <div className="mb-1 flex items-center justify-between text-xs font-medium">
                        <span className="capitalize text-muted-foreground">{key.replace(/([A-Z])/g, " $1")}</span>
                        <span>{value}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </SectionPanel>
            <SectionPanel description="Items that need governance attention before data, exports, or reports can be trusted." title="Priority alerts">
              <div className="space-y-3">
                {summary.attention_items.map((item) => (
                  <div className="flex items-start gap-3 rounded-xl border bg-muted/20 p-3" key={item}>
                    <AlertTriangle aria-hidden="true" className="mt-0.5 text-warning" size={16} />
                    <p className="text-sm leading-6">{item}</p>
                  </div>
                ))}
              </div>
            </SectionPanel>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <DataTable columns={approvalColumns} emptyLabel="No governance approvals are waiting." rows={approvals} searchLabel="Search approvals" title="Approval queue" />
            <DataTable columns={riskColumns} emptyLabel="No governance risks are open." rows={risks} searchLabel="Search risks" title="Risk indicators" />
          </div>
        </>
      ) : null}

      {activeSection === "audit-trail" ? (
        <DataTable columns={auditColumns} emptyLabel="No audit events have been recorded." rows={auditEvents} searchLabel="Search audit events" title="Central audit trail" />
      ) : null}

      {activeSection === "policies" ? (
        <DataTable columns={policyColumns} emptyLabel="No governance policies are configured." rows={policies} searchLabel="Search policies" title="Policy management" />
      ) : null}

      {activeSection === "approvals" ? (
        <DataTable columns={approvalColumns} emptyLabel="No approval requests are waiting." rows={approvals} searchLabel="Search approvals" title="Governance approvals" />
      ) : null}

      {activeSection === "retention-rules" ? (
        <DataTable columns={retentionColumns} emptyLabel="No retention rules are configured." rows={retentionRules} searchLabel="Search retention rules" title="Retention rules" />
      ) : null}

      {activeSection === "consent-management" ? (
        <div className="grid gap-4 xl:grid-cols-[0.75fr_1.25fr]">
          <SectionPanel description="Consent coverage is monitored before submissions can be approved or exported." title="Consent compliance">
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricCard icon={<CheckCircle2 aria-hidden="true" />} label="Consent Records" tone="success" value={consentRecords.length} />
              <MetricCard icon={<AlertTriangle aria-hidden="true" />} label="Exceptions" tone={consentExceptions ? "danger" : "success"} value={consentExceptions} />
            </div>
          </SectionPanel>
          <DataTable columns={consentColumns} emptyLabel="No consent records are available." rows={consentRecords} searchLabel="Search consent records" title="Consent register" />
        </div>
      ) : null}

      {activeSection === "compliance" ? (
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <DataTable columns={complianceColumns} emptyLabel="No compliance checks are configured." rows={complianceChecks} searchLabel="Search compliance" title="Compliance tracking" />
          <DataTable columns={riskColumns} emptyLabel="No governance risks are open." rows={risks} searchLabel="Search risks" title="Risk management" />
        </div>
      ) : null}

      {activeSection === "data-stewardship" ? (
        <div className="space-y-4">
          <DataTable columns={stewardshipColumns} emptyLabel="No stewardship assignments exist." rows={stewardship} searchLabel="Search stewardship" title="Data stewardship assignments" />
          <div className="grid gap-4 xl:grid-cols-3">
            <SectionPanel description="Classification levels define masking, approval, access, and encryption controls for sensitive assets." title="Data classification">
              <div className="flex flex-wrap gap-2">
                {masterData.map((entry: MasterDataEntryRead) => (
                  <Badge key={entry.id} tone={entry.code.includes("sensitive") || entry.code.includes("restricted") ? "danger" : "neutral"}>
                    {entry.label}
                  </Badge>
                ))}
              </div>
            </SectionPanel>
            <SectionPanel description="Lineage events prove how submissions become indicators, reports, and exports." title="Data lineage">
              <div className="space-y-3">
                {lineage.slice(0, 3).map((event) => (
                  <div className="rounded-xl border bg-muted/20 p-3" key={event.id}>
                    <div className="flex items-center gap-2">
                      <GitBranch aria-hidden="true" size={15} />
                      <p className="text-sm font-medium">{event.source_type} to {event.target_type}</p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{event.transformation}</p>
                  </div>
                ))}
              </div>
            </SectionPanel>
            <SectionPanel description="Version history preserves rollback awareness and immutable change tracking." title="Change management">
              <div className="space-y-3">
                {versions.slice(0, 3).map((version) => (
                  <div className="rounded-xl border bg-muted/20 p-3" key={version.id}>
                    <div className="flex items-center gap-2">
                      <FileClock aria-hidden="true" size={15} />
                      <p className="text-sm font-medium">{version.entity_type} v{version.version_number}</p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{version.change_type}</p>
                  </div>
                ))}
              </div>
            </SectionPanel>
          </div>
        </div>
      ) : null}

      <section className="rounded-xl border bg-panel p-3.5 shadow-line">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Stamp aria-hidden="true" className="text-primary" size={17} />
              <h2 className="text-sm font-semibold">Governance boundaries</h2>
            </div>
            <div className="mt-1">
              <HelpHint label="About governance boundaries" title="Governance boundaries">
                Governance owns audit, policies, compliance, retention, consent, stewardship, risk, and export controls. User accounts stay in Users & Teams, system configuration stays in Administration, and form-specific controls stay in Forms.
              </HelpHint>
            </div>
          </div>
          <Badge tone="governance">{governanceSections.find((section) => section.id === activeSection)?.route}</Badge>
        </div>
      </section>
    </section>
  );
}
