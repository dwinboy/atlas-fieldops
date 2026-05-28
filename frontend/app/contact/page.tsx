import type { Metadata } from "next";

import { MarketingShell } from "@/components/marketing/MarketingShell";
import { SimplePageHero } from "@/components/marketing/MarketingBlocks";

export const metadata: Metadata = {
  title: "Contact & Demo Request",
  description: "Request a demo, speak with sales, or ask about implementation support for Atlas FieldOps."
};

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
          <form className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
            <div className="grid gap-4 md:grid-cols-2">
              {["Full name", "Work email", "Organization", "Role"].map((label) => (
                <label className="text-sm font-medium" key={label}>
                  {label}
                  <input className="mt-2 h-11 w-full rounded-md border border-black/10 px-3 outline-none focus:ring-2 focus:ring-[#0f766e]/25" placeholder={label} />
                </label>
              ))}
            </div>
            <label className="mt-4 block text-sm font-medium">
              What are you trying to improve?
              <textarea className="mt-2 min-h-32 w-full rounded-md border border-black/10 p-3 outline-none focus:ring-2 focus:ring-[#0f766e]/25" placeholder="Field data collection, beneficiary tracking, reporting, offline sync..." />
            </label>
            <button className="mt-5 h-11 rounded-md bg-[#0f766e] px-5 text-sm font-semibold text-white" type="button">
              Request demo
            </button>
          </form>
          <aside className="rounded-2xl border border-black/10 bg-[#10201c] p-6 text-white">
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
