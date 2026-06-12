import type { Metadata } from "next";
import Link from "next/link";

import { MarketingShell } from "@/components/marketing/MarketingShell";
import { marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "Template Library",
  description:
    "Explore Atlas FieldOps project, form, dashboard, and indicator templates for faster M&E platform setup.",
  path: "/templates",
});

const templateGroups = [
  ["Project templates", "Agriculture, health, education, humanitarian, research, government service delivery, and donor-funded programs."],
  ["Form templates", "Registration, baseline, monitoring visit, facility assessment, training attendance, feedback, and endline surveys."],
  ["Dashboard templates", "Executive, project, donor, field operations, indicator, data quality, and migration readiness dashboards."],
  ["Indicator templates", "Outputs, outcomes, impact indicators, logframes, disaggregation, baselines, targets, and reporting periods."],
];

export default function TemplatesPage() {
  return (
    <MarketingShell>
      <main>
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0d9488]">Templates</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[#0c1f1b] md:text-5xl">
              Start faster with reusable M&E templates.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#5b6a65]">
              Templates reduce setup time while keeping governance, versioning, audit, data quality, and mobile-readiness intact.
            </p>
          </div>
          <div className="mx-auto mt-12 grid max-w-7xl gap-4 px-0 md:grid-cols-2">
            {templateGroups.map(([title, text]) => (
              <article className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm" key={title}>
                <h2 className="text-xl font-semibold text-[#0c1f1b]">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-[#5b6a65]">{text}</p>
              </article>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link className="inline-flex h-11 items-center rounded-md bg-[#0d9488] px-5 text-sm font-semibold text-white hover:bg-[#0b7a70]" href="/signup">
              Install templates in a workspace
            </Link>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
