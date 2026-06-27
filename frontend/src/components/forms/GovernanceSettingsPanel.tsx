import { History } from "lucide-react";

import {
  fieldAppearanceWithMetadata,
  fieldAppearanceWithTag,
  fieldMetadataValue,
  hasFieldTag,
} from "@/components/forms/fieldMetadata";
import { Badge } from "@/components/ui/badge";
import { HelpHint } from "@/components/ui/help-hint";
import { Input, Select } from "@/components/ui/input";
import { updateField, type DynamicForm, type FormField } from "@/lib/forms";

/** Review, editing & audit governance settings tab (edit rule, reviewer role, audit label, locks). */
export function GovernanceSettingsPanel({
  field,
  form,
  onUpdateForm,
}: {
  field: FormField;
  form: DynamicForm;
  onUpdateForm: (form: DynamicForm) => void;
}) {
  return (
                            <section className="mt-4 rounded-lg border bg-panel p-4">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <History aria-hidden="true" className="text-primary" size={16} />
                                  <h3 className="text-sm font-semibold">Review, editing, and audit governance</h3><HelpHint label="About this tab" title="Review, editing, and audit governance">Control who can edit this answer, whether changes need a reason, and how it is versioned and audited.</HelpHint>
                                </div>
                                <Badge tone="admin">Audit-safe</Badge>
                              </div>
                              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                                <label className="text-sm font-semibold">
                                  Edit after submission
                                  <Select
                                    className="mt-2"
                                    onChange={(event) =>
                                      onUpdateForm(
                                        updateField(form, field.id, {
                                          appearance: fieldAppearanceWithMetadata(field, "edit-rule", event.target.value),
                                        }),
                                      )
                                    }
                                    value={fieldMetadataValue(field, "edit-rule")}
                                  >
                                    <option value="">Form default</option>
                                    <option value="allowed_before_approval">Allowed before approval</option>
                                    <option value="change_request">Change request required</option>
                                    <option value="locked_after_approval">Locked after approval</option>
                                    <option value="never_editable">Never editable</option>
                                  </Select>
                                </label>
                                <label className="text-sm font-semibold">
                                  Reviewer role
                                  <Input
                                    className="mt-2"
                                    onChange={(event) =>
                                      onUpdateForm(
                                        updateField(form, field.id, {
                                          appearance: fieldAppearanceWithMetadata(field, "reviewer-role", event.target.value),
                                        }),
                                      )
                                    }
                                    placeholder="supervisor, data_manager, me_manager"
                                    value={fieldMetadataValue(field, "reviewer-role")}
                                  />
                                </label>
                                <label className="text-sm font-semibold">
                                  Audit label
                                  <Input
                                    className="mt-2"
                                    onChange={(event) =>
                                      onUpdateForm(
                                        updateField(form, field.id, {
                                          appearance: fieldAppearanceWithMetadata(field, "audit-label", event.target.value),
                                        }),
                                      )
                                    }
                                    placeholder="Profile phone update, consent, GPS proof"
                                    value={fieldMetadataValue(field, "audit-label")}
                                  />
                                </label>
                                {[
                                  ["change-reason-required", "Require reason when edited"],
                                  ["approved-data-lock", "Lock after approval"],
                                  ["reviewer-comment-required", "Reviewer comment required"],
                                  ["include-in-data-freeze", "Include in report data freeze"],
                                  ["quality-flag-visible", "Show quality flag in data grid"],
                                  ["source-lineage-visible", "Show source lineage"],
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
                            </section>
  );
}
