"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { HelpHint } from "@/components/ui/help-hint";
import { cn } from "@/lib/utils";

export function Modal({
  children,
  contentClassName,
  description,
  open,
  onOpenChange,
  title
}: {
  children: ReactNode;
  contentClassName?: string;
  description?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border bg-surface-container-lowest p-0 shadow-elevated",
            contentClassName
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Dialog.Title className="text-base font-semibold">{title}</Dialog.Title>
                {description ? <HelpHint label={`About ${title}`} title={title}>{description}</HelpHint> : null}
              </div>
              {description ? <Dialog.Description className="sr-only">{description}</Dialog.Description> : null}
            </div>
            <Dialog.Close asChild>
              <Button aria-label="Close modal" size="icon" variant="ghost">
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

/**
 * Scrollable, consistently-padded modal body. Use inside <Modal> so content never sits
 * flush against the dialog edges and long forms scroll instead of clipping. Opt-in: the
 * Modal primitive renders children as-is, so existing custom/full-bleed modals are
 * unaffected until migrated.
 */
export function ModalBody({
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

/** Sticky, bordered, padded footer for modal actions. Sits below the scrollable body. */
export function ModalFooter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-end gap-2 border-t bg-surface-container-lowest px-5 py-3",
        className,
      )}
    >
      {children}
    </div>
  );
}
