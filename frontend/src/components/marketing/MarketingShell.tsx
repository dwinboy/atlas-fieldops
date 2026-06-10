"use client";

import { Menu, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/status-dot";
import { footerColumns, navItems } from "@/lib/marketing/content";
import { cn } from "@/lib/utils";

export function MarketingShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f7faf8] text-[#10201c]">
      <header className="sticky top-0 z-50 border-b border-black/10 bg-[#f7faf8]/88 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link className="flex items-center gap-3" href="/">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0f766e] text-white">
              <ShieldCheck size={18} aria-hidden="true" />
            </span>
            <span className="font-semibold tracking-tight">Atlas FieldOps</span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-[#52615d] lg:flex" aria-label="Public navigation">
            {navItems.map((item) => (
              <Link className="transition hover:text-[#10201c]" href={item.href} key={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="hidden items-center gap-2 lg:flex">
            <Button asChild variant="ghost">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild variant="primary">
              <Link href="/book-demo">Book demo</Link>
            </Button>
          </div>
          <button
            aria-label="Open navigation"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-black/10 bg-white lg:hidden"
            onClick={() => setOpen(true)}
            type="button"
          >
            <Menu size={18} />
          </button>
        </div>
        <div className={cn("fixed inset-0 z-50 bg-[#10201c]/40 lg:hidden", open ? "block" : "hidden")}>
          <div className="ml-auto flex min-h-screen w-[86vw] max-w-sm flex-col bg-[#f7faf8] p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Atlas FieldOps</span>
              <button aria-label="Close navigation" className="rounded-md border p-2" onClick={() => setOpen(false)} type="button">
                <X size={18} />
              </button>
            </div>
            <nav className="mt-8 grid gap-2 text-base font-medium" aria-label="Mobile navigation">
              {[...navItems, { label: "Case Studies", href: "/case-studies" }, { label: "Security", href: "/security" }, { label: "About", href: "/about" }].map((item) => (
                <Link className="rounded-md px-3 py-3 hover:bg-black/5" href={item.href} key={item.href} onClick={() => setOpen(false)}>
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-auto grid gap-2">
              <Button asChild>
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild variant="primary">
                <Link href="/book-demo">Book demo</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>
      {children}
      <footer className="border-t border-black/10 bg-[#10201c] text-white">
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
