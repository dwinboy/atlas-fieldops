"use client";

import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { MarketingNav } from "@/components/marketing/MarketingNav";
import { StatusDot } from "@/components/ui/status-dot";
import { footerColumns } from "@/lib/marketing/content";
import { cn } from "@/lib/utils";

export function MarketingShell({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 4);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#fafaf8] text-[#0c1f1b]">
      <header
        className={cn(
          "sticky top-0 z-50 border-b bg-background/90 backdrop-blur-xl transition-shadow",
          scrolled ? "border-border shadow-sm" : "border-transparent",
        )}
      >
        <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link className="flex items-center gap-3" href="/">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck size={18} aria-hidden="true" />
            </span>
            <span className="font-semibold tracking-tight text-foreground">Atlas FieldOps</span>
          </Link>
          <MarketingNav />
        </div>
      </header>
      {children}
      <footer className="border-t border-black/10 bg-[#0c1f1b] text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.3fr_2fr] lg:px-8">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#5eead4]/15 text-[#5eead4]">
                <ShieldCheck size={18} aria-hidden="true" />
              </span>
              <span className="font-semibold">Atlas FieldOps</span>
            </div>
            <p className="mt-4 max-w-md text-sm leading-6 text-white/68">
              Monitoring, evaluation, offline data collection, and operational intelligence for teams doing mission-critical field work.
            </p>
            <Link className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-white/68 transition hover:text-white" href="/status">
              <StatusDot tone="online" />
              All systems operational
            </Link>
          </div>
          <nav aria-label="Footer" className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {footerColumns.map((column) => (
              <div key={column.title}>
                <h2 className="text-sm font-semibold">{column.title}</h2>
                <ul className="mt-4 space-y-3 text-sm text-white/68">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link className="transition hover:text-white" href={link.href}>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <p>&copy; {new Date().getFullYear()} Atlas FieldOps. All rights reserved.</p>
            <div className="flex gap-5">
              <Link className="transition hover:text-white" href="/privacy">Privacy</Link>
              <Link className="transition hover:text-white" href="/terms">Terms</Link>
              <Link className="transition hover:text-white" href="/security">Security</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
