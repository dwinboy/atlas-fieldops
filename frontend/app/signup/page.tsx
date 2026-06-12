import type { Metadata } from "next";
import Link from "next/link";

import { ContactRequestForm } from "@/components/marketing/ContactRequestForm";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "Start Free Trial",
  description:
    "Request an Atlas FieldOps trial workspace for monitoring and evaluation, offline data collection, entity management, imports, and donor reporting.",
  path: "/signup",
});

export default function SignupPage() {
  return (
    <MarketingShell>
      <main>
        <section className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0d9488]">Start trial</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[#0c1f1b] md:text-5xl">
              Create a startup-ready M&E workspace.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#5b6a65]">
              Share your organization details and we will prepare a secure onboarding path for projects, imports, forms, entities, teams, reports, and integrations.
            </p>
            <div className="mt-8 grid gap-3 text-sm text-[#5b6a65]">
              {["Organization workspace setup", "First admin and team invitation readiness", "Migration assistant for historical data", "Templates for projects, forms, dashboards, and indicators"].map((item) => (
                <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm" key={item}>{item}</div>
              ))}
            </div>
            <p className="mt-6 text-sm text-[#5b6a65]">
              Already have an account? <Link className="font-semibold text-[#0d9488]" href="/login">Sign in</Link>.
            </p>
          </div>
          <ContactRequestForm source="signup" title="Request a trial workspace" />
        </section>
      </main>
    </MarketingShell>
  );
}
