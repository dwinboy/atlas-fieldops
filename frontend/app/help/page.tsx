import type { Metadata } from "next";
import Link from "next/link";

import { CTASection, SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { faqSchema, JsonLd, marketingMetadata } from "@/lib/marketing/seo";

const helpCategories = [
  {
    title: "Getting started",
    faqs: [
      ["What is Atlas FieldOps?", "Atlas FieldOps is monitoring and evaluation software for projects, survey forms, field operations, submissions, maps, indicators, reports, data quality, governance, and administration."],
      ["How do I create an organization workspace?", "Request a workspace on the sign-up page. Once provisioned, you will receive onboarding steps to create your organization profile, invite your first administrator, and configure your first project."],
      ["What roles are available in Atlas FieldOps?", "Roles include Super Admin (platform-wide), System Admin (organization-wide), Project Manager, Data Manager, Supervisor, Field Officer, Analyst, and Viewer/Donor. Each role controls which modules and actions are accessible."],
      ["Does Atlas FieldOps offer a free trial?", "Yes. Contact us through the sign-up page and we will provision a trial workspace with sample data so your team can evaluate the full platform."],
    ],
  },
  {
    title: "Data collection and forms",
    faqs: [
      ["Does Atlas FieldOps support offline data collection?", "Yes. Atlas FieldOps is designed for mobile-ready forms, offline collection, GPS, media evidence, timestamps, and sync workflows. Field officers can collect data without internet and sync when connectivity is restored."],
      ["What field types does the form builder support?", "The form builder supports text, number, date, select, multi-select, GPS, media, signature, repeat groups, calculated fields, reference data lookups, and conditional logic."],
      ["Can forms be versioned without breaking existing data?", "Yes. Publishing a new version of a form preserves the existing version so previously collected data remains linked to the correct schema. Supervisors can choose which version to use for new assignments."],
      ["How do I use a template instead of building a form from scratch?", "Open the Forms module, click New Form, and choose a template from the library. Templates include registration, baseline, monitoring visit, facility assessment, training attendance, and endline forms."],
    ],
  },
  {
    title: "Submissions and review",
    faqs: [
      ["How does the approval workflow work?", "Submitted data enters a review queue. Supervisors can approve, reject, or return submissions for correction. Approved submissions feed indicators, reports, and maps. Every action is recorded in the audit trail."],
      ["Can I bulk-approve submissions?", "Yes. The Submissions module supports filtering by form, project, officer, and date, followed by bulk-approve actions for clean records that pass quality checks."],
      ["What happens when a submission is returned for correction?", "The field officer is notified and can reopen the draft on their mobile device, make corrections, and resubmit. The correction history is preserved in the audit log."],
      ["How are GPS coordinates validated?", "Data quality rules check GPS coordinates for impossible travel speed, location outside the expected area, and duplicate coordinates. Flagged submissions appear in the quality review queue."],
    ],
  },
  {
    title: "Indicators and reporting",
    faqs: [
      ["Can Atlas FieldOps help with donor reporting?", "Yes. It connects approved submissions, indicators, maps, data quality checks, and reports into governed reporting workflows. Reports can be exported as PDFs, Excel files, or sent on a schedule."],
      ["How do I link a form to an indicator?", "In the Indicators module, create an indicator and map its source to a specific form question or calculated field. Approved submissions automatically update the indicator's current value."],
      ["What is a logframe and how does Atlas FieldOps support it?", "A logframe is a results framework showing inputs, activities, outputs, outcomes, and impact. The Indicators module lets you organise indicators by logframe level and track progress against targets."],
      ["Can indicators be disaggregated by age, gender, or location?", "Yes. Indicators support disaggregation categories that map to form fields. Results are broken down automatically in the indicator dashboard and reports."],
    ],
  },
  {
    title: "Maps and field operations",
    faqs: [
      ["What does the mapping module show?", "The mapping module shows project boundaries, submission locations, beneficiary locations, coverage gaps, supervisor routes, and GPS anomalies. Spatial filters let you zoom into a district, village, or officer route."],
      ["How are field officer assignments managed?", "Supervisors create assignments that specify a form, entity list, target count, deadline, and responsible officers. Officers see their assignments on the mobile app and can start collection immediately."],
      ["Who uses Atlas FieldOps?", "NGOs, governments, donors, research teams, health programs, education programs, agriculture teams, and humanitarian operations."],
    ],
  },
  {
    title: "Data quality and governance",
    faqs: [
      ["What data quality checks are available?", "Atlas FieldOps checks for duplicate records, outlier values, missing required fields, GPS anomalies, impossible travel speed, and reused media. Rules can be configured per form or per project."],
      ["How are audit logs maintained?", "Every data creation, edit, approval, export, and administrative action is logged with a timestamp, actor identity, and before/after values. Audit logs cannot be edited or deleted."],
      ["Can we control which users can export data?", "Yes. Governance controls include export permissions per role, project-level access restrictions, and export approval rules for sensitive datasets."],
    ],
  },
  {
    title: "Administration and integrations",
    faqs: [
      ["How do I import data from KoBoToolbox, ODK, or Excel?", "Use the Imports and Migration assistant under Administration. Upload your source file, map columns to the platform schema, preview the result, and confirm the import. Duplicate and validation checks run before any data is committed."],
      ["Does Atlas FieldOps have a REST API?", "Yes. The API is versioned under /api/v1 and supports authentication, projects, forms, submissions, beneficiaries, indicators, and reports. API keys with scopes are managed under Administration."],
      ["Can Atlas FieldOps send notifications to field officers?", "Yes. Notification rules can be configured to alert field officers, supervisors, and managers by email when assignments are created, submissions are returned, or quality flags are raised."],
    ],
  },
];

const allFaqs = helpCategories.flatMap((category) =>
  category.faqs.map(([question, answer]) => ({ question, answer }))
);

export const metadata: Metadata = marketingMetadata({
  title: "Help Center",
  description: "Atlas FieldOps help center with FAQs, troubleshooting, product guides, and training topics for monitoring, evaluation, and field data collection workflows.",
  path: "/help",
});

export default function HelpPage() {
  return (
    <MarketingShell>
      <JsonLd data={faqSchema(allFaqs)} />
      <main>
        <SimplePageHero
          eyebrow="Help center"
          title="Answers for teams using Atlas FieldOps"
          text="Find quick answers about monitoring and evaluation workflows, offline data collection, survey management, GIS mapping, data quality, and reporting."
        />
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-wrap gap-2">
            {helpCategories.map((category) => (
              <a
                className="rounded-full border border-black/10 bg-white px-4 py-1.5 text-sm font-medium text-[#52615d] transition hover:border-[#0f766e]/40 hover:text-[#0f766e]"
                href={`#${category.title.toLowerCase().replaceAll(" ", "-")}`}
                key={category.title}
              >
                {category.title}
              </a>
            ))}
          </div>
          <div className="space-y-14">
            {helpCategories.map((category) => (
              <div id={category.title.toLowerCase().replaceAll(" ", "-")} key={category.title}>
                <h2 className="mb-5 text-2xl font-semibold capitalize">{category.title}</h2>
                <div className="space-y-4">
                  {category.faqs.map(([question, answer]) => (
                    <article className="rounded-xl border border-black/10 bg-white p-6 shadow-sm" key={question}>
                      <h3 className="text-base font-semibold">{question}</h3>
                      <p className="mt-2 text-sm leading-6 text-[#52615d]">{answer}</p>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-14 rounded-2xl border border-black/10 bg-[#10201c] p-8 text-white">
            <h2 className="text-xl font-semibold">Need more help?</h2>
            <p className="mt-2 text-sm leading-6 text-white/70">
              Check the mobile field app guide, read the full documentation, or contact our team for implementation support.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link className="inline-flex h-10 items-center rounded-md bg-white px-4 text-sm font-semibold text-[#10201c] hover:bg-white/90" href="/help/mobile">
                Mobile app guide
              </Link>
              <Link className="inline-flex h-10 items-center rounded-md border border-white/25 px-4 text-sm font-semibold text-white hover:bg-white/10" href="/documentation">
                Documentation
              </Link>
              <Link className="inline-flex h-10 items-center rounded-md border border-white/25 px-4 text-sm font-semibold text-white hover:bg-white/10" href="/contact">
                Contact support
              </Link>
            </div>
          </div>
        </section>
        <CTASection />
      </main>
    </MarketingShell>
  );
}
