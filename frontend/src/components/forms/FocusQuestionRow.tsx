import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Type } from "lucide-react";

import { fieldTypeIcons } from "@/components/forms/fieldTypeIcons";
import { Button } from "@/components/ui/button";
import { type FormField } from "@/lib/forms";
import { cn } from "@/lib/utils";

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
          <span className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Icon aria-hidden="true" size={12} />
            {field.type.replace("_", " ")}
            {field.required ? " · mandatory" : ""}
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
