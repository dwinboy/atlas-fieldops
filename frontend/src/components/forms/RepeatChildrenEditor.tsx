import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { HelpHint } from "@/components/ui/help-hint";
import { Input, Select } from "@/components/ui/input";
import { createField, typeChangePatchForField, type FieldType, type FormField } from "@/lib/forms";

const REPEAT_CHILD_TYPES: { type: FieldType; label: string }[] = [
  { type: "text", label: "Text" },
  { type: "textarea", label: "Long text" },
  { type: "number", label: "Number" },
  { type: "decimal", label: "Decimal" },
  { type: "select", label: "Single choice" },
  { type: "multiselect", label: "Multiple choice" },
  { type: "date", label: "Date" },
  { type: "polygon", label: "Boundary (polygon)" },
  { type: "gps", label: "GPS point" },
  { type: "photo", label: "Photo" },
  { type: "repeat_group", label: "Repeat group (nested)" },
];

/** Authors the questions that repeat inside a repeat group (e.g. one polygon per farm). Children
 * are stored on `field.children` and flow through to the mobile app, which renders a row per item. */
export function RepeatChildrenEditor({
  field,
  onChange,
}: {
  field: FormField;
  onChange: (children: FormField[]) => void;
}) {
  const children = field.children ?? [];
  const [newType, setNewType] = useState<FieldType>("text");

  function addChild() {
    const child = createField(newType, field.sectionId, field.pageId);
    const label = REPEAT_CHILD_TYPES.find((item) => item.type === newType)?.label ?? "Question";
    onChange([...children, { ...child, label: `${label} ${children.length + 1}` }]);
  }

  function patchChild(id: string, patch: Partial<FormField>) {
    onChange(children.map((child) => (child.id === id ? { ...child, ...patch } : child)));
  }

  return (
    <section className="rounded-md border bg-background p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">Questions inside this repeat group</p>
        <HelpHint label="About repeat questions" title="Repeat questions">
          These questions repeat once per item. On mobile the field officer adds a row per item
          (e.g. per farm) and answers them — including mapping a boundary for each.
        </HelpHint>
      </div>
      {children.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          No repeated questions yet. Add the questions that should be answered for each item (for
          example, a farm name and its boundary).
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {children.map((child) => (
            <div className="space-y-2" key={child.id}>
            <div className="grid gap-2 rounded-md border p-2 md:grid-cols-[minmax(0,1fr)_150px_auto]">
              <Input
                aria-label="Repeat question label"
                onChange={(event) => patchChild(child.id, { label: event.target.value })}
                value={child.label}
              />
              <Select
                aria-label="Repeat question type"
                onChange={(event) => patchChild(child.id, typeChangePatchForField(child, event.target.value as FieldType))}
                value={child.type}
              >
                {REPEAT_CHILD_TYPES.map((item) => (
                  <option key={item.type} value={item.type}>
                    {item.label}
                  </option>
                ))}
              </Select>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-xs text-muted-foreground">
                  <input
                    checked={child.required ?? false}
                    onChange={(event) => patchChild(child.id, { required: event.target.checked })}
                    type="checkbox"
                  />
                  Required
                </label>
                <Button
                  aria-label={`Remove ${child.label}`}
                  onClick={() => onChange(children.filter((item) => item.id !== child.id))}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <Trash2 aria-hidden="true" size={14} />
                </Button>
              </div>
            </div>
            {child.type === "repeat_group" ? (
              <div className="ml-3 border-l-2 border-primary/30 pl-3">
                <RepeatChildrenEditor
                  field={child}
                  onChange={(grandchildren) => patchChild(child.id, { children: grandchildren })}
                />
              </div>
            ) : null}
            </div>
          ))}
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Select aria-label="New repeat question type" onChange={(event) => setNewType(event.target.value as FieldType)} value={newType}>
          {REPEAT_CHILD_TYPES.map((item) => (
            <option key={item.type} value={item.type}>
              {item.label}
            </option>
          ))}
        </Select>
        <Button onClick={addChild} size="sm" type="button" variant="secondary">
          <Plus aria-hidden="true" size={14} />
          Add repeat question
        </Button>
      </div>
    </section>
  );
}
