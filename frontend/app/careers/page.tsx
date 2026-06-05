import type { Metadata } from "next";

import { ContactRequestForm } from "@/components/marketing/ContactRequestForm";
import { SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "Careers",
  description: "Join Atlas FieldOps to build monitoring and evaluation software, offline data collection tools, GIS mapping, data quality systems, and reporting platforms for field teams.",
  path: "/careers",
});

export default function CareersPage() {
  return (
    <MarketingShell>
      <main>
        <SimplePageHero eyebrow="Careers" title="Build software for teams doing real field work" text="We are designing enterprise monitoring, evaluation, data collection, GIS, and impact reporting tools for organizations solving complex operational problems." />
        <section className="mx-auto grid max-w-6xl gap-8 px-4 pb-20 sm:px-6 lg:grid-cols-[0.8fr_1fr] lg:px-8">
          <aside className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Open roles</h2>
            <div className="mt-5 space-y-3">
              {["Senior Frontend Engineer", "M&E Product Specialist", "Implementation Lead"].map((role) => (
                <div className="rounded-lg border border-black/10 bg-[#f7faf8] p-4" key={role}>
                  <p className="font-semibold">{role}</p>
                  <p className="mt-1 text-sm text-[#52615d]">Remote-friendly · Enterprise SaaS · Field operations</p>
                </div>
              ))}
            </div>
          </aside>
          <ContactRequestForm source="careers" title="Register career interest" />
        </section>
      </main>
    </MarketingShell>
  );
}
