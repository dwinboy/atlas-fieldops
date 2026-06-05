import type { Metadata } from "next";

import { CTASection, SimplePageHero, TrustBand } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "About",
  description: "Learn about the mission, vision, values, and story behind Atlas FieldOps, an enterprise field operations and monitoring platform.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <MarketingShell>
      <main>
        <SimplePageHero
          eyebrow="About"
          title="Built for organizations doing serious work in difficult environments"
          text="Atlas FieldOps exists to help field teams turn frontline activity into trusted decisions, accountable reporting, and better interventions."
        />
        <section className="mx-auto max-w-5xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="grid gap-5 md:grid-cols-3">
            {[
              ["Mission", "Make field operations easier to run, easier to verify, and easier to explain."],
              ["Vision", "A world where every program can see what is happening, what needs attention, and what action comes next."],
              ["Focus", "Offline-first technology for African deployment realities, low bandwidth, and distributed field teams."]
            ].map(([title, text]) => (
              <article className="rounded-xl border border-black/10 bg-white p-6 shadow-sm" key={title}>
                <h2 className="text-lg font-semibold">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-[#52615d]">{text}</p>
              </article>
            ))}
          </div>
        </section>
        <TrustBand />
        <CTASection />
      </main>
    </MarketingShell>
  );
}
