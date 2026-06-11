import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { CTASection, SectionIntro, SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { site, useCasePages } from "@/lib/marketing/content";
import { breadcrumbSchema, faqSchema, JsonLd, marketingMetadata } from "@/lib/marketing/seo";

export function generateStaticParams() {
  return useCasePages.map((useCase) => ({ slug: useCase.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const useCase = useCasePages.find((item) => item.slug === params.slug);
  if (!useCase) return {};
  return marketingMetadata({
    title: `${useCase.title} Software`,
    description: useCase.description,
    path: `/use-cases/${useCase.slug}`,
  });
}

export default function UseCaseDetailPage({ params }: { params: { slug: string } }) {
  const useCase = useCasePages.find((item) => item.slug === params.slug);
  if (!useCase) notFound();

  const steps = [
    "Create the project and geographic scope.",
    "Build or clone the survey form with validation, GPS, consent, and reference data.",
    "Assign field teams, supervisors, locations, and targets.",
    "Collect offline data and sync submissions safely.",
    "Review quality flags, approve records, and report results.",
  ];

  return (
    <MarketingShell>
      <JsonLd data={breadcrumbSchema([{ name: "Home", url: site.url }, { name: "Use Cases", url: `${site.url}/use-cases` }, { name: useCase.title, url: `${site.url}/use-cases/${useCase.slug}` }])} />
      <JsonLd data={faqSchema([
        { question: `Can Atlas FieldOps support ${useCase.title.toLowerCase()}?`, answer: useCase.description },
        { question: "Does it work offline?", answer: "Yes. Atlas FieldOps supports mobile-ready forms, GPS, media, timestamps, and offline sync workflows." },
      ])} />
      <main>
        <SimplePageHero eyebrow="Use case" title={useCase.title} text={useCase.description} />
        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
            <article className="rounded-xl border border-black/10 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">Workflow</h2>
              <ol className="mt-4 space-y-3 text-sm leading-6 text-[#5b6a65]">
                {steps.map((step, index) => <li key={step}>{index + 1}. {step}</li>)}
              </ol>
            </article>
            <article className="rounded-xl border border-black/10 bg-[#0c1f1b] p-6 text-white shadow-sm">
              <h2 className="text-xl font-semibold">Why teams use Atlas FieldOps</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {["Survey management", "Offline collection", "Data quality", "GIS mapping", "Indicator tracking", "Donor reporting"].map((item) => (
                  <div className="rounded-lg border border-white/15 bg-white/8 p-4" key={item}>
                    <p className="font-semibold">{item}</p>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>
        <section className="bg-white py-20">
          <SectionIntro eyebrow="Implementation" title="Make complex field workflows easier to run" text="The same platform supports form design, assignments, quality review, maps, indicators, reports, and auditability." />
          <div className="mt-8 flex justify-center">
            <Link className="inline-flex h-11 items-center rounded-md bg-[#0d9488] px-5 text-sm font-semibold text-white shadow-lg transition hover:bg-[#0b7a70]" href="/book-demo">
              Book a demo
            </Link>
          </div>
        </section>
        <CTASection />
      </main>
    </MarketingShell>
  );
}
