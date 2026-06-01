import type { MetadataRoute } from "next";

const routes = ["", "features", "solutions", "services", "about", "contact", "pricing", "resources", "blog", "case-studies", "collect/demo-registration"];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: `https://atlasfieldops.com/${route}`,
    lastModified: new Date(),
    changeFrequency: route ? "monthly" : "weekly",
    priority: route ? 0.7 : 1
  }));
}
