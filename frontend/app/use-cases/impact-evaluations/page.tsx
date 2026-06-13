import type { Metadata } from "next";

import { CTASection, SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "Impact Evaluations",
  description: "Attribute results to your program with rigorous, structured evidence.",
  path: "/use-cases/impact-evaluations",
});

export default function ImpactEvaluationsPage() {
  return (
    <MarketingShell>
      <main>
        <SimplePageHero
          eyebrow="Use Cases"
          title="Impact evaluations with structured field evidence"
          text="Design evaluation instruments, manage cohorts, collect offline data, preserve form versions, monitor enumerators, and prepare clean datasets for analysis."
        />
        <section className="px-4 pb-20 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
            {[
              ["Rigorous instruments", "Use validation, skip logic, reference data, question metadata, and version control to protect comparability."],
              ["Fieldwork oversight", "Track assignments, sync status, GPS, submission timing, suspicious patterns, and reviewer queues during collection."],
              ["Governed datasets", "Separate drafts, pending submissions, approved records, imported data, and cleaned data so analysts know exactly what is ready."],
            ].map(([title, text]) => (
              <article className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm" key={title}>
                <h2 className="text-lg font-semibold">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-[#5b6a65]">{text}</p>
              </article>
            ))}
          </div>
        </section>
        <CTASection />
      </main>
    </MarketingShell>
  );
}
