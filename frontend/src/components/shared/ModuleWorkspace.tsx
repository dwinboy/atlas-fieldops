"use client";

import type { ReactNode } from "react";
import { ArrowRight, Route, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { NavigationItem } from "@/config/navigation";
import { cn } from "@/lib/utils";

export type ModuleWorkspaceAction = {
  description: string;
  label: string;
  onClick: () => void;
};

type ModuleWorkspaceProps = {
  actions?: ModuleWorkspaceAction[];
  children?: ReactNode;
  className?: string;
  item: NavigationItem;
  status?: string;
};

export function ModuleWorkspace({
  actions = [],
  children,
  className,
  item,
  status = "Architecture aligned",
}: ModuleWorkspaceProps) {
  const Icon = item.icon;
  const areas = item.children ?? [];

  return (
    <section className={cn("space-y-5", className)}>
      <div className="rounded-2xl border bg-panel p-5 shadow-line">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex min-w-0 gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border bg-primary/10 text-primary">
              <Icon aria-hidden="true" size={22} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={item.tone}>{item.domain}</Badge>
                <Badge tone="success">{status}</Badge>
              </div>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight">
                {item.label}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                {item.description}
              </p>
            </div>
          </div>

          {actions.length ? (
            <div className="flex shrink-0 flex-wrap gap-2">
              {actions.map((action) => (
                <Button
                  key={action.label}
                  onClick={action.onClick}
                  title={action.description}
                  type="button"
                  variant="secondary"
                >
                  {action.label}
                  <ArrowRight aria-hidden="true" />
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {areas.length ? (
        <section
          aria-label={`${item.label} sections`}
          className="rounded-2xl border bg-panel/80 p-4 shadow-line"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-sm font-semibold">Workspace sections</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                These are the approved sections from the platform architecture.
              </p>
            </div>
            <Badge tone="neutral">{areas.length} sections</Badge>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {areas.map((area) => (
              <article
                className="rounded-xl border bg-background/80 p-4 shadow-sm"
                key={area.route}
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-panel text-primary">
                    <Sparkles aria-hidden="true" size={15} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold">{area.label}</h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {area.description}
                    </p>
                    <p className="mt-3 inline-flex max-w-full items-center gap-1 rounded-md bg-muted px-2 py-1 font-mono text-[11px] text-muted-foreground">
                      <Route aria-hidden="true" size={12} />
                      <span className="truncate">{area.route}</span>
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {children ? <div className="min-w-0">{children}</div> : null}
    </section>
  );
}
