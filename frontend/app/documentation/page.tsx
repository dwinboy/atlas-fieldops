import type { Metadata } from "next";

import { ArchitectureGraphic, DataUseGraphic, ModuleEcosystemGraphic, OperatingFlowGraphic, SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { marketingMetadata } from "@/lib/marketing/seo";

const contextCards = [
  {
    title: "What Atlas FieldOps is for",
    text: "Atlas FieldOps helps organizations plan field work, build forms, assign teams, collect data online or offline, review submissions, clean imported records, track entities, map activity, measure KPIs, and produce governed reports.",
  },
  {
    title: "How the platform is organized",
    text: "The workspace follows the real operating flow: organization settings, projects, entity categories, forms, assignments, submissions, approvals, data quality, maps, metrics, reports, and audit history.",
  },
  {
    title: "What counts as ready data",
    text: "Data becomes ready for dashboards, exports, entities, and reports after it is submitted or imported, reviewed where required, cleaned when needed, approved, and linked to the right project, form, entity, location, user, and time period.",
  },
  {
    title: "How sectors fit",
    text: "Sector packs and custom project settings change the language and templates for agriculture, health, education, retail, inventory, logistics, audits, HR, humanitarian work, government programs, research, and custom operations.",
  },
];

const roleContext = [
  ["Organization owner or admin", "Create the organization structure, invite users, assign roles, set permissions, configure reference data, and keep governance settings understandable."],
  ["Project or program manager", "Create projects, choose the sector context, define locations and entities, attach forms, assign field teams, and monitor progress."],
  ["Data manager", "Review submissions, approve clean data, return records that need correction, manage imports, clean spreadsheet uploads, and protect data quality."],
  ["Supervisor", "Assign field officers, review daily work, approve field visit requests, check sync status, and follow up on returned submissions or quality issues."],
  ["Field officer", "Use the mobile app to download assigned work, collect data, save drafts, capture GPS/media evidence, and sync submissions when connected."],
  ["Viewer, donor, or leadership user", "Read approved summaries, dashboards, reports, maps, and exports without changing operational records."],
];

const userJourney = [
  ["1. Set the organization context", "Create or join the correct organization. Confirm users, teams, permissions, locations, reference data, and platform settings before operational data collection starts."],
  ["2. Create a project", "Choose the sector or custom setup, define geography, entity categories, KPIs or metrics, forms, teams, governance rules, and readiness requirements."],
  ["3. Build and publish forms", "Create questions, validation, logic, entity links, duplicate rules, workflow, mobile controls, permissions, and review readiness before publishing a stable version."],
  ["4. Assign field work", "Send published forms, locations, entities, and tasks to the right field officers or teams so the mobile app only shows authorized work."],
  ["5. Collect or import data", "Field officers collect on mobile or web. Data managers can upload spreadsheet data into published forms and clean rows before confirming them."],
  ["6. Review and approve", "Supervisors or data managers approve, reject, return, or archive submissions. Approved records become official evidence for entities, metrics, maps, and reports."],
  ["7. Use the data", "Ready data feeds entity profiles, project dashboards, GIS maps, quality scorecards, metric tracking, exports, reports, and management decisions."],
];

const quickStartByGoal = [
  ["I want to collect data in the field", "Create a project, build a form, publish it, assign it to field officers, then let officers sync the form in the mobile app."],
  ["I want to import existing spreadsheet data", "Open the published form data page, upload the spreadsheet, map columns, clean rows in the grid, then confirm clean rows for review or use."],
  ["I want to track people, facilities, stores, assets, or cases", "Activate an entity category in the project, link a registration form to that category, map profile fields, and approve registration submissions."],
  ["I want reports and dashboards", "Use approved submissions and clean imported data. Connect metrics or KPIs where needed, then open Reports or Dashboards with project and date filters."],
  ["I want to control access", "Use Users & Teams, role assignments, project/location scope, form permissions, and Governance audit trails. Frontend hiding is not enough; backend permissions enforce access."],
  ["I want mobile teams to work offline", "Assign forms, entities, and locations, confirm mobile rules, let officers sync once online, collect offline, then sync queued submissions when connected."],
];

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
    text: "Managers assign field officers to projects, forms, locations, entities, visits, and operational activities. Supervisors can approve movement requests and monitor field progress.",
    worksBy: "The field officer profile shows assignments, supervisor relationship, devices, permissions, submissions, performance, and activity history.",
  },
  {
    title: "Mobile field app",
    text: "Field officers sign in, sync assigned work, collect data offline, save drafts, capture GPS and media evidence, queue submissions, and sync when connected.",
    worksBy: "Mobile bootstrap downloads profile, permissions, assignments, projects, forms, locations, entities, rules, and returned submissions.",
  },
  {
    title: "Submissions and approval",
    text: "Submitted records arrive in the web app for review. Reviewers approve, return, reject, or archive records based on quality, evidence, and governance rules.",
    worksBy: "Approved data can feed entities, indicators, reports, dashboards, maps, and audit history. Unapproved records stay visible but should not count as official results.",
  },
  {
    title: "Data import and cleaning",
    text: "Users can upload spreadsheet data into forms, map columns, see missing fields, clean rows in an Excel-like grid, and confirm clean data for review.",
    worksBy: "Uploaded and imported records keep source labels, import batch context, row issues, and cleaning status so they are not confused with live field submissions.",
  },
  {
    title: "Entities and records",
    text: "Entities such as farmers, households, facilities, schools, groups, and other records are the long-term records connected to approved submissions.",
    worksBy: "Approved entity-linked forms can create or update entities, generate stable codes, preserve profile lineage, and send conflicts to reconciliation.",
  },
  {
    title: "Data quality and reconciliation",
    text: "Data Quality helps teams investigate duplicates, missing values, outliers, invalid GPS, profile conflicts, suspicious activity, and unlinked records.",
    worksBy: "Quality issues are reviewed before records are used in reports, indicators, entity profiles, or donor outputs.",
  },
  {
    title: "Mapping and GPS evidence",
    text: "Mapping shows project areas, entity locations, submission points, facilities, coverage gaps, GPS quality issues, and operational movement evidence.",
    worksBy: "GPS capture stores coordinates, accuracy, source, timestamp, and quality signals where forms or activity rules require location evidence.",
  },
  {
    title: "Indicators, dashboards, and reports",
    text: "Indicators track baselines, targets, actual progress, disaggregation, and reporting periods. Reports turn approved data into dashboards, exports, and donor-ready outputs.",
    worksBy: "Reports should use approved, traceable data linked to forms, projects, entities, indicators, and quality checks.",
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
  title: "Product Documentation and User Guide",
  description: "Public Atlas FieldOps user guide with context for organizations, projects, forms, mobile collection, submissions, entities, data quality, mapping, metrics, reports, governance, administration, and secure workflows.",
  path: "/documentation",
});

export default function DocumentationPage() {
  return (
    <MarketingShell>
      <main>
        <SimplePageHero
          eyebrow="Documentation"
          title="Atlas FieldOps user guide"
          text="A public guide that explains what each part of Atlas FieldOps is for, who uses it, what to prepare, what happens after each action, and how field data becomes trusted operational evidence."
        />
        <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
          <div className="grid gap-4 md:grid-cols-2">
            {contextCards.map((card) => (
              <article className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm" key={card.title}>
                <h2 className="text-xl font-semibold text-[#0c1f1b]">{card.title}</h2>
                <p className="mt-3 text-sm leading-6 text-[#5b6a65]">{card.text}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0d9488]">Start here</p>
            <h2 className="mt-3 text-2xl font-semibold text-[#0c1f1b]">Choose the path that matches what you want to do</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {quickStartByGoal.map(([goal, nextStep]) => (
                <article className="rounded-xl bg-[#f3f8f6] p-4" key={goal}>
                  <h3 className="text-sm font-semibold text-[#0c1f1b]">{goal}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#5b6a65]">{nextStep}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <OperatingFlowGraphic />
        <ModuleEcosystemGraphic />
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {roleContext.map(([role, context]) => (
              <article className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm" key={role}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0d9488]">Role context</p>
                <h2 className="mt-3 text-lg font-semibold text-[#0c1f1b]">{role}</h2>
                <p className="mt-2 text-sm leading-6 text-[#5b6a65]">{context}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="bg-white py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0d9488]">Beginner workflow</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#0c1f1b] md:text-4xl">The normal path from setup to usable data</h2>
              <p className="mt-4 text-base leading-7 text-[#5b6a65]">Most organizations should follow this order so forms, assignments, submissions, entities, maps, and reports stay connected.</p>
            </div>
            <ol className="mt-12 grid gap-4 md:grid-cols-2">
              {userJourney.map(([title, text]) => (
                <li className="rounded-2xl border border-black/10 bg-[#fafaf8] p-6 shadow-sm" key={title}>
                  <h3 className="text-lg font-semibold text-[#0c1f1b]">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#5b6a65]">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
        <ArchitectureGraphic />
        <DataUseGraphic />
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
