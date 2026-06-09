import type { Metadata } from "next";

import { CTASection, SimplePageHero, TrustBand } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "About",
  description: "Learn about the mission, vision, values, and story behind Atlas FieldOps, an enterprise field operations and monitoring platform.",
  path: "/about",
});

const principles = [
  ["Mission", "Make field operations easier to run, easier to verify, and easier to explain."],
  ["Vision", "A world where every program can see what is happening, what needs attention, and what action comes next."],
  ["Focus", "Offline-first technology for African deployment realities, low bandwidth, and distributed field teams."],
];

const values = [
  ["Operational clarity", "Every feature should help a team understand what happened, who is responsible, and what comes next — without ambiguity."],
  ["Data trust", "Collected records, approved submissions, and indicator values must be auditable, defensible, and honest."],
  ["Field realism", "The product is designed around the constraints of real field teams: limited connectivity, basic devices, mixed literacy levels, and tight timelines."],
  ["Accountability", "From individual submissions to donor reporting, every action should leave a trail that can answer difficult questions."],
  ["Simplicity at scale", "Features that are complex to configure should be powerful for managers and invisible to field officers."],
  ["Continuous improvement", "Field programs evolve. The platform must support version changes, schema migration, and redeployment without data loss."],
];

const commitments = [
  ["Privacy first", "Beneficiary data, GPS locations, and sensitive records are governed by role-based access, consent controls, and immutable audit logs."],
  ["Offline reliability", "Core workflows — form collection, submission queuing, GPS capture, and sync — must work on any device, even in remote areas with no signal."],
  ["Real-world deployment", "We test against the connectivity levels, device types, and operational rhythms that field programs actually experience."],
  ["Open integration", "Customer data belongs to the customer. The platform supports API access, governed exports, and standard formats to prevent lock-in."],
];

export default function AboutPage() {
  return (
    <MarketingShell>
      <main>
        <SimplePageHero
          eyebrow="About"
          title="Built for organizations doing serious work in difficult environments"
          text="Atlas FieldOps exists to help field teams turn frontline activity into trusted decisions, accountable reporting, and better interventions."
        />
        <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="grid gap-5 md:grid-cols-3">
            {principles.map(([title, text]) => (
              <article className="rounded-xl border border-black/10 bg-white p-6 shadow-sm" key={title}>
                <h2 className="text-lg font-semibold">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-[#52615d]">{text}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="border-y border-black/10 bg-white py-16">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0f766e]">Values</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">What guides how we build</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {values.map(([title, text]) => (
                <article className="rounded-xl border border-black/10 bg-[#f7faf8] p-5" key={title}>
                  <h3 className="text-base font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#52615d]">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="py-16">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0f766e]">Commitments</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">What organizations can rely on</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {commitments.map(([title, text]) => (
                <article className="rounded-xl border border-black/10 bg-white p-6 shadow-sm" key={title}>
                  <h3 className="text-lg font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#52615d]">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <TrustBand />
        <CTASection />
      </main>
    </MarketingShell>
  );
}
