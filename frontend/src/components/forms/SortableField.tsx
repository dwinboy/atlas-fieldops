import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, Check, Copy, GripVertical, Settings2, Trash2 } from "lucide-react";

import { FieldInputPreview } from "@/components/forms/FieldInputPreview";
import { fieldTypeIcons } from "@/components/forms/fieldTypeIcons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type FormField } from "@/lib/forms";
import { cn } from "@/lib/utils";

export function SortableField({
  field,
  index,
  selected,
  onDuplicate,
  onEditSettings,
  onLabelChange,
  onMoveDown,
  onMoveUp,
  onRemove,
  onSelect,
  onToggleRequired,
  referenceBound,
  canMoveDown,
  canMoveUp,
  issueSeverity,
}: {
  field: FormField;
  index: number;
  selected: boolean;
  onDuplicate: () => void;
  onEditSettings: () => void;
  onLabelChange: (label: string) => void;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onRemove: () => void;
  onSelect: () => void;
  onToggleRequired: (required: boolean) => void;
  referenceBound: boolean;
  canMoveDown: boolean;
  canMoveUp: boolean;
  /** Worst health-check severity for this question, if any — shown as a badge in the row. */
  issueSeverity?: "error" | "warning";
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });
  const FieldIcon = fieldTypeIcons[field.type];

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group border-b bg-surface-container-lowest px-3 py-2.5 transition last:border-b-0 hover:bg-muted/30",
        field.type === "repeat_group" &&
          "border-l-4 border-l-primary/70 bg-primary/5",
        selected && "bg-primary/10 ring-1 ring-inset ring-primary/25",
        isDragging && "relative z-10 shadow-elevated",
      )}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <button
            className="mt-0.5 flex h-8 w-7 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            {...attributes}
            {...listeners}
            aria-label={`Drag ${field.label} to reorder`}
            onClick={(event) => event.stopPropagation()}
            type="button"
          >
            <GripVertical aria-hidden="true" size={15} />
          </button>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground">
            <FieldIcon aria-hidden="true" size={15} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-[11px] text-muted-foreground">
                {String(index + 1).padStart(2, "0")}
              </span>
              <Badge tone="neutral">{field.type.replace("_", " ")}</Badge>
              {field.required ? <Badge tone="warning">required</Badge> : null}
              {field.logic?.length ? <Badge tone="accent">logic</Badge> : null}
              {Object.keys(field.validation ?? {}).length ? (
                <Badge tone="warning">validation</Badge>
              ) : null}
              {referenceBound ? (
                <Badge tone="success">reference data</Badge>
              ) : null}
              {field.type === "repeat_group" ? (
                <Badge tone="collect">repeat group</Badge>
              ) : null}
              {issueSeverity ? (
                <Badge tone={issueSeverity === "error" ? "danger" : "warning"}>
                  {issueSeverity === "error" ? "⚠ needs fixing" : "⚠ check"}
                </Badge>
              ) : null}
            </div>
            <Input
              className="mt-1 h-8 border-transparent bg-transparent px-0 text-sm font-semibold shadow-none focus:border-primary"
              onChange={(event) => onLabelChange(event.target.value)}
              onClick={(event) => event.stopPropagation()}
              value={field.label}
            />
            {field.hint ? (
              <p className="line-clamp-1 text-xs text-muted-foreground">
                {field.hint}
              </p>
            ) : null}
            <FieldInputPreview field={field} />
          </div>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-1 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
          <Button
            aria-label={`Open settings for ${field.label}`}
            onClick={(event) => {
              event.stopPropagation();
              onEditSettings();
            }}
            size="icon"
            type="button"
            variant="secondary"
          >
            <Settings2 aria-hidden="true" />
          </Button>
          <Button
            aria-label={`${field.required ? "Make optional" : "Make required"} ${field.label}`}
            onClick={(event) => {
              event.stopPropagation();
              onToggleRequired(!field.required);
            }}
            size="icon"
            type="button"
            variant={field.required ? "secondary" : "ghost"}
          >
            <Check aria-hidden="true" />
          </Button>
          <Button
            aria-label={`Move ${field.label} up`}
            disabled={!canMoveUp}
            onClick={(event) => {
              event.stopPropagation();
              onMoveUp();
            }}
            size="icon"
            type="button"
            variant="ghost"
          >
            <ArrowUp aria-hidden="true" />
          </Button>
          <Button
            aria-label={`Move ${field.label} down`}
            disabled={!canMoveDown}
            onClick={(event) => {
              event.stopPropagation();
              onMoveDown();
            }}
            size="icon"
            type="button"
            variant="ghost"
          >
            <ArrowDown aria-hidden="true" />
          </Button>
          <Button
            aria-label={`Duplicate ${field.label}`}
            onClick={(event) => {
              event.stopPropagation();
              onDuplicate();
            }}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Copy aria-hidden="true" />
          </Button>
          <Button
            aria-label={`Remove ${field.label}`}
            onClick={(event) => {
              event.stopPropagation();
              onRemove();
            }}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
