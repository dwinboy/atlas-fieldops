import type { Metadata } from "next";

import { SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "Privacy",
  description: "Atlas FieldOps privacy overview for public website leads, customer data, operational records, sensitive field data, and privacy-aware platform design.",
  path: "/privacy",
});

const sections = [
  ["Public website leads", "We collect lead information submitted through contact, demo, resource, and careers forms so our team can respond to requests."],
  ["Customer platform data", "Operational records, submissions, GPS, media, indicators, and reports belong to customer organizations and are governed by customer permissions and agreements."],
  ["Sensitive data", "Atlas FieldOps is designed to support consent, masking, access control, auditability, retention, and export governance."],
  ["Future integrations", "CRM, analytics, and support integrations must follow consent, security, and customer data handling rules."],
];

export default function PrivacyPage() {
  return (
    <MarketingShell>
      <main>
        <SimplePageHero eyebrow="Privacy" title="Privacy-aware field data operations" text="Atlas FieldOps separates public marketing leads from secure customer workspaces and is designed for governed operational data." />
        <section className="mx-auto max-w-4xl space-y-4 px-4 pb-20 sm:px-6 lg:px-8">
          {sections.map(([title, text]) => (
            <article className="rounded-xl border border-black/10 bg-white p-6 shadow-sm" key={title}>
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#52615d]">{text}</p>
            </article>
          ))}
        </section>
      </main>
    </MarketingShell>
  );
}
