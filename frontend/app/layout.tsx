import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppProviders } from "@/app/providers";

export const metadata: Metadata = {
  title: "Atlas FieldOps",
  description: "Offline-ready monitoring, evaluation, and field operations platform",
  applicationName: "Atlas FieldOps",
  appleWebApp: {
    capable: true,
    title: "Atlas FieldOps"
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
