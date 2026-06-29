import type { Metadata } from "next";
import Link from "next/link";

import { SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { site } from "@/lib/marketing/content";
import { breadcrumbSchema, JsonLd, marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "System Status and Service Reliability",
  description: "Atlas FieldOps public status and reliability page for web app availability, API health, database services, mobile sync, file uploads, background jobs, integrations, notifications, and incident communication.",
  path: "/status",
});

const services = [
  ["Web application", "Workspace, public pages, dashboards, forms, submissions, and reports."],
  ["API services", "Authentication, projects, forms, submissions, entities, indicators, maps, and reports."],
  ["Database", "Tenant data, audit history, submissions, entities, workflows, and reporting records."],
  ["Mobile sync", "Assigned work, offline forms, queued submissions, GPS/media evidence, and device status."],
  ["File and media uploads", "Photos, attachments, signatures, import files, exports, and generated reports."],
  ["Background jobs", "Imports, clean-up tasks, report preparation, sync processing, and scheduled activity."],
  ["Integrations", "API integrations, exports, notification channels, and connected systems."],
  ["Email notifications", "Invitations, workflow notices, approvals, returned submissions, and operational alerts."],
];

const reliabilityPractices = [
  ["Tenant protection", "Organization data is separated by tenant, role, project, and permission scope."],
  ["Operational monitoring", "Core services are checked for availability, API health, sync readiness, and background processing."],
  ["Incident communication", "When a material service issue occurs, users should receive clear impact, workaround, and resolution updates."],
  ["Recovery planning", "Backups, migrations, logs, audit history, and deployment procedures are treated as release-critical controls."],
];

const incidentStates = [
  ["Operational", "Service is available and no user-impacting incident is known."],
  ["Degraded performance", "Some workflows may be slower, delayed, or partially unavailable."],
  ["Partial outage", "A specific service or module is unavailable for some users."],
  ["Major outage", "A critical system is unavailable and active recovery is required."],
];

export default function StatusPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Atlas FieldOps System Status",
    url: `${site.url}/status`,
    description: metadata.description,
  };

  return (
    <MarketingShell>
      <JsonLd data={jsonLd} />
      <JsonLd data={breadcrumbSchema([{ name: "Home", url: site.url }, { name: "Status", url: `${site.url}/status` }])} />
      <main>
        <SimplePageHero
          eyebrow="Status"
          title="Platform transparency and service readiness"
          text="A public reliability page for Atlas FieldOps web, API, database, mobile sync, media upload, integrations, notifications, and operational incident communication."
        />
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b pb-4">
              <div>
                <h2 className="text-xl font-semibold">Current service summary</h2>
                <p className="mt-1 text-sm text-[#5b6a65]">Public readiness overview for core Atlas FieldOps services.</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">Operational</span>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {services.map(([service, description]) => (
                <div className="rounded-lg border border-black/10 bg-[#fafaf8] p-4" key={service}>
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-medium">{service}</span>
                    <span className="text-sm font-semibold text-emerald-700">Healthy</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#5b6a65]">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="mx-auto grid max-w-7xl gap-5 px-4 pb-16 sm:px-6 md:grid-cols-2 lg:px-8">
          <article className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0d9488]">Reliability model</p>
            <h2 className="mt-3 text-2xl font-semibold text-[#0c1f1b]">How Atlas FieldOps thinks about service readiness</h2>
            <div className="mt-5 grid gap-3">
              {reliabilityPractices.map(([title, text]) => (
                <div className="rounded-xl bg-[#f3f8f6] p-4" key={title}>
                  <h3 className="text-sm font-semibold text-[#0c1f1b]">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-[#5b6a65]">{text}</p>
                </div>
              ))}
            </div>
          </article>
          <article className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0d9488]">Incident language</p>
            <h2 className="mt-3 text-2xl font-semibold text-[#0c1f1b]">What each status means</h2>
            <div className="mt-5 grid gap-3">
              {incidentStates.map(([title, text]) => (
                <div className="rounded-xl bg-[#fafaf8] p-4" key={title}>
                  <h3 className="text-sm font-semibold text-[#0c1f1b]">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-[#5b6a65]">{text}</p>
                </div>
              ))}
            </div>
          </article>
        </section>
        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-black/10 bg-[#0c1f1b] p-8 text-white shadow-2xl">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5eead4]">Need help?</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight">Report a service issue or ask about platform readiness</h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70">
                  If your team experiences login, sync, upload, submission, reporting, or integration problems, contact support with your organization name, affected user, module, time, and steps to reproduce.
                </p>
              </div>
              <Link className="inline-flex h-11 items-center justify-center rounded-md bg-white px-5 text-sm font-semibold text-[#0d9488] transition hover:bg-white/90" href="/contact">
                Contact support
              </Link>
            </div>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
