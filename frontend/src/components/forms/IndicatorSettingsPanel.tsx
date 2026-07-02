import { Sigma } from "lucide-react";

import {
  fieldAppearanceWithMetadata,
  fieldMetadataValue,
} from "@/components/forms/fieldMetadata";
import { Badge } from "@/components/ui/badge";
import { HelpHint } from "@/components/ui/help-hint";
import { Input, Select } from "@/components/ui/input";
import { updateField, type DynamicForm, type FormField } from "@/lib/forms";

/** Indicator & reporting-link settings tab (indicator mapping, component, unit, disaggregation). */
export function IndicatorSettingsPanel({
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
                                  <Sigma aria-hidden="true" className="text-primary" size={16} />
                                  <h3 className="text-sm font-semibold">Indicator and reporting link</h3><HelpHint label="About this tab" title="Indicator and reporting link">Map this answer to a monitoring indicator so it rolls up into results dashboards and donor reports.</HelpHint>
                                </div>
                                <Badge tone="accent">M&E reporting</Badge>
                              </div>
                              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                                Define how this answer contributes to indicators, disaggregation, donor reports, and dashboards.
                              </p>
                              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                                <label className="text-sm font-semibold">
                                  Linked indicator
                                  <Input
                                    className="mt-2"
                                    onChange={(event) =>
                                      onUpdateForm(
                                        updateField(form, field.id, {
                                          appearance: fieldAppearanceWithMetadata(field, "indicator", event.target.value),
                                        }),
                                      )
                                    }
                                    placeholder="Example: IND-AG-01 or % farmers using improved seed"
                                    value={fieldMetadataValue(field, "indicator")}
                                  />
                                </label>
                                <label className="text-sm font-semibold">
                                  Indicator component
                                  <Select
                                    className="mt-2"
                                    onChange={(event) =>
                                      onUpdateForm(
                                        updateField(form, field.id, {
                                          appearance: fieldAppearanceWithMetadata(field, "indicator-component", event.target.value),
                                        }),
                                      )
                                    }
                                    value={fieldMetadataValue(field, "indicator-component")}
                                  >
                                    <option value="">Not mapped</option>
                                    <option value="numerator">Numerator</option>
                                    <option value="denominator">Denominator</option>
                                    <option value="disaggregation">Disaggregation</option>
                                    <option value="baseline">Baseline value</option>
                                    <option value="target">Target value</option>
                                    <option value="evidence">Supporting evidence</option>
                                  </Select>
                                </label>
                                <label className="text-sm font-semibold">
                                  Unit of measure
                                  <Input
                                    className="mt-2"
                                    onChange={(event) =>
                                      onUpdateForm(
                                        updateField(form, field.id, {
                                          appearance: fieldAppearanceWithMetadata(field, "unit", event.target.value),
                                        }),
                                      )
                                    }
                                    placeholder="people, hectares, kg, %, visits"
                                    value={fieldMetadataValue(field, "unit")}
                                  />
                                </label>
                                <label className="text-sm font-semibold">
                                  Reporting period
                                  <Select
                                    className="mt-2"
                                    onChange={(event) =>
                                      onUpdateForm(
                                        updateField(form, field.id, {
                                          appearance: fieldAppearanceWithMetadata(field, "report-period", event.target.value),
                                        }),
                                      )
                                    }
                                    value={fieldMetadataValue(field, "report-period")}
                                  >
                                    <option value="">Form default</option>
                                    <option value="monthly">Monthly</option>
                                    <option value="quarterly">Quarterly</option>
                                    <option value="seasonal">Seasonal</option>
                                    <option value="annual">Annual</option>
                                    <option value="donor_schedule">Donor schedule</option>
                                  </Select>
                                </label>
                                <label className="text-sm font-semibold lg:col-span-2">
                                  Disaggregation categories
                                  <Input
                                    className="mt-2"
                                    onChange={(event) =>
                                      onUpdateForm(
                                        updateField(form, field.id, {
                                          appearance: fieldAppearanceWithMetadata(field, "disaggregation", event.target.value),
                                        }),
                                      )
                                    }
                                    placeholder="sex, age_group, disability_status, district"
                                    value={fieldMetadataValue(field, "disaggregation")}
                                  />
                                </label>
                                <label className="text-sm font-semibold lg:col-span-3">
                                  Donor/reporting tag
                                  <Input
                                    className="mt-2"
                                    onChange={(event) =>
                                      onUpdateForm(
                                        updateField(form, field.id, {
                                          appearance: fieldAppearanceWithMetadata(field, "donor-tag", event.target.value),
                                        }),
                                      )
                                    }
                                    placeholder="USAID-IR1, FCDO-output-2, Global Fund indicator"
                                    value={fieldMetadataValue(field, "donor-tag")}
                                  />
                                </label>
                              </div>
                            </section>
  );
}
