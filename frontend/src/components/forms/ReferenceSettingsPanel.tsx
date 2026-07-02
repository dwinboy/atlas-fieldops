import { Database } from "lucide-react";

import {
  fieldAppearanceWithMetadata,
  fieldAppearanceWithTag,
  fieldMetadataValue,
  hasFieldTag,
} from "@/components/forms/fieldMetadata";
import { persistedFormToLocal } from "@/components/forms/persistedFormToLocal";
import { SelectionConfigurator } from "@/components/forms/SelectionConfigurator";
import { Button } from "@/components/ui/button";
import { HelpHint } from "@/components/ui/help-hint";
import { Input, Select } from "@/components/ui/input";
import {
  deleteFormDataset,
  renameFormDataset,
  replaceFormDataset,
  uploadFormDataset,
  type DataFormRead,
  type FormDatasetSummary,
} from "@/lib/api";
import { updateField, type DynamicForm, type FormField } from "@/lib/forms";

/** Selectable-answers & reference-data settings tab: the unified selection configurator plus the
 * legacy reference-list bindings (list name, cascading parent, new-value policy, offline/search). */
export function ReferenceSettingsPanel({
  field,
  form,
  onUpdateForm,
  datasets,
  otherForms,
  token,
  isPreview,
  onRefetchDatasets,
  onAddReferenceBinding,
}: {
  field: FormField;
  form: DynamicForm;
  onUpdateForm: (form: DynamicForm) => void;
  datasets: FormDatasetSummary[];
  otherForms: DataFormRead[];
  token: string | null;
  isPreview: boolean;
  onRefetchDatasets: () => void;
  onAddReferenceBinding: (field: FormField) => void;
}) {
  return (
    <section className="mt-4 rounded-lg border bg-surface-container-lowest p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Database aria-hidden="true" className="text-primary" size={16} />
          <h3 className="text-sm font-semibold">Selectable answers &amp; reference data</h3>
        </div>
        <HelpHint label="About selectable answers" title="Selectable answers">
          Choose where this question’s answers come from — a fixed list, a shared
          dataset (with columns, filters, and cascading), or live records from
          entities or another form. This drives how the field officer searches and picks.
        </HelpHint>
      </div>
      <div className="mt-4">
        <SelectionConfigurator
          availableDatasets={datasets}
          field={field}
          forms={otherForms
            .filter((option) => option.id !== form.id)
            .map((option) => ({ id: option.id, name: option.name }))}
          onChange={(selection) =>
            onUpdateForm(
              updateField(form, field.id, { selection }),
            )
          }
          onUploadDataset={
            token && !isPreview
              ? async (file) => {
                  const summary = await uploadFormDataset(token, form.id, file);
                  void onRefetchDatasets();
                  return summary;
                }
              : undefined
          }
          onRenameDataset={
            token && !isPreview
              ? async (slug, name) => {
                  await renameFormDataset(token, form.id, slug, name);
                  void onRefetchDatasets();
                }
              : undefined
          }
          onReplaceDataset={
            token && !isPreview
              ? async (slug, file) => {
                  const summary = await replaceFormDataset(token, form.id, slug, file);
                  void onRefetchDatasets();
                  return summary;
                }
              : undefined
          }
          onDeleteDataset={
            token && !isPreview
              ? async (slug) => {
                  await deleteFormDataset(token, form.id, slug);
                  void onRefetchDatasets();
                }
              : undefined
          }
          resolveFormFields={(formId) => {
            const sourceForm = otherForms.find((item) => item.id === formId);
            if (!sourceForm) return [];
            return persistedFormToLocal(sourceForm).fields.map((sourceField) => ({
              variable: sourceField.variableName ?? sourceField.id,
              label: sourceField.label,
            }));
          }}
          siblings={form.fields.filter((item) => item.id !== field.id)}
        />
      </div>
      <details className="mt-4 rounded-md border bg-background p-3">
        <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">
          Advanced reference-list bindings (legacy)
        </summary>
      <div className="mt-3 flex items-center justify-end gap-2">
        <Button onClick={() => onAddReferenceBinding(field)} size="sm" type="button" variant="secondary">
          Bind list
        </Button>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <label className="text-sm font-semibold">
          Reference list name
          <Input
            className="mt-2"
            onChange={(event) =>
              onUpdateForm(
                updateField(form, field.id, {
                  appearance: fieldAppearanceWithMetadata(field, "reference-list", event.target.value),
                }),
              )
            }
            placeholder="districts, villages, crops, facilities"
            value={fieldMetadataValue(field, "reference-list")}
          />
        </label>
        <label className="text-sm font-semibold">
          Cascading parent question
          <Select
            className="mt-2"
            onChange={(event) =>
              onUpdateForm(
                updateField(form, field.id, {
                  appearance: fieldAppearanceWithMetadata(field, "reference-parent", event.target.value),
                }),
              )
            }
            value={fieldMetadataValue(field, "reference-parent")}
          >
            <option value="">No parent</option>
            {form.fields.filter((candidate) => candidate.id !== field.id).map((candidate) => (
              <option key={candidate.id} value={candidate.variableName ?? candidate.id}>
                {candidate.label}
              </option>
            ))}
          </Select>
        </label>
        <label className="text-sm font-semibold">
          New value policy
          <Select
            className="mt-2"
            onChange={(event) =>
              onUpdateForm(
                updateField(form, field.id, {
                  appearance: fieldAppearanceWithMetadata(field, "new-reference-policy", event.target.value),
                }),
              )
            }
            value={fieldMetadataValue(field, "new-reference-policy")}
          >
            <option value="">Do not allow new values</option>
            <option value="allow_other">Allow Other</option>
            <option value="allow_with_review">Allow Other, require review</option>
            <option value="block_unknown">Block unknown value</option>
          </Select>
        </label>
        {[
          ["reference-offline", "Download list for offline mobile"],
          ["searchable-reference", "Searchable list on mobile"],
          ["reference-version-lock", "Lock list version after publishing"],
        ].map(([tag, label]) => (
          <label className="flex items-center gap-2 text-sm font-semibold" key={tag}>
            <input
              checked={hasFieldTag(field, tag)}
              className="h-4 w-4"
              onChange={(event) =>
                onUpdateForm(
                  updateField(form, field.id, {
                    appearance: fieldAppearanceWithTag(field, tag, event.target.checked),
                  }),
                )
              }
              type="checkbox"
            />
            {label}
          </label>
        ))}
      </div>
      </details>
    </section>
  );
}
