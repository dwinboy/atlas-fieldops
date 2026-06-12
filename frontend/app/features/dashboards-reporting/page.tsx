import type { Metadata } from "next";

import { ComingSoonNotice, SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "Dashboards & Reporting",
  description: "Real-time dashboards, custom reports, and donor outputs built from approved program data.",
  path: "/features/dashboards-reporting",
});

export default function DashboardsReportingPage() {
  return (
    <MarketingShell>
      <main>
        <SimplePageHero
          eyebrow="Features"
          title="Real-time visibility into program performance"
          text="Standard reports, custom dashboards, donor outputs, and scheduled exports built from approved data."
        />
        <ComingSoonNotice backHref="/features" backLabel="Back to Features" />
      </main>
    </MarketingShell>
  );
}
