import type { Metadata } from "next";

import { FeatureDetailPage } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { formBuilderContent } from "@/lib/marketing/feature-content";
import { marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "Form Builder for Surveys, Inspections, Audits, and Field Workflows",
  description:
    "Design mobile-ready data collection forms for surveys, inspections, audits, registrations, stock counts, delivery proof, and custom workflows with logic, validation, repeat groups, entity links, and versioning.",
  path: "/features/form-builder",
});

export default function Page() {
  return (
    <MarketingShell>
      <FeatureDetailPage content={formBuilderContent} />
    </MarketingShell>
  );
}
