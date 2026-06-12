import type { Metadata } from "next";

import { ContactRequestForm } from "@/components/marketing/ContactRequestForm";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "Contact Atlas FieldOps",
  description: "Contact Atlas FieldOps for monitoring and evaluation software, offline data collection, survey management, GIS mapping, implementation support, and enterprise deployment questions.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <MarketingShell>
      <main>
        <SimplePageHero
          eyebrow="Contact"
          title="Plan a field operations platform around your real workflows"
          text="Tell us about your programs, regions, field teams, reporting requirements, and connectivity realities."
        />
        <section className="mx-auto grid max-w-6xl gap-8 px-4 pb-20 sm:px-6 lg:grid-cols-[1fr_0.8fr] lg:px-8">
          <ContactRequestForm source="contact" title="Contact sales" />
          <aside className="rounded-2xl border border-black/10 bg-[#0c1f1b] p-6 text-white">
            <h2 className="text-xl font-semibold">Enterprise inquiry</h2>
            <p className="mt-3 text-sm leading-6 text-white/70">
              We can help scope workflows, mobile sync, data migration, reports, geospatial dashboards, and security requirements.
            </p>
            <div className="mt-6 space-y-4 text-sm">
              <p>Sales: hello@atlasfieldops.com</p>
              <p>Support: support@atlasfieldops.com</p>
              <p>Implementation: delivery@atlasfieldops.com</p>
            </div>
          </aside>
        </section>
      </main>
    </MarketingShell>
  );
}
