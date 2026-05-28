"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, FileCheck2, Fingerprint, GitBranch, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { DataTable, type TableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import {
  createGovernancePolicy,
  createRetentionPolicy,
  createValidationRule,
  getGovernanceSummary,
  governExport,
  listDataVersions,
  listExportLogs,
  listGovernancePolicies,
  listLineageEvents,
  listMasterDataEntries,
  listRetentionPolicies,
  listValidationRules,
  type ExportLogRead,
  type GovernancePolicyRead,
  type LineageEventRead,
  type RetentionPolicyRead,
  type ValidationRuleRead
} from "@/lib/api";
import { useWorkspaceStore } from "@/stores/workspace";

type GovernanceCommandCenterProps = {
  token: string | null;
};

export function GovernanceCommandCenter({ token }: GovernanceCommandCenterProps) {
  const [policyName, setPolicyName] = useState("Official reporting governance");
  const [retentionRecordType, setRetentionRecordType] = useState("submissions");
  const [validationRuleCode, setValidationRuleCode] = useState("gps-required");
  const [exportDataset, setExportDataset] = useState("beneficiaries");
  const pushToast = useWorkspaceStore((state) => state.pushToast);

  const summaryQuery = useQuery({
    queryKey: ["governance-summary", token],
    queryFn: () => getGovernanceSummary(token ?? ""),
    enabled: Boolean(token)
  });
  const policiesQuery = useQuery({
    queryKey: ["governance-policies", token],
    queryFn: () => listGovernancePolicies(token ?? ""),
    enabled: Boolean(token)
  });
  const retentionQuery = useQuery({
    queryKey: ["retention-policies", token],
    queryFn: () => listRetentionPolicies(token ?? ""),
    enabled: Boolean(token)
  });
  const rulesQuery = useQuery({
    queryKey: ["validation-rules", token],
    queryFn: () => listValidationRules(token ?? ""),
    enabled: Boolean(token)
  });
  const lineageQuery = useQuery({
    queryKey: ["lineage-events", token],
    queryFn: () => listLineageEvents(token ?? ""),
    enabled: Boolean(token)
  });
  const exportsQuery = useQuery({
    queryKey: ["export-logs", token],
    queryFn: () => listExportLogs(token ?? ""),
    enabled: Boolean(token)
  });
  const versionsQuery = useQuery({
    queryKey: ["data-versions", token],
    queryFn: () => listDataVersions(token ?? ""),
    enabled: Boolean(token)
  });
  const masterDataQuery = useQuery({
    queryKey: ["master-data", token],
    queryFn: () => listMasterDataEntries(token ?? ""),
    enabled: Boolean(token)
  });

  const createPolicyMutation = useMutation({
    mutationFn: () =>
      createGovernancePolicy(token ?? "", {
        name: policyName,
        policy_type: "reporting",
        lifecycle_state: "approved",
        enforcement_level: "blocking",
        rules_json: { approved_data_only: true, requires_lineage: true }
      }),
    onSuccess: async () => {
      pushToast({ title: "Governance policy created", description: "Official reporting now requires approved, traceable data.", tone: "success" });
      await Promise.all([policiesQuery.refetch(), summaryQuery.refetch()]);
    }
  });

  const createRetentionMutation = useMutation({
    mutationFn: () =>
      createRetentionPolicy(token ?? "", {
        record_type: retentionRecordType,
        retention_years: 10,
        archive_after_days: 365,
        legal_hold: false,
        purge_allowed: false,
        anonymize_on_export: true
      }),
    onSuccess: async () => {
      pushToast({ title: "Retention policy created", description: "Records now have archive, retention, and anonymization controls.", tone: "success" });
      await Promise.all([retentionQuery.refetch(), summaryQuery.refetch()]);
    }
  });

  const createRuleMutation = useMutation({
    mutationFn: () =>
      createValidationRule(token ?? "", {
        rule_code: validationRuleCode,
        name: "Require GPS evidence for field submissions",
        target_entity: "submissions",
        severity: "high",
        expression: "latitude != null && longitude != null && accuracy <= 50"
      }),
    onSuccess: async () => {
      pushToast({ title: "Validation rule created", description: "New data quality rule is active for governed submissions.", tone: "success" });
      await Promise.all([rulesQuery.refetch(), summaryQuery.refetch()]);
    }
  });

  const governExportMutation = useMutation({
    mutationFn: () =>
      governExport(token ?? "", {
        dataset_type: exportDataset,
        export_format: "xlsx",
        anonymized: true,
        record_count: 1200,
        filters_json: { approved_only: true }
      }),
    onSuccess: async (log) => {
      pushToast({ title: "Export governed", description: `Export status: ${log.status}. Risk score: ${log.risk_score}`, tone: log.status === "approved" ? "success" : "warning" });
      await Promise.all([exportsQuery.refetch(), summaryQuery.refetch()]);
    }
  });

  const policyColumns: TableColumn<GovernancePolicyRead>[] = [
    { key: "name", header: "Policy", value: (row) => row.name, render: (row) => <div><p className="font-medium">{row.name}</p><p className="text-xs text-muted-foreground">{row.policy_type}</p></div> },
    { key: "state", header: "State", value: (row) => row.lifecycle_state, render: (row) => <Badge tone={row.lifecycle_state === "approved" ? "success" : "neutral"}>{row.lifecycle_state}</Badge> },
    { key: "level", header: "Enforcement", value: (row) => row.enforcement_level, render: (row) => row.enforcement_level }
  ];

  const retentionColumns: TableColumn<RetentionPolicyRead>[] = [
    { key: "record_type", header: "Record type", value: (row) => row.record_type, render: (row) => row.record_type },
    { key: "years", header: "Retention", value: (row) => String(row.retention_years), render: (row) => `${row.retention_years} years` },
    { key: "export", header: "Export privacy", value: (row) => String(row.anonymize_on_export), render: (row) => <Badge tone={row.anonymize_on_export ? "success" : "warning"}>{row.anonymize_on_export ? "Anonymize" : "Raw allowed"}</Badge> }
  ];

  const ruleColumns: TableColumn<ValidationRuleRead>[] = [
    { key: "rule", header: "Rule", value: (row) => row.name, render: (row) => <div><p className="font-medium">{row.name}</p><p className="text-xs text-muted-foreground">{row.rule_code}</p></div> },
    { key: "target", header: "Target", value: (row) => row.target_entity, render: (row) => row.target_entity },
    { key: "severity", header: "Severity", value: (row) => row.severity, render: (row) => <Badge tone={row.severity === "high" || row.severity === "critical" ? "warning" : "neutral"}>{row.severity}</Badge> }
  ];

  const exportColumns: TableColumn<ExportLogRead>[] = [
    { key: "dataset", header: "Dataset", value: (row) => row.dataset_type, render: (row) => row.dataset_type },
    { key: "status", header: "Status", value: (row) => row.status, render: (row) => <Badge tone={row.status === "approved" ? "success" : "warning"}>{row.status}</Badge> },
    { key: "risk", header: "Risk", value: (row) => String(row.risk_score), render: (row) => row.risk_score.toFixed(2) }
  ];

  const lineageColumns: TableColumn<LineageEventRead>[] = [
    { key: "source", header: "Source", value: (row) => `${row.source_type}:${row.source_id}`, render: (row) => <span>{row.source_type} to {row.target_type}</span> },
    { key: "target", header: "Target", value: (row) => row.target_id, render: (row) => row.target_id },
    { key: "transformation", header: "Transformation", value: (row) => row.transformation, render: (row) => row.transformation }
  ];

  const summary = summaryQuery.data;
  const cards = [
    ["Compliance score", `${summary?.compliance_score ?? 0}%`, ShieldCheck],
    ["Audit events", `${summary?.audit_events ?? 0}`, Fingerprint],
    ["Quality signals", `${summary?.open_quality_signals ?? 0}`, AlertTriangle],
    ["Lineage events", `${summary?.lineage_events ?? 0}`, GitBranch]
  ] as const;

  return (
    <section aria-labelledby="governance-title" className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Governance</p>
          <h1 id="governance-title" className="mt-2 text-2xl font-semibold tracking-tight">Governance command center</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
            Manage auditability, retention, validation, lineage, consent, export controls, and operational data integrity from one governed workspace.
          </p>
        </div>
        <Badge tone={summary?.attention_items.length ? "warning" : "success"}>{summary?.attention_items.length ? "Needs review" : "Governed"}</Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {cards.map(([label, value, Icon]) => (
          <div className="surface-premium rounded-2xl p-4" key={label}>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{label}</p>
              <Icon aria-hidden="true" className="text-primary" size={17} />
            </div>
            <p className="mt-3 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      {summary?.attention_items.length ? (
        <div className="rounded-2xl border border-warning/30 bg-warning/10 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle aria-hidden="true" size={17} />
            <h2 className="text-sm font-semibold">Governance attention</h2>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {summary.attention_items.map((item) => <p className="rounded-lg bg-background/70 p-3 text-sm" key={item}>{item}</p>)}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-4">
        <form className="rounded-2xl border bg-panel p-4" onSubmit={(event) => { event.preventDefault(); createPolicyMutation.mutate(); }}>
          <h2 className="text-sm font-semibold">Policy</h2>
          <Input className="mt-3" value={policyName} onChange={(event) => setPolicyName(event.target.value)} />
          <Button className="mt-4 w-full" disabled={createPolicyMutation.isPending} type="submit" variant="primary"><FileCheck2 aria-hidden="true" /> Create policy</Button>
        </form>
        <form className="rounded-2xl border bg-panel p-4" onSubmit={(event) => { event.preventDefault(); createRetentionMutation.mutate(); }}>
          <h2 className="text-sm font-semibold">Retention</h2>
          <Select className="mt-3" value={retentionRecordType} onChange={(event) => setRetentionRecordType(event.target.value)}>
            {["submissions", "beneficiaries", "reports", "media", "audit_logs"].map((type) => <option key={type} value={type}>{type}</option>)}
          </Select>
          <Button className="mt-4 w-full" disabled={createRetentionMutation.isPending} type="submit" variant="primary">Set retention</Button>
        </form>
        <form className="rounded-2xl border bg-panel p-4" onSubmit={(event) => { event.preventDefault(); createRuleMutation.mutate(); }}>
          <h2 className="text-sm font-semibold">Validation</h2>
          <Input className="mt-3" value={validationRuleCode} onChange={(event) => setValidationRuleCode(event.target.value)} />
          <Button className="mt-4 w-full" disabled={createRuleMutation.isPending} type="submit" variant="primary">Add rule</Button>
        </form>
        <form className="rounded-2xl border bg-panel p-4" onSubmit={(event) => { event.preventDefault(); governExportMutation.mutate(); }}>
          <h2 className="text-sm font-semibold">Export control</h2>
          <Select className="mt-3" value={exportDataset} onChange={(event) => setExportDataset(event.target.value)}>
            {["beneficiaries", "submissions", "indicators", "reports"].map((type) => <option key={type} value={type}>{type}</option>)}
          </Select>
          <Button className="mt-4 w-full" disabled={governExportMutation.isPending} type="submit" variant="primary">Govern export</Button>
        </form>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <DataTable columns={policyColumns} emptyLabel="No governance policies yet" rows={policiesQuery.data ?? []} searchLabel="Search policies" title="Governance policies" />
        <DataTable columns={retentionColumns} emptyLabel="No retention policies yet" rows={retentionQuery.data ?? []} searchLabel="Search retention" title="Retention policies" />
        <DataTable columns={ruleColumns} emptyLabel="No validation rules yet" rows={rulesQuery.data ?? []} searchLabel="Search rules" title="Validation rules" />
        <DataTable columns={exportColumns} emptyLabel="No governed exports yet" rows={exportsQuery.data ?? []} searchLabel="Search exports" title="Export governance" />
        <DataTable columns={lineageColumns} emptyLabel="No lineage events yet" rows={lineageQuery.data ?? []} searchLabel="Search lineage" title="Lineage tracking" />
        <div className="surface-premium rounded-2xl p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 aria-hidden="true" size={17} />
            <h2 className="text-sm font-semibold">Integrity coverage</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border bg-background/70 p-3"><p className="text-xs text-muted-foreground">Data versions</p><p className="mt-2 text-xl font-semibold">{versionsQuery.data?.length ?? 0}</p></div>
            <div className="rounded-xl border bg-background/70 p-3"><p className="text-xs text-muted-foreground">Consent records</p><p className="mt-2 text-xl font-semibold">{summary?.consent_records ?? 0}</p></div>
            <div className="rounded-xl border bg-background/70 p-3"><p className="text-xs text-muted-foreground">Master data</p><p className="mt-2 text-xl font-semibold">{masterDataQuery.data?.length ?? 0}</p></div>
          </div>
        </div>
      </div>
    </section>
  );
}
