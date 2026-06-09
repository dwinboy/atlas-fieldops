import type { Metadata } from "next";
import Link from "next/link";

import { CTASection, SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { faqSchema, JsonLd, marketingMetadata } from "@/lib/marketing/seo";

const faqs = [
  [
    "What is Atlas FieldOps?",
    "Atlas FieldOps is monitoring and evaluation software for projects, survey forms, field operations, submissions, maps, indicators, reports, data quality, governance, and administration. It connects every step from project setup to donor reporting in one workflow-aware platform.",
  ],
  [
    "Does Atlas FieldOps support offline data collection?",
    "Yes. Atlas FieldOps is designed for mobile-ready forms, offline collection, GPS capture, photo and file attachments, timestamps, and sync workflows. Field officers can collect data without internet and sync safely when connectivity returns.",
  ],
  [
    "Who uses Atlas FieldOps?",
    "NGOs, governments, donors, research teams, health programs, education programs, agriculture teams, and humanitarian operations. Any program that needs trusted field data, beneficiary management, indicator tracking, and reporting can use Atlas FieldOps.",
  ],
  [
    "Can Atlas FieldOps help with donor reporting?",
    "Yes. It connects approved submissions, indicators, maps, data quality checks, and governed exports into reporting workflows. You can generate standard reports, custom dashboards, indicator progress tables, scheduled reports, and donor packages directly from approved data.",
  ],
  [
    "How do I import data from KoboToolbox, ODK, or Excel?",
    "Use Imports & Migration under Administration. Upload your file in CSV, Excel, JSON, XLSForm, GeoJSON, or KML format. The Smart Analysis assistant detects field mapping, duplicate groups, location matches, entity matches, and validation issues before any data is written. KoboToolbox, ODK Central, and DHIS2 direct connectors are available in Phase 2.",
  ],
  [
    "How does beneficiary management work?",
    "Beneficiaries are registered with a profile, GPS point, consent status, program links, and visit history. You can import registries from external tools, search existing records before creating new ones, and review possible duplicates. Every submission can be linked to an existing beneficiary for longitudinal tracking.",
  ],
  [
    "How are form submissions reviewed and approved?",
    "Field officers sync submissions from mobile devices into the review queue. Supervisors open the Submissions workspace, review each record's responses, quality flags, GPS evidence, and attachments, then approve, reject, or return the record for correction. Only approved submissions are used in indicators, maps, and reports.",
  ],
  [
    "What data quality controls does Atlas FieldOps provide?",
    "Atlas FieldOps detects duplicates, outliers, GPS issues, missing data, validation failures, and high-risk patterns. Data Quality rules run automatically against collected records. You can investigate issues, override or resolve them, and review the quality score before exporting or reporting data.",
  ],
  [
    "How are indicators and targets tracked?",
    "Create indicators in the Indicators module with a code, definition, unit, type, baseline, and target. Link each indicator to a form question or uploaded dataset as its data source. Atlas FieldOps computes current values from approved submissions and shows progress against targets in the Results Framework, Logframes, and Indicator Reports.",
  ],
  [
    "Is Atlas FieldOps suitable for multi-country or multi-region programs?",
    "Yes. Projects can span multiple regions, districts, and communities using the location hierarchy in Administration. Mapping shows coverage by location. Reports filter and aggregate by geography. Field operations can assign officers to specific locations and track coverage per area.",
  ],
  [
    "What roles and permissions does the platform support?",
    "Atlas FieldOps supports System Admin, M&E Manager, Data Manager, Supervisor, Field Officer, and Viewer/Donor roles. Permissions control which modules, projects, forms, submissions, and exports each role can access. Team-level scoping limits supervisors and field officers to their assigned areas.",
  ],
  [
    "How do I get started with Atlas FieldOps?",
    "Start by creating your organization and first user accounts. Then create a project, build or import your survey form, assign field officers, and deploy the form to the mobile app. Field officers collect data offline, sync submissions, and supervisors review and approve records before they enter indicators and reports.",
  ],
];

const workflowGuides = [
  {
    title: "Mobile field app help",
    description: "Prepare devices, collect data offline, protect drafts, sync submissions, and send diagnostics.",
    href: "/help/mobile",
  },
  {
    title: "Platform documentation",
    description: "Setup guidance, workflows, permissions, examples, and next actions for every module.",
    href: "/documentation",
  },
  {
    title: "Use cases",
    description: "Baseline surveys, monitoring visits, registration programs, health, agriculture, and humanitarian workflows.",
    href: "/use-cases",
  },
  {
    title: "Book a demo",
    description: "See how Atlas FieldOps fits your program structure with a guided walkthrough.",
    href: "/book-demo",
  },
];

export const metadata: Metadata = marketingMetadata({
  title: "Help Center",
  description: "Atlas FieldOps help center with FAQs, troubleshooting, product guides, and training topics for monitoring, evaluation, and field data collection workflows.",
  path: "/help",
});

export default function HelpPage() {
  return (
    <MarketingShell>
      <JsonLd data={faqSchema(faqs.map(([question, answer]) => ({ question, answer })))} />
      <main>
        <SimplePageHero
          eyebrow="Help center"
          title="Answers for field teams, managers, and administrators"
          text="Find quick answers about monitoring and evaluation workflows, offline data collection, survey management, GIS mapping, data quality, imports, indicators, and reporting."
        />

        <section className="mx-auto grid max-w-7xl gap-4 px-4 pb-10 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
          {workflowGuides.map((guide) => (
            <Link
              className="rounded-xl border border-[#0f766e]/20 bg-[#0f766e]/5 p-5 shadow-sm transition hover:bg-[#0f766e]/10"
              href={guide.href}
              key={guide.href}
            >
              <h2 className="text-sm font-semibold text-[#0f766e]">{guide.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#52615d]">{guide.description}</p>
            </Link>
          ))}
        </section>

        <section className="mx-auto max-w-4xl space-y-4 px-4 pb-20 sm:px-6 lg:px-8">
          <h2 className="text-xl font-semibold text-[#10201c]">Frequently asked questions</h2>
          {faqs.map(([question, answer]) => (
            <article className="rounded-xl border border-black/10 bg-white p-6 shadow-sm" key={question}>
              <h3 className="text-base font-semibold">{question}</h3>
              <p className="mt-2 text-sm leading-6 text-[#52615d]">{answer}</p>
            </article>
          ))}
        </section>

        <CTASection />
      </main>
    </MarketingShell>
  );
}

