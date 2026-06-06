import type { Metadata } from "next";

import { ContactRequestForm } from "@/components/marketing/ContactRequestForm";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "Create Organization",
  description:
    "Start an Atlas FieldOps organization workspace with organization profile, first admin, projects, imports, users, templates, and secure settings.",
  path: "/create-organization",
});

const setupSteps = ["Organization info", "First administrator", "Project or import choice", "Branding and settings", "Invite team", "Start collecting data"];

export default function CreateOrganizationPage() {
  return (
    <MarketingShell>
      <main>
        <section className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.9fr_1fr] lg:px-8">
          <aside className="rounded-3xl bg-[#10201c] p-8 text-white shadow-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5eead4]">Organization setup</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight">Launch with a guided SaaS setup path.</h1>
            <div className="mt-8 grid gap-3">
              {setupSteps.map((step, index) => (
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/8 p-3 text-sm" key={step}>
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#5eead4]/15 text-xs font-semibold text-[#5eead4]">{index + 1}</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </aside>
          <ContactRequestForm source="create-organization" title="Create organization request" />
        </section>
      </main>
    </MarketingShell>
  );
}
