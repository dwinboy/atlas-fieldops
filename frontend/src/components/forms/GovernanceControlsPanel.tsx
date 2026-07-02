import { HelpHint } from "@/components/ui/help-hint";
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
                <span className="inline-flex items-center gap-1.5">
                  Minimum quality score
                  <HelpHint label="About minimum quality score" title="Minimum quality score">
                    The lowest data-quality score (0–100) a submission must reach to be accepted as
                    clean. Records below it are flagged for review. Leave at 0 to not enforce a score.
                  </HelpHint>
                </span>
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
                <span className="inline-flex items-center gap-1.5">
                  Data retention days
                  <HelpHint label="About data retention" title="Data retention days">
                    How long collected records are kept before they’re eligible for deletion/anonymisation
                    — set this to match your donor agreement or data-protection policy.
                  </HelpHint>
                </span>
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
                <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold">
                  Governance switches
                  <HelpHint label="About governance switches" title="Governance switches">
                    Org-wide enforcement toggles applied to every submission of this form — e.g.
                    always capture GPS/timestamp, require supervisor review, restrict who can export,
                    mask sensitive fields, require PII tagging and consent, and lock or archive records
                    automatically. Turn on the ones your program or donor requires.
                  </HelpHint>
                </h3>
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
                      className="flex items-center gap-2 rounded-md border bg-surface-container-lowest px-3 py-2 text-sm"
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
