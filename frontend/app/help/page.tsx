import type { Metadata } from "next";

import { SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { faqSchema, JsonLd, marketingMetadata } from "@/lib/marketing/seo";

const faqs = [
  ["What is Atlas FieldOps?", "Atlas FieldOps is monitoring and evaluation software for projects, survey forms, field operations, submissions, maps, indicators, reports, data quality, governance, and administration."],
  ["Does Atlas FieldOps support offline data collection?", "Yes. Atlas FieldOps is designed for mobile-ready forms, offline collection, GPS, media evidence, timestamps, and sync workflows."],
  ["Who uses Atlas FieldOps?", "NGOs, governments, donors, research teams, health programs, education programs, agriculture teams, and humanitarian operations."],
  ["Can Atlas FieldOps help with donor reporting?", "Yes. It connects approved submissions, indicators, maps, data quality checks, and reports into governed reporting workflows."],
];

export const metadata: Metadata = marketingMetadata({
  title: "Help Center",
  description: "Atlas FieldOps help center with FAQs, troubleshooting, product guides, and training topics for monitoring, evaluation, and field data collection workflows.",
  path: "/help",
});

export default function HelpPage() {
  return (
    <MarketingShell>
      <JsonLd data={faqSchema(faqs.map(([question, answer]) => ({ question, answer })))} />
      <main>
        <SimplePageHero eyebrow="Help center" title="Answers for teams evaluating Atlas FieldOps" text="Find quick answers about monitoring and evaluation workflows, offline data collection, survey management, GIS mapping, data quality, and reporting." />
        <section className="mx-auto max-w-4xl space-y-4 px-4 pb-20 sm:px-6 lg:px-8">
          {faqs.map(([question, answer]) => (
            <article className="rounded-xl border border-black/10 bg-white p-6 shadow-sm" key={question}>
              <h2 className="text-lg font-semibold">{question}</h2>
              <p className="mt-2 text-sm leading-6 text-[#52615d]">{answer}</p>
            </article>
          ))}
        </section>
      </main>
    </MarketingShell>
  );
}
