import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { CTASection, SectionIntro, SimplePageHero, TrustBand } from "@/components/marketing/MarketingBlocks";
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

  return (
    <MarketingShell>
      <JsonLd data={breadcrumbSchema([{ name: "Home", url: site.url }, { name: "Use Cases", url: `${site.url}/use-cases` }, { name: useCase.title, url: `${site.url}/use-cases/${useCase.slug}` }])} />
      <JsonLd data={faqSchema(useCase.faqs)} />
      <main>
        <SimplePageHero eyebrow="Use case" title={useCase.title} text={useCase.description} />
        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
            <article className="rounded-xl border border-black/10 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">Workflow</h2>
              <ol className="mt-4 space-y-3 text-sm leading-6 text-[#52615d]">
                {useCase.steps.map((step, index) => (
                  <li className="flex gap-3" key={step}>
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#0f766e]/10 text-xs font-semibold text-[#0f766e]">{index + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </article>
            <div className="grid gap-5">
              <article className="rounded-xl border border-black/10 bg-[#10201c] p-6 text-white shadow-sm">
                <h2 className="text-xl font-semibold">Key outcomes</h2>
                <ul className="mt-4 space-y-2">
                  {useCase.outcomes.map((outcome) => (
                    <li className="flex items-center gap-2 text-sm text-white/80" key={outcome}>
                      <span className="h-1.5 w-1.5 rounded-full bg-[#5eead4]" />
                      {outcome}
                    </li>
                  ))}
                </ul>
              </article>
              <article className="rounded-xl border border-black/10 bg-white p-6 shadow-sm">
                <h2 className="text-base font-semibold">Relevant modules</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {useCase.modules.map((module) => (
                    <span className="rounded-full bg-[#0f766e]/10 px-3 py-1 text-xs font-semibold text-[#0f766e]" key={module}>{module}</span>
                  ))}
                </div>
              </article>
            </div>
          </div>
          {useCase.faqs.length > 0 && (
            <div className="mt-10">
              <h2 className="text-2xl font-semibold">Common questions</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {useCase.faqs.map((faq) => (
                  <article className="rounded-xl border border-black/10 bg-white p-6 shadow-sm" key={faq.question}>
                    <h3 className="text-base font-semibold">{faq.question}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#52615d]">{faq.answer}</p>
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>
        <section className="bg-white py-20">
          <SectionIntro eyebrow="Implementation" title="Make complex field workflows easier to run" text="The same platform supports form design, assignments, quality review, maps, indicators, reports, and auditability." />
          <div className="mt-8 flex justify-center">
            <Link className="inline-flex h-11 items-center rounded-md bg-[#0f766e] px-5 text-sm font-semibold text-white shadow-lg transition hover:bg-[#115e59]" href="/book-demo">
              Book a demo
            </Link>
          </div>
        </section>
        <TrustBand />
        <CTASection />
      </main>
    </MarketingShell>
  );
}
