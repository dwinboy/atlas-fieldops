import { ArrowRight, Check, MapPin, RadioTower, ShieldCheck, Smartphone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { industries, metrics, platformFeatures, pricingTiers, trustLogos, workflowSteps } from "@/lib/marketing/content";

export function SectionIntro({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0f766e]">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#10201c] md:text-4xl">{title}</h2>
      <p className="mt-4 text-base leading-7 text-[#52615d]">{text}</p>
    </div>
  );
}

export function HeroMockup() {
  return (
    <div className="relative mx-auto mt-6 max-h-[200px] max-w-6xl overflow-hidden pb-3 md:max-h-[220px]">
      <div className="absolute -inset-4 rounded-[28px] bg-[#0f766e]/10 blur-2xl" />
      <div className="relative overflow-hidden rounded-[28px] border border-black/10 bg-[#10201c] shadow-2xl">
        <div className="soft-grid absolute inset-0 opacity-25" />
        <div className="grid min-h-[470px] lg:grid-cols-[1fr_360px]">
          <div className="p-4 sm:p-6">
            <div className="surface-premium rounded-2xl bg-[#f8fbfa] p-4 shadow-xl">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0f766e]">Operations center</p>
                  <h3 className="mt-1 text-lg font-semibold">Climate-smart agriculture program</h3>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Live sync</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                {metrics.map((metric) => (
                  <div className="rounded-lg border bg-white p-3" key={metric.label}>
                    <p className="text-xl font-semibold">{metric.value}</p>
                    <p className="mt-1 text-xs leading-5 text-[#52615d]">{metric.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-lg border bg-white p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Connected workflow</h4>
                    <RadioTower className="text-[#0f766e]" size={17} />
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
                    <div className="relative h-44 w-44 rounded-full border border-[#0f766e]/20 bg-white/70 shadow-inner">
                      <span className="absolute left-10 top-8 flex h-8 w-8 items-center justify-center rounded-full bg-[#0f766e] text-white shadow-lg">
                        <MapPin size={15} />
                      </span>
                      <span className="absolute right-8 top-14 flex h-8 w-8 items-center justify-center rounded-full bg-[#0f766e] text-white shadow-lg">
                        <MapPin size={15} />
                      </span>
                      <span className="absolute bottom-8 left-16 flex h-8 w-8 items-center justify-center rounded-full bg-[#0f766e] text-white shadow-lg">
                        <MapPin size={15} />
                      </span>
                      <span className="absolute bottom-14 right-12 flex h-8 w-8 items-center justify-center rounded-full bg-[#0f766e] text-white shadow-lg">
                        <MapPin size={15} />
                      </span>
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-[#52615d]">GPS evidence, village coverage, farm boundaries, and officer routes.</p>
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
            <div className="absolute inset-0 bg-gradient-to-t from-[#10201c]/78 via-[#10201c]/18 to-transparent" />
            <div className="relative flex h-full flex-col justify-end">
              <div className="rounded-2xl border border-white/25 bg-white/88 p-4 shadow-2xl backdrop-blur">
                <div className="flex items-center gap-3">
                  <Smartphone className="text-[#0f766e]" />
                  <div>
                    <p className="text-sm font-semibold">Offline mobile collection</p>
                    <p className="text-xs text-[#52615d]">812 records waiting to sync safely.</p>
                  </div>
                </div>
                <div className="animated-sync-bar mt-4 h-2 rounded-full bg-[#d7e4df]">
                  <div className="h-full w-[72%] rounded-full bg-[#0f766e]" />
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
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#0f766e]/10 text-[#0f766e]">
              <Icon size={20} />
            </div>
            <h3 className="mt-5 text-lg font-semibold">{feature.title}</h3>
            <p className="mt-2 text-sm leading-6 text-[#52615d]">{feature.text}</p>
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
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-6">
          {trustLogos.map((logo) => (
            <div className="rounded-lg border border-black/10 bg-[#f7faf8] px-3 py-4 text-center text-sm font-semibold text-[#52615d]" key={logo}>
              {logo}
            </div>
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
        text="Submissions, beneficiary changes, approvals, GPS evidence, imports, and interventions propagate through dashboards, reports, maps, notifications, and supervisor queues."
      />
      <div className="mx-auto mt-12 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-3 md:grid-cols-5">
          {workflowSteps.map((step, index) => (
            <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm" key={step}>
              <p className="text-xs font-semibold text-[#0f766e]">{String(index + 1).padStart(2, "0")}</p>
              <p className="mt-3 text-sm font-semibold">{step}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function IndustryGrid() {
  const visuals = [
    {
      label: "Farm mapping",
      gradient: "linear-gradient(135deg, #dbece4 0%, #f8fbfa 46%, #c8e1d4 100%)",
      metric: "42k farmers"
    },
    {
      label: "Health outreach",
      gradient: "linear-gradient(135deg, #dbeafe 0%, #f8fbfa 48%, #ccfbf1 100%)",
      metric: "18 clinics"
    },
    {
      label: "Aid distribution",
      gradient: "linear-gradient(135deg, #fef3c7 0%, #f8fbfa 50%, #dbeafe 100%)",
      metric: "9 review queues"
    },
    {
      label: "Service monitoring",
      gradient: "linear-gradient(135deg, #e5e7eb 0%, #f8fbfa 48%, #cbd5e1 100%)",
      metric: "64 districts"
    }
  ];

  return (
    <div className="mx-auto mt-12 grid max-w-7xl gap-5 px-4 sm:px-6 md:grid-cols-2 lg:px-8">
      {industries.map((industry, index) => (
        <article className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm" key={industry.title}>
          <div
            aria-label={`${industry.title} operational preview`}
            className="relative h-56 w-full overflow-hidden"
            role="img"
            style={{ background: visuals[index]?.gradient }}
          >
            <div className="absolute inset-x-6 top-6 flex items-center justify-between rounded-xl border border-black/10 bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0f766e]">{visuals[index]?.label}</span>
              <span className="rounded-full bg-[#0f766e]/10 px-3 py-1 text-xs font-semibold text-[#0f766e]">{visuals[index]?.metric}</span>
            </div>
            <div className="absolute bottom-6 left-6 right-6 grid grid-cols-[1fr_120px] gap-4">
              <div className="rounded-xl border border-black/10 bg-white/82 p-4 shadow-sm backdrop-blur">
                <div className="h-2 w-3/4 rounded-full bg-[#0f766e]" />
                <div className="mt-3 h-2 w-1/2 rounded-full bg-[#0f766e]/30" />
                <div className="mt-5 grid grid-cols-3 gap-2">
                  <span className="h-12 rounded-lg bg-white shadow-line" />
                  <span className="h-12 rounded-lg bg-white shadow-line" />
                  <span className="h-12 rounded-lg bg-white shadow-line" />
                </div>
              </div>
              <div className="relative rounded-xl border border-black/10 bg-white/72 shadow-sm backdrop-blur">
                <span className="absolute left-7 top-8 flex h-7 w-7 items-center justify-center rounded-full bg-[#0f766e] text-white">
                  <MapPin size={13} />
                </span>
                <span className="absolute bottom-8 right-7 flex h-7 w-7 items-center justify-center rounded-full bg-[#0f766e] text-white">
                  <MapPin size={13} />
                </span>
              </div>
            </div>
          </div>
          <div className="p-6">
            <h3 className="text-xl font-semibold">{industry.title}</h3>
            <p className="mt-2 text-sm leading-6 text-[#52615d]">{industry.text}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

export function CTASection() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl rounded-3xl bg-[#10201c] p-8 text-white shadow-2xl md:p-12">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5eead4]">Ready for field operations</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Run connected programs with trusted data, even offline.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70">
              See how Atlas FieldOps can support your field teams, M&E workflows, beneficiary operations, geospatial intelligence, and donor reporting.
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
        <article className={`rounded-2xl border p-6 shadow-sm ${tier.featured ? "border-[#0f766e] bg-[#0f766e] text-white" : "border-black/10 bg-white"}`} key={tier.name}>
          <h2 className="text-xl font-semibold">{tier.name}</h2>
          <p className={`mt-2 text-sm leading-6 ${tier.featured ? "text-white/72" : "text-[#52615d]"}`}>{tier.description}</p>
          <p className="mt-6 text-3xl font-semibold">{tier.price}</p>
          <ul className="mt-6 space-y-3 text-sm">
            {tier.features.map((feature) => (
              <li className="flex gap-2" key={feature}>
                <Check size={16} className={tier.featured ? "text-[#99f6e4]" : "text-[#0f766e]"} />
                {feature}
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}

export function SimplePageHero({ eyebrow, title, text, children }: { eyebrow: string; title: string; text: string; children?: ReactNode }) {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0f766e]">{eyebrow}</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[#10201c] md:text-6xl">{title}</h1>
        <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-[#52615d]">{text}</p>
        {children}
      </div>
    </section>
  );
}

export function TrustBand() {
  return (
    <div className="mx-auto grid max-w-7xl gap-4 px-4 pb-20 sm:px-6 md:grid-cols-3 lg:px-8">
      {[
        ["Secure by design", "RBAC, audit logs, tenant isolation, and approval history."],
        ["Offline-first", "Forms, media, GPS, beneficiaries, tasks, and sync queues."],
        ["Enterprise ready", "Workflow orchestration, reporting, integrations, and support."]
      ].map(([title, text]) => (
        <article className="rounded-xl border border-black/10 bg-white p-6" key={title}>
          <ShieldCheck className="text-[#0f766e]" size={20} />
          <h2 className="mt-4 text-lg font-semibold">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-[#52615d]">{text}</p>
        </article>
      ))}
    </div>
  );
}
