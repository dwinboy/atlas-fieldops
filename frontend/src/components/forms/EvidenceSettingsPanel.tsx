import { Camera } from "lucide-react";

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

/** Field evidence & integrity settings tab (capture rules, min-seconds, integrity action). */
export function EvidenceSettingsPanel({
  field,
  form,
  onUpdateForm,
}: {
  field: FormField;
  form: DynamicForm;
  onUpdateForm: (form: DynamicForm) => void;
}) {
  return (
                            <section className="mt-4 rounded-lg border bg-surface-container-lowest p-4">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <Camera aria-hidden="true" className="text-primary" size={16} />
                                  <h3 className="text-sm font-semibold">Field evidence and integrity</h3><HelpHint label="About this tab" title="Field evidence and integrity">Require photos, GPS, or back-check evidence so submissions are verifiable and trustworthy.</HelpHint>
                                </div>
                                <Badge tone="warning">Quality signal</Badge>
                              </div>
                              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                                {[
                                  ["capture-timestamp", "Capture timestamp"],
                                  ["capture-gps", "Capture GPS evidence"],
                                  ["photo-evidence", "Photo evidence required"],
                                  ["back-check-candidate", "Eligible for back-check"],
                                  ["static-gps-warning", "Flag static GPS"],
                                  ["fast-interview-warning", "Flag too-fast completion"],
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
                                <label className="text-sm font-semibold">
                                  Minimum seconds on question
                                  <Input
                                    className="mt-2"
                                    onChange={(event) =>
                                      onUpdateForm(
                                        updateField(form, field.id, {
                                          appearance: fieldAppearanceWithMetadata(field, "min-seconds", event.target.value),
                                        }),
                                      )
                                    }
                                    placeholder="Example: 10"
                                    type="number"
                                    value={fieldMetadataValue(field, "min-seconds")}
                                  />
                                </label>
                                <label className="text-sm font-semibold">
                                  Integrity failure action
                                  <Select
                                    className="mt-2"
                                    onChange={(event) =>
                                      onUpdateForm(
                                        updateField(form, field.id, {
                                          appearance: fieldAppearanceWithMetadata(field, "integrity-action", event.target.value),
                                        }),
                                      )
                                    }
                                    value={fieldMetadataValue(field, "integrity-action")}
                                  >
                                    <option value="">Warn reviewer</option>
                                    <option value="block_submission">Block submission</option>
                                    <option value="send_to_review">Send to review</option>
                                    <option value="require_supervisor_note">Require supervisor note</option>
                                  </Select>
                                </label>
                              </div>
                            </section>
  );
}
