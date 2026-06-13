import type { Metadata } from "next";

import { FeatureDetailPage } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { formBuilderContent } from "@/lib/marketing/feature-content";
import { marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "Form Builder for M&E Surveys",
  description:
    "Design mobile-ready data collection forms with sections, repeat groups, skip logic, validation, and versioning — backwards from your indicators.",
  path: "/features/form-builder",
});

export default function Page() {
  return (
    <MarketingShell>
      <FeatureDetailPage content={formBuilderContent} />
    </MarketingShell>
  );
}
