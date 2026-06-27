import { RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { type FormField } from "@/lib/forms";

/** Configures an embedded sub-survey: pick a source form, snapshot its questions into this one as a
 * repeatable group, and bound how many entries officers collect (optionally driven by a count
 * question). The questions are embedded (a version-pinned snapshot), not linked, so it works offline. */
export function SubformConfigurator({
  field,
  forms,
  siblings,
  loadFields,
  onChange,
}: {
  field: FormField;
  forms: { id: string; name: string }[];
  siblings: FormField[];
  loadFields: (formId: string) => FormField[];
  onChange: (patch: Partial<FormField>) => void;
}) {
  const subform = field.subform ?? { mode: "embed" as const };
  const update = (patch: Partial<NonNullable<FormField["subform"]>>) =>
    onChange({ subform: { ...subform, ...patch } });
  const childCount = field.children?.length ?? 0;
  const numberSiblings = siblings.filter((sibling) =>
    ["number", "decimal", "currency", "rating", "nps"].includes(sibling.type),
  );

  function loadFromForm() {
    if (!subform.formId) return;
    const fields = loadFields(subform.formId);
    const name = forms.find((form) => form.id === subform.formId)?.name;
    onChange({ subform: { ...subform, formName: name }, children: fields });
  }

  return (
    <div className="space-y-3 rounded-md border border-primary/30 bg-primary/5 p-3">
      <div className="grid gap-3 lg:grid-cols-2">
        <label className="text-sm font-semibold">
          Source survey
          <Select
            className="mt-2"
            disabled={forms.length === 0}
            onChange={(event) => update({ formId: event.target.value || undefined })}
            value={subform.formId ?? ""}
          >
            <option value="">{forms.length ? "Choose a form to embed…" : "No other forms yet"}</option>
            {forms.map((form) => (
              <option key={form.id} value={form.id}>
                {form.name}
              </option>
            ))}
          </Select>
        </label>
        <div className="flex items-end">
          <Button disabled={!subform.formId} onClick={loadFromForm} size="sm" type="button" variant="secondary">
            <RotateCw aria-hidden="true" /> {childCount ? "Refresh embedded questions" : "Load questions"}
          </Button>
        </div>
        <label className="text-sm font-semibold">
          Minimum entries
          <Input
            className="mt-2"
            min={0}
            onChange={(event) => update({ min: event.target.value === "" ? undefined : Number(event.target.value) })}
            type="number"
            value={subform.min ?? ""}
          />
        </label>
        <label className="text-sm font-semibold">
          Maximum entries
          <Input
            className="mt-2"
            min={0}
            onChange={(event) => update({ max: event.target.value === "" ? undefined : Number(event.target.value) })}
            type="number"
            value={subform.max ?? ""}
          />
        </label>
        <label className="text-sm font-semibold lg:col-span-2">
          Auto-create entries from a count question (optional)
          <Select
            className="mt-2"
            onChange={(event) => update({ countFromVariable: event.target.value || undefined })}
            value={subform.countFromVariable ?? ""}
          >
            <option value="">Officer adds entries manually</option>
            {numberSiblings.map((sibling) => (
              <option key={sibling.id} value={sibling.variableName ?? sibling.id}>
                {sibling.label}
              </option>
            ))}
          </Select>
        </label>
      </div>
      <p className="text-xs text-muted-foreground">
        {subform.formName && childCount
          ? `Embeds ${childCount} question(s) from “${subform.formName}”. Officers complete them per entry in this one workflow.`
          : "Pick a source survey and load its questions. They’re embedded here (a snapshot) and collected as a repeatable group — no separate form to open."}
      </p>
    </div>
  );
}
