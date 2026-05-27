"use client";

import { Check, ClipboardList, Plus, Trash2, UploadCloud } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { addField, publishForm, removeField, type DynamicForm, type FieldType } from "@/lib/forms";
import { starterForms } from "@/lib/mockData";
import { useWorkspaceStore } from "@/stores/workspace";

const fieldTypes: FieldType[] = ["text", "number", "date", "photo", "gps", "select"];

export function DynamicForms() {
  const [forms, setForms] = useState<DynamicForm[]>(starterForms);
  const [selectedFormId, setSelectedFormId] = useState(starterForms[0]?.id ?? "");
  const [fieldLabel, setFieldLabel] = useState("");
  const [fieldType, setFieldType] = useState<FieldType>("text");
  const [required, setRequired] = useState(true);
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const selectedForm = useMemo(() => forms.find((form) => form.id === selectedFormId) ?? forms[0], [forms, selectedFormId]);

  function updateSelectedForm(nextForm: DynamicForm) {
    setForms((current) => current.map((form) => (form.id === nextForm.id ? nextForm : form)));
  }

  return (
    <section aria-labelledby="forms-title" className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Schema studio</p>
          <h1 id="forms-title" className="mt-2 text-2xl font-semibold tracking-tight">
            Dynamic forms
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Build offline-ready collection templates with validation, media capture, and GPS-aware fields.
          </p>
        </div>
        <Button variant="primary">
          <Plus aria-hidden="true" />
          New template
        </Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
        <aside className="rounded-lg border bg-panel p-3">
          <div className="mb-3 flex items-center gap-2">
            <ClipboardList aria-hidden="true" size={18} />
            <h2 className="text-sm font-semibold">Templates</h2>
          </div>
          <div className="space-y-2">
            {forms.map((form) => (
              <button
                key={form.id}
                className={`w-full rounded-md border px-3 py-3 text-left text-sm transition ${
                  selectedForm?.id === form.id ? "border-primary/35 bg-primary/10 text-primary" : "bg-background hover:bg-muted/60"
                }`}
                onClick={() => setSelectedFormId(form.id)}
                type="button"
              >
                <span className="block font-medium">{form.name}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                  {form.fields.length} fields · {form.status}
                </span>
              </button>
            ))}
          </div>
        </aside>

        {selectedForm ? (
          <div className="space-y-4">
            <section className="rounded-lg border bg-panel p-4" aria-labelledby="builder-title">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 id="builder-title" className="text-sm font-semibold">
                    {selectedForm.name}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">Updated {new Date(selectedForm.updatedAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={selectedForm.status === "published" ? "success" : "neutral"}>{selectedForm.status}</Badge>
                <Button
                  onClick={() => {
                    updateSelectedForm(publishForm(selectedForm));
                    pushToast({ title: "Form published", description: selectedForm.name, tone: "success" });
                  }}
                  type="button"
                  variant="primary"
                >
                  <UploadCloud aria-hidden="true" />
                  Publish
                </Button>
                </div>
              </div>

              <form
                className="mt-5 grid gap-3 md:grid-cols-[1fr_160px_140px_auto]"
                onSubmit={(event) => {
                  event.preventDefault();
                  updateSelectedForm(
                    addField(selectedForm, {
                      id: `${fieldType}-${Date.now()}`,
                      label: fieldLabel,
                      type: fieldType,
                      required
                    })
                  );
                  setFieldLabel("");
                }}
              >
                <label className="text-sm font-medium">
                  Field label
                  <Input
                    className="mt-2"
                    value={fieldLabel}
                    onChange={(event) => setFieldLabel(event.target.value)}
                    required
                  />
                </label>
                <label className="text-sm font-medium">
                  Type
                  <Select
                    className="mt-2"
                    value={fieldType}
                    onChange={(event) => setFieldType(event.target.value as FieldType)}
                  >
                    {fieldTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="flex items-end gap-2 pb-2 text-sm font-medium">
                  <input
                    checked={required}
                    className="h-4 w-4"
                    onChange={(event) => setRequired(event.target.checked)}
                    type="checkbox"
                  />
                  Required
                </label>
                <Button className="self-end" type="submit">
                  <Plus aria-hidden="true" />
                  Add
                </Button>
              </form>
            </section>

            <section className="rounded-lg border bg-panel" aria-labelledby="field-list-title">
              <div className="border-b p-4">
                <h2 id="field-list-title" className="text-sm font-semibold">
                  Fields
                </h2>
              </div>
              <div className="divide-y">
                {selectedForm.fields.map((field) => (
                  <div key={field.id} className="flex items-center justify-between gap-4 p-4 transition hover:bg-muted/35">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-medium">
                        {field.required ? <Check aria-hidden="true" className="text-success" size={14} /> : null}
                        {field.label}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {field.type} · {field.required ? "required" : "optional"}
                      </p>
                    </div>
                    <Button
                      aria-label={`Remove ${field.label}`}
                      size="icon"
                      onClick={() => updateSelectedForm(removeField(selectedForm, field.id))}
                      type="button"
                      variant="ghost"
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </section>
  );
}
