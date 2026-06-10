"use client";

import type { LucideIcon } from "lucide-react";
import { ArrowRight, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

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
  icon?: LucideIcon;
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
  status = "Ready",
  areas,
  actions = [],
  className,
}: ModuleLandingPageProps) {
  const router = useRouter();

  return (
    <section className={cn("space-y-4", className)}>
      <div className="rounded-xl border bg-panel p-4 shadow-line">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-sm">
              <Icon aria-hidden="true" size={20} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold tracking-tight">{title}</h2>
                <HelpHint label={`About ${title}`} title={title}>
                  {description}
                </HelpHint>
                <Badge tone="success">{status}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
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
        {areas.map((area) => {
          const AreaIcon = area.icon;
          return (
            <button
              key={area.route}
              type="button"
              onClick={() => router.push(area.route)}
              className="group rounded-xl border bg-panel p-4 text-left shadow-sm transition-all duration-200 ease-product hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {AreaIcon ? (
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <AreaIcon aria-hidden="true" size={15} />
                    </span>
                  ) : (
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <ChevronRight aria-hidden="true" size={15} />
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold leading-tight">{area.label}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{area.description}</p>
                  </div>
                </div>
                <ArrowRight
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  size={14}
                />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
