import type { Metadata } from "next";

import { CTASection, PricingCards, SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "Pricing",
  description: "Pricing plans for monitoring and evaluation software, offline data collection, survey management, GIS mapping, indicators, data quality, and reporting.",
  path: "/pricing",
});

export default function PricingPage() {
  return (
    <MarketingShell>
      <main>
        <SimplePageHero
          eyebrow="Pricing"
          title="Flexible pricing for serious programs"
          text="Pricing is shaped around scale, support needs, integrations, data volumes, and deployment model."
        />
        <PricingCards />
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
            <div className="border-b p-5">
              <h2 className="text-xl font-semibold">Plan comparison</h2>
              <p className="mt-1 text-sm text-[#5b6a65]">See what&apos;s included as your program grows from a single project to an enterprise deployment.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-[#fafaf8] text-[#5b6a65]">
                  <tr>
                    {["Capability", "Starter", "Professional", "Enterprise"].map((heading) => <th className="px-5 py-3 font-semibold" key={heading}>{heading}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {[
                    ["Projects and forms", "Included", "Included", "Included"],
                    ["Offline mobile collection", "Included", "Included", "Included"],
                    ["GIS mapping", "Basic", "Advanced", "Advanced + custom layers"],
                    ["Indicators and reports", "Basic", "Advanced", "Enterprise reporting"],
                    ["Governance and audit", "Standard", "Advanced", "Custom compliance"],
                    ["Integrations and API", "Limited", "Available", "Custom"],
                  ].map((row) => (
                    <tr key={row[0]}>
                      {row.map((cell) => <td className="px-5 py-3" key={cell}>{cell}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
        <CTASection />
      </main>
    </MarketingShell>
  );
}
