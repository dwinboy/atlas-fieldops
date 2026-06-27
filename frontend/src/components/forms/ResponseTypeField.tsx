import { Type } from "lucide-react";
import { useState } from "react";

import { fieldTypeIcons } from "@/components/forms/fieldTypeIcons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpHint } from "@/components/ui/help-hint";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { fieldCatalog, fieldTypeHelp, type FieldType } from "@/lib/forms";
import { cn } from "@/lib/utils";

export function ResponseTypeField({
  currentType,
  onSelect,
}: {
  currentType: FieldType;
  onSelect: (type: FieldType) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const CurrentIcon = fieldTypeIcons[currentType] ?? Type;
  const catalogEntries = fieldCatalog.flatMap((group) => group.fields);
  const currentLabel =
    catalogEntries.find((entry) => entry.type === currentType)?.label ?? currentType;
  const normalizedQuery = query.trim().toLowerCase();
  const groups = fieldCatalog
    .map((group) => ({
      group: group.group,
      fields: group.fields.filter((entry) =>
        normalizedQuery.length === 0
          ? true
          : `${entry.label} ${entry.description} ${entry.type}`
              .toLowerCase()
              .includes(normalizedQuery),
      ),
    }))
    .filter((group) => group.fields.length > 0);

  const openModal = () => {
    setQuery("");
    setOpen(true);
  };

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
          Response type
          <HelpHint label="What a response type is" title="Response type">
            The response type is the most important choice for a question — it decides how the answer
            is captured and which validation, logic, indicator, reference, evidence, privacy, mobile,
            and governance settings apply.
          </HelpHint>
        </span>
        <Button onClick={openModal} size="sm" type="button" variant="secondary">
          Change
        </Button>
      </div>
      <button
        className="mt-2 flex w-full items-center gap-3 rounded-md border bg-background p-3 text-left transition hover:border-primary"
        onClick={openModal}
        type="button"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <CurrentIcon aria-hidden="true" size={18} />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold">{currentLabel}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {fieldTypeHelp[currentType] ?? "Choose how this question is answered."}
          </span>
        </span>
      </button>

      <Modal
        contentClassName="max-w-3xl"
        description="The response type determines every other setting for this question."
        onOpenChange={setOpen}
        open={open}
        title="Choose a response type"
      >
        <div className="border-b px-5 py-3">
          <Input
            autoFocus
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search response types…"
            value={query}
          />
        </div>
        <div className="max-h-[60vh] space-y-5 overflow-y-auto px-5 py-4 product-scrollbar">
          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No response types match “{query}”.
            </p>
          ) : (
            groups.map((group) => (
              <div key={group.group}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.group}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {group.fields.map((entry) => {
                    const Icon = fieldTypeIcons[entry.type] ?? Type;
                    const selected = entry.type === currentType;
                    return (
                      <button
                        className={cn(
                          "flex items-start gap-3 rounded-md border p-3 text-left transition hover:border-primary",
                          selected ? "border-primary bg-primary/5" : "bg-background",
                        )}
                        key={entry.type}
                        onClick={() => {
                          onSelect(entry.type);
                          setOpen(false);
                        }}
                        type="button"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <Icon aria-hidden="true" size={16} />
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5 text-sm font-semibold">
                            {entry.label}
                            {selected ? <Badge tone="accent">Current</Badge> : null}
                          </span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {entry.description}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
}
