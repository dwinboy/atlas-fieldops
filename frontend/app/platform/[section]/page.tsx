import { WorkspaceApp } from "@/components/WorkspaceApp";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Platform Console",
  robots: {
    index: false,
    follow: false,
  },
};

export default function PlatformSectionPage() {
  return <WorkspaceApp />;
}
