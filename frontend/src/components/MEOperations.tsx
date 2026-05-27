"use client";

import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  Bell,
  Download,
  MapPin,
  MessageCircle,
  Plus,
  RefreshCw,
  Smartphone,
  UsersRound
} from "lucide-react";
import type { ReactNode } from "react";

import { DataTable, type TableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/status-dot";
import {
  beneficiaries,
  cases,
  dataQualitySignals,
  donorReports,
  indicators,
  mapCoverage,
  programs
} from "@/lib/mockData";

type Beneficiary = (typeof beneficiaries)[number];
type Program = (typeof programs)[number];
type Indicator = (typeof indicators)[number];
type CaseItem = (typeof cases)[number];
type DonorReport = (typeof donorReports)[number];

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
        action={<Button variant="primary"><Plus aria-hidden="true" /> Register beneficiary</Button>}
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
        action={<Button variant="primary"><Plus aria-hidden="true" /> New program</Button>}
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
        action={<Button variant="primary"><Plus aria-hidden="true" /> Add indicator</Button>}
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
        action={<Button variant="primary"><Plus aria-hidden="true" /> Open case</Button>}
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
        action={<Button><Download aria-hidden="true" /> Export GeoJSON</Button>}
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
        action={<Button variant="primary"><Plus aria-hidden="true" /> New report</Button>}
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
        action={<Button variant="primary"><RefreshCw aria-hidden="true" /> Retry failed uploads</Button>}
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
