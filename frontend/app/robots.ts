import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/login",
          "/app",
          "/dashboard",
          "/projects",
          "/forms",
          "/field-operations",
          "/submissions",
          "/mapping",
          "/indicators",
          "/reports",
          "/data-quality",
          "/users-teams",
          "/governance",
          "/administration",
          "/platform",
          "/api",
          "/collect",
        ],
      },
    ],
    sitemap: "https://atlasfieldops.com/sitemap.xml",
  };
}
