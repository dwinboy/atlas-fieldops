import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GitBranch,
  GripVertical,
  Link2,
  RotateCcw,
  ShieldCheck,
  Sigma,
  Trash2,
  Type,
} from "lucide-react";

import { fieldTypeIcons } from "@/components/forms/fieldTypeIcons";
import { Button } from "@/components/ui/button";
import { type FormField } from "@/lib/forms";
import { cn } from "@/lib/utils";

/**
 * Capability chips: a question carrying skip logic, validation, a calculation, carry-forward,
 * or an entity link looks identical to a plain one without these — which makes complex forms
 * impossible to audit at a glance. Only render what's present.
 */
function capabilityChips(field: FormField): { icon: typeof Type; label: string }[] {
  const chips: { icon: typeof Type; label: string }[] = [];
  if (field.logic?.length) chips.push({ icon: GitBranch, label: `logic ×${field.logic.length}` });
  const validation = field.validation ?? {};
  if (Object.keys(validation).length) chips.push({ icon: ShieldCheck, label: "validation" });
  if (field.calculation) chips.push({ icon: Sigma, label: "calc" });
  if (field.carryForward) chips.push({ icon: RotateCcw, label: "carry-forward" });
  const helpText = field.appearance?.helpText ?? "";
  if (helpText.includes("[beneficiary-field:")) {
    chips.push({ icon: Link2, label: helpText.includes("[duplicate-key]") ? "linked · dup key" : "linked" });
  }
  return chips;
}

export function FocusQuestionRow({
  field,
  index,
  selected,
  onDelete,
  onSelect,
}: {
  field: FormField;
  index: number;
  selected: boolean;
  onDelete: () => void;
  onSelect: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });
  const Icon = fieldTypeIcons[field.type] ?? Type;
  const chips = capabilityChips(field);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group flex min-h-16 w-full items-center gap-2 border-b px-4 py-3 transition hover:bg-muted/60",
        selected && "bg-primary/5 text-primary",
        isDragging && "relative z-20 bg-surface-container-lowest shadow-elevated",
      )}
    >
      <button
        aria-label={`Drag ${field.label} to reorder`}
        className="flex h-8 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        onClick={(event) => event.stopPropagation()}
        title="Drag to reorder"
        type="button"
        {...attributes}
        {...listeners}
      >
        <GripVertical aria-hidden="true" size={15} />
      </button>
      <button
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        onClick={onSelect}
        type="button"
      >
        <span className="w-7 shrink-0 text-sm font-semibold">{index + 1}.</span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-sm font-semibold text-foreground">
            {field.label}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Icon aria-hidden="true" size={12} />
              {field.type.replace("_", " ")}
            </span>
            {field.required ? (
              <span className="rounded-full bg-warning/10 px-1.5 py-px font-semibold text-warning">
                required
              </span>
            ) : null}
            {chips.map((chip) => {
              const ChipIcon = chip.icon;
              return (
                <span
                  className="flex items-center gap-1 rounded-full bg-primary/8 px-1.5 py-px font-semibold text-primary"
                  key={chip.label}
                >
                  <ChipIcon aria-hidden="true" size={10} />
                  {chip.label}
                </span>
              );
            })}
          </span>
        </span>
      </button>
      <Button
        aria-label={`Delete ${field.label}`}
        className="opacity-70 group-hover:opacity-100"
        onClick={onDelete}
        size="icon"
        title="Delete question"
        type="button"
        variant="ghost"
      >
        <Trash2 aria-hidden="true" />
      </Button>
    </div>
  );
}
