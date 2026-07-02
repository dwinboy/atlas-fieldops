"use client";

import type { LucideIcon } from "lucide-react";
import { ArrowRight, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpHint } from "@/components/ui/help-hint";
import { cn } from "@/lib/utils";

type ModuleAction = {
  label: string;
  description: string;
  onClick?: () => void;
};

type ModuleArea = {
  label: string;
  route: string;
  description: string;
};

type ModuleLandingPageProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  status?: string;
  areas: ModuleArea[];
  actions?: ModuleAction[];
  className?: string;
};

export function ModuleLandingPage({
  title,
  description,
  icon: Icon,
  status = "Workspace ready",
  areas,
  actions = [],
  className,
}: ModuleLandingPageProps) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="rounded-2xl border border-border-subtle bg-surface-container-lowest p-3.5 shadow-card">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-primary/10 text-primary">
              <Icon aria-hidden="true" size={18} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold tracking-tight">
                  {title}
                </h2>
                <HelpHint label={`About ${title}`} title={title}>
                  {description}
                </HelpHint>
                <Badge tone="success">{status}</Badge>
              </div>
            </div>
          </div>
          {actions.length ? (
            <div className="flex shrink-0 flex-wrap gap-2">
              {actions.map((action) => (
                <Button
                  key={action.label}
                  type="button"
                  variant="secondary"
                  onClick={action.onClick}
                  title={action.description}
                >
                  {action.label}
                  <ArrowRight aria-hidden="true" />
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
        {areas.map((area) => (
          <article
            key={area.route}
            className="rounded-lg border bg-surface-container-lowest p-3 shadow-sm"
          >
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Sparkles aria-hidden="true" size={13} />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-[13px] font-semibold">{area.label}</h3>
                  <HelpHint label={`About ${area.label}`} title={area.label}>
                    {area.description}
                  </HelpHint>
                </div>
                <p className="mt-2 truncate rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                  {area.route}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
