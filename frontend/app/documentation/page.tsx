import type { Metadata } from "next";

import { SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { marketingMetadata } from "@/lib/marketing/seo";

const functionalityGuide = [
  {
    title: "Getting started and workspace access",
    text: "Users sign in to an organization workspace, see only the modules allowed by their role, and start from Dashboard for the current operating picture.",
    worksBy: "Organization, role, permissions, access scope, and audit logs control what each user can view or change.",
  },
  {
    title: "Projects and surveys",
    text: "Projects organize program context, donors, geography, teams, indicators, forms, submissions, reports, and governance. Surveys organize baseline, monitoring, registration, endline, and other M&E activities inside a project.",
    worksBy: "Managers create project setup, select sector guidance, define locations, attach forms, configure teams, and activate the project when ready.",
  },
  {
    title: "Forms and form controls",
    text: "Forms are the data collection tools. Users build questions, configure validation, entity rules, permissions, workflow, data quality controls, mobile readiness, and publishing rules.",
    worksBy: "Draft forms can be saved and edited. Published forms create stable versions for assignments and mobile sync.",
  },
  {
    title: "Field operations and assignments",
    text: "Managers assign field officers to projects, forms, locations, beneficiaries, visits, and operational activities. Supervisors can approve movement requests and monitor field progress.",
    worksBy: "The field officer profile shows assignments, supervisor relationship, devices, permissions, submissions, performance, and activity history.",
  },
  {
    title: "Mobile field app",
    text: "Field officers sign in, sync assigned work, collect data offline, save drafts, capture GPS and media evidence, queue submissions, and sync when connected.",
    worksBy: "Mobile bootstrap downloads profile, permissions, assignments, projects, forms, locations, beneficiaries, rules, and returned submissions.",
  },
  {
    title: "Submissions and approval",
    text: "Submitted records arrive in the web app for review. Reviewers approve, return, reject, or archive records based on quality, evidence, and governance rules.",
    worksBy: "Approved data can feed beneficiaries, indicators, reports, dashboards, maps, and audit history. Unapproved records stay visible but should not count as official results.",
  },
  {
    title: "Data import and cleaning",
    text: "Users can upload spreadsheet data into forms, map columns, see missing fields, clean rows in an Excel-like grid, and confirm clean data for review.",
    worksBy: "Uploaded and imported records keep source labels, import batch context, row issues, and cleaning status so they are not confused with live field submissions.",
  },
  {
    title: "Beneficiaries and entities",
    text: "Beneficiaries, farmers, households, facilities, schools, groups, and other entities are the long-term records connected to approved submissions.",
    worksBy: "Approved entity-linked forms can create or update beneficiaries, generate stable codes, preserve profile lineage, and send conflicts to reconciliation.",
  },
  {
    title: "Data quality and reconciliation",
    text: "Data Quality helps teams investigate duplicates, missing values, outliers, invalid GPS, profile conflicts, suspicious activity, and unlinked records.",
    worksBy: "Quality issues are reviewed before records are used in reports, indicators, beneficiary profiles, or donor outputs.",
  },
  {
    title: "Mapping and GPS evidence",
    text: "Mapping shows project areas, beneficiary locations, submission points, facilities, coverage gaps, GPS quality issues, and operational movement evidence.",
    worksBy: "GPS capture stores coordinates, accuracy, source, timestamp, and quality signals where forms or activity rules require location evidence.",
  },
  {
    title: "Indicators, dashboards, and reports",
    text: "Indicators track baselines, targets, actual progress, disaggregation, and reporting periods. Reports turn approved data into dashboards, exports, and donor-ready outputs.",
    worksBy: "Reports should use approved, traceable data linked to forms, projects, beneficiaries, indicators, and quality checks.",
  },
  {
    title: "Users, teams, roles, and governance",
    text: "Admins manage users, stacked roles, teams, permission scopes, role profiles, supervisor relationships, and organization access.",
    worksBy: "Governance records sensitive actions, approvals, policy changes, profile updates, exports, audit trails, and access decisions.",
  },
  {
    title: "Administration and platform settings",
    text: "Administration manages reusable reference data, location hierarchy, notifications, API settings, integrations, mobile devices, version policies, backups, and system settings.",
    worksBy: "System-wide settings live in Administration, while form, project, data quality, user, and governance settings stay in their owning modules.",
  },
];

const updateRules = [
  "When a module, workflow, permission, status, button, or route changes, update this documentation page in the same pull request.",
  "Keep wording aligned with the live UI labels used in the application.",
  "Document what the feature is for, who uses it, how it works, what data it affects, and what the expected result is.",
  "Do not describe a feature as available unless it exists in the product code or has a visible placeholder marked as future-ready.",
];

export const metadata: Metadata = marketingMetadata({
  title: "Product Documentation",
  description: "Atlas FieldOps documentation for getting started, projects, forms, field operations, submissions, mapping, indicators, reports, data quality, governance, administration, and API workflows.",
  path: "/documentation",
});

export default function DocumentationPage() {
  return (
    <MarketingShell>
      <main>
        <SimplePageHero eyebrow="Documentation" title="Atlas FieldOps functionality guide" text="A public guide explaining how the main platform features work across projects, forms, mobile collection, submissions, beneficiaries, quality, maps, reports, governance, and administration." />
        <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0d9488]">Documentation maintenance rule</p>
            <h2 className="mt-3 text-2xl font-semibold text-[#0c1f1b]">This page must stay current with product changes</h2>
            <ul className="mt-4 grid gap-3 text-sm leading-6 text-[#5b6a65] md:grid-cols-2">
              {updateRules.map((rule) => (
                <li className="rounded-lg bg-[#f3f8f6] p-3" key={rule}>{rule}</li>
              ))}
            </ul>
          </div>
        </section>
        <section className="mx-auto grid max-w-7xl gap-4 px-4 pb-20 sm:px-6 md:grid-cols-2 lg:px-8">
          {functionalityGuide.map((item, index) => (
            <article className="rounded-xl border border-black/10 bg-white p-6 shadow-sm" key={item.title}>
              <p className="text-xs font-semibold text-[#0d9488]">{String(index + 1).padStart(2, "0")}</p>
              <h2 className="mt-3 text-lg font-semibold">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#5b6a65]">{item.text}</p>
              <p className="mt-4 rounded-lg bg-[#fafaf8] p-3 text-sm leading-6 text-[#3f4f4a]">
                <span className="font-semibold text-[#0c1f1b]">How it works: </span>
                {item.worksBy}
              </p>
            </article>
          ))}
        </section>
      </main>
    </MarketingShell>
  );
}
