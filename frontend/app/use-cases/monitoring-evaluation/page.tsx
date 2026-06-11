import type { Metadata } from "next";

import { ComingSoonNotice, SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "Monitoring & Evaluation",
  description: "Track activities, outputs, and outcomes against your results framework with Atlas FieldOps.",
  path: "/use-cases/monitoring-evaluation",
});

export default function MonitoringEvaluationPage() {
  return (
    <MarketingShell>
      <main>
        <SimplePageHero
          eyebrow="Use Cases"
          title="Monitoring & Evaluation"
          text="Track activities, outputs, and outcomes against your results framework, with offline collection and approvals built in."
        />
        <ComingSoonNotice backHref="/use-cases" backLabel="Back to Use Cases" />
      </main>
    </MarketingShell>
  );
}
