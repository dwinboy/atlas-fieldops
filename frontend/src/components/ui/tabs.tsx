"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export type TabItem<T extends string = string> = {
  value: T;
  label: string;
  hint?: string;
  badge?: ReactNode;
};

type TabsProps<T extends string> = {
  ariaLabel: string;
  className?: string;
  items: TabItem<T>[];
  onChange: (value: T) => void;
  value: T;
};

export function Tabs<T extends string>({
  ariaLabel,
  className,
  items,
  onChange,
  value,
}: TabsProps<T>) {
  const listRef = useRef<HTMLDivElement>(null);

  function focusTab(index: number) {
    const tabs = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    tabs?.[index]?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const currentIndex = items.findIndex((item) => item.value === value);
    if (currentIndex < 0) return;
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % items.length;
    if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + items.length) % items.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = items.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    onChange(items[nextIndex].value);
    focusTab(nextIndex);
  }

  return (
    <div
      aria-label={ariaLabel}
      className={cn(
        "flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border bg-panel p-1 shadow-line product-scrollbar",
        className,
      )}
      onKeyDown={handleKeyDown}
      ref={listRef}
      role="tablist"
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            aria-selected={active}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
            )}
            key={item.value}
            onClick={() => onChange(item.value)}
            role="tab"
            tabIndex={active ? 0 : -1}
            title={item.hint}
            type="button"
          >
            <span>{item.label}</span>
            {item.badge}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({
  active,
  children,
  className,
}: {
  active: boolean;
  children: ReactNode;
  className?: string;
}) {
  if (!active) return null;
  return (
    <div className={cn("space-y-3", className)} role="tabpanel">
      {children}
    </div>
  );
}
