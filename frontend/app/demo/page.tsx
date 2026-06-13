import type { Metadata } from "next";
import Link from "next/link";

import { MarketingShell } from "@/components/marketing/MarketingShell";
import { JsonLd, breadcrumbSchema, marketingMetadata } from "@/lib/marketing/seo";
import { site } from "@/lib/marketing/content";

export const metadata: Metadata = marketingMetadata({
  title: "Demo Workspace",
  description:
    "Explore a safe Atlas FieldOps demo workspace for projects, forms, entities, submissions, indicators, maps, data quality, and reports.",
  path: "/demo",
});

const demoModules = [
  ["Demo Projects", "Sector-ready examples for agriculture, health, education, retail, logistics, inventory, audits, and custom operations."],
  ["Demo Entities", "Farmers, households, facilities, stores, products, assets, shipments, employees, and custom records with duplicate checks."],
  ["Demo Forms", "Registration, surveys, inspections, stock counts, delivery confirmations, training attendance, and mobile checklists."],
  ["Demo Dashboards", "Operational KPIs, data quality alerts, approval queues, GPS evidence, maps, and reporting readiness."],
];

export default function DemoPage() {
  return (
    <MarketingShell>
      <JsonLd data={breadcrumbSchema([{ name: "Home", url: site.url }, { name: "Demo", url: `${site.url}/demo` }])} />
      <main>
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0d9488]">Demo environment</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[#0c1f1b] md:text-6xl">
              Try the platform with safe sample data.
            </h1>
            <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-[#5b6a65]">
              The demo workspace shows how a real operations team can create a sector project, build forms, register entities, review submissions, monitor quality, map coverage, and report results without exposing customer data.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link className="inline-flex h-11 items-center rounded-md bg-[#0d9488] px-5 text-sm font-semibold text-white hover:bg-[#0b7a70]" href="/login">
                Open demo sign in
              </Link>
              <Link className="inline-flex h-11 items-center rounded-md border border-black/10 bg-white px-5 text-sm font-semibold text-[#0c1f1b] hover:bg-black/[0.03]" href="/book-demo">
                Book guided demo
              </Link>
            </div>
          </div>
        </section>
        <section className="mx-auto grid max-w-7xl gap-4 px-4 pb-20 sm:px-6 md:grid-cols-2 lg:px-8">
          {demoModules.map(([title, text]) => (
            <article className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm" key={title}>
              <h2 className="text-xl font-semibold text-[#0c1f1b]">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-[#5b6a65]">{text}</p>
            </article>
          ))}
        </section>
      </main>
    </MarketingShell>
  );
}
