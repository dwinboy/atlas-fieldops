"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Right-side detail Drawer for review-in-context workflows (e.g. inspecting a record without
 * leaving its queue). Slides over the content on desktop (default max-w-2xl) and goes
 * full-screen below the md breakpoint so tablets keep a usable review surface. Header shows
 * a title (+ optional meta line) with a close affordance; wrap long content in DrawerBody
 * and actions in DrawerFooter — same conventions as Modal.
 */
export function Drawer({
  children,
  contentClassName,
  meta,
  onOpenChange,
  open,
  title,
}: {
  children: ReactNode;
  contentClassName?: string;
  meta?: ReactNode;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-deep-emerald-dark/25 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
        <Dialog.Content
          className={cn(
            "fixed inset-y-0 right-0 z-50 flex h-full w-full flex-col overflow-hidden border-l border-border-subtle bg-surface-container-lowest shadow-elevated outline-none md:max-w-2xl",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right data-[state=open]:duration-200 data-[state=closed]:duration-150",
            contentClassName,
          )}
        >
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border-subtle px-5 py-4">
            <div className="min-w-0">
              <Dialog.Title className="truncate text-base font-semibold text-on-surface">
                {title}
              </Dialog.Title>
              {meta ? (
                <div className="mt-1 text-xs text-on-surface-variant">{meta}</div>
              ) : null}
            </div>
            <Dialog.Close asChild>
              <Button aria-label="Close panel" size="icon" variant="ghost">
                <X aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Scrollable, consistently-padded drawer body. */
export function DrawerBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex-1 overflow-y-auto px-5 py-4 product-scrollbar", className)}>
      {children}
    </div>
  );
}

/** Sticky action footer pinned below the scrollable body. */
export function DrawerFooter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-end gap-2 border-t border-border-subtle bg-surface-container-lowest px-5 py-3",
        className,
      )}
    >
      {children}
    </div>
  );
}
