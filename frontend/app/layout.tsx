import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import { AppProviders } from "@/app/providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  metadataBase: new URL("https://atlasfieldops.com"),
  title: {
    default: "Atlas FieldOps | Monitoring, Evaluation & Field Data Collection Platform",
    template: "%s | Atlas FieldOps"
  },
  description: "Offline-ready monitoring, evaluation, data collection, beneficiary management, and operational intelligence for NGOs, governments, and field teams.",
  keywords: [
    "monitoring and evaluation software",
    "data collection platform",
    "field data collection system",
    "NGO data platform",
    "agriculture monitoring platform",
    "beneficiary management software",
    "M&E platform",
    "offline data collection app",
    "operational intelligence system"
  ],
  applicationName: "Atlas FieldOps",
  openGraph: {
    title: "Atlas FieldOps",
    description: "Connected monitoring, evaluation, field data collection, and operational intelligence.",
    url: "https://atlasfieldops.com",
    siteName: "Atlas FieldOps",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Atlas FieldOps platform preview" }],
    locale: "en_US",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Atlas FieldOps",
    description: "Offline-ready M&E and field operations platform for mission-critical programs."
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
    <html className={inter.variable} lang="en">
      <body className="font-sans antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
