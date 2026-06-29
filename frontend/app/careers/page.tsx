import type { Metadata } from "next";

import { ContactRequestForm } from "@/components/marketing/ContactRequestForm";
import { SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "Careers Building Field Data Collection and Operations Software",
  description: "Join Atlas FieldOps to build field data collection software, offline mobile tools, GIS mapping, data quality workflows, reporting systems, and operations platforms for organizations working in the field.",
  path: "/careers",
});

const missionAreas = [
  ["Offline-first product engineering", "Build mobile and web workflows that continue working when field teams lose connectivity."],
  ["Data quality and governance", "Design approval, audit, validation, reconciliation, and reporting workflows that protect operational trust."],
  ["GIS and field intelligence", "Turn GPS, boundaries, coverage, facilities, submissions, and activity evidence into clear management tools."],
  ["Implementation and customer success", "Help organizations translate real operating procedures into simple, reliable software workflows."],
];

const hiringValues = [
  "Respect field teams and the difficult conditions they work in.",
  "Design simple interfaces for complex operational workflows.",
  "Treat data lineage, permissions, and audit history as product features.",
  "Build carefully, test honestly, and document what users need to know.",
];

const hiringSteps = [
  ["1. Intro conversation", "We learn about your experience, interests, and the operational problems you want to solve."],
  ["2. Practical review", "You discuss a real workflow, product problem, implementation case, or engineering task."],
  ["3. Team discussion", "You meet the people closest to the role and learn how Atlas FieldOps works day to day."],
  ["4. Offer and onboarding", "We align on responsibilities, growth path, tools, and first outcomes."],
];

export default function CareersPage() {
  return (
    <MarketingShell>
      <main>
        <SimplePageHero
          eyebrow="Careers"
          title="Build software for teams doing real field work"
          text="Join the team building Atlas FieldOps: an enterprise platform for offline mobile collection, field operations, GIS intelligence, data quality, approvals, reporting, and organization governance."
        />
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-black/10 bg-[#0c1f1b] p-8 text-white shadow-2xl">
            <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5eead4]">Why this work matters</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight">Field operations need software that understands reality</h2>
                <p className="mt-4 text-sm leading-7 text-white/70">
                  Atlas FieldOps is built for organizations that manage people, places, entities, evidence, approvals, maps, metrics, and reports under real operational pressure.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {missionAreas.map(([title, text]) => (
                  <article className="rounded-2xl border border-white/12 bg-white/[0.08] p-5" key={title}>
                    <h2 className="text-base font-semibold">{title}</h2>
                    <p className="mt-2 text-sm leading-6 text-white/68">{text}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
        <section className="mx-auto grid max-w-7xl gap-5 px-4 pb-16 sm:px-6 md:grid-cols-2 lg:px-8">
          <article className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0d9488]">How we work</p>
            <h2 className="mt-3 text-2xl font-semibold text-[#0c1f1b]">Product values</h2>
            <ul className="mt-5 space-y-3">
              {hiringValues.map((value) => (
                <li className="rounded-xl bg-[#f3f8f6] p-4 text-sm leading-6 text-[#5b6a65]" key={value}>{value}</li>
              ))}
            </ul>
          </article>
          <article className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0d9488]">Hiring process</p>
            <h2 className="mt-3 text-2xl font-semibold text-[#0c1f1b]">Clear, practical, and role-focused</h2>
            <ol className="mt-5 space-y-3">
              {hiringSteps.map(([title, text]) => (
                <li className="rounded-xl bg-[#fafaf8] p-4" key={title}>
                  <h3 className="text-sm font-semibold text-[#0c1f1b]">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-[#5b6a65]">{text}</p>
                </li>
              ))}
            </ol>
          </article>
        </section>
        <section className="mx-auto grid max-w-6xl gap-8 px-4 pb-20 sm:px-6 lg:grid-cols-[0.8fr_1fr] lg:px-8">
          <aside className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Open roles</h2>
            <p className="mt-2 text-sm leading-6 text-[#5b6a65]">We are especially interested in people who understand field operations, enterprise SaaS, mobile-first workflows, GIS, data quality, and customer implementation.</p>
            <div className="mt-5 space-y-3">
              {["Senior Frontend Engineer", "M&E Product Specialist", "Implementation Lead"].map((role) => (
                <div className="rounded-lg border border-black/10 bg-[#fafaf8] p-4" key={role}>
                  <p className="font-semibold">{role}</p>
                  <p className="mt-1 text-sm text-[#5b6a65]">Remote-friendly · Enterprise SaaS · Field operations</p>
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
