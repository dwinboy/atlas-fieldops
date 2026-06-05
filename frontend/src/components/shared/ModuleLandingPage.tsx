"use client";

import type { LucideIcon } from "lucide-react";
import { ArrowRight, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    <section className={cn("space-y-5", className)}>
      <div className="rounded-2xl border bg-panel p-5 shadow-line">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-primary/10 text-primary">
              <Icon aria-hidden="true" size={22} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight">
                  {title}
                </h2>
                <Badge tone="success">{status}</Badge>
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                {description}
              </p>
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

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {areas.map((area) => (
          <article
            key={area.route}
            className="rounded-xl border bg-panel p-4 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Sparkles aria-hidden="true" size={15} />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold">{area.label}</h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {area.description}
                </p>
                <p className="mt-3 truncate rounded-md bg-muted px-2 py-1 font-mono text-[11px] text-muted-foreground">
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

