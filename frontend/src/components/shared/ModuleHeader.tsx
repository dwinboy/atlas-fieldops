"use client";

import type { ReactNode } from "react";

import { HelpHint } from "@/components/ui/help-hint";
import { cn } from "@/lib/utils";

export type ModuleHeaderTab<T extends string> = {
  id: T;
  label: string;
  route?: string;
};

type ModuleHeaderProps<T extends string> = {
  actions?: ReactNode;
  activeTab?: T;
  badges?: ReactNode;
  children?: ReactNode;
  className?: string;
  description?: ReactNode;
  helpLabel?: string;
  helpTitle?: string;
  helpText?: ReactNode;
  icon?: ReactNode;
  navigation?: ReactNode;
  onSelectTab?: (tab: T) => void;
  tabs?: ReadonlyArray<ModuleHeaderTab<T>>;
  tabsLabel?: string;
  title: ReactNode;
};

export function ModuleHeader<T extends string>({
  actions,
  activeTab,
  badges,
  children,
  className,
  description,
  helpLabel,
  helpTitle,
  helpText,
  icon,
  navigation,
  onSelectTab,
  tabs = [],
  tabsLabel,
  title,
}: ModuleHeaderProps<T>) {
  return (
    <div className={cn("workspace-command-header p-4", className)}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className={cn("min-w-0", icon ? "flex max-w-4xl gap-3" : "max-w-3xl")}>
          {icon ? (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
              {icon}
            </span>
          ) : null}
          <div className="min-w-0">
            {badges ? <div className="flex flex-wrap items-center gap-2">{badges}</div> : null}
            <div className={cn("flex flex-wrap items-center gap-2", badges && "mt-3")}>
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              {helpText ? (
                <HelpHint label={helpLabel ?? `About ${String(title)}`} title={helpTitle ?? String(title)}>
                  {helpText}
                </HelpHint>
              ) : null}
            </div>
            {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
            {children}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>

      {navigation ?? (tabs.length ? (
        <div
          aria-label={tabsLabel ?? `${String(title)} sections`}
          className="workspace-command-tabs product-scrollbar"
        >
          {tabs.map((tab) => (
            <button
              className={cn(
                "shrink-0 px-3 py-2 text-xs transition",
                activeTab === tab.id && "is-active",
              )}
              key={tab.id}
              onClick={() => onSelectTab?.(tab.id)}
              type="button"
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      ) : null)}
    </div>
  );
}
