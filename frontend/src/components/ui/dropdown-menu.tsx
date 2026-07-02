"use client";

import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { MoreVertical } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ActionMenuItem = {
  key: string;
  label: ReactNode;
  icon?: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
};

export function ActionMenu({
  items,
  label = "More actions",
}: {
  items: ActionMenuItem[];
  label?: string;
}) {
  if (!items.length) return null;
  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>
        <Button aria-label={label} size="icon" variant="ghost">
          <MoreVertical aria-hidden="true" />
        </Button>
      </DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align="end"
          className="z-50 min-w-[190px] overflow-hidden rounded-xl border bg-surface-container-lowest p-1 shadow-elevated data-[state=open]:animate-in data-[state=closed]:animate-out"
          sideOffset={6}
        >
          {items.map((item) => (
            <DropdownMenuPrimitive.Item
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium outline-none transition [&_svg]:size-3.5 [&_svg]:shrink-0",
                item.tone === "danger" ? "text-danger hover:bg-danger/10" : "text-foreground hover:bg-muted/65",
                item.disabled ? "pointer-events-none opacity-50" : "",
              )}
              disabled={item.disabled}
              key={item.key}
              onSelect={(event) => {
                event.preventDefault();
                item.onSelect();
              }}
            >
              {item.icon}
              {item.label}
            </DropdownMenuPrimitive.Item>
          ))}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}
