import {
  ArrowRight,
  Check,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  Database,
  FileText,
  Layers3,
  MapPin,
  RadioTower,
  ShieldCheck,
  Smartphone,
  UsersRound,
  Workflow,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  architectureLayers,
  industries,
  metrics,
  operatingFlow,
  platformModules,
  platformFeatures,
  pricingTiers,
  sectorCapabilities,
  trustLogos,
  workflowSteps,
} from "@/lib/marketing/content";
import { cn } from "@/lib/utils";

export function SectionIntro({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0d9488]">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#0c1f1b] md:text-4xl">{title}</h2>
      <p className="mt-4 text-base leading-7 text-[#5b6a65]">{text}</p>
    </div>
  );
}

export function HeroMockup() {
  return (
    <div className="relative mx-auto mt-6 max-w-6xl pb-3">
      <div className="absolute -inset-4 rounded-[28px] bg-[#0d9488]/10 blur-2xl" />
      <div className="relative overflow-hidden rounded-[28px] border border-black/10 bg-[#0c1f1b] shadow-2xl">
        <div className="soft-grid absolute inset-0 opacity-25" />
        <div className="grid min-h-[470px] lg:grid-cols-[1fr_360px]">
          <div className="p-4 sm:p-6">
            <div className="surface-premium rounded-2xl bg-[#fafaf8] p-4 shadow-xl">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0d9488]">Operations center</p>
                  <h3 className="mt-1 text-lg font-semibold">Climate-smart agriculture program</h3>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Live sync</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                {metrics.map((metric) => (
                  <div className="rounded-lg border bg-white p-3" key={metric.label}>
                    <p className="text-xl font-semibold text-[#b45309]">{metric.value}</p>
                    <p className="mt-1 text-xs leading-5 text-[#5b6a65]">{metric.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-lg border bg-white p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Connected workflow</h4>
                    <RadioTower className="text-[#0d9488]" size={17} />
                  </div>
                  <div className="mt-4 grid gap-2">
                    {workflowSteps.slice(0, 7).map((step, index) => (
                      <div className="flex items-center gap-3 rounded-md bg-[#f1f5f3] p-2 text-sm" key={step}>
                        <span className="flex h-6 w-6 items-center justify-center rounded bg-white text-xs font-semibold">{index + 1}</span>
                        <span>{step}</span>
                        <ArrowRight className="ml-auto text-[#8b9793]" size={14} />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border bg-white p-4">
                  <h4 className="text-sm font-semibold">Coverage map</h4>
                  <div className="mt-4 grid h-56 place-items-center rounded-xl bg-[#e7f0ed]">
                    <div className="relative h-44 w-44 rounded-full border border-[#0d9488]/20 bg-white/70 shadow-inner">
                      <span className="absolute left-10 top-8 flex h-8 w-8 items-center justify-center rounded-full bg-[#0d9488] text-white shadow-lg">
                        <MapPin size={15} />
                      </span>
                      <span className="absolute right-8 top-14 flex h-8 w-8 items-center justify-center rounded-full bg-[#0d9488] text-white shadow-lg">
                        <MapPin size={15} />
                      </span>
                      <span className="absolute bottom-8 left-16 flex h-8 w-8 items-center justify-center rounded-full bg-[#0d9488] text-white shadow-lg">
                        <MapPin size={15} />
                      </span>
                      <span className="absolute bottom-14 right-12 flex h-8 w-8 items-center justify-center rounded-full bg-[#0d9488] text-white shadow-lg">
                        <MapPin size={15} />
                      </span>
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-[#5b6a65]">GPS evidence, village coverage, farm boundaries, and officer routes.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="relative overflow-hidden p-6">
            <Image
              alt="Field officers collecting data with a tablet"
              className="object-cover"
              fill
              priority
              sizes="360px"
              src="/marketing/field-operations-hero.png"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0c1f1b]/78 via-[#0c1f1b]/18 to-transparent" />
            <div className="relative flex h-full flex-col justify-end">
              <div className="rounded-2xl border border-white/25 bg-white/88 p-4 shadow-2xl backdrop-blur">
                <div className="flex items-center gap-3">
                  <Smartphone className="text-[#0d9488]" />
                  <div>
                    <p className="text-sm font-semibold">Offline mobile collection</p>
                    <p className="text-xs text-[#5b6a65]">812 records waiting to sync safely.</p>
                  </div>
                </div>
                <div className="animated-sync-bar mt-4 h-2 rounded-full bg-[#d7e4df]">
                  <div className="h-full w-[72%] rounded-full bg-[#0d9488]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FeatureGrid() {
  return (
    <div className="mx-auto mt-12 grid max-w-7xl gap-4 px-4 sm:px-6 md:grid-cols-2 lg:grid-cols-3 lg:px-8">
      {platformFeatures.map((feature) => {
        const Icon = feature.icon;
        return (
          <article className="rounded-xl border border-black/10 bg-white p-6 shadow-sm" key={feature.title}>
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#0d9488]/10 text-[#0d9488]">
              <Icon size={20} />
            </div>
            <h3 className="mt-5 text-lg font-semibold">{feature.title}</h3>
            <p className="mt-2 text-sm leading-6 text-[#5b6a65]">{feature.text}</p>
          </article>
        );
      })}
    </div>
  );
}

export function TrustedBy() {
  return (
    <section className="border-y border-black/10 bg-white/70 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-[#6a7773]">Built for serious field operations</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {trustLogos.map((logo) => (
            <span className="text-sm font-semibold tracking-wide text-[#5b6a65]" key={logo}>
              {logo}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

export function WorkflowShowcase() {
  return (
    <section className="py-20">
      <SectionIntro
        eyebrow="Unified workflow"
        title="Every action updates the operational system"
        text="Submissions, entity changes, approvals, GPS evidence, imports, and interventions propagate through dashboards, reports, maps, notifications, and supervisor queues."
      />
      <div className="mx-auto mt-12 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-3 md:grid-cols-5">
          {workflowSteps.map((step, index) => (
            <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm" key={step}>
              <p className="text-xs font-semibold text-[#0d9488]">{String(index + 1).padStart(2, "0")}</p>
              <p className="mt-3 text-sm font-semibold">{step}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function OperatingFlowGraphic() {
  const icons = [Layers3, ClipboardCheck, RadioTower, Smartphone, ShieldCheck, FileText];

  return (
    <section className="bg-white py-20">
      <SectionIntro
        eyebrow="How the platform works"
        title="One clear path from setup to trusted operational data"
        text="Atlas FieldOps is built around the way field organizations actually work: configure the context, collect evidence, review it, and turn approved data into action."
      />
      <ol className="mx-auto mt-12 grid max-w-7xl gap-4 px-4 sm:px-6 lg:grid-cols-6 lg:px-8">
        {operatingFlow.map((step, index) => {
          const Icon = icons[index % icons.length];
          return (
            <li className="group relative rounded-2xl border border-black/10 bg-[#fafaf8] p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg" key={step.title}>
              {index < operatingFlow.length - 1 ? (
                <span className="absolute -right-3 top-10 z-10 hidden h-6 w-6 items-center justify-center rounded-full border border-[#0d9488]/20 bg-white text-[#0d9488] shadow-sm lg:flex">
                  <ArrowRight size={14} />
                </span>
              ) : null}
              <div className="flex items-center justify-between gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0c1f1b] text-white shadow-lg shadow-[#0c1f1b]/10">
                  <Icon size={20} />
                </span>
                <span className="rounded-full bg-[#0d9488]/10 px-2 py-1 font-mono text-[11px] font-semibold text-[#0d9488]">0{index + 1}</span>
              </div>
              <h3 className="mt-5 text-base font-semibold leading-5 text-[#0c1f1b]">{step.title}</h3>
              <p className="mt-2 text-xs leading-5 text-[#5b6a65]">{step.text}</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function ArchitectureGraphic() {
  const firstColumn = architectureLayers.slice(0, 4);
  const secondColumn = architectureLayers.slice(4);

  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 rounded-[24px] border border-black/10 bg-[#0c1f1b] p-6 text-white shadow-2xl md:p-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5eead4]">Architecture</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Built as an operational data system, not just a survey tool.</h2>
          <p className="mt-4 text-sm leading-7 text-white/70">
            Every record keeps its organization, project, entity, form version, user, location, review state, and audit trail so data can move safely from mobile capture to dashboards and reports.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              ["Multi-tenant", "Tenant isolation"],
              ["Offline-ready", "Mobile sync"],
              ["Governed", "Audit history"],
            ].map(([label, text]) => (
              <div className="rounded-lg border border-white/12 bg-white/8 p-3" key={label}>
                <p className="text-sm font-semibold">{label}</p>
                <p className="mt-1 text-xs text-white/60">{text}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="relative rounded-2xl border border-white/12 bg-white/[0.06] p-4">
          <div className="absolute inset-x-10 top-1/2 hidden h-px bg-gradient-to-r from-transparent via-[#5eead4]/45 to-transparent lg:block" />
          <div className="grid gap-4 lg:grid-cols-[1fr_170px_1fr] lg:items-center">
            <div className="grid gap-3">
              {firstColumn.map(([layer, text], index) => (
                <div className="rounded-xl border border-white/10 bg-white/[0.08] p-4" key={layer}>
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#5eead4] font-mono text-xs font-semibold text-[#0c1f1b]">
                      {index + 1}
                    </span>
                    <span className="text-sm font-semibold">{layer}</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-white/62">{text}</p>
                </div>
              ))}
            </div>
            <div className="relative z-10 rounded-2xl border border-[#5eead4]/35 bg-[#5eead4] p-4 text-[#0c1f1b] shadow-2xl shadow-[#5eead4]/10">
              <Database size={24} />
              <h3 className="mt-3 text-sm font-semibold">Trusted data core</h3>
              <p className="mt-2 text-xs leading-5 text-[#16433b]">Every record keeps tenant, project, entity, form version, location, user, status, and audit context.</p>
            </div>
            <div className="grid gap-3">
              {secondColumn.map(([layer, text], index) => (
                <div className="rounded-xl border border-white/10 bg-white/[0.08] p-4" key={layer}>
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white/14 font-mono text-xs font-semibold text-[#5eead4]">
                      {index + firstColumn.length + 1}
                    </span>
                    <span className="text-sm font-semibold">{layer}</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-white/62">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ModuleEcosystemGraphic() {
  const modules = platformModules.slice(0, 10);
  const icons = [Layers3, ClipboardList, RadioTower, ClipboardCheck, MapPin, Database, FileText, ShieldCheck, UsersRound, Workflow];

  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionIntro
          eyebrow="Module ecosystem"
          title="Each module has a job, but the data stays connected"
          text="The public pages now show Atlas FieldOps as one operating system: projects sit at the center, and every module contributes to collection, control, analysis, or action."
        />
        <div className="relative mt-12 rounded-[24px] border border-black/10 bg-white p-5 shadow-sm md:p-8">
          <div className="soft-grid absolute inset-0 opacity-40" />
          <div className="relative grid gap-4 md:grid-cols-2 lg:grid-cols-[1fr_220px_1fr] lg:items-center">
            <div className="grid gap-3">
              {modules.slice(0, 5).map(([title, text], index) => {
                const Icon = icons[index];
                return (
                  <article className="rounded-xl border border-black/10 bg-[#fafaf8] p-4 shadow-sm" key={title}>
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0d9488]/10 text-[#0d9488]">
                        <Icon size={18} />
                      </span>
                      <h3 className="text-sm font-semibold text-[#0c1f1b]">{title}</h3>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[#5b6a65]">{text}</p>
                  </article>
                );
              })}
            </div>
            <div className="relative rounded-2xl border border-[#0d9488]/20 bg-[#0d9488] p-5 text-white shadow-2xl shadow-[#0d9488]/15">
              <span className="absolute -left-3 top-1/2 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#0d9488] shadow lg:flex">
                <ArrowRight size={14} />
              </span>
              <span className="absolute -right-3 top-1/2 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#0d9488] shadow lg:flex">
                <ArrowRight size={14} />
              </span>
              <Layers3 size={26} />
              <h3 className="mt-3 text-xl font-semibold">Project workspace</h3>
              <p className="mt-2 text-sm leading-6 text-white/78">Sector, geography, forms, teams, entities, rules, collection, and reporting stay anchored to the same project context.</p>
            </div>
            <div className="grid gap-3">
              {modules.slice(5, 10).map(([title, text], offset) => {
                const index = offset + 5;
                const Icon = icons[index];
                return (
                  <article className="rounded-xl border border-black/10 bg-[#fafaf8] p-4 shadow-sm" key={title}>
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0d9488]/10 text-[#0d9488]">
                        <Icon size={18} />
                      </span>
                      <h3 className="text-sm font-semibold text-[#0c1f1b]">{title}</h3>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[#5b6a65]">{text}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function SectorAdaptabilityShowcase() {
  const primarySectors = sectorCapabilities.slice(0, 9);
  const customSector = sectorCapabilities.find(([sector]) => sector === "Custom");

  return (
    <section className="py-20">
      <SectionIntro
        eyebrow="Sector-adaptive"
        title="One platform that speaks the language of each operation"
        text="Project sector packs and custom settings adapt the same core system to farmers, stores, facilities, schools, shipments, assets, employees, inspections, and any custom record type."
      />
      <div className="mx-auto mt-12 grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[1fr_1.2fr] lg:px-8 lg:items-center">
        <div className="rounded-[24px] border border-black/10 bg-[#0c1f1b] p-6 text-white shadow-2xl">
          <div className="rounded-2xl border border-white/12 bg-white/[0.08] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5eead4]">Same platform engine</p>
            <h3 className="mt-3 text-2xl font-semibold">Sector packs change the language, not the architecture.</h3>
            <p className="mt-3 text-sm leading-6 text-white/68">Forms, entities, assignments, GPS, approvals, data quality, maps, metrics, and reports all stay connected through configurable project context.</p>
          </div>
          {customSector ? (
            <div className="mt-4 rounded-2xl border border-[#5eead4]/25 bg-[#5eead4]/12 p-5">
              <p className="text-sm font-semibold text-[#5eead4]">{customSector[0]}</p>
              <p className="mt-2 text-sm leading-6 text-white/70">{customSector[1]}</p>
            </div>
          ) : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {primarySectors.map(([sector, detail]) => (
            <article className="rounded-xl border border-black/10 bg-white p-4 shadow-sm" key={sector}>
              <p className="text-sm font-semibold text-[#0d9488]">{sector}</p>
              <p className="mt-2 text-xs leading-5 text-[#5b6a65]">{detail}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function DataUseGraphic() {
  const lanes = [
    ["Capture", "Mobile/Web/Import", Smartphone],
    ["Review", "Approve/Return/Clean", ClipboardCheck],
    ["Official record", "Entities/KPIs/Maps", Database],
    ["Decide", "Reports/Dashboards/Exports", FileText],
  ] as const;

  return (
    <section className="bg-white py-20">
      <SectionIntro
        eyebrow="Data use"
        title="Users can see exactly when data becomes ready"
        text="A visitor should understand immediately: raw data is captured first, then reviewed and cleaned, then promoted into official records, dashboards, maps, KPIs, and reports."
      />
      <div className="mx-auto mt-12 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-[24px] border border-black/10 bg-[#fafaf8] p-5 shadow-sm md:p-8">
          <div className="grid gap-4 lg:grid-cols-4">
            {lanes.map(([title, label, Icon], index) => (
              <article className="relative rounded-2xl border border-black/10 bg-white p-5 shadow-sm" key={title}>
                {index < lanes.length - 1 ? (
                  <span className="absolute -right-3 top-1/2 z-10 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-[#0d9488]/20 bg-white text-[#0d9488] shadow-sm lg:flex">
                    <ArrowRight size={15} />
                  </span>
                ) : null}
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0d9488]/10 text-[#0d9488]">
                  <Icon size={22} />
                </span>
                <h3 className="mt-4 text-xl font-semibold text-[#0c1f1b]">{title}</h3>
                <p className="mt-1 text-sm font-semibold text-[#0d9488]">{label}</p>
                <div className="mt-4 h-2 rounded-full bg-[#e0ebe7]">
                  <div className="h-full rounded-full bg-[#0d9488]" style={{ width: `${40 + index * 18}%` }} />
                </div>
              </article>
            ))}
          </div>
          <div className="mt-5 rounded-2xl border border-[#0d9488]/20 bg-white p-5">
            <p className="text-sm font-semibold text-[#0c1f1b]">Final result: trusted operational intelligence</p>
            <p className="mt-2 text-sm leading-6 text-[#5b6a65]">Approved submissions update entity profiles, quality dashboards, GIS layers, KPI progress, supervisor queues, reports, and governed exports.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function IndustryGrid() {
  const visuals = [
    {
      label: "Farm mapping",
      gradient: "linear-gradient(135deg, #dbece4 0%, #fafaf8 46%, #c8e1d4 100%)",
      metric: "42k farmers"
    },
    {
      label: "Health outreach",
      gradient: "linear-gradient(135deg, #dbeafe 0%, #fafaf8 48%, #ccfbf1 100%)",
      metric: "18 clinics"
    },
    {
      label: "Aid distribution",
      gradient: "linear-gradient(135deg, #fef3c7 0%, #fafaf8 50%, #dbeafe 100%)",
      metric: "9 review queues"
    },
    {
      label: "Service monitoring",
      gradient: "linear-gradient(135deg, #e5e7eb 0%, #fafaf8 48%, #cbd5e1 100%)",
      metric: "64 districts"
    },
    {
      label: "Inventory control",
      gradient: "linear-gradient(135deg, #dcfce7 0%, #fafaf8 48%, #bbf7d0 100%)",
      metric: "12k items"
    },
    {
      label: "Delivery proof",
      gradient: "linear-gradient(135deg, #ede9fe 0%, #fafaf8 48%, #bfdbfe 100%)",
      metric: "98% verified"
    },
    {
      label: "Audit evidence",
      gradient: "linear-gradient(135deg, #fee2e2 0%, #fafaf8 48%, #fef3c7 100%)",
      metric: "214 findings"
    }
  ];

  return (
    <div className="mx-auto mt-12 grid max-w-7xl gap-5 px-4 sm:px-6 md:grid-cols-2 lg:px-8">
      {industries.map((industry, index) => (
        <article className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg" key={industry.title}>
          {(() => {
            const visual = visuals[index % visuals.length];
            return (
          <div
            aria-label={`${industry.title} operational preview`}
            className="relative h-56 w-full overflow-hidden"
            role="img"
            style={{ background: visual.gradient }}
          >
            <div className="absolute inset-x-6 top-6 flex items-center justify-between rounded-xl border border-black/10 bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0d9488]">{visual.label}</span>
              <span className="rounded-full bg-[#0d9488]/10 px-3 py-1 text-xs font-semibold text-[#0d9488]">{visual.metric}</span>
            </div>
            <div className="absolute bottom-6 left-6 right-6 grid grid-cols-[1fr_120px] gap-4">
              <div className="rounded-xl border border-black/10 bg-white/82 p-4 shadow-sm backdrop-blur">
                <div className="h-2 w-3/4 rounded-full bg-[#0d9488]" />
                <div className="mt-3 h-2 w-1/2 rounded-full bg-[#0d9488]/30" />
                <div className="mt-5 grid grid-cols-3 gap-2">
                  <span className="h-12 rounded-lg bg-white shadow-line" />
                  <span className="h-12 rounded-lg bg-white shadow-line" />
                  <span className="h-12 rounded-lg bg-white shadow-line" />
                </div>
              </div>
              <div className="relative rounded-xl border border-black/10 bg-white/72 shadow-sm backdrop-blur">
                <span className="absolute left-7 top-8 flex h-7 w-7 items-center justify-center rounded-full bg-[#0d9488] text-white">
                  <MapPin size={13} />
                </span>
                <span className="absolute bottom-8 right-7 flex h-7 w-7 items-center justify-center rounded-full bg-[#0d9488] text-white">
                  <MapPin size={13} />
                </span>
              </div>
            </div>
          </div>
            );
          })()}
          <div className="p-6">
            <h3 className="text-xl font-semibold">{industry.title}</h3>
            <p className="mt-2 text-sm leading-6 text-[#5b6a65]">{industry.text}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

export function CTASection() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl rounded-3xl bg-[#0c1f1b] p-8 text-white shadow-2xl md:p-12">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5eead4]">Ready for field operations</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Run connected programs with trusted data, even offline.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70">
              See how Atlas FieldOps can support your field teams, sector workflows, entity operations, geospatial intelligence, KPI tracking, and governed reporting.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Button asChild variant="primary">
              <Link href="/book-demo">Book demo</Link>
            </Button>
            <Button asChild>
              <Link href="/features">Explore features</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function PricingCards() {
  return (
    <div className="mx-auto mt-12 grid max-w-6xl gap-5 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
      {pricingTiers.map((tier) => (
        <article className={`rounded-2xl border p-6 shadow-sm ${tier.featured ? "border-[#0d9488] bg-[#0d9488] text-white" : "border-black/10 bg-white"}`} key={tier.name}>
          <h2 className="text-xl font-semibold">{tier.name}</h2>
          <p className={`mt-2 text-sm leading-6 ${tier.featured ? "text-white/72" : "text-[#5b6a65]"}`}>{tier.description}</p>
          <p className="mt-6 text-3xl font-semibold">{tier.price}</p>
          <ul className="mt-6 space-y-3 text-sm">
            {tier.features.map((feature) => (
              <li className="flex gap-2" key={feature}>
                <Check size={16} className={tier.featured ? "text-[#99f6e4]" : "text-[#0d9488]"} />
                {feature}
              </li>
            ))}
          </ul>
          <Link
            className={cn(
              "mt-6 inline-flex h-11 w-full items-center justify-center rounded-md px-5 text-sm font-semibold transition",
              tier.featured
                ? "bg-white text-[#0d9488] hover:bg-white/90"
                : "bg-[#0d9488] text-white hover:bg-[#0b7a70]"
            )}
            href={tier.cta.href}
          >
            {tier.cta.label}
          </Link>
        </article>
      ))}
    </div>
  );
}

export function SimplePageHero({ eyebrow, title, text, children }: { eyebrow: string; title: string; text: string; children?: ReactNode }) {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0d9488]">{eyebrow}</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[#0c1f1b] md:text-6xl">{title}</h1>
        <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-[#5b6a65]">{text}</p>
        {children}
      </div>
    </section>
  );
}

export function ComingSoonNotice({ backHref, backLabel }: { backHref: string; backLabel: string }) {
  return (
    <section className="px-4 pb-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl rounded-2xl border border-black/10 bg-white p-10 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0d9488]">Coming soon</p>
        <p className="mt-3 text-base leading-7 text-[#5b6a65]">
          We&apos;re still building out this page. In the meantime, take a look at the resources below for more on this topic.
        </p>
        <Link className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#0d9488] transition hover:text-[#0c1f1b]" href={backHref}>
          <ArrowRight aria-hidden="true" className="rotate-180" size={16} />
          {backLabel}
        </Link>
      </div>
    </section>
  );
}

export function FAQAccordion({ items }: { items: { question: string; answer: string }[] }) {
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <details className="group rounded-xl border border-black/10 bg-white p-6 shadow-sm" key={item.question}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold text-[#0c1f1b] [&::-webkit-details-marker]:hidden">
            {item.question}
            <ChevronDown aria-hidden="true" className="shrink-0 text-[#0d9488] transition-transform group-open:rotate-180" size={20} />
          </summary>
          <p className="mt-3 text-sm leading-6 text-[#5b6a65]">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}

export function LegalDocument({
  lastUpdated,
  intro,
  sections,
}: {
  lastUpdated: string;
  intro?: ReactNode;
  sections: { id: string; title: string; content: ReactNode }[];
}) {
  return (
    <section className="px-4 pb-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm text-[#5b6a65]">Last updated: {lastUpdated}</p>
        {intro ? <div className="mt-4 space-y-4 text-sm leading-6 text-[#5b6a65]">{intro}</div> : null}

        <nav aria-label="Table of contents" className="mt-8 rounded-xl border border-black/10 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0d9488]">On this page</p>
          <ol className="mt-3 grid gap-2 sm:grid-cols-2">
            {sections.map((section) => (
              <li key={section.id}>
                <a className="text-sm text-[#0c1f1b] transition hover:text-[#0d9488]" href={`#${section.id}`}>
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-8 space-y-6">
          {sections.map((section) => (
            <article className="rounded-xl border border-black/10 bg-white p-6 shadow-sm" id={section.id} key={section.id}>
              <h2 className="text-xl font-semibold text-[#0c1f1b]">{section.title}</h2>
              <div className="legal-prose mt-3 space-y-3 text-sm leading-6 text-[#5b6a65]">{section.content}</div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function TrustBand() {
  return (
    <div className="mx-auto grid max-w-7xl gap-4 px-4 pb-20 sm:px-6 md:grid-cols-3 lg:px-8">
      {[
        ["Secure by design", "RBAC, audit logs, tenant isolation, and approval history."],
        ["Offline-first", "Forms, media, GPS, entities, tasks, and sync queues."],
        ["Enterprise ready", "Workflow orchestration, reporting, integrations, and support."]
      ].map(([title, text]) => (
        <article className="rounded-xl border border-black/10 bg-white p-6" key={title}>
          <ShieldCheck className="text-[#0d9488]" size={20} />
          <h2 className="mt-4 text-lg font-semibold">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-[#5b6a65]">{text}</p>
        </article>
      ))}
    </div>
  );
}

export type FeatureDetailContent = {
  eyebrow: string;
  title: string;
  lede: string;
  capabilities: { title: string; description: string }[];
  workflow: { title: string; description: string }[];
  outcomes: string[];
  related: { title: string; href: string }[];
};

export function FeatureDetailPage({ content }: { content: FeatureDetailContent }) {
  return (
    <main>
      <section className="relative overflow-hidden px-4 pb-10 pt-16 sm:px-6 lg:px-8">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#0d9488]/[0.07] to-transparent" />
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex rounded-full border border-[#0d9488]/20 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#0d9488]">
            {content.eyebrow}
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[#0c1f1b] md:text-5xl md:leading-[1.05]">
            {content.title}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[#5b6a65] md:text-lg">
            {content.lede}
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link className="inline-flex h-11 items-center rounded-md bg-[#0d9488] px-5 text-sm font-semibold text-white shadow-lg transition hover:bg-[#0b7a70]" href="/book-demo">
              Book demo
            </Link>
            <Link className="inline-flex h-11 items-center rounded-md border-2 border-[#0c1f1b]/15 bg-white px-5 text-sm font-semibold text-[#0c1f1b] transition hover:border-[#0d9488]/40 hover:text-[#0d9488]" href="/signup">
              Start free trial
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0d9488]">Capabilities</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#0c1f1b] md:text-4xl">What you can do</h2>
        </div>
        <div className="mx-auto mt-12 grid max-w-6xl gap-4 px-0 sm:grid-cols-2 lg:grid-cols-3">
          {content.capabilities.map((capability) => (
            <article className="rounded-xl border border-black/10 bg-white p-6 shadow-sm" key={capability.title}>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0d9488]/10 text-[#0d9488]">
                <Check size={18} />
              </div>
              <h3 className="mt-4 text-base font-semibold text-[#0c1f1b]">{capability.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#5b6a65]">{capability.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0d9488]">How it works</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#0c1f1b] md:text-4xl">From setup to trusted data</h2>
        </div>
        <ol className="mx-auto mt-12 grid max-w-5xl gap-6 px-4 sm:px-6 md:grid-cols-2 lg:px-8">
          {content.workflow.map((stepItem, index) => (
            <li className="flex gap-4 rounded-xl border border-black/10 bg-[#fafaf8] p-5" key={stepItem.title}>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0c1f1b] text-sm font-semibold text-white">
                {index + 1}
              </span>
              <div>
                <h3 className="text-base font-semibold text-[#0c1f1b]">{stepItem.title}</h3>
                <p className="mt-1 text-sm leading-6 text-[#5b6a65]">{stepItem.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-10 rounded-3xl border border-black/10 bg-white p-8 shadow-sm lg:grid-cols-[1fr_1fr] lg:p-12">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0d9488]">Outcomes</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#0c1f1b] md:text-3xl">Why teams choose it</h2>
            <p className="mt-4 text-sm leading-7 text-[#5b6a65]">
              Built for field reality — unreliable connectivity, multi-role teams, and the audit standards donors expect.
            </p>
          </div>
          <ul className="grid gap-3">
            {content.outcomes.map((outcome) => (
              <li className="flex items-start gap-3 text-sm leading-6 text-[#0c1f1b]" key={outcome}>
                <Check aria-hidden="true" className="mt-0.5 shrink-0 text-[#0d9488]" size={18} />
                {outcome}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0d9488]">Explore more</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {content.related.map((item) => (
              <Link
                className="group flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-white p-4 text-sm font-semibold text-[#0c1f1b] shadow-sm transition hover:border-[#0d9488]/40 hover:text-[#0d9488]"
                href={item.href}
                key={item.href}
              >
                {item.title}
                <ArrowRight aria-hidden="true" className="shrink-0 transition group-hover:translate-x-0.5" size={16} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <CTASection />
    </main>
  );
}
