import type { Metadata } from "next";

import { CTASection, SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "Security, Governance, and Compliance",
  description: "Atlas FieldOps security includes encryption readiness, access control, audit trails, governance workflows, backups, data quality controls, and tenant separation.",
  path: "/security",
});

const controls = [
  ["Data security", "Secure architecture for sensitive submissions, attachments, GPS evidence, and entity records."],
  ["Access control", "Role-based and scope-aware permissions for projects, forms, submissions, maps, reports, users, and administration."],
  ["Audit trails", "Immutable records for publishing, approvals, exports, governance changes, and platform support actions."],
  ["Governance", "Consent, retention, approvals, data stewardship, export controls, and policy management."],
  ["Backups", "Backup and recovery architecture for database, files, and configuration metadata."],
  ["Compliance readiness", "Designed for donor, government, safeguarding, and privacy-focused operating environments."],
];

export default function SecurityPage() {
  return (
    <MarketingShell>
      <main>
        <SimplePageHero eyebrow="Security" title="Enterprise trust for sensitive field data" text="Atlas FieldOps is designed for organizations that need accountable data collection, governed access, auditability, and reliable operational controls." />
        <section className="mx-auto grid max-w-7xl gap-5 px-4 pb-20 sm:px-6 md:grid-cols-2 lg:grid-cols-3 lg:px-8">
          {controls.map(([title, text]) => (
            <article className="rounded-xl border border-black/10 bg-white p-6 shadow-sm" key={title}>
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#5b6a65]">{text}</p>
            </article>
          ))}
        </section>
        <CTASection />
      </main>
    </MarketingShell>
  );
}
