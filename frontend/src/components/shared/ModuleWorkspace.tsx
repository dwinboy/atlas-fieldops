"use client";

import type { ReactNode } from "react";
import { ArrowRight, Route, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpHint } from "@/components/ui/help-hint";
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
  showSections?: boolean;
  status?: string;
};

export function ModuleWorkspace({
  actions = [],
  children,
  className,
  item,
  showSections = true,
  status = "Architecture aligned",
}: ModuleWorkspaceProps) {
  const Icon = item.icon;
  const areas = item.children ?? [];

  return (
    <section className={cn("space-y-3", className)}>
      <div className="rounded-xl border bg-panel p-3.5 shadow-line">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex min-w-0 gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-primary/10 text-primary">
              <Icon aria-hidden="true" size={18} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={item.tone}>{item.domain}</Badge>
                <Badge tone="success">{status}</Badge>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-semibold tracking-tight">
                  {item.label}
                </h1>
                <HelpHint label={`About ${item.label}`} title={item.label}>
                  {item.description}
                </HelpHint>
              </div>
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

      {showSections && areas.length ? (
        <section
          aria-label={`${item.label} sections`}
          className="rounded-xl border bg-panel/80 p-3 shadow-line"
        >
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[13px] font-semibold">Workspace sections</h2>
                <HelpHint label="About workspace sections" title="Workspace sections">
                  These are the approved sections from the platform architecture.
                </HelpHint>
              </div>
            </div>
            <Badge tone="neutral">{areas.length} sections</Badge>
          </div>

          <div className="mt-3 grid gap-2.5 md:grid-cols-2 2xl:grid-cols-3">
            {areas.map((area) => (
              <article
                className="rounded-lg border bg-background/80 p-3 shadow-sm"
                key={area.route}
              >
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border bg-panel text-primary">
                    <Sparkles aria-hidden="true" size={13} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[13px] font-semibold">{area.label}</h3>
                      <HelpHint label={`About ${area.label}`} title={area.label}>
                        {area.description}
                      </HelpHint>
                    </div>
                    <p className="mt-2 inline-flex max-w-full items-center gap-1 rounded-md bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
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
