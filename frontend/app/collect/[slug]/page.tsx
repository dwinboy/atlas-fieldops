import type { Metadata } from "next";

import { PublicCollectionForm } from "@/components/PublicCollectionForm";

type CollectPageProps = {
  params: {
    slug: string;
  };
};

export function generateMetadata({ params }: CollectPageProps): Metadata {
  const title = params.slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  return {
    title: `${title || "Public Collection"} | Atlas FieldOps`,
    description: "Submit a field data response through a controlled Atlas FieldOps public collection link.",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default function CollectPage({ params }: CollectPageProps) {
  return <PublicCollectionForm slug={params.slug} />;
}
