import type { MetadataRoute } from "next";

import { site, solutionPages, useCasePages } from "@/lib/marketing/content";

const publicRoutes = [
  "",
  "features",
  "demo",
  "signup",
  "create-organization",
  "onboarding",
  "donor",
  "templates",
  "solutions",
  "use-cases",
  "pricing",
  "about",
  "contact",
  "book-demo",
  "resources",
  "blog",
  "case-studies",
  "security",
  "privacy",
  "terms",
  "help",
  "help/mobile",
  "documentation",
  "services",
  "status",
  "careers",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    ...publicRoutes,
    ...solutionPages.map((solution) => `solutions/${solution.slug}`),
    ...useCasePages.map((useCase) => `use-cases/${useCase.slug}`),
  ];

  return routes.map((route) => ({
    url: route ? `${site.url}/${route}` : site.url,
    lastModified: new Date(),
    changeFrequency: route ? "monthly" : "weekly",
    priority: route ? 0.75 : 1,
  }));
}
