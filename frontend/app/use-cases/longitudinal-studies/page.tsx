import type { Metadata } from "next";

import { CTASection, SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "Longitudinal Studies",
  description: "Follow the same respondents and indicators across multiple data collection rounds.",
  path: "/use-cases/longitudinal-studies",
});

export default function LongitudinalStudiesPage() {
  return (
    <MarketingShell>
      <main>
        <SimplePageHero
          eyebrow="Use Cases"
          title="Longitudinal tracking for people, places, assets, and services"
          text="Follow the same entities across registration, baseline, repeat visits, inspections, training, distributions, service delivery, endline, and follow-up workflows."
        />
        <section className="px-4 pb-20 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
            {[
              ["Unique identifiers", "Maintain stable entity codes for farmers, patients, schools, stores, assets, cases, shipments, or custom records."],
              ["Linked records", "Connect every approved form submission to the right entity, project, location, field officer, form version, and approval event."],
              ["Timeline visibility", "See the full history of services, visits, checks, distributions, profile changes, GPS evidence, and data quality flags."],
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
