import { Input, Select } from "@/components/ui/input";
import { type FormControlsSettings } from "@/lib/api";

/** Form-level governance controls (status, edit policy, audit settings). */
export function GovernanceControlsPanel({
  controls,
  onUpdateControls,
}: {
  controls: FormControlsSettings;
  onUpdateControls: (updater: (controls: FormControlsSettings) => FormControlsSettings) => void;
}) {
  return (
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="text-sm font-medium">
                Form status
                <Select
                  className="mt-2"
                  onChange={(event) =>
                    onUpdateControls((controls) => ({
                      ...controls,
                      governance: {
                        ...controls.governance,
                        form_status: event.target
                          .value as FormControlsSettings["governance"]["form_status"],
                      },
                    }))
                  }
                  value={controls.governance.form_status}
                >
                  <option value="draft">Draft</option>
                  <option value="testing">Testing</option>
                  <option value="published">Published</option>
                  <option value="suspended">Suspended</option>
                  <option value="archived">Archived</option>
                </Select>
              </label>
              <label className="text-sm font-medium">
                Minimum quality score
                <Input
                  className="mt-2"
                  max={100}
                  min={0}
                  onChange={(event) =>
                    onUpdateControls((controls) => ({
                      ...controls,
                      governance: {
                        ...controls.governance,
                        minimum_quality_score: Number(event.target.value) || 0,
                      },
                    }))
                  }
                  type="number"
                  value={controls.governance.minimum_quality_score}
                />
              </label>
              <label className="text-sm font-medium">
                Review SLA hours
                <Input
                  className="mt-2"
                  min={1}
                  onChange={(event) =>
                    onUpdateControls((controls) => ({
                      ...controls,
                      governance: {
                        ...controls.governance,
                        review_sla_hours: Number(event.target.value) || 1,
                      },
                    }))
                  }
                  type="number"
                  value={controls.governance.review_sla_hours}
                />
              </label>
              <label className="text-sm font-medium">
                Data retention days
                <Input
                  className="mt-2"
                  min={1}
                  onChange={(event) =>
                    onUpdateControls((controls) => ({
                      ...controls,
                      governance: {
                        ...controls.governance,
                        data_retention_days: Number(event.target.value) || 1,
                      },
                    }))
                  }
                  type="number"
                  value={controls.governance.data_retention_days}
                />
              </label>
              <div className="rounded-lg border bg-background p-4 lg:col-span-2">
                <h3 className="text-sm font-semibold">Governance switches</h3>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {(
                    [
                      ["require_gps_capture", "Require GPS capture"],
                      [
                        "require_timestamp_capture",
                        "Require timestamp capture",
                      ],
                      [
                        "require_enumerator_assignment",
                        "Require enumerator assignment",
                      ],
                      [
                        "require_supervisor_review",
                        "Require supervisor review",
                      ],
                      ["export_restricted", "Restrict exports"],
                      ["sensitive_field_masking", "Mask sensitive fields"],
                      ["pii_tagging_required", "Require PII tagging"],
                      ["consent_required", "Require consent"],
                      ["auto_lock_after_approval", "Auto-lock after approval"],
                      [
                        "auto_archive_after_project_closure",
                        "Auto-archive after project closure",
                      ],
                    ] satisfies [
                      keyof FormControlsSettings["governance"],
                      string,
                    ][]
                  ).map(([key, label]) => (
                    <label
                      className="flex items-center gap-2 rounded-md border bg-panel px-3 py-2 text-sm"
                      key={String(key)}
                    >
                      <input
                        checked={Boolean(controls.governance[key])}
                        onChange={(event) =>
                          onUpdateControls((controls) => ({
                            ...controls,
                            governance: {
                              ...controls.governance,
                              [key]: event.target.checked,
                            },
                          }))
                        }
                        type="checkbox"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
  );
}
