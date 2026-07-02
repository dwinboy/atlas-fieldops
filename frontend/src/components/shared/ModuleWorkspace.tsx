"use client";

import type { ReactNode } from "react";
import { ArrowRight, Sparkles } from "lucide-react";

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
};

export function ModuleWorkspace({
  actions = [],
  children,
  className,
  item,
  showSections = true,
}: ModuleWorkspaceProps) {
  const Icon = item.icon;
  const areas = item.children ?? [];

  return (
    <section className={cn("space-y-3", className)}>
      <div className="surface-hero rounded-2xl p-3.5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex min-w-0 gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-primary/10 text-primary">
              <Icon aria-hidden="true" size={18} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-semibold tracking-tight">
                  {item.label}
                </h1>
                <HelpHint label={`About ${item.label}`} title={item.label}>
                  {item.description}
                </HelpHint>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
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
          className="rounded-xl border bg-surface-container-lowest/80 p-3 shadow-line"
        >
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[13px] font-semibold">Sections in this area</h2>
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
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border bg-surface-container-lowest text-primary">
                    <Sparkles aria-hidden="true" size={13} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-[13px] font-semibold">{area.label}</h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{area.description}</p>
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
