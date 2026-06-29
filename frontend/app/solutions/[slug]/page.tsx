import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { CTASection, DataUseGraphic, OperatingFlowGraphic, SectionIntro, SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { site, solutionPages } from "@/lib/marketing/content";
import { breadcrumbSchema, faqSchema, JsonLd, marketingMetadata } from "@/lib/marketing/seo";

export function generateStaticParams() {
  return solutionPages.map((solution) => ({ slug: solution.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const solution = solutionPages.find((item) => item.slug === params.slug);
  if (!solution) return {};
  return marketingMetadata({
    title: solution.title,
    description: solution.description,
    path: `/solutions/${solution.slug}`,
  });
}

export default function SolutionDetailPage({ params }: { params: { slug: string } }) {
  const solution = solutionPages.find((item) => item.slug === params.slug);
  if (!solution) notFound();
  const Icon = solution.icon;
  const url = `${site.url}/solutions/${solution.slug}`;

  return (
    <MarketingShell>
      <JsonLd data={breadcrumbSchema([{ name: "Home", url: site.url }, { name: "Solutions", url: `${site.url}/solutions` }, { name: solution.audience, url }])} />
      <JsonLd data={faqSchema([
        { question: `Who is ${solution.title} for?`, answer: solution.audience },
        { question: "Which Atlas FieldOps modules are most relevant?", answer: solution.modules.join(", ") },
      ])} />
      <main>
        <SimplePageHero eyebrow="Solution" title={solution.title} text={solution.description}>
          <div className="mt-6 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#0d9488]/20 bg-white px-4 py-2 text-sm font-semibold text-[#0d9488]">
              <Icon size={17} /> {solution.audience}
            </span>
          </div>
        </SimplePageHero>
        <section className="mx-auto grid max-w-7xl gap-5 px-4 pb-20 sm:px-6 lg:grid-cols-3 lg:px-8">
          <article className="rounded-xl border border-black/10 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Challenges</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-[#5b6a65]">
              {solution.challenges.map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </article>
          <article className="rounded-xl border border-black/10 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Relevant modules</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {solution.modules.map((item) => <span className="rounded-full bg-[#0d9488]/10 px-3 py-1 text-sm font-semibold text-[#0d9488]" key={item}>{item}</span>)}
            </div>
          </article>
          <article className="rounded-xl border border-black/10 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Expected outcomes</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-[#5b6a65]">
              {solution.outcomes.map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </article>
        </section>
        <OperatingFlowGraphic />
        <DataUseGraphic />
        <section className="bg-white py-20">
          <SectionIntro eyebrow="Next step" title="See how this workflow fits your organization" text="Atlas FieldOps can be configured around your programs, data collection methods, geography, approvals, and reporting commitments." />
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
