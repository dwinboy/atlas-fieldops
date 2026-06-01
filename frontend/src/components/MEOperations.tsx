"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  Bell,
  Boxes,
  CheckCircle2,
  Columns3,
  Download,
  FileText,
  FileSpreadsheet,
  MapPin,
  MessageCircle,
  Plus,
  RadioTower,
  RefreshCw,
  Save,
  Smartphone,
  WalletCards,
  UploadCloud,
  UsersRound
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { DataTable, type TableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/status-dot";
import { Input, Select } from "@/components/ui/input";
import {
  applyImportJob,
  createExportJob,
  listBeneficiaries,
  listCases,
  listImportJobs,
  listImportRows,
  listIndicators,
  listMediaEvidence,
  listPrograms,
  listPublicCollectionLinks,
  listReports,
  updateImportRow,
  uploadImportFile,
  type BeneficiaryRead,
  type CaseRead,
  type DonorReportRead,
  type ImportJobRead,
  type ImportRowRead,
  type IndicatorRead,
  type MediaEvidenceRead,
  type ProgramRead
} from "@/lib/api";
import {
  beneficiaries,
  beneficiaryProfileConnections,
  cases,
  collectionChannels,
  dataQualitySignals,
  donorReports,
  editableRows,
  enterpriseOperations,
  exportFormatCatalog,
  exportJobs,
  importColumns,
  importJobs,
  importValidationIssues,
  indicators,
  mapCoverage,
  mediaEvidenceItems,
  migrationSources,
  operationalEvents,
  operationalFlow,
  programs,
  sharingPermissionMatrix
} from "@/lib/mockData";
import { useWorkspaceStore } from "@/stores/workspace";

type Beneficiary = (typeof beneficiaries)[number];
type Program = (typeof programs)[number];
type Indicator = (typeof indicators)[number];
type CaseItem = (typeof cases)[number];
type DonorReport = (typeof donorReports)[number];
type ImportJob = (typeof importJobs)[number];
type EditableRow = (typeof editableRows)[number];
type ExportJob = (typeof exportJobs)[number];
type MediaEvidenceItem = (typeof mediaEvidenceItems)[number];
type SharingPermissionRow = (typeof sharingPermissionMatrix)[number];

type DataInteroperabilityCenterProps = {
  token: string | null;
};

type TokenAwareProps = {
  token: string | null;
};

function PageHeader({
  eyebrow,
  title,
  description,
  action
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted" aria-label={`${value}% progress`} role="img">
      <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
    </div>
  );
}

function ConnectedPanel({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border bg-panel p-4 shadow-line">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function ActionButton({
  children,
  description,
  title,
  variant = "primary"
}: {
  children: ReactNode;
  description: string;
  title: string;
  variant?: "primary" | "secondary" | "ghost";
}) {
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const [resultVisible, setResultVisible] = useState(false);

  function handleAction(): void {
    setResultVisible(true);
    pushToast({ title, description, tone: "success" });
  }

  return (
    <div className="flex flex-col items-stretch gap-2 md:items-end">
      <Button onClick={handleAction} type="button" variant={variant}>
        {children}
      </Button>
      {resultVisible ? (
        <div className="max-w-sm rounded-lg border border-success/30 bg-success/10 p-3 text-left shadow-line" aria-live="polite">
          <div className="flex gap-2">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0 text-success" size={16} />
            <div>
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function EnterpriseOperationsCenter() {
  const [enterpriseResult, setEnterpriseResult] = useState("");
  const enterpriseMetrics = [
    {
      label: "Regional units",
      value: "3",
      icon: Boxes,
      result: "Regional units define accountability, data visibility, approval routing, and local ownership. Use them to keep national, regional, and district teams working from the same governed structure."
    },
    {
      label: "Live workflows",
      value: "3",
      icon: CheckCircle2,
      result: "Live workflows turn operational rules into queues, escalation paths, and audit trails. Review them before changing who approves data, corrections, duplicate checks, or field follow-up."
    },
    {
      label: "Tracked resources",
      value: "258",
      icon: Smartphone,
      result: "Tracked resources connect devices, vehicles, supplies, and field assets to programs and teams. Use this view to confirm whether work has the right equipment before deployment."
    },
    {
      label: "Budget utilization",
      value: "64%",
      icon: WalletCards,
      result: "Budget utilization shows how much approved funding has already been used. Compare spending with delivery progress before approving new activities, procurements, or donor reports."
    }
  ];

  return (
    <section aria-labelledby="enterprise-ops-title" className="space-y-5">
      <PageHeader
        eyebrow="Enterprise operations"
        title="Governance, resources, budgets, and work in one place"
        description="Connect regional structures, approval chains, assets, documents, budgets, tasks, and interventions to the same operational workflow graph."
        action={<ActionButton title="Connected record ready" description="A governed operational record workflow has been opened."><Plus aria-hidden="true" /> Create connected record</ActionButton>}
      />

      {enterpriseResult ? (
        <section className="rounded-2xl border border-success/30 bg-success/10 p-4" aria-live="polite">
          <div className="flex items-start gap-3">
            <Boxes aria-hidden="true" className="mt-0.5 text-success" size={18} />
            <div>
              <h2 className="text-sm font-semibold">Operations result</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{enterpriseResult}</p>
            </div>
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        {enterpriseMetrics.map(({ label, value, icon: Icon, result }) => (
          <button
            className="rounded-lg border bg-panel p-4 text-left shadow-line transition hover:border-primary/30 hover:bg-primary/5"
            key={label}
            onClick={() => setEnterpriseResult(result)}
            type="button"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{label}</p>
              <Icon aria-hidden="true" className="text-muted-foreground" size={17} />
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
          </button>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <ConnectedPanel title="Organizational hierarchy" description="Regional data isolation, accountability, and approval routing all begin here.">
          {enterpriseOperations.units.map((unit) => (
            <button
              className="w-full rounded-md border bg-background p-3 text-left transition hover:border-primary/30 hover:bg-primary/5"
              key={unit.name}
              onClick={() =>
                setEnterpriseResult(
                  `${unit.name} is a ${unit.type.toLowerCase()} for ${unit.region}, owned by ${unit.owner}. Use this structure to control who sees data, who approves work, and who is accountable for follow-up.`
                )
              }
              type="button"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">{unit.name}</p>
                <Badge tone="success">{unit.status}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{unit.type} · {unit.region} · {unit.owner}</p>
            </button>
          ))}
        </ConnectedPanel>

        <ConnectedPanel title="Approval workflows" description="Workflow definitions drive queues, SLA tracking, corrections, and escalations.">
          {enterpriseOperations.workflows.map((workflow) => (
            <button
              className="w-full rounded-md border bg-background p-3 text-left transition hover:border-primary/30 hover:bg-primary/5"
              key={workflow.name}
              onClick={() =>
                setEnterpriseResult(
                  `${workflow.name} is ${workflow.status.toLowerCase()} with the path ${workflow.steps} and an SLA of ${workflow.sla}. Use this to make review ownership clear and prevent overdue operational work.`
                )
              }
              type="button"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">{workflow.name}</p>
                <Badge tone="accent">{workflow.sla}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{workflow.steps} · {workflow.status}</p>
            </button>
          ))}
        </ConnectedPanel>

        <ConnectedPanel title="Resources and assets" description="Devices, vehicles, and supplies are assigned to projects, field teams, and regions.">
          {enterpriseOperations.resources.map((resource) => (
            <button
              className="w-full rounded-md border bg-background p-3 text-left transition hover:border-primary/30 hover:bg-primary/5"
              key={resource.name}
              onClick={() =>
                setEnterpriseResult(
                  `${resource.name} is a ${resource.type.toLowerCase()} assigned to ${resource.assigned}. Current status: ${resource.status}. Confirm this before sending teams, approving logistics, or reporting resource coverage.`
                )
              }
              type="button"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">{resource.name}</p>
                <Badge tone="neutral">{resource.status}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{resource.type} · {resource.assigned}</p>
            </button>
          ))}
        </ConnectedPanel>

        <ConnectedPanel title="Budgets and documents" description="Operational spending and knowledge artifacts stay linked to projects, interventions, evidence, and reports.">
          {enterpriseOperations.finance.map((line) => (
            <button
              className="w-full rounded-md border bg-background p-3 text-left transition hover:border-primary/30 hover:bg-primary/5"
              key={line.category}
              onClick={() =>
                setEnterpriseResult(
                  `${line.category} has used ${line.utilization}% of its budget: ${line.spent} spent from ${line.allocated}. Compare this with delivery progress before approving more activities.`
                )
              }
              type="button"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">{line.category}</p>
                <Badge tone="accent">{line.utilization}% used</Badge>
              </div>
              <ProgressBar value={line.utilization} />
              <p className="mt-2 text-xs text-muted-foreground">{line.spent} spent of {line.allocated}</p>
            </button>
          ))}
          {enterpriseOperations.documents.map((document) => (
            <button
              className="flex w-full items-center gap-3 rounded-md border bg-background p-3 text-left transition hover:border-primary/30 hover:bg-primary/5"
              key={document.title}
              onClick={() =>
                setEnterpriseResult(
                  `${document.title} is a ${document.type.toLowerCase()} linked to ${document.link}. Status: ${document.status}. Keep this document current so teams follow the same policy, contract, or compliance requirement.`
                )
              }
              type="button"
            >
              <FileText aria-hidden="true" className="text-muted-foreground" size={17} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{document.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{document.type} · {document.link}</p>
              </div>
              <Badge tone="success">{document.status}</Badge>
            </button>
          ))}
        </ConnectedPanel>
      </div>
    </section>
  );
}

export function OperationalEcosystem() {
  const [ecosystemResult, setEcosystemResult] = useState("");
  return (
    <section aria-labelledby="ecosystem-title" className="space-y-5">
      <PageHeader
        eyebrow="Operational ecosystem"
        title="One connected field operations system"
        description="See how programs, people, forms, submissions, approvals, analytics, and follow-ups work together as one operational chain."
        action={<ActionButton title="Live context recalculated" description="Programs, submissions, indicators, approvals, and reports are synced."><RefreshCw aria-hidden="true" /> Recalculate live context</ActionButton>}
      />

      {ecosystemResult ? (
        <section className="rounded-2xl border border-success/30 bg-success/10 p-4" aria-live="polite">
          <div className="flex items-start gap-3">
            <Boxes aria-hidden="true" className="mt-0.5 text-success" size={18} />
            <div>
              <h2 className="text-sm font-semibold">Ecosystem result</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{ecosystemResult}</p>
            </div>
          </div>
        </section>
      ) : null}

      <div className="rounded-lg border bg-panel p-4 shadow-line">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold">Connected workflow chain</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Each step feeds the next. Forms act as operational transactions, not isolated surveys.
            </p>
          </div>
          <Badge tone="success"><CheckCircle2 aria-hidden="true" size={12} /> Event-driven</Badge>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {operationalFlow.map((node, index) => (
            <button
              className="relative rounded-lg border bg-background p-3 text-left transition hover:border-primary/30 hover:bg-primary/5"
              key={node.id}
              onClick={() =>
                setEcosystemResult(
                  `${node.label}: ${node.detail}. Current count is ${node.count} and status is ${node.status}. This step feeds connected Atlas work such as forms, reviews, dashboards, approvals, cases, and reports.`
                )
              }
              type="button"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Boxes aria-hidden="true" size={16} />
                </span>
                <Badge tone={node.status === "Needs review" || node.status === "Open" ? "warning" : "neutral"}>{node.status}</Badge>
              </div>
              <p className="text-sm font-semibold">{node.label}</p>
              <p className="mt-1 min-h-10 text-xs leading-5 text-muted-foreground">{node.detail}</p>
              <p className="mt-3 text-lg font-semibold tracking-tight">{node.count}</p>
              {index < operationalFlow.length - 1 ? (
                <span className="absolute -right-2 top-1/2 hidden h-px w-4 bg-border xl:block" aria-hidden="true" />
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <section className="rounded-lg border bg-panel p-4 shadow-line">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Realtime event propagation</h2>
              <p className="mt-1 text-xs text-muted-foreground">Operational actions automatically update connected systems.</p>
            </div>
            <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <StatusDot tone="online" />
              Live
            </span>
          </div>
          <div className="mt-4 divide-y rounded-lg border bg-background">
            {operationalEvents.map((item) => (
              <button
                className="grid w-full gap-3 p-4 text-left transition hover:bg-primary/5 md:grid-cols-[180px_1fr_92px]"
                key={`${item.event}-${item.age}`}
                onClick={() =>
                  setEcosystemResult(
                    `${item.event} came from ${item.source} ${item.age}. It updates ${item.effects.join(", ")}. Priority is ${item.priority}; review it when it affects approval queues, registry quality, or donor reporting.`
                  )
                }
                type="button"
              >
                <div>
                  <p className="text-sm font-medium">{item.event}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.source}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.effects.map((effect) => (
                    <Badge key={effect} tone="accent">{effect}</Badge>
                  ))}
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <Badge tone={item.priority === "High" ? "warning" : "neutral"}>{item.priority}</Badge>
                  <p className="mt-2">{item.age}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        <aside className="rounded-lg border bg-panel p-4 shadow-line">
          <h2 className="text-sm font-semibold">Living beneficiary profile</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Beneficiaries aggregate every operational signal: projects, visits, submissions, GPS, cases, indicators, and reports.
          </p>
          <div className="mt-4 space-y-3">
            {beneficiaryProfileConnections.map((item) => (
              <button
                className="w-full rounded-md border bg-background p-3 text-left transition hover:border-primary/30 hover:bg-primary/5"
                key={item.label}
                onClick={() =>
                  setEcosystemResult(
                    `${item.label}: ${item.value}. ${item.note}. This profile signal helps teams understand the complete beneficiary history before approving data, resolving cases, or reporting outcomes.`
                  )
                }
                type="button"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{item.label}</p>
                  <Badge tone="neutral">{item.value}</Badge>
                </div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.note}</p>
              </button>
            ))}
          </div>
        </aside>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["Project-driven", "Projects control assigned forms, officers, beneficiaries, geography, indicators, and reports."],
          ["Approval-aware", "Quality flags, GPS anomalies, duplicate risks, and corrections all feed supervisor queues."],
          ["Report-ready", "Dashboards and donor reports read live trusted operational data instead of disconnected exports."]
        ].map(([title, text]) => (
          <button
            className="rounded-lg border bg-panel p-4 text-left shadow-line transition hover:border-primary/30 hover:bg-primary/5"
            key={title}
            onClick={() => setEcosystemResult(`${title}: ${text}`)}
            type="button"
          >
            <h2 className="text-sm font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
          </button>
        ))}
      </div>
    </section>
  );
}

function mapBeneficiary(row: BeneficiaryRead): Beneficiary {
  return {
    id: row.id,
    uid: row.beneficiary_uid,
    name: row.display_name,
    type: row.beneficiary_type,
    program: row.project_id ? `Project ${row.project_id.slice(0, 8)}` : "Unassigned",
    region: row.region ?? "Unassigned",
    community: row.community ?? row.district ?? "Unassigned",
    status: row.enrollment_status,
    vulnerability: row.vulnerability_score,
    duplicateRisk: Math.round(row.duplicate_risk_score),
    lastVisit: row.last_visit_at ? new Date(row.last_visit_at).toLocaleDateString() : "No visit yet",
    coordinates: row.latitude !== null && row.longitude !== null ? `${row.latitude}, ${row.longitude}` : "No GPS"
  };
}

export function BeneficiaryRegistry({ token }: TokenAwareProps) {
  const [beneficiaryResult, setBeneficiaryResult] = useState("");
  const beneficiariesQuery = useQuery({
    queryKey: ["beneficiaries", token],
    queryFn: () => listBeneficiaries(token ?? ""),
    enabled: Boolean(token && token !== "preview-token")
  });
  const beneficiaryRows = beneficiariesQuery.data?.map(mapBeneficiary) ?? beneficiaries;
  const withGpsCount = beneficiariesQuery.data?.filter((row) => row.latitude !== null && row.longitude !== null).length ?? 0;
  const withGpsPercent = beneficiariesQuery.data?.length ? Math.round((withGpsCount / beneficiariesQuery.data.length) * 100) : 92;
  const visitedCount = beneficiariesQuery.data?.filter((row) => row.last_visit_at).length ?? 41382;
  const duplicateCount = beneficiariesQuery.data?.filter((row) => row.duplicate_risk_score > 15).length ?? 214;
  const registryActions = [
    {
      label: "Registered",
      value: (beneficiariesQuery.data?.length ?? 98220).toLocaleString(),
      icon: UsersRound,
      result: "The registry is the trusted list of people, households, farmers, groups, schools, clinics, or other entities served by programs. Use registration forms with consent, GPS, identity notes, and eligibility fields before assigning support."
    },
    {
      label: "Visited this month",
      value: visitedCount.toLocaleString(),
      icon: BadgeCheck,
      result: "Recent visits show which beneficiaries have fresh field evidence. Review last visit dates before reporting results, assigning follow-ups, or closing cases."
    },
    {
      label: "Possible duplicates",
      value: duplicateCount.toLocaleString(),
      icon: AlertTriangle,
      result: "Duplicate review helps prevent the same person, household, or group from being counted twice. Compare IDs, names, phone numbers, villages, GPS, and enrollment history before merging or rejecting records."
    },
    {
      label: "With GPS",
      value: `${withGpsPercent}%`,
      icon: MapPin,
      result: "GPS coverage shows how many registry records can be verified on a map. Missing coordinates should be corrected during field visits or supervisor review."
    }
  ];

  function describeBeneficiary(row: Beneficiary): void {
    setBeneficiaryResult(
      `${row.name} is a ${row.type.toLowerCase()} in ${row.community}, ${row.region}. Current status: ${row.status}. Duplicate risk is ${row.duplicateRisk}%, last visit is ${row.lastVisit}, and GPS evidence is ${row.coordinates}. Next step: verify consent, check duplicate signals, and confirm the program assignment before reporting this record.`
    );
  }

  const columns: TableColumn<Beneficiary>[] = [
    {
      key: "name",
      header: "Beneficiary",
      value: (row) => `${row.name} ${row.uid} ${row.type}`,
      render: (row) => (
        <div>
          <button className="font-medium text-left text-primary hover:underline" onClick={() => describeBeneficiary(row)} type="button">
            {row.name}
          </button>
          <p className="mt-0.5 text-xs text-muted-foreground">{row.uid} · {row.type}</p>
        </div>
      )
    },
    { key: "program", header: "Program", value: (row) => row.program, render: (row) => row.program },
    { key: "community", header: "Community", value: (row) => `${row.region} ${row.community}`, render: (row) => `${row.community}, ${row.region}` },
    {
      key: "risk",
      header: "Quality",
      value: (row) => String(row.duplicateRisk),
      render: (row) => <Badge tone={row.duplicateRisk > 15 ? "warning" : "success"}>{row.duplicateRisk}% duplicate risk</Badge>
    },
    { key: "visit", header: "Last visit", value: (row) => row.lastVisit, render: (row) => row.lastVisit }
  ];

  return (
    <section className="space-y-5" aria-labelledby="beneficiaries-title">
      <PageHeader
        eyebrow="Beneficiaries"
        title="Beneficiary registry"
        description="Search households, farmers, cooperatives, schools, clinics, and groups with simple quality signals and visit history."
        action={<ActionButton title="Beneficiary workflow opened" description="Registration, duplicate checks, GPS, and consent steps are ready."><Plus aria-hidden="true" /> Register beneficiary</ActionButton>}
      />
      {beneficiaryResult ? (
        <section className="rounded-2xl border border-success/30 bg-success/10 p-4" aria-live="polite">
          <div className="flex items-start gap-3">
            <UsersRound aria-hidden="true" className="mt-0.5 text-success" size={18} />
            <div>
              <h2 className="text-sm font-semibold">Registry result</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{beneficiaryResult}</p>
            </div>
          </div>
        </section>
      ) : null}
      <div className="grid gap-3 md:grid-cols-4">
        {registryActions.map(({ label, value, icon: Icon, result }) => (
          <button
            key={label}
            className="rounded-lg border bg-panel p-4 text-left transition hover:border-primary/30 hover:bg-primary/5"
            onClick={() => setBeneficiaryResult(result)}
            type="button"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{label}</p>
              <Icon aria-hidden="true" className="text-muted-foreground" size={17} />
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
          </button>
        ))}
      </div>
      <DataTable columns={columns} emptyLabel="No beneficiaries yet" rows={beneficiaryRows} searchLabel="Search people, IDs, villages, or programs" title={beneficiariesQuery.isFetching ? "Registry syncing" : "Registry"} />
    </section>
  );
}

function mapProgram(row: ProgramRead): Program {
  return {
    id: row.id,
    name: row.name,
    donor: "Operational program",
    region: row.region ?? "All regions",
    budget: "Not set",
    coverage: row.region ?? "Organization-wide",
    beneficiaries: 0,
    progress: row.is_active ? 42 : 0,
    nextMilestone: "Connect forms, indicators, and field teams"
  };
}

export function ProgramManagement({ token }: TokenAwareProps) {
  const [programResult, setProgramResult] = useState("");
  const programsQuery = useQuery({
    queryKey: ["programs", token],
    queryFn: () => listPrograms(token ?? ""),
    enabled: Boolean(token && token !== "preview-token")
  });
  const programRows = programsQuery.data?.map(mapProgram) ?? programs;

  const columns: TableColumn<Program>[] = [
    {
      key: "program",
      header: "Program",
      value: (row) => `${row.name} ${row.donor}`,
      render: (row) => (
        <div>
          <p className="font-medium">{row.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{row.donor} · {row.region}</p>
        </div>
      )
    },
    { key: "coverage", header: "Coverage", value: (row) => row.coverage, render: (row) => row.coverage },
    { key: "beneficiaries", header: "Beneficiaries", value: (row) => String(row.beneficiaries), render: (row) => row.beneficiaries.toLocaleString() },
    { key: "budget", header: "Budget", value: (row) => row.budget, render: (row) => row.budget },
    {
      key: "progress",
      header: "Progress",
      value: (row) => String(row.progress),
      render: (row) => <div className="min-w-36"><ProgressBar value={row.progress} /><p className="mt-1 text-xs text-muted-foreground">{row.progress}% complete</p></div>
    }
  ];

  return (
    <section className="space-y-5">
      <PageHeader
        eyebrow="Programs"
        title="Programs and projects"
        description="Plan interventions, monitor milestones, and keep donor-funded work easy to understand across regions."
        action={<ActionButton title="Program workflow opened" description="Project setup, geography, indicators, officers, and reporting are ready."><Plus aria-hidden="true" /> New program</ActionButton>}
      />
      {programResult ? (
        <section className="rounded-2xl border border-success/30 bg-success/10 p-4" aria-live="polite">
          <div className="flex items-start gap-3">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 text-success" size={18} />
            <div>
              <h2 className="text-sm font-semibold">Program result</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{programResult}</p>
            </div>
          </div>
        </section>
      ) : null}
      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <DataTable columns={columns} emptyLabel="No programs yet" rows={programRows} searchLabel="Search programs, donors, or regions" title={programsQuery.isFetching ? "Active programs syncing" : "Active programs"} />
        <aside className="rounded-lg border bg-panel p-4">
          <h2 className="text-sm font-semibold">Next milestones</h2>
          <div className="mt-4 space-y-3">
            {programRows.map((program) => (
              <button
                key={program.id}
                className="w-full rounded-md border bg-background p-3 text-left transition hover:border-primary/30 hover:bg-primary/5"
                onClick={() =>
                  setProgramResult(
                    `${program.name} next step: ${program.nextMilestone}. Connect the program to assigned forms, indicators, teams, and reporting periods before field rollout.`
                  )
                }
                type="button"
              >
                <p className="text-sm font-medium">{program.nextMilestone}</p>
                <p className="mt-1 text-xs text-muted-foreground">{program.name}</p>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}

function mapIndicator(row: IndicatorRead): Indicator {
  return {
    code: row.code,
    name: row.name,
    baseline: row.baseline_value,
    current: row.current_value,
    target: row.target_value,
    unit: row.unit,
    progress: row.progress_percent
  };
}

export function IndicatorTracking({ token }: TokenAwareProps) {
  const [indicatorResult, setIndicatorResult] = useState("");
  const indicatorsQuery = useQuery({
    queryKey: ["indicators", token],
    queryFn: () => listIndicators(token ?? ""),
    enabled: Boolean(token && token !== "preview-token")
  });
  const indicatorRows = indicatorsQuery.data?.map(mapIndicator) ?? indicators;

  const columns: TableColumn<Indicator>[] = [
    { key: "code", header: "Code", value: (row) => row.code, render: (row) => <span className="font-mono text-xs">{row.code}</span> },
    {
      key: "name",
      header: "Indicator",
      value: (row) => row.name,
      render: (row) => (
        <button
          className="text-left"
          onClick={() =>
            setIndicatorResult(
              `${row.name} is ${row.progress}% toward target. Current value is ${row.current} ${row.unit} against ${row.target} ${row.unit}. Use this signal in donor reports and field follow-up planning.`
            )
          }
          type="button"
        >
          {row.name}
        </button>
      )
    },
    { key: "current", header: "Current", value: (row) => String(row.current), render: (row) => `${row.current} ${row.unit}` },
    { key: "target", header: "Target", value: (row) => String(row.target), render: (row) => `${row.target} ${row.unit}` },
    {
      key: "progress",
      header: "Progress",
      value: (row) => String(row.progress),
      render: (row) => <div className="min-w-32"><ProgressBar value={row.progress} /></div>
    }
  ];

  return (
    <section className="space-y-5">
      <PageHeader
        eyebrow="Indicators"
        title="Indicator tracking"
        description="Track baselines, targets, progress, and donor reporting metrics without burying teams in spreadsheets."
        action={<ActionButton title="Indicator workflow opened" description="Baseline, target, formula, and reporting fields are ready."><Plus aria-hidden="true" /> Add indicator</ActionButton>}
      />
      {indicatorResult ? (
        <section className="rounded-2xl border border-success/30 bg-success/10 p-4" aria-live="polite">
          <div className="flex items-start gap-3">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 text-success" size={18} />
            <div>
              <h2 className="text-sm font-semibold">Indicator result</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{indicatorResult}</p>
            </div>
          </div>
        </section>
      ) : null}
      <DataTable columns={columns} emptyLabel="No indicators yet" rows={indicatorRows} searchLabel="Search indicators" title={indicatorsQuery.isFetching ? "KPI registry syncing" : "KPI registry"} />
    </section>
  );
}

function titleCase(value: string): string {
  return value
    .replaceAll("_", " ")
    .split(" ")
    .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1)}` : part))
    .join(" ");
}

function mapCase(row: CaseRead): CaseItem {
  return {
    id: row.case_number,
    title: row.title,
    type: titleCase(row.case_type),
    beneficiary: row.beneficiary_id ? `Beneficiary ${row.beneficiary_id.slice(0, 8)}` : "Unlinked beneficiary",
    priority: titleCase(row.priority),
    status: titleCase(row.status),
    due: row.due_at ? new Date(row.due_at).toLocaleDateString() : "No due date"
  };
}

export function CaseManagement({ token }: TokenAwareProps) {
  const [caseResult, setCaseResult] = useState("");
  const casesQuery = useQuery({
    queryKey: ["cases", token],
    queryFn: () => listCases(token ?? ""),
    enabled: Boolean(token && token !== "preview-token")
  });
  const caseRows = casesQuery.data?.map(mapCase) ?? cases;

  const columns: TableColumn<CaseItem>[] = [
    { key: "id", header: "Case", value: (row) => row.id, render: (row) => <span className="font-mono text-xs">{row.id}</span> },
    {
      key: "title",
      header: "Follow-up",
      value: (row) => `${row.title} ${row.beneficiary}`,
      render: (row) => (
        <div>
          <button
            className="text-left font-medium"
            onClick={() =>
              setCaseResult(
                `${row.title} is a ${row.priority.toLowerCase()} priority ${row.type.toLowerCase()} for ${row.beneficiary}. Due: ${row.due}. Next step: assign ownership, add notes, and close the loop with evidence.`
              )
            }
            type="button"
          >
            {row.title}
          </button>
          <p className="mt-0.5 text-xs text-muted-foreground">{row.beneficiary}</p>
        </div>
      )
    },
    { key: "type", header: "Type", value: (row) => row.type, render: (row) => row.type },
    { key: "priority", header: "Priority", value: (row) => row.priority, render: (row) => <Badge tone={row.priority === "High" ? "warning" : "neutral"}>{row.priority}</Badge> },
    { key: "status", header: "Status", value: (row) => row.status, render: (row) => row.status },
    { key: "due", header: "Due", value: (row) => row.due, render: (row) => row.due }
  ];

  return (
    <section className="space-y-5">
      <PageHeader
        eyebrow="Cases"
        title="Case management"
        description="Manage complaints, referrals, corrections, and follow-ups with clear ownership and simple next actions."
        action={<ActionButton title="Case workflow opened" description="Referral, complaint, escalation, and follow-up fields are ready."><Plus aria-hidden="true" /> Open case</ActionButton>}
      />
      {caseResult ? (
        <section className="rounded-2xl border border-success/30 bg-success/10 p-4" aria-live="polite">
          <div className="flex items-start gap-3">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 text-success" size={18} />
            <div>
              <h2 className="text-sm font-semibold">Case result</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{caseResult}</p>
            </div>
          </div>
        </section>
      ) : null}
      <DataTable columns={columns} emptyLabel="No cases yet" rows={caseRows} searchLabel="Search cases" title={casesQuery.isFetching ? "Open follow-ups syncing" : "Open follow-ups"} />
    </section>
  );
}

export function GeospatialIntelligence() {
  const [mapResult, setMapResult] = useState("");
  function selectMapLayer(layer: string): void {
    setMapResult(`${layer} layer is ready. Turn this layer on when supervisors need location evidence, route planning, or offline verification.`);
  }

  return (
    <section className="space-y-5">
      <PageHeader
        eyebrow="Map"
        title="Geospatial coverage"
        description="See where field work is happening, where coverage is weak, and which areas need supervisor attention."
        action={<ActionButton title="GeoJSON export prepared" description="Coverage layers are ready for GIS export." variant="secondary"><Download aria-hidden="true" /> Export GeoJSON</ActionButton>}
      />
      {mapResult ? (
        <section className="rounded-2xl border border-success/30 bg-success/10 p-4" aria-live="polite">
          <div className="flex items-start gap-3">
            <MapPin aria-hidden="true" className="mt-0.5 text-success" size={18} />
            <div>
              <h2 className="text-sm font-semibold">Map result</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{mapResult}</p>
            </div>
          </div>
        </section>
      ) : null}
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <section className="min-h-[420px] rounded-lg border bg-panel p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Coverage map</h2>
              <p className="mt-1 text-xs text-muted-foreground">Simplified preview for offline map layers and field coverage.</p>
            </div>
            <Badge tone="success" className="gap-1.5"><StatusDot tone="online" /> 4 regions</Badge>
          </div>
          <div className="mt-5 grid min-h-[320px] gap-3 rounded-lg border bg-background p-4 md:grid-cols-2">
            {mapCoverage.map((region) => (
              <button
                key={region.region}
                className="flex flex-col justify-between rounded-lg border bg-panel p-4 text-left transition hover:border-primary/30 hover:bg-primary/5"
                onClick={() =>
                  setMapResult(
                    `${region.region} has ${region.coverage}% coverage and ${region.submissions.toLocaleString()} submissions. Use this area to decide where supervisors should verify coverage or load offline map packs.`
                  )
                }
                type="button"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium">{region.region}</p>
                  <MapPin aria-hidden="true" className="text-primary" size={18} />
                </div>
                <div className="mt-8">
                  <ProgressBar value={region.coverage} />
                  <p className="mt-2 text-sm text-muted-foreground">{region.coverage}% coverage · {region.submissions.toLocaleString()} submissions</p>
                </div>
              </button>
            ))}
          </div>
        </section>
        <aside className="rounded-lg border bg-panel p-4">
          <h2 className="text-sm font-semibold">Map layers</h2>
          <div className="mt-4 space-y-2">
            {["Villages", "Farm boundaries", "Clinic catchments", "Supervisor routes", "Offline map packs"].map((layer) => (
              <button
                key={layer}
                className="flex w-full items-center justify-between rounded-md border bg-background px-3 py-2 text-left text-sm transition hover:border-primary/30 hover:bg-primary/5"
                onClick={() => selectMapLayer(layer)}
                onPointerDown={() => selectMapLayer(layer)}
                type="button"
              >
                <span>{layer}</span>
                <Badge tone="accent">Ready</Badge>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}

function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return "Current period";
  if (start && end) return `${new Date(start).toLocaleDateString()} - ${new Date(end).toLocaleDateString()}`;
  return new Date(start ?? end ?? "").toLocaleDateString();
}

function mapReport(row: DonorReportRead): DonorReport {
  return {
    name: row.name,
    donor: row.donor ?? "Internal",
    type: titleCase(row.report_type),
    period: formatDateRange(row.period_start, row.period_end),
    status: titleCase(row.status),
    formats: row.export_formats.join(", ").toUpperCase()
  };
}

export function ReportingCenter({ token }: TokenAwareProps) {
  const [draftSummary, setDraftSummary] = useState("");
  const [reportResult, setReportResult] = useState("");
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const reportsQuery = useQuery({
    queryKey: ["reports", token],
    queryFn: () => listReports(token ?? ""),
    enabled: Boolean(token && token !== "preview-token")
  });
  const reportRows = reportsQuery.data?.map(mapReport) ?? donorReports;

  function describeReport(row: DonorReport): void {
    const statusGuidance = row.status.toLowerCase().includes("ready")
      ? "This report is ready for management review. Confirm the period, check evidence links, and export the approved package."
      : row.status.toLowerCase().includes("needs")
        ? "This report needs more data before it should be sent. Review missing indicators, unresolved cases, weak map coverage, or unapproved submissions first."
        : "This report is still being prepared. Keep validating indicators, narrative sections, map layers, and donor formats before final approval.";
    setReportResult(
      `${row.name} is a ${row.type.toLowerCase()} report for ${row.donor}, covering ${row.period}. Export formats: ${row.formats}. ${statusGuidance}`
    );
  }

  const columns: TableColumn<DonorReport>[] = [
    {
      key: "name",
      header: "Report",
      value: (row) => `${row.name} ${row.donor}`,
      render: (row) => (
        <div>
          <button className="text-left font-medium text-primary hover:underline" onClick={() => describeReport(row)} type="button">
            {row.name}
          </button>
          <p className="mt-0.5 text-xs text-muted-foreground">{row.donor} · {row.period}</p>
        </div>
      )
    },
    { key: "type", header: "Type", value: (row) => row.type, render: (row) => row.type },
    { key: "formats", header: "Exports", value: (row) => row.formats, render: (row) => row.formats },
    { key: "status", header: "Status", value: (row) => row.status, render: (row) => <Badge tone={row.status === "Ready for review" ? "success" : row.status === "Needs data" ? "warning" : "neutral"}>{row.status}</Badge> }
  ];

  function draftNarrativeSummary(): void {
    const readyReports = reportRows.filter((report) => report.status.toLowerCase().includes("ready")).length;
    const nextSummary =
      `Program delivery is on track across ${reportRows.length} reporting package${reportRows.length === 1 ? "" : "s"}. ` +
      `${readyReports} report${readyReports === 1 ? " is" : "s are"} ready for review, with approved indicators, field submissions, and evidence prepared for donor-facing export. ` +
      "Recommended next step: review remaining data gaps, confirm the reporting period, and export the final package with organization branding.";
    setDraftSummary(nextSummary);
    setReportResult(nextSummary);
    pushToast({ title: "Narrative summary drafted", description: "A donor-ready report summary is ready to review.", tone: "success" });
  }

  return (
    <section className="space-y-5">
      <PageHeader
        eyebrow="Reports"
        title="Donor reporting"
        description="Prepare indicator reports, narrative summaries, logframes, and map exports for donors and program teams."
        action={<ActionButton title="Report builder opened" description="Donor report sections and live operational data are ready."><Plus aria-hidden="true" /> New report</ActionButton>}
      />
      {reportResult ? (
        <section className="rounded-2xl border border-success/30 bg-success/10 p-4" aria-live="polite">
          <div className="flex items-start gap-3">
            <FileText aria-hidden="true" className="mt-0.5 text-success" size={18} />
            <div>
              <h2 className="text-sm font-semibold">Report result</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{reportResult}</p>
            </div>
          </div>
        </section>
      ) : null}
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <DataTable columns={columns} emptyLabel="No reports yet" rows={reportRows} searchLabel="Search reports" title={reportsQuery.isFetching ? "Reporting center syncing" : "Reporting center"} />
        <aside className="space-y-4">
          <section className="rounded-lg border bg-panel p-4">
            <h2 className="text-sm font-semibold">AI report assistant</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Draft narrative summaries from approved indicators, cases, maps, and field activity.</p>
            <Button className="mt-4 w-full" onClick={draftNarrativeSummary} type="button">
              <ArrowUpRight aria-hidden="true" /> Draft summary
            </Button>
            {draftSummary ? (
              <div className="mt-4 rounded-lg border bg-background p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Draft narrative</p>
                <p className="mt-2 text-sm leading-6">{draftSummary}</p>
              </div>
            ) : null}
          </section>
          <section className="rounded-lg border bg-panel p-4">
            <h2 className="text-sm font-semibold">White-label exports</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Use organization branding, logo, custom colors, and donor-specific formats.</p>
            <div className="mt-4 grid gap-2">
              {[
                ["Branding", "Logo, colors, cover page, and organization details"],
                ["Evidence", "Approved submissions, photos, signatures, GPS, and case notes"],
                ["Formats", "PDF, Excel, CSV, GeoJSON, and donor-specific packages"]
              ].map(([label, detail]) => (
                <button
                  key={label}
                  className="rounded-md border bg-background p-3 text-left transition hover:border-primary/30 hover:bg-primary/5"
                  onClick={() =>
                    setReportResult(
                      `${label}: ${detail}. Confirm this section before final export so donors receive a clear, professional, and auditable package.`
                    )
                  }
                  type="button"
                >
                  <p className="text-sm font-medium">{label}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

export function ConnectivityCenter() {
  const [connectivityResult, setConnectivityResult] = useState("");
  return (
    <section className="space-y-5">
      <PageHeader
        eyebrow="Connectivity"
        title="Offline and communication center"
        description="Keep field teams confident when networks are weak with clear sync, retry, SMS, and WhatsApp readiness."
        action={<ActionButton title="Retry queue started" description="Failed uploads, media, and sync batches have been queued for retry."><RefreshCw aria-hidden="true" /> Retry failed uploads</ActionButton>}
      />
      {connectivityResult ? (
        <section className="rounded-2xl border border-success/30 bg-success/10 p-4" aria-live="polite">
          <div className="flex items-start gap-3">
            <RadioTower aria-hidden="true" className="mt-0.5 text-success" size={18} />
            <div>
              <h2 className="text-sm font-semibold">Connectivity result</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{connectivityResult}</p>
            </div>
          </div>
        </section>
      ) : null}
      <div className="grid gap-3 md:grid-cols-4">
        {[
          ["Delta sync", "On", RefreshCw],
          ["Compressed uploads", "480 KB photos", Smartphone],
          ["SMS alerts", "Ready", Bell],
          ["WhatsApp", "Configured", MessageCircle]
        ].map(([label, value, Icon]) => (
          <button
            key={label as string}
            className="rounded-lg border bg-panel p-4 text-left transition hover:border-primary/30 hover:bg-primary/5"
            onClick={() =>
              setConnectivityResult(
                `${label as string} is ${value as string}. Use this status to decide whether field teams can keep collecting, retry failed uploads, or switch to SMS and WhatsApp follow-up.`
              )
            }
            type="button"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{label as string}</p>
              <Icon aria-hidden="true" className="text-muted-foreground" size={17} />
            </div>
            <p className="mt-3 text-xl font-semibold tracking-tight">{value as string}</p>
          </button>
        ))}
      </div>
      <section className="rounded-lg border bg-panel p-4">
        <h2 className="text-sm font-semibold">Data quality and fraud signals</h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {dataQualitySignals.map((item) => (
            <button
              key={item.signal}
              className="w-full rounded-md border bg-background p-3 text-left transition hover:border-primary/30 hover:bg-primary/5"
              onClick={() => setConnectivityResult(`${item.signal}: ${item.action}. Confidence is ${item.confidence}, so review this before approving related submissions.`)}
              type="button"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">{item.signal}</p>
                <Badge tone={item.severity === "High" ? "danger" : "warning"}>{item.confidence}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{item.action}</p>
            </button>
          ))}
        </div>
      </section>
    </section>
  );
}

export function DataInteroperabilityCenter({ token }: DataInteroperabilityCenterProps) {
  const [datasetType, setDatasetType] = useState("beneficiaries");
  const [selectedImportId, setSelectedImportId] = useState<string | null>(null);
  const [lastUploadName, setLastUploadName] = useState("");
  const [dataResult, setDataResult] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const canUpload = Boolean(token && token !== "preview-token");

  const importJobsQuery = useQuery({
    queryKey: ["import-jobs", token],
    queryFn: () => listImportJobs(token ?? ""),
    enabled: Boolean(token && token !== "preview-token")
  });

  const importRowsQuery = useQuery({
    queryKey: ["import-rows", token, selectedImportId],
    queryFn: () => listImportRows(token ?? "", selectedImportId ?? ""),
    enabled: Boolean(token && token !== "preview-token" && selectedImportId)
  });

  const mediaEvidenceQuery = useQuery({
    queryKey: ["media-evidence", token],
    queryFn: () => listMediaEvidence(token ?? ""),
    enabled: Boolean(token && token !== "preview-token")
  });

  const publicLinksQuery = useQuery({
    queryKey: ["public-collection-links", token],
    queryFn: () => listPublicCollectionLinks(token ?? ""),
    enabled: Boolean(token && token !== "preview-token")
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadImportFile(token ?? "", datasetType, file),
    onSuccess: async (response) => {
      setLastUploadName(response.job.source_name);
      setSelectedImportId(response.job.id);
      setDataResult(`${response.job.source_name} uploaded for ${response.job.dataset_type.replaceAll("_", " ")}. ${response.job.valid_rows.toLocaleString()} rows are valid and ${response.job.error_rows.toLocaleString()} rows need attention before import.`);
      pushToast({
        title: "File uploaded",
        description: `${response.job.source_name} is ready for review and editing`,
        tone: response.job.error_rows ? "warning" : "success"
      });
      await importJobsQuery.refetch();
      await importRowsQuery.refetch();
    },
    onError: () => {
      setDataResult("Upload failed. Use CSV, XLSX, JSON, or GeoJSON and confirm your account has data import access.");
      pushToast({
        title: "Upload failed",
        description: "Use CSV, XLSX, JSON, or GeoJSON and make sure you are signed in with data import access.",
        tone: "danger"
      });
    }
  });

  const rowMutation = useMutation({
    mutationFn: (payload: { importJobId: string; row: ImportRowRead; column: string; value: string }) =>
      updateImportRow(token ?? "", payload.importJobId, payload.row.id, {
        changes: { [payload.column]: payload.value },
        expected_version: payload.row.version
      }),
    onSuccess: async (_row, variables) => {
      setDataResult(`Row ${variables.row.row_number} was updated. Column "${variables.column}" now has a saved version and will sync with the import review.`);
      pushToast({ title: "Cell saved", description: "The imported row was versioned and queued for sync", tone: "success" });
      await importRowsQuery.refetch();
    }
  });

  const applyMutation = useMutation({
    mutationFn: () => applyImportJob(token ?? "", selectedImportId ?? ""),
    onSuccess: async (response) => {
      setDataResult(`Import applied: ${response.created_records.toLocaleString()} created, ${response.updated_records.toLocaleString()} updated, and ${response.skipped_rows.toLocaleString()} skipped. Version history remains available for rollback.`);
      pushToast({
        title: "Import applied",
        description: `${response.created_records} created, ${response.updated_records} updated, ${response.skipped_rows} skipped`,
        tone: response.skipped_rows ? "warning" : "success"
      });
      await importJobsQuery.refetch();
      await importRowsQuery.refetch();
    },
    onError: () => {
      setDataResult("Import was not applied. Fix validation errors or choose a supported dataset type before applying.");
      pushToast({
        title: "Import not applied",
        description: "Fix rows with errors or choose a supported dataset type before applying.",
        tone: "danger"
      });
    }
  });

  const exportMutation = useMutation({
    mutationFn: () =>
      createExportJob(token ?? "", {
        dataset_type: "media",
        export_format: "zip",
        filtered_view: { include_media: true, include_audit: true },
        scheduled: false
      }),
    onSuccess: async (job) => {
      setDataResult(`${job.export_format.toUpperCase()} export for ${job.dataset_type.replaceAll("_", " ")} is queued with media and audit information included.`);
      pushToast({ title: "Export queued", description: `${job.export_format.toUpperCase()} package is being prepared`, tone: "success" });
    },
    onError: () => {
      setDataResult("Export was not queued. Sign in with data export access to create export jobs.");
      pushToast({ title: "Export not queued", description: "Sign in with data export access to create export jobs.", tone: "danger" });
    }
  });

  const realImportColumns = useMemo(() => {
    const keys: string[] = [];
    for (const row of importRowsQuery.data ?? []) {
      for (const key of Object.keys(row.edited_data)) {
        if (!keys.includes(key)) keys.push(key);
      }
    }
    return keys.slice(0, 8);
  }, [importRowsQuery.data]);
  const serverImportRows = importRowsQuery.data ?? [];
  const selectedImportJob = importJobsQuery.data?.find((job) => job.id === selectedImportId);
  const selectedImportIsApplied = selectedImportJob?.status === "applied";
  const serverIssueRows = serverImportRows.filter((row) => row.issue_count > 0 || row.validation_status === "needs_fixes" || row.validation_status === "conflict");

  useEffect(() => {
    if (!selectedImportId && importJobsQuery.data?.length) {
      setSelectedImportId(importJobsQuery.data[0].id);
    }
  }, [importJobsQuery.data, selectedImportId]);

  const importColumnsDef: TableColumn<ImportJob>[] = [
    {
      key: "file",
      header: "Upload",
      value: (row) => `${row.file} ${row.type}`,
      render: (row) => (
        <div>
          <p className="font-medium">{row.file}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{row.type} · {row.rows.toLocaleString()} rows</p>
        </div>
      )
    },
    { key: "valid", header: "Valid rows", value: (row) => String(row.valid), render: (row) => row.valid.toLocaleString() },
    {
      key: "issues",
      header: "Needs fixing",
      value: (row) => String(row.issues),
      render: (row) => <Badge tone={row.issues > 0 ? "warning" : "success"}>{row.issues.toLocaleString()} rows</Badge>
    },
    { key: "status", header: "Status", value: (row) => row.status, render: (row) => <Badge tone={row.status === "Ready to import" ? "success" : row.status === "Importing" ? "accent" : "warning"}>{row.status}</Badge> }
  ];
  const serverImportColumnsDef: TableColumn<ImportJobRead>[] = [
    {
      key: "source",
      header: "Upload",
      value: (row) => `${row.source_name} ${row.dataset_type}`,
      render: (row) => (
        <button
          className="text-left"
          onClick={() => setSelectedImportId(row.id)}
          type="button"
        >
          <span className="block font-medium">{row.source_name}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">{row.dataset_type} · {row.total_rows.toLocaleString()} rows</span>
        </button>
      )
    },
    { key: "valid", header: "Valid rows", value: (row) => String(row.valid_rows), render: (row) => row.valid_rows.toLocaleString() },
    {
      key: "issues",
      header: "Needs fixing",
      value: (row) => String(row.error_rows + row.duplicate_rows),
      render: (row) => <Badge tone={row.error_rows || row.duplicate_rows ? "warning" : "success"}>{(row.error_rows + row.duplicate_rows).toLocaleString()} rows</Badge>
    },
    { key: "status", header: "Status", value: (row) => row.status, render: (row) => <Badge tone={row.status === "validated" ? "success" : "warning"}>{row.status.replaceAll("_", " ")}</Badge> }
  ];
  const editableColumns: TableColumn<EditableRow>[] = [
    { key: "id", header: "ID", value: (row) => row.id, render: (row) => <span className="font-mono text-xs">{row.id}</span> },
    { key: "name", header: "Name", value: (row) => row.name, render: (row) => <input aria-label={`Name for ${row.id}`} className="w-full rounded border bg-background px-2 py-1" defaultValue={row.name} /> },
    { key: "village", header: "Village", value: (row) => row.village, render: (row) => <input aria-label={`Village for ${row.id}`} className="w-full rounded border bg-background px-2 py-1" defaultValue={row.village} /> },
    { key: "phone", header: "Phone", value: (row) => row.phone, render: (row) => <input aria-label={`Phone for ${row.id}`} className="w-full rounded border bg-background px-2 py-1" defaultValue={row.phone} /> },
    { key: "sync", header: "Save status", value: (row) => row.sync, render: (row) => <Badge tone={row.sync === "Synced" ? "success" : row.sync === "Waiting to sync" ? "warning" : "neutral"}>{row.sync}</Badge> }
  ];
  const realEditableColumns: TableColumn<ImportRowRead>[] = [
    { key: "row", header: "Row", value: (row) => String(row.row_number), render: (row) => <span className="font-mono text-xs">{row.row_number}</span> },
    ...realImportColumns.map((column): TableColumn<ImportRowRead> => ({
      key: column,
      header: column,
      value: (row) => String(row.edited_data[column] ?? ""),
      render: (row) => (
        <input
          aria-label={`${column} for row ${row.row_number}`}
          className="min-w-32 w-full rounded border bg-background px-2 py-1 text-sm"
          defaultValue={String(row.edited_data[column] ?? "")}
          onBlur={(event) => {
            const nextValue = event.currentTarget.value;
            if (nextValue !== String(row.edited_data[column] ?? "") && selectedImportId) {
              rowMutation.mutate({ importJobId: selectedImportId, row, column, value: nextValue });
            }
          }}
        />
      )
    })),
    {
      key: "status",
      header: "Status",
      value: (row) => row.validation_status,
      render: (row) => <Badge tone={row.validation_status === "valid" || row.validation_status === "edited" ? "success" : "warning"}>{row.validation_status.replaceAll("_", " ")}</Badge>
    }
  ];
  const exportColumns: TableColumn<ExportJob>[] = [
    { key: "name", header: "Dataset", value: (row) => row.name, render: (row) => row.name },
    { key: "format", header: "Format", value: (row) => row.format, render: (row) => row.format },
    { key: "filter", header: "View", value: (row) => row.filter, render: (row) => row.filter },
    { key: "schedule", header: "Schedule", value: (row) => row.schedule, render: (row) => row.schedule },
    { key: "status", header: "Status", value: (row) => row.status, render: (row) => <Badge tone={row.status === "Ready" ? "success" : "accent"}>{row.status}</Badge> }
  ];
  const mediaColumns: TableColumn<MediaEvidenceItem>[] = [
    { key: "id", header: "Media ID", value: (row) => row.id, render: (row) => <span className="font-mono text-xs">{row.id}</span> },
    { key: "type", header: "Type", value: (row) => row.type, render: (row) => row.type },
    { key: "record", header: "Linked record", value: (row) => row.record, render: (row) => row.record },
    { key: "location", header: "Location", value: (row) => row.location, render: (row) => row.location },
    { key: "size", header: "Size", value: (row) => row.size, render: (row) => row.size },
    { key: "status", header: "Status", value: (row) => row.status, render: (row) => <Badge tone={row.status === "Reviewed" ? "success" : row.status === "Needs review" ? "warning" : "accent"}>{row.status}</Badge> }
  ];
  const serverMediaColumns: TableColumn<MediaEvidenceRead>[] = [
    { key: "id", header: "Media ID", value: (row) => row.id, render: (row) => <span className="font-mono text-xs">{row.id.slice(0, 8)}</span> },
    { key: "type", header: "Type", value: (row) => row.media_type, render: (row) => row.media_type },
    { key: "file", header: "File", value: (row) => row.file_name, render: (row) => row.file_name },
    { key: "size", header: "Size", value: (row) => String(row.size_bytes), render: (row) => `${Math.round(row.size_bytes / 1024)} KB` },
    { key: "status", header: "Status", value: (row) => row.review_status, render: (row) => <Badge tone={row.review_status === "reviewed" ? "success" : "warning"}>{row.review_status.replaceAll("_", " ")}</Badge> }
  ];
  const sharingColumns: TableColumn<SharingPermissionRow>[] = [
    { key: "role", header: "Role", value: (row) => row.role, render: (row) => row.role },
    { key: "submit", header: "Submit", value: (row) => String(row.submit), render: (row) => <Badge tone={row.submit ? "success" : "neutral"}>{row.submit ? "Allowed" : "No"}</Badge> },
    { key: "view", header: "View", value: (row) => String(row.view), render: (row) => <Badge tone={row.view ? "success" : "neutral"}>{row.view ? "Allowed" : "No"}</Badge> },
    { key: "edit", header: "Edit", value: (row) => String(row.edit), render: (row) => <Badge tone={row.edit ? "warning" : "neutral"}>{row.edit ? "Allowed" : "No"}</Badge> },
    { key: "export", header: "Export", value: (row) => String(row.export), render: (row) => <Badge tone={row.export ? "accent" : "neutral"}>{row.export ? "Allowed" : "No"}</Badge> }
  ];

  return (
    <section className="space-y-5">
      <PageHeader
        eyebrow="Data"
        title="Import, clean, edit, and export"
        description="Bring in spreadsheets, map files, historical exports, and operational datasets with safe validation, mapping, bulk edits, and rollback."
        action={
          <div className="flex flex-col items-start gap-2 md:items-end">
            <Button
              disabled={!canUpload || uploadMutation.isPending}
              onClick={() => fileInputRef.current?.click()}
              type="button"
              variant="primary"
            >
              <UploadCloud aria-hidden="true" size={16} />
              {uploadMutation.isPending ? "Uploading" : "Upload file"}
            </Button>
            <input
              ref={fileInputRef}
              className="sr-only"
              type="file"
              accept=".csv,.xlsx,.json,.geojson"
              disabled={!canUpload || uploadMutation.isPending}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                if (file) uploadMutation.mutate(file);
                event.currentTarget.value = "";
              }}
            />
            <p className="text-xs text-muted-foreground">
              {canUpload ? lastUploadName ? `Last uploaded: ${lastUploadName}` : "CSV, XLSX, JSON, or GeoJSON" : "Sign in to upload files"}
            </p>
          </div>
        }
      />

      <div className="grid gap-3 md:grid-cols-4">
        {[
          ["Supported imports", "CSV, XLSX, JSON, GeoJSON", FileSpreadsheet],
          ["Rows waiting", "18,864", RefreshCw],
          ["Bulk edits", "3 batches", Columns3],
          ["Rollback", "Available", CheckCircle2]
        ].map(([label, value, Icon]) => (
          <article key={label as string} className="rounded-lg border bg-panel p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{label as string}</p>
              <Icon aria-hidden="true" className="text-muted-foreground" size={17} />
            </div>
            <p className="mt-3 text-lg font-semibold tracking-tight">{value as string}</p>
          </article>
        ))}
      </div>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label="Collection channels">
        {collectionChannels.map((channel) => (
          <article className="rounded-lg border bg-panel p-4" key={channel.name}>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-sm font-semibold">{channel.name}</h2>
              <Badge tone={channel.status === "Ready" || channel.status === "Supported" ? "success" : "accent"}>{channel.status}</Badge>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{channel.description}</p>
          </article>
        ))}
      </section>

      {dataResult ? (
        <section className="rounded-2xl border border-success/30 bg-success/10 p-4" aria-live="polite">
          <div className="flex items-start gap-3">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 text-success" size={18} />
            <div>
              <h2 className="text-sm font-semibold">Data result</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{dataResult}</p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid min-w-0 gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <section className="rounded-lg border bg-panel p-4">
            <h2 className="text-sm font-semibold">Upload settings</h2>
            <label className="mt-4 block text-sm font-medium">
              Dataset
              <Select className="mt-2" value={datasetType} onChange={(event) => setDatasetType(event.target.value)}>
                {["beneficiaries", "submissions", "geospatial", "indicators", "programs", "cases", "field_officers", "historical_migration"].map((item) => (
                  <option key={item} value={item}>{item.replaceAll("_", " ")}</option>
                ))}
              </Select>
            </label>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Upload CSV, XLSX, JSON, or GeoJSON files. Parsed rows appear in the editable grid below.
            </p>
            {!canUpload ? (
              <p className="mt-3 rounded-md border border-warning/25 bg-warning/10 px-3 py-2 text-xs text-warning">
                Uploads are disabled in preview mode. Sign in with an account that has data import access.
              </p>
            ) : null}
            {uploadMutation.isError ? (
              <p className="mt-3 rounded-md border border-danger/25 bg-danger/10 px-3 py-2 text-xs text-danger">
                Upload failed. Check the file type and column headers.
              </p>
            ) : null}
          </section>
          <section className="rounded-lg border bg-panel p-4">
            <h2 className="text-sm font-semibold">Safe import steps</h2>
            <div className="mt-4 space-y-3">
              {[
                ["1", "Upload file", "CSV, Excel, JSON, map files, or historical exports."],
                ["2", "Match columns", "Save mappings for repeated beneficiary or indicator imports."],
                ["3", "Fix issues", "Review missing names, invalid GPS, duplicates, and bad dates."],
                ["4", "Import safely", "Partial import, version tracking, and rollback stay available."]
              ].map(([step, title, copy]) => (
                <div key={step} className="grid grid-cols-[28px_1fr] gap-3 rounded-md border bg-background p-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-sm font-semibold text-primary">{step}</span>
                  <span>
                    <span className="block text-sm font-medium">{title}</span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">{copy}</span>
                  </span>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-lg border bg-panel p-4">
            <h2 className="text-sm font-semibold">Migration sources</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {migrationSources.map((source) => <Badge key={source} tone="neutral">{source}</Badge>)}
            </div>
          </section>
        </aside>

        <div className="min-w-0 space-y-5">
          {importJobsQuery.data?.length ? (
            <DataTable columns={serverImportColumnsDef} emptyLabel="No import jobs yet" rows={importJobsQuery.data} searchLabel="Search imports" title="Import history" />
          ) : (
            <DataTable columns={importColumnsDef} emptyLabel="No import jobs yet" rows={importJobs} searchLabel="Search imports" title="Import history" />
          )}

          <section className="rounded-lg border bg-panel p-4">
            <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Column mapping</h2>
              <p className="mt-1 text-xs text-muted-foreground">The system suggests matches. Users can adjust and save the mapping for next time.</p>
            </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    setDataResult(`${datasetType.replaceAll("_", " ")} column mapping was saved for future imports. Atlas will reuse these matches when similar files are uploaded.`);
                    pushToast({
                      title: "Mapping saved",
                      description: `${datasetType.replaceAll("_", " ")} column mapping will be reused on the next import.`,
                      tone: "success"
                    });
                  }}
                  size="sm"
                  type="button"
                  variant="secondary"
                >
                  <Save aria-hidden="true" /> Save mapping
                </Button>
                <Button
                  disabled={!selectedImportId || !canUpload || selectedImportIsApplied || applyMutation.isPending}
                  onClick={() => applyMutation.mutate()}
                  size="sm"
                  variant="primary"
                >
                  <CheckCircle2 aria-hidden="true" />
                  {applyMutation.isPending ? "Applying" : selectedImportIsApplied ? "Already applied" : "Apply to registry"}
                </Button>
              </div>
            </div>
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {importColumns.map((column) => (
                <div key={column.source} className="rounded-md border bg-background p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">{column.source}</p>
                    <Badge tone={column.confidence === "High" ? "success" : "warning"}>{column.confidence}</Badge>
                  </div>
                  <p className="mt-2 rounded bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">{column.target}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>

      <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0 rounded-lg border bg-panel p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Validation issues</h2>
              <p className="mt-1 text-xs text-muted-foreground">Row-level feedback keeps imports understandable and safe.</p>
            </div>
            <Button
              onClick={() => {
                const fallbackIssues = serverIssueRows.length || importValidationIssues.length;
                setDataResult(
                  fallbackIssues
                    ? `${fallbackIssues} row${fallbackIssues === 1 ? "" : "s"} still need review before import. Fix missing values, invalid GPS, duplicates, or date issues first.`
                    : "No blocking validation issues were found. This dataset is ready for safe import."
                );
                pushToast({
                  title: "Validation rechecked",
                  description: fallbackIssues
                    ? `${fallbackIssues} row${fallbackIssues === 1 ? "" : "s"} still need attention before import.`
                    : "No blocking issues were found in the current import preview.",
                  tone: fallbackIssues ? "warning" : "success"
                });
              }}
              size="sm"
              type="button"
              variant="secondary"
            >
              <RefreshCw aria-hidden="true" /> Recheck
            </Button>
          </div>
          <div className="space-y-2">
            {serverImportRows.length ? (
              serverIssueRows.length ? (
                serverIssueRows.map((row) => (
                  <div key={row.id} className="grid gap-3 rounded-md border bg-background p-3 md:grid-cols-[80px_120px_1fr_auto] md:items-center">
                    <span className="text-sm font-medium">Row {row.row_number}</span>
                    <span className="text-sm text-muted-foreground">Imported data</span>
                    <span>
                      <span className="block text-sm font-medium">{row.validation_status.replaceAll("_", " ")}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">Edit this row before applying the import.</span>
                    </span>
                    <Badge tone={row.validation_status === "conflict" ? "danger" : "warning"}>{row.issue_count || 1} issue</Badge>
                  </div>
                ))
              ) : (
                <div className="rounded-md border border-success/25 bg-success/10 p-3 text-sm text-success">
                  This import has no blocking validation issues and can be applied to the live registry.
                </div>
              )
            ) : (
              importValidationIssues.map((issue) => (
                <div key={`${issue.row}-${issue.field}`} className="grid gap-3 rounded-md border bg-background p-3 md:grid-cols-[80px_120px_1fr_auto] md:items-center">
                  <span className="text-sm font-medium">Row {issue.row}</span>
                  <span className="text-sm text-muted-foreground">{issue.field}</span>
                  <span>
                    <span className="block text-sm font-medium">{issue.issue}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{issue.fix}</span>
                  </span>
                  <Badge tone={issue.severity === "Error" ? "danger" : "warning"}>{issue.severity}</Badge>
                </div>
              ))
            )}
          </div>
        </section>

        <aside className="rounded-lg border bg-panel p-4">
          <h2 className="text-sm font-semibold">Conflict resolution</h2>
          <div className="mt-4 space-y-3 text-sm">
            {["Update existing records by ID", "Flag duplicate beneficiaries", "Keep prior version for rollback", "Ask supervisor before overwriting reviewed data"].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <CheckCircle2 aria-hidden="true" className="text-success" size={16} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </aside>
      </section>

      {serverImportRows.length ? (
        <DataTable columns={realEditableColumns} emptyLabel="No rows ready for editing" rows={serverImportRows} searchLabel="Search editable rows" title="Editable imported rows" />
      ) : (
        <DataTable columns={editableColumns} emptyLabel="No rows ready for editing" rows={editableRows} searchLabel="Search editable rows" title="Spreadsheet editing preview" />
      )}

      <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <DataTable columns={exportColumns} emptyLabel="No export jobs yet" rows={exportJobs} searchLabel="Search exports" title="Exports and scheduled files" />
        <aside className="rounded-lg border bg-panel p-4">
          <h2 className="text-sm font-semibold">Export formats</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Prepare filtered files for donors, supervisors, GIS tools, migration packages, or external systems.</p>
          <div className="mt-4 space-y-2">
            {exportFormatCatalog.map((format) => (
              <div className="rounded-md border bg-background p-3" key={format.format}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{format.format}</p>
                  <Badge tone="accent">{format.readiness}</Badge>
                </div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{format.use}</p>
              </div>
            ))}
          </div>
          <Button
            className="mt-5 w-full"
            disabled={exportMutation.isPending}
            onClick={() => {
              if (!canUpload) {
                setDataResult("Preview ZIP export prepared. It would include reviewed media, audit records, and selected dataset files when export access is available.");
                pushToast({ title: "Preview export prepared", description: "A ZIP package preview is ready for review.", tone: "success" });
                return;
              }
              exportMutation.mutate();
            }}
            type="button"
          >
            <Download aria-hidden="true" />
            {exportMutation.isPending ? "Creating export" : "Create ZIP export"}
          </Button>
        </aside>
      </section>

      <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        {mediaEvidenceQuery.data?.length ? (
          <DataTable columns={serverMediaColumns} emptyLabel="No media evidence yet" rows={mediaEvidenceQuery.data} searchLabel="Search media evidence" title="Media gallery and evidence review" />
        ) : (
          <DataTable columns={mediaColumns} emptyLabel="No media evidence yet" rows={mediaEvidenceItems} searchLabel="Search media evidence" title="Media gallery and evidence review" />
        )}
        <aside className="rounded-lg border bg-panel p-4">
          <h2 className="text-sm font-semibold">Media evidence workflow</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Photos, signatures, audio, video, and files are treated as linked evidence. Review status, record links, file size, and location stay visible before export.
          </p>
          <div className="mt-4 space-y-2">
            {["Link every file to a form submission or beneficiary record", "Keep media review separate from data approval when needed", "Package media with ZIP exports for migration and audit", "Flag large files before mobile sync windows close"].map((item) => (
              <div className="flex gap-2 rounded-md border bg-background p-3 text-sm" key={item}>
                <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0 text-success" size={15} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </aside>
      </section>

      {publicLinksQuery.data?.length ? (
        <section className="rounded-lg border bg-panel p-4">
          <h2 className="text-sm font-semibold">Live public collection links</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {publicLinksQuery.data.map((link) => (
              <article className="rounded-md border bg-background p-3" key={link.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{link.title}</p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">{link.public_url}</p>
                  </div>
                  <Badge tone={link.status === "active" ? "success" : "neutral"}>{link.status}</Badge>
                </div>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  {link.access_mode} · {link.require_authentication ? "login required" : "open access"} · {link.submission_count} submissions
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <DataTable columns={sharingColumns} emptyLabel="No sharing roles configured" rows={sharingPermissionMatrix} searchLabel="Search sharing roles" title="Project sharing and public collection permissions" />
    </section>
  );
}
