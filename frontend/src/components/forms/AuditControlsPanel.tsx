import { ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { type FormControlsSettings } from "@/lib/api";

/** Form-level audit-trail view (recent change events). */
export function AuditControlsPanel({
  controls,
}: {
  controls: FormControlsSettings;
}) {
  return (
            <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
              <section className="rounded-lg border bg-background p-4">
                <ShieldCheck aria-hidden="true" className="text-primary" />
                <h3 className="mt-3 text-sm font-semibold">
                  Immutable audit trail
                </h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Audit records cannot be deleted. High-risk events require a
                  reason and exports are restricted to approved roles.
                </p>
                <Badge
                  className="mt-3"
                  tone={
                    controls.audit.immutable ? "success" : "danger"
                  }
                >
                  {controls.audit.immutable
                    ? "Immutable"
                    : "Not immutable"}
                </Badge>
              </section>
              <section className="rounded-lg border bg-background p-4">
                <h3 className="text-sm font-semibold">Tracked events</h3>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {controls.audit.tracked_events.map((event) => (
                    <span
                      className="rounded-md border bg-panel px-2 py-1 text-[11px] text-muted-foreground"
                      key={event}
                    >
                      {event.replaceAll("_", " ")}
                    </span>
                  ))}
                </div>
                <h3 className="mt-5 text-sm font-semibold">Reason required</h3>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {controls.audit.reason_required_events.map(
                    (event) => (
                      <span
                        className="rounded-md border border-warning/30 bg-warning/10 px-2 py-1 text-[11px]"
                        key={event}
                      >
                        {event.replaceAll("_", " ")}
                      </span>
                    ),
                  )}
                </div>
              </section>
            </div>
  );
}
