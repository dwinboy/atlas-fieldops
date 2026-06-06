import type { Metadata } from "next";
import Link from "next/link";

import { MarketingShell } from "@/components/marketing/MarketingShell";
import { marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "Donor Portal",
  description:
    "Atlas FieldOps donor portal readiness for read-only dashboards, indicators, reports, maps, and governed exports.",
  path: "/donor",
});

const donorViews = [
  ["Portfolio dashboard", "Approved KPIs, indicator progress, coverage, quality score, and reporting period status."],
  ["Reports", "Published donor reports, scheduled outputs, export history, and evidence packages."],
  ["Indicators", "Targets, baselines, current results, disaggregation, and achievement status."],
  ["Maps", "Aggregated district-level maps with coordinate masking and role-based spatial visibility."],
];

export default function DonorPortalPage() {
  return (
    <MarketingShell>
      <main>
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0f766e]">Read-only donor access</p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[#10201c] md:text-5xl">
                Share approved impact evidence without giving edit access.
              </h1>
              <p className="mt-5 text-base leading-7 text-[#52615d]">
                The donor portal is designed for secure, read-only access to approved reports, dashboards, indicators, and aggregated maps. Tenant data remains protected by organization, project, and role boundaries.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link className="inline-flex h-11 items-center rounded-md bg-[#0f766e] px-5 text-sm font-semibold text-white hover:bg-[#115e59]" href="/book-demo">
                  Request donor portal demo
                </Link>
                <Link className="inline-flex h-11 items-center rounded-md border border-black/10 bg-white px-5 text-sm font-semibold text-[#10201c] hover:bg-black/[0.03]" href="/security">
                  Review security
                </Link>
              </div>
            </div>
            <div className="grid gap-4">
              {donorViews.map(([title, text]) => (
                <article className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm" key={title}>
                  <h2 className="text-lg font-semibold text-[#10201c]">{title}</h2>
                  <p className="mt-2 text-sm leading-6 text-[#52615d]">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
