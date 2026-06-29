import type { Metadata } from "next";
import Link from "next/link";

import { CTASection, SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { resourceCards, site } from "@/lib/marketing/content";
import { breadcrumbSchema, JsonLd, marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "Field Data Collection Resources, Templates, and Guides",
  description: "Guides, templates, checklists, playbooks, and best practices for field data collection, M&E workflows, mobile forms, data quality, GIS mapping, entity tracking, imports, approvals, and reporting.",
  path: "/resources",
});

const resourcePaths = [
  ["Plan the system", "Define the project context, entity categories, locations, user roles, indicators, and reporting needs before forms are built."],
  ["Prepare field collection", "Use form, assignment, offline sync, GPS, media, and field officer readiness checklists before deployment."],
  ["Control data quality", "Apply validation, duplicate checks, approval rules, cleaning workflows, and reconciliation before data becomes official."],
  ["Report with confidence", "Use approved submissions, entity lineage, indicators, maps, and governed exports for leadership or donor reporting."],
];

const starterKits = [
  ["Agriculture starter kit", "Farmer registration, farm visit, input distribution, yield monitoring, and training attendance guidance."],
  ["Retail and inventory kit", "Store audit, product check, shelf availability, supplier record, barcode, and variance review guidance."],
  ["Health outreach kit", "Facility assessment, community outreach, referral follow-up, stock monitoring, and supervisor review guidance."],
  ["Audit and inspection kit", "Checklist design, evidence capture, risk rating, corrective action, review, and export guidance."],
];

export default function ResourcesPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Atlas FieldOps Resources",
    url: `${site.url}/resources`,
    description: metadata.description,
  };

  return (
    <MarketingShell>
      <JsonLd data={jsonLd} />
      <JsonLd data={breadcrumbSchema([{ name: "Home", url: site.url }, { name: "Resources", url: `${site.url}/resources` }])} />
      <main>
        <SimplePageHero
          eyebrow="Resources"
          title="Practical guides for building reliable field data systems"
          text="Use templates, checklists, playbooks, and implementation guidance to plan projects, design forms, assign mobile teams, clean data, and report with confidence."
        />
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="grid gap-4 lg:grid-cols-4">
            {resourcePaths.map(([title, text], index) => (
              <article className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm" key={title}>
                <p className="font-mono text-xs font-semibold text-[#0d9488]">{String(index + 1).padStart(2, "0")}</p>
                <h2 className="mt-3 text-lg font-semibold text-[#0c1f1b]">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-[#5b6a65]">{text}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="bg-white py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0d9488]">Resource library</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#0c1f1b]">Templates and guides organized around real implementation work</h2>
                <p className="mt-4 text-sm leading-7 text-[#5b6a65]">
                  The library helps teams move from planning to field deployment without guessing what to configure next.
                </p>
                <Link className="mt-5 inline-flex text-sm font-semibold text-[#0d9488] transition hover:text-[#0c1f1b]" href="/documentation">
                  Open the full user guide
                </Link>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                {resourceCards.map((resource) => (
                  <article className="rounded-xl border border-black/10 bg-[#fafaf8] p-6 shadow-sm" key={resource.title}>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0d9488]">{resource.type}</p>
                    <h3 className="mt-3 text-xl font-semibold">{resource.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#5b6a65]">{resource.text}</p>
                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-[#5b6a65]">{resource.category}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-black/10 bg-[#0c1f1b] p-8 text-white shadow-2xl">
            <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5eead4]">Sector starter kits</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight">Adapt the same operating system to different industries</h2>
                <p className="mt-4 text-sm leading-7 text-white/70">
                  Resources explain how sector packs translate Atlas FieldOps into the language of agriculture, retail, health, inspections, logistics, education, humanitarian programs, and custom operations.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {starterKits.map(([title, text]) => (
                  <article className="rounded-2xl border border-white/12 bg-white/[0.08] p-5" key={title}>
                    <h3 className="text-base font-semibold">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/68">{text}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
        <CTASection />
      </main>
    </MarketingShell>
  );
}
