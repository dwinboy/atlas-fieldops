import type { Metadata } from "next";

import { ContactRequestForm } from "@/components/marketing/ContactRequestForm";
import { SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "Book a Demo",
  description: "Book a demo of Atlas FieldOps for monitoring and evaluation, offline data collection, survey management, GIS mapping, indicator tracking, data quality, and donor reporting.",
  path: "/book-demo",
});

export default function BookDemoPage() {
  return (
    <MarketingShell>
      <main>
        <SimplePageHero
          eyebrow="Book demo"
          title="See how Atlas FieldOps works for your programs"
          text="Share your organization, country, field team size, and interest area. We will help map Atlas FieldOps to your M&E, data collection, GIS, and reporting workflows."
        />
        <section className="mx-auto grid max-w-6xl gap-8 px-4 pb-20 sm:px-6 lg:grid-cols-[1fr_0.8fr] lg:px-8">
          <ContactRequestForm source="book-demo" title="Book your product demo" />
          <aside className="rounded-2xl border border-black/10 bg-[#10201c] p-6 text-white">
            <h2 className="text-xl font-semibold">What we cover</h2>
            <ul className="mt-5 space-y-3 text-sm leading-6 text-white/72">
              <li>• Project, survey, and form creation flow</li>
              <li>• Offline mobile data collection and sync</li>
              <li>• Review, approval, and data quality controls</li>
              <li>• GIS mapping, indicators, and donor reports</li>
              <li>• Security, governance, and deployment options</li>
            </ul>
          </aside>
        </section>
      </main>
    </MarketingShell>
  );
}
