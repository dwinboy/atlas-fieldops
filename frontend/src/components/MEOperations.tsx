"use client";

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
  RefreshCw,
  Save,
  Smartphone,
  WalletCards,
  UploadCloud,
  UsersRound
} from "lucide-react";
import type { ReactNode } from "react";

import { DataTable, type TableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/status-dot";
import {
  beneficiaries,
  beneficiaryProfileConnections,
  cases,
  dataQualitySignals,
  donorReports,
  editableRows,
  enterpriseOperations,
  exportJobs,
  importColumns,
  importJobs,
  importValidationIssues,
  indicators,
  mapCoverage,
  migrationSources,
  operationalEvents,
  operationalFlow,
  programs
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
  return (
    <Button
      onClick={() => pushToast({ title, description, tone: "success" })}
      type="button"
      variant={variant}
    >
      {children}
    </Button>
  );
}

export function EnterpriseOperationsCenter() {
  return (
    <section aria-labelledby="enterprise-ops-title" className="space-y-5">
      <PageHeader
        eyebrow="Enterprise operations"
        title="Governance, resources, budgets, and work in one place"
        description="Connect regional structures, approval chains, assets, documents, budgets, tasks, and interventions to the same operational workflow graph."
        action={<ActionButton title="Connected record ready" description="A governed operational record workflow has been opened."><Plus aria-hidden="true" /> Create connected record</ActionButton>}
      />

      <div className="grid gap-4 md:grid-cols-4">
        {[
          ["Regional units", "3", Boxes],
          ["Live workflows", "3", CheckCircle2],
          ["Tracked resources", "258", Smartphone],
          ["Budget utilization", "64%", WalletCards]
        ].map(([label, value, Icon]) => (
          <article className="rounded-lg border bg-panel p-4 shadow-line" key={label as string}>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{label as string}</p>
              <Icon aria-hidden="true" className="text-muted-foreground" size={17} />
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight">{value as string}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <ConnectedPanel title="Organizational hierarchy" description="Regional data isolation, accountability, and approval routing all begin here.">
          {enterpriseOperations.units.map((unit) => (
            <div className="rounded-md border bg-background p-3" key={unit.name}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">{unit.name}</p>
                <Badge tone="success">{unit.status}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{unit.type} · {unit.region} · {unit.owner}</p>
            </div>
          ))}
        </ConnectedPanel>

        <ConnectedPanel title="Approval workflows" description="Workflow definitions drive queues, SLA tracking, corrections, and escalations.">
          {enterpriseOperations.workflows.map((workflow) => (
            <div className="rounded-md border bg-background p-3" key={workflow.name}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">{workflow.name}</p>
                <Badge tone="accent">{workflow.sla}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{workflow.steps} · {workflow.status}</p>
            </div>
          ))}
        </ConnectedPanel>

        <ConnectedPanel title="Resources and assets" description="Devices, vehicles, and supplies are assigned to projects, field teams, and regions.">
          {enterpriseOperations.resources.map((resource) => (
            <div className="rounded-md border bg-background p-3" key={resource.name}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">{resource.name}</p>
                <Badge tone="neutral">{resource.status}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{resource.type} · {resource.assigned}</p>
            </div>
          ))}
        </ConnectedPanel>

        <ConnectedPanel title="Budgets and documents" description="Operational spending and knowledge artifacts stay linked to projects, interventions, evidence, and reports.">
          {enterpriseOperations.finance.map((line) => (
            <div className="rounded-md border bg-background p-3" key={line.category}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">{line.category}</p>
                <Badge tone="accent">{line.utilization}% used</Badge>
              </div>
              <ProgressBar value={line.utilization} />
              <p className="mt-2 text-xs text-muted-foreground">{line.spent} spent of {line.allocated}</p>
            </div>
          ))}
          {enterpriseOperations.documents.map((document) => (
            <div className="flex items-center gap-3 rounded-md border bg-background p-3" key={document.title}>
              <FileText aria-hidden="true" className="text-muted-foreground" size={17} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{document.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{document.type} · {document.link}</p>
              </div>
              <Badge tone="success">{document.status}</Badge>
            </div>
          ))}
        </ConnectedPanel>
      </div>
    </section>
  );
}

export function OperationalEcosystem() {
  return (
    <section aria-labelledby="ecosystem-title" className="space-y-5">
      <PageHeader
        eyebrow="Operational ecosystem"
        title="One connected field operations system"
        description="See how programs, people, forms, submissions, approvals, analytics, and follow-ups work together as one operational chain."
        action={<ActionButton title="Live context recalculated" description="Programs, submissions, indicators, approvals, and reports are synced."><RefreshCw aria-hidden="true" /> Recalculate live context</ActionButton>}
      />

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
            <article className="relative rounded-lg border bg-background p-3" key={node.id}>
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
            </article>
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
              <div className="grid gap-3 p-4 md:grid-cols-[180px_1fr_92px]" key={`${item.event}-${item.age}`}>
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
              </div>
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
              <div className="rounded-md border bg-background p-3" key={item.label}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{item.label}</p>
                  <Badge tone="neutral">{item.value}</Badge>
                </div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.note}</p>
              </div>
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
          <article className="rounded-lg border bg-panel p-4 shadow-line" key={title}>
            <h2 className="text-sm font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function BeneficiaryRegistry() {
  const columns: TableColumn<Beneficiary>[] = [
    {
      key: "name",
      header: "Beneficiary",
      value: (row) => `${row.name} ${row.uid} ${row.type}`,
      render: (row) => (
        <div>
          <p className="font-medium">{row.name}</p>
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
      <div className="grid gap-3 md:grid-cols-4">
        {[
          ["Registered", "98,220", UsersRound],
          ["Visited this month", "41,382", BadgeCheck],
          ["Possible duplicates", "214", AlertTriangle],
          ["With GPS", "92%", MapPin]
        ].map(([label, value, Icon]) => (
          <article key={label as string} className="rounded-lg border bg-panel p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{label as string}</p>
              <Icon aria-hidden="true" className="text-muted-foreground" size={17} />
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight">{value as string}</p>
          </article>
        ))}
      </div>
      <DataTable columns={columns} emptyLabel="No beneficiaries yet" rows={beneficiaries} searchLabel="Search people, IDs, villages, or programs" title="Registry" />
    </section>
  );
}

export function ProgramManagement() {
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
      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <DataTable columns={columns} emptyLabel="No programs yet" rows={programs} searchLabel="Search programs, donors, or regions" title="Active programs" />
        <aside className="rounded-lg border bg-panel p-4">
          <h2 className="text-sm font-semibold">Next milestones</h2>
          <div className="mt-4 space-y-3">
            {programs.map((program) => (
              <div key={program.id} className="rounded-md border bg-background p-3">
                <p className="text-sm font-medium">{program.nextMilestone}</p>
                <p className="mt-1 text-xs text-muted-foreground">{program.name}</p>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}

export function IndicatorTracking() {
  const columns: TableColumn<Indicator>[] = [
    { key: "code", header: "Code", value: (row) => row.code, render: (row) => <span className="font-mono text-xs">{row.code}</span> },
    { key: "name", header: "Indicator", value: (row) => row.name, render: (row) => row.name },
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
      <DataTable columns={columns} emptyLabel="No indicators yet" rows={indicators} searchLabel="Search indicators" title="KPI registry" />
    </section>
  );
}

export function CaseManagement() {
  const columns: TableColumn<CaseItem>[] = [
    { key: "id", header: "Case", value: (row) => row.id, render: (row) => <span className="font-mono text-xs">{row.id}</span> },
    {
      key: "title",
      header: "Follow-up",
      value: (row) => `${row.title} ${row.beneficiary}`,
      render: (row) => (
        <div>
          <p className="font-medium">{row.title}</p>
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
      <DataTable columns={columns} emptyLabel="No cases yet" rows={cases} searchLabel="Search cases" title="Open follow-ups" />
    </section>
  );
}

export function GeospatialIntelligence() {
  return (
    <section className="space-y-5">
      <PageHeader
        eyebrow="Map"
        title="Geospatial coverage"
        description="See where field work is happening, where coverage is weak, and which areas need supervisor attention."
        action={<ActionButton title="GeoJSON export prepared" description="Coverage layers are ready for GIS export." variant="secondary"><Download aria-hidden="true" /> Export GeoJSON</ActionButton>}
      />
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
              <div key={region.region} className="flex flex-col justify-between rounded-lg border bg-panel p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{region.region}</p>
                  <MapPin aria-hidden="true" className="text-primary" size={18} />
                </div>
                <div className="mt-8">
                  <ProgressBar value={region.coverage} />
                  <p className="mt-2 text-sm text-muted-foreground">{region.coverage}% coverage · {region.submissions.toLocaleString()} submissions</p>
                </div>
              </div>
            ))}
          </div>
        </section>
        <aside className="rounded-lg border bg-panel p-4">
          <h2 className="text-sm font-semibold">Map layers</h2>
          <div className="mt-4 space-y-2">
            {["Villages", "Farm boundaries", "Clinic catchments", "Supervisor routes", "Offline map packs"].map((layer) => (
              <div key={layer} className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-sm">
                <span>{layer}</span>
                <Badge tone="accent">Ready</Badge>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}

export function ReportingCenter() {
  const columns: TableColumn<DonorReport>[] = [
    { key: "name", header: "Report", value: (row) => `${row.name} ${row.donor}`, render: (row) => <div><p className="font-medium">{row.name}</p><p className="mt-0.5 text-xs text-muted-foreground">{row.donor} · {row.period}</p></div> },
    { key: "type", header: "Type", value: (row) => row.type, render: (row) => row.type },
    { key: "formats", header: "Exports", value: (row) => row.formats, render: (row) => row.formats },
    { key: "status", header: "Status", value: (row) => row.status, render: (row) => <Badge tone={row.status === "Ready for review" ? "success" : row.status === "Needs data" ? "warning" : "neutral"}>{row.status}</Badge> }
  ];

  return (
    <section className="space-y-5">
      <PageHeader
        eyebrow="Reports"
        title="Donor reporting"
        description="Prepare indicator reports, narrative summaries, logframes, and map exports for donors and program teams."
        action={<ActionButton title="Report builder opened" description="Donor report sections and live operational data are ready."><Plus aria-hidden="true" /> New report</ActionButton>}
      />
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <DataTable columns={columns} emptyLabel="No reports yet" rows={donorReports} searchLabel="Search reports" title="Reporting center" />
        <aside className="space-y-4">
          <section className="rounded-lg border bg-panel p-4">
            <h2 className="text-sm font-semibold">AI report assistant</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Draft narrative summaries from approved indicators, cases, maps, and field activity.</p>
            <Button className="mt-4 w-full"><ArrowUpRight aria-hidden="true" /> Draft summary</Button>
          </section>
          <section className="rounded-lg border bg-panel p-4">
            <h2 className="text-sm font-semibold">White-label exports</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Use organization branding, logo, custom colors, and donor-specific formats.</p>
          </section>
        </aside>
      </div>
    </section>
  );
}

export function ConnectivityCenter() {
  return (
    <section className="space-y-5">
      <PageHeader
        eyebrow="Connectivity"
        title="Offline and communication center"
        description="Keep field teams confident when networks are weak with clear sync, retry, SMS, and WhatsApp readiness."
        action={<ActionButton title="Retry queue started" description="Failed uploads, media, and sync batches have been queued for retry."><RefreshCw aria-hidden="true" /> Retry failed uploads</ActionButton>}
      />
      <div className="grid gap-3 md:grid-cols-4">
        {[
          ["Delta sync", "On", RefreshCw],
          ["Compressed uploads", "480 KB photos", Smartphone],
          ["SMS alerts", "Ready", Bell],
          ["WhatsApp", "Configured", MessageCircle]
        ].map(([label, value, Icon]) => (
          <article key={label as string} className="rounded-lg border bg-panel p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{label as string}</p>
              <Icon aria-hidden="true" className="text-muted-foreground" size={17} />
            </div>
            <p className="mt-3 text-xl font-semibold tracking-tight">{value as string}</p>
          </article>
        ))}
      </div>
      <section className="rounded-lg border bg-panel p-4">
        <h2 className="text-sm font-semibold">Data quality and fraud signals</h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {dataQualitySignals.map((item) => (
            <div key={item.signal} className="rounded-md border bg-background p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">{item.signal}</p>
                <Badge tone={item.severity === "High" ? "danger" : "warning"}>{item.confidence}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{item.action}</p>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

export function DataInteroperabilityCenter() {
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
  const editableColumns: TableColumn<EditableRow>[] = [
    { key: "id", header: "ID", value: (row) => row.id, render: (row) => <span className="font-mono text-xs">{row.id}</span> },
    { key: "name", header: "Name", value: (row) => row.name, render: (row) => <input aria-label={`Name for ${row.id}`} className="w-full rounded border bg-background px-2 py-1" defaultValue={row.name} /> },
    { key: "village", header: "Village", value: (row) => row.village, render: (row) => <input aria-label={`Village for ${row.id}`} className="w-full rounded border bg-background px-2 py-1" defaultValue={row.village} /> },
    { key: "phone", header: "Phone", value: (row) => row.phone, render: (row) => <input aria-label={`Phone for ${row.id}`} className="w-full rounded border bg-background px-2 py-1" defaultValue={row.phone} /> },
    { key: "sync", header: "Save status", value: (row) => row.sync, render: (row) => <Badge tone={row.sync === "Synced" ? "success" : row.sync === "Waiting to sync" ? "warning" : "neutral"}>{row.sync}</Badge> }
  ];
  const exportColumns: TableColumn<ExportJob>[] = [
    { key: "name", header: "Dataset", value: (row) => row.name, render: (row) => row.name },
    { key: "format", header: "Format", value: (row) => row.format, render: (row) => row.format },
    { key: "filter", header: "View", value: (row) => row.filter, render: (row) => row.filter },
    { key: "schedule", header: "Schedule", value: (row) => row.schedule, render: (row) => row.schedule },
    { key: "status", header: "Status", value: (row) => row.status, render: (row) => <Badge tone={row.status === "Ready" ? "success" : "accent"}>{row.status}</Badge> }
  ];

  return (
    <section className="space-y-5">
      <PageHeader
        eyebrow="Data"
        title="Import, clean, edit, and export"
        description="Bring in spreadsheets, map files, historical exports, and operational datasets with safe validation, mapping, bulk edits, and rollback."
        action={<ActionButton title="Upload workflow opened" description="CSV, Excel, JSON, GeoJSON, and historical migration validation are ready."><UploadCloud aria-hidden="true" /> Upload data</ActionButton>}
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

      <section className="grid min-w-0 gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-4">
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
          <DataTable columns={importColumnsDef} emptyLabel="No import jobs yet" rows={importJobs} searchLabel="Search imports" title="Import history" />

          <section className="rounded-lg border bg-panel p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">Column mapping</h2>
                <p className="mt-1 text-xs text-muted-foreground">The system suggests matches. Users can adjust and save the mapping for next time.</p>
              </div>
              <Button size="sm"><Save aria-hidden="true" /> Save mapping</Button>
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
            <Button size="sm" variant="secondary"><RefreshCw aria-hidden="true" /> Recheck</Button>
          </div>
          <div className="space-y-2">
            {importValidationIssues.map((issue) => (
              <div key={`${issue.row}-${issue.field}`} className="grid gap-3 rounded-md border bg-background p-3 md:grid-cols-[80px_120px_1fr_auto] md:items-center">
                <span className="text-sm font-medium">Row {issue.row}</span>
                <span className="text-sm text-muted-foreground">{issue.field}</span>
                <span>
                  <span className="block text-sm font-medium">{issue.issue}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{issue.fix}</span>
                </span>
                <Badge tone={issue.severity === "Error" ? "danger" : "warning"}>{issue.severity}</Badge>
              </div>
            ))}
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

      <DataTable columns={editableColumns} emptyLabel="No rows ready for editing" rows={editableRows} searchLabel="Search editable rows" title="Spreadsheet editing preview" />

      <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <DataTable columns={exportColumns} emptyLabel="No export jobs yet" rows={exportJobs} searchLabel="Search exports" title="Exports and scheduled files" />
        <aside className="rounded-lg border bg-panel p-4">
          <h2 className="text-sm font-semibold">Export formats</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Prepare filtered CSV, XLSX, PDF, JSON, and GeoJSON exports for donors, supervisors, or external systems.</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {["CSV", "XLSX", "PDF", "JSON", "GeoJSON"].map((format) => <Badge key={format} tone="accent">{format}</Badge>)}
          </div>
          <Button className="mt-5 w-full"><Download aria-hidden="true" /> Create export</Button>
        </aside>
      </section>
    </section>
  );
}
