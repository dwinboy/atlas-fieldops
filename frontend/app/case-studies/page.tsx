import type { Metadata } from "next";
import Link from "next/link";

import { CTASection, SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { caseStudies, site } from "@/lib/marketing/content";
import { breadcrumbSchema, JsonLd, marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "Field Operations and Data Collection Case Studies",
  description: "Case studies and implementation scenarios showing how organizations use Atlas FieldOps for offline data collection, entity tracking, submissions, approvals, GIS mapping, data quality, indicators, and reporting.",
  path: "/case-studies",
});

const outcomeThemes = [
  ["Faster review cycles", "Supervisors and data managers work from shared submission queues instead of chasing spreadsheets and messages."],
  ["Cleaner operational records", "Approved submissions update entities, maps, metrics, dashboards, and reports with source history."],
  ["Better field visibility", "Managers see location coverage, team activity, overdue work, GPS quality, and evidence status earlier."],
  ["Stronger reporting confidence", "Reports rely on approved, traceable, and permission-controlled data rather than disconnected files."],
];

const scenarioFlow = [
  "Set up projects, sectors, entities, users, teams, locations, and reporting rules.",
  "Build mobile forms and assign them to the right officers, locations, stores, facilities, or assets.",
  "Collect data online or offline with GPS, media, signatures, timestamps, and linked records.",
  "Review submissions, resolve quality issues, approve official data, and report from trusted records.",
];

export default function CaseStudiesPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Atlas FieldOps Case Studies",
    url: `${site.url}/case-studies`,
    description: metadata.description,
  };

  return (
    <MarketingShell>
      <JsonLd data={jsonLd} />
      <JsonLd data={breadcrumbSchema([{ name: "Home", url: site.url }, { name: "Case Studies", url: `${site.url}/case-studies` }])} />
      <main>
        <SimplePageHero
          eyebrow="Case studies"
          title="How connected workflows improve field operations"
          text="Implementation scenarios showing how organizations replace scattered data collection, review, mapping, and reporting processes with one governed operating system."
        />
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm md:p-8">
            <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0d9488]">Common implementation pattern</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#0c1f1b]">From field activity to management evidence</h2>
                <p className="mt-4 text-sm leading-7 text-[#5b6a65]">
                  The most valuable deployments connect the complete chain: setup, mobile collection, review, quality control, entity updates, maps, indicators, and reporting.
                </p>
              </div>
              <ol className="grid gap-3 md:grid-cols-2">
                {scenarioFlow.map((item, index) => (
                  <li className="rounded-2xl bg-[#f3f8f6] p-4 text-sm leading-6 text-[#5b6a65]" key={item}>
                    <span className="mb-2 block font-mono text-xs font-semibold text-[#0d9488]">{String(index + 1).padStart(2, "0")}</span>
                    {item}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
        <section className="mx-auto grid max-w-7xl gap-5 px-4 pb-16 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
          {outcomeThemes.map(([title, text]) => (
            <article className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm" key={title}>
              <h2 className="text-base font-semibold text-[#0c1f1b]">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#5b6a65]">{text}</p>
            </article>
          ))}
        </section>
        <section className="mx-auto grid max-w-7xl gap-5 px-4 pb-20 sm:px-6 md:grid-cols-2 lg:grid-cols-3 lg:px-8">
          {caseStudies.map((study) => (
            <article className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg" key={study.title}>
              <div className="flex items-start justify-between gap-4">
                <p className="text-3xl font-semibold text-[#0d9488]">{study.result}</p>
                <span className="rounded-full bg-[#0d9488]/10 px-3 py-1 text-xs font-semibold text-[#0d9488]">{study.sector}</span>
              </div>
              <h2 className="mt-5 text-xl font-semibold text-[#0c1f1b]">{study.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#5b6a65]">{study.text}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-[#5b6a65]">
                <span>{study.country}</span>
                <span>/</span>
                <span>{study.organizationType}</span>
              </div>
            </article>
          ))}
        </section>
        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-black/10 bg-[#0c1f1b] p-8 text-white shadow-2xl">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5eead4]">See your workflow</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight">Map your own operational case study before rollout</h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70">
                  Tell us your sector, field teams, forms, approvals, entities, reports, and deployment constraints. We can help translate them into a practical Atlas FieldOps workflow.
                </p>
              </div>
              <Link className="inline-flex h-11 items-center justify-center rounded-md bg-white px-5 text-sm font-semibold text-[#0d9488] transition hover:bg-white/90" href="/book-demo">
                Book workflow review
              </Link>
            </div>
          </div>
        </section>
        <CTASection />
      </main>
    </MarketingShell>
  );
}
