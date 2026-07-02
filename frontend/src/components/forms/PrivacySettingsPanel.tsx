import { ShieldCheck } from "lucide-react";

import {
  fieldAppearanceWithMetadata,
  fieldAppearanceWithTag,
  fieldMetadataValue,
  hasFieldTag,
} from "@/components/forms/fieldMetadata";
import { Badge } from "@/components/ui/badge";
import { HelpHint } from "@/components/ui/help-hint";
import { Select } from "@/components/ui/input";
import { updateField, type DynamicForm, type FormField } from "@/lib/forms";

/** Privacy, consent & sensitive-data settings tab (sensitivity, consent dependency, masking tags). */
export function PrivacySettingsPanel({
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
                                  <ShieldCheck aria-hidden="true" className="text-primary" size={16} />
                                  <h3 className="text-sm font-semibold">Privacy, consent, and sensitive data</h3><HelpHint label="About this tab" title="Privacy, consent, and sensitive data">Classify how sensitive this answer is, require consent, and control who can see it.</HelpHint>
                                </div>
                                <Badge tone="danger">Protection</Badge>
                              </div>
                              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                                <label className="text-sm font-semibold">
                                  Sensitivity level
                                  <Select
                                    className="mt-2"
                                    onChange={(event) =>
                                      onUpdateForm(
                                        updateField(form, field.id, {
                                          appearance: fieldAppearanceWithMetadata(field, "sensitivity", event.target.value),
                                        }),
                                      )
                                    }
                                    value={fieldMetadataValue(field, "sensitivity")}
                                  >
                                    <option value="">None</option>
                                    <option value="internal">Internal</option>
                                    <option value="confidential">Confidential</option>
                                    <option value="restricted">Restricted</option>
                                    <option value="pii">PII</option>
                                    <option value="sensitive">Sensitive</option>
                                  </Select>
                                </label>
                                <label className="text-sm font-semibold lg:col-span-2">
                                  Consent dependency
                                  <Select
                                    className="mt-2"
                                    onChange={(event) =>
                                      onUpdateForm(
                                        updateField(form, field.id, {
                                          appearance: fieldAppearanceWithMetadata(field, "consent-field", event.target.value),
                                        }),
                                      )
                                    }
                                    value={fieldMetadataValue(field, "consent-field")}
                                  >
                                    <option value="">No consent dependency</option>
                                    {form.fields.filter((field) => /consent|agree|permission/i.test(field.label)).map((field) => (
                                      <option key={field.id} value={field.variableName ?? field.id}>
                                        {field.label}
                                      </option>
                                    ))}
                                  </Select>
                                </label>
                                {[
                                  ["mask-on-screen", "Mask on screen"],
                                  ["mask-on-export", "Mask on export"],
                                  ["encrypt-at-rest", "Require encryption at rest"],
                                  ["hide-after-submit", "Hide after submit"],
                                  ["screenshot-restricted", "Restrict screenshots where supported"],
                                  ["consent-required", "Consent required before answering"],
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
