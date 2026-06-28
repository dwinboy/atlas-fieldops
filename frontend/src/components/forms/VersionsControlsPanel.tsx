import { Badge } from "@/components/ui/badge";
import { type FormControlsSettings } from "@/lib/api";
import { type DynamicForm } from "@/lib/forms";

/** Form-level version controls and version history list. */
export function VersionsControlsPanel({
  form,
  controls,
  onUpdateControls,
}: {
  form: DynamicForm | undefined;
  controls: FormControlsSettings;
  onUpdateControls: (updater: (controls: FormControlsSettings) => FormControlsSettings) => void;
}) {
  return (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <section className="rounded-lg border bg-background p-4">
                <h3 className="text-sm font-semibold">Version rules</h3>
                <div className="mt-3 grid gap-2">
                  {(
                    [
                      [
                        "editing_published_creates_draft",
                        "Editing a published form creates a new draft",
                      ],
                      [
                        "preserve_submission_version_link",
                        "Submissions stay linked to the collected version",
                      ],
                      [
                        "compare_versions_enabled",
                        "Version comparison is enabled",
                      ],
                      [
                        "reference_lists_version_aware",
                        "Reference lists are version-aware",
                      ],
                      [
                        "archived_versions_viewable",
                        "Archived versions stay viewable for audit",
                      ],
                    ] satisfies [
                      keyof FormControlsSettings["versioning"],
                      string,
                    ][]
                  ).map(([key, label]) => (
                    <label
                      className="flex items-center gap-2 rounded-md border bg-panel px-3 py-2 text-sm"
                      key={String(key)}
                    >
                      <input
                        checked={controls.versioning[key]}
                        onChange={(event) =>
                          onUpdateControls((controls) => ({
                            ...controls,
                            versioning: {
                              ...controls.versioning,
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
              </section>
              <aside className="rounded-lg border bg-panel p-4">
                <h3 className="text-sm font-semibold">Current form history</h3>
                <div className="mt-3 space-y-2">
                  {(
                    form?.history ?? [
                      {
                        version: form?.version ?? 1,
                        status: form?.status ?? "draft",
                        createdAt:
                          form?.updatedAt ?? new Date().toISOString(),
                        summary: "Current draft",
                      },
                    ]
                  ).map((entry) => (
                    <div
                      className="rounded-md border bg-background px-3 py-2 text-xs"
                      key={`${entry.version}-${entry.createdAt}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold">
                          Version {entry.version}
                        </span>
                        <Badge
                          tone={
                            entry.status === "published" ? "success" : "neutral"
                          }
                        >
                          {entry.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-muted-foreground">
                        {entry.summary}
                      </p>
                    </div>
                  ))}
                </div>
              </aside>
            </div>
  );
}
