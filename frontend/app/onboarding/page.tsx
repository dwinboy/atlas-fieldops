import type { Metadata } from "next";
import Link from "next/link";

import { MarketingShell } from "@/components/marketing/MarketingShell";
import { marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "Onboarding Wizard",
  description:
    "Atlas FieldOps onboarding guides new organizations through projects, data imports, forms, beneficiaries, team invitations, and data collection readiness.",
  path: "/onboarding",
});

const onboardingSteps = [
  ["Create organization", "Capture organization profile, country, timezone, localization, branding, and first admin readiness."],
  ["Create project", "Set donor, locations, teams, indicators, project owner, and implementation dates."],
  ["Import existing data", "Bring Kobo, ODK, SurveyCTO, Excel, DHIS2, CommCare, or Google Forms history into the migration assistant."],
  ["Create form", "Start from templates or a blank builder, publish a governed version, and link entity controls."],
  ["Add beneficiaries", "Register or import farmers, households, facilities, schools, groups, or custom entities."],
  ["Invite team", "Add supervisors, data managers, field officers, and read-only donor users with scoped roles."],
  ["Start collecting data", "Assign forms and entities, collect submissions, review data, monitor quality, and report progress."],
];

export default function OnboardingPage() {
  return (
    <MarketingShell>
      <main>
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0f766e]">Onboarding</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[#10201c] md:text-5xl">
              From first workspace to field collection.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#52615d]">
              The startup onboarding path helps organizations become operational without developer intervention while preserving secure tenant boundaries.
            </p>
          </div>
          <div className="mx-auto mt-12 grid max-w-6xl gap-4">
            {onboardingSteps.map(([title, text], index) => (
              <article className="grid gap-4 rounded-2xl border border-black/10 bg-white p-5 shadow-sm md:grid-cols-[80px_1fr]" key={title}>
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0f766e]/10 text-sm font-semibold text-[#0f766e]">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h2 className="text-lg font-semibold text-[#10201c]">{title}</h2>
                  <p className="mt-2 text-sm leading-6 text-[#52615d]">{text}</p>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link className="inline-flex h-11 items-center rounded-md bg-[#0f766e] px-5 text-sm font-semibold text-white hover:bg-[#115e59]" href="/signup">
              Start onboarding request
            </Link>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
