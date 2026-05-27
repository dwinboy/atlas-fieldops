"use client";

import { ClipboardList, Plus, Trash2, UploadCloud } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/Button";
import { addField, publishForm, removeField, type DynamicForm, type FieldType } from "@/lib/forms";
import { starterForms } from "@/lib/mockData";

const fieldTypes: FieldType[] = ["text", "number", "date", "photo", "gps", "select"];

export function DynamicForms() {
  const [forms, setForms] = useState<DynamicForm[]>(starterForms);
  const [selectedFormId, setSelectedFormId] = useState(starterForms[0]?.id ?? "");
  const [fieldLabel, setFieldLabel] = useState("");
  const [fieldType, setFieldType] = useState<FieldType>("text");
  const [required, setRequired] = useState(true);
  const selectedForm = useMemo(() => forms.find((form) => form.id === selectedFormId) ?? forms[0], [forms, selectedFormId]);

  function updateSelectedForm(nextForm: DynamicForm) {
    setForms((current) => current.map((form) => (form.id === nextForm.id ? nextForm : form)));
  }

  return (
    <section aria-labelledby="forms-title" className="space-y-6">
      <div>
        <h1 id="forms-title" className="text-2xl font-semibold">
          Dynamic forms
        </h1>
        <p className="mt-1 text-sm text-slate-600">Design offline-ready collection templates with typed fields.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
        <aside className="rounded border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <ClipboardList aria-hidden="true" size={18} />
            <h2 className="text-base font-semibold">Templates</h2>
          </div>
          <div className="space-y-2">
            {forms.map((form) => (
              <button
                key={form.id}
                className={`w-full rounded border px-3 py-3 text-left text-sm ${
                  selectedForm?.id === form.id ? "border-teal-300 bg-teal-50" : "border-slate-200 bg-white"
                }`}
                onClick={() => setSelectedFormId(form.id)}
                type="button"
              >
                <span className="block font-medium">{form.name}</span>
                <span className="mt-1 block text-xs text-slate-500">
                  {form.fields.length} fields · {form.status}
                </span>
              </button>
            ))}
          </div>
        </aside>

        {selectedForm ? (
          <div className="space-y-4">
            <section className="rounded border border-slate-200 bg-white p-5" aria-labelledby="builder-title">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 id="builder-title" className="text-base font-semibold">
                    {selectedForm.name}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">Updated {new Date(selectedForm.updatedAt).toLocaleString()}</p>
                </div>
                <Button
                  icon={<UploadCloud aria-hidden="true" size={18} />}
                  onClick={() => updateSelectedForm(publishForm(selectedForm))}
                  type="button"
                  variant="primary"
                >
                  Publish
                </Button>
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
                <label className="text-sm font-medium text-slate-700">
                  Field label
                  <input
                    className="mt-2 h-10 w-full rounded border border-slate-300 px-3"
                    value={fieldLabel}
                    onChange={(event) => setFieldLabel(event.target.value)}
                    required
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Type
                  <select
                    className="mt-2 h-10 w-full rounded border border-slate-300 px-3"
                    value={fieldType}
                    onChange={(event) => setFieldType(event.target.value as FieldType)}
                  >
                    {fieldTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-end gap-2 pb-2 text-sm font-medium text-slate-700">
                  <input
                    checked={required}
                    className="h-4 w-4"
                    onChange={(event) => setRequired(event.target.checked)}
                    type="checkbox"
                  />
                  Required
                </label>
                <Button className="self-end" icon={<Plus aria-hidden="true" size={18} />} type="submit">
                  Add
                </Button>
              </form>
            </section>

            <section className="rounded border border-slate-200 bg-white" aria-labelledby="field-list-title">
              <div className="border-b border-slate-200 p-5">
                <h2 id="field-list-title" className="text-base font-semibold">
                  Fields
                </h2>
              </div>
              <div className="divide-y divide-slate-100">
                {selectedForm.fields.map((field) => (
                  <div key={field.id} className="flex items-center justify-between gap-4 p-5">
                    <div>
                      <p className="text-sm font-medium">{field.label}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {field.type} · {field.required ? "required" : "optional"}
                      </p>
                    </div>
                    <Button
                      aria-label={`Remove ${field.label}`}
                      className="w-10 px-0"
                      icon={<Trash2 aria-hidden="true" size={18} />}
                      onClick={() => updateSelectedForm(removeField(selectedForm, field.id))}
                      type="button"
                      variant="ghost"
                    >
                      <span className="sr-only">Remove</span>
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

