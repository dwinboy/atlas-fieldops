import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppProviders } from "@/app/providers";

export const metadata: Metadata = {
  metadataBase: new URL("https://atlasfieldops.com"),
  title: {
    default: "Atlas FieldOps | Field Data Collection, Operations & Reporting Platform",
    template: "%s | Atlas FieldOps"
  },
  description: "Offline-ready field data collection, forms, inspections, inventory checks, GIS mapping, entity management, KPI tracking, approvals, and reporting for every sector.",
  keywords: [
    "monitoring and evaluation software",
    "data collection platform",
    "field data collection system",
    "field operations software",
    "inspection management software",
    "inventory data collection software",
    "retail field operations software",
    "mobile survey app",
    "GIS mapping software",
    "NGO data platform",
    "agriculture monitoring platform",
    "entity management software",
    "M&E platform",
    "offline data collection app",
    "operational intelligence system"
  ],
  applicationName: "Atlas FieldOps",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  openGraph: {
    title: "Atlas FieldOps",
    description: "Connected field data collection, mobile operations, mapping, approvals, analytics, and governed reporting.",
    url: "https://atlasfieldops.com",
    siteName: "Atlas FieldOps",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Atlas FieldOps platform preview" }],
    locale: "en_US",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Atlas FieldOps",
    description: "Offline-ready field data collection and operations platform for mission-critical work."
  },
  appleWebApp: {
    capable: true,
    title: "Atlas FieldOps"
  },
  other: {
    "mobile-web-app-capable": "yes"
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
