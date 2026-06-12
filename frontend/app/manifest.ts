import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Atlas FieldOps",
    short_name: "FieldOps",
    description: "Offline-ready monitoring, evaluation, and field operations workspace.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#0f766e",
    lang: "en",
    icons: [
      {
        src: "/icon.png",
        sizes: "2000x2000",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };
}
