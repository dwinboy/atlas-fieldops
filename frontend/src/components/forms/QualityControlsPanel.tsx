import { Select } from "@/components/ui/input";
import { type FormControlsSettings } from "@/lib/api";

/** Form-level data-quality controls (validation strictness, review rules). */
export function QualityControlsPanel({
  controls,
  onUpdateControls,
}: {
  controls: FormControlsSettings;
  onUpdateControls: (updater: (controls: FormControlsSettings) => FormControlsSettings) => void;
}) {
  return (
            <div className="space-y-3">
              {controls.data_quality_rules.map((rule) => (
                <div
                  className="grid gap-3 rounded-lg border bg-background p-4 md:grid-cols-[minmax(0,1fr)_160px_120px]"
                  key={rule.id}
                >
                  <label className="flex items-start gap-3">
                    <input
                      checked={rule.enabled}
                      className="mt-1"
                      onChange={(event) =>
                        onUpdateControls((controls) => ({
                          ...controls,
                          data_quality_rules: controls.data_quality_rules.map(
                            (candidate) =>
                              candidate.id === rule.id
                                ? {
                                    ...candidate,
                                    enabled: event.target.checked,
                                  }
                                : candidate,
                          ),
                        }))
                      }
                      type="checkbox"
                    />
                    <span>
                      <span className="block text-sm font-semibold">
                        {rule.label}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {rule.rule_type.replaceAll("_", " ")} ·{" "}
                        {rule.fields.length
                          ? rule.fields.join(", ")
                          : "all relevant fields"}
                      </span>
                    </span>
                  </label>
                  <label className="text-xs font-medium">
                    Severity
                    <Select
                      className="mt-1"
                      onChange={(event) =>
                        onUpdateControls((controls) => ({
                          ...controls,
                          data_quality_rules: controls.data_quality_rules.map(
                            (candidate) =>
                              candidate.id === rule.id
                                ? {
                                    ...candidate,
                                    severity: event.target
                                      .value as FormControlsSettings["data_quality_rules"][number]["severity"],
                                  }
                                : candidate,
                          ),
                        }))
                      }
                      value={rule.severity}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </Select>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium">
                    <input
                      checked={rule.blocking}
                      onChange={(event) =>
                        onUpdateControls((controls) => ({
                          ...controls,
                          data_quality_rules: controls.data_quality_rules.map(
                            (candidate) =>
                              candidate.id === rule.id
                                ? {
                                    ...candidate,
                                    blocking: event.target.checked,
                                  }
                                : candidate,
                          ),
                        }))
                      }
                      type="checkbox"
                    />
                    Block submit
                  </label>
                </div>
              ))}
            </div>
  );
}
