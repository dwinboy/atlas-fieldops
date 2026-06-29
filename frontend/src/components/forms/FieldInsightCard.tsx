import { AlertTriangle, ArrowLeftRight, Info } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { checkFormHealth } from "@/lib/formHealth";
import { describeField, fieldConnections } from "@/lib/formInsights";
import { type DynamicForm, type FormField } from "@/lib/forms";

/** "What is this question doing?" card shown above a question's settings: a plain-language summary,
 * its connections (what it depends on / what depends on it), and any structural problems — so a
 * builder always understands a question and the impact of changing it, without reading expressions. */
export function FieldInsightCard({
  field,
  form,
  onJump,
}: {
  field: FormField;
  form: DynamicForm;
  onJump: (fieldId: string) => void;
}) {
  const summary = describeField(field);
  const { dependsOn, usedBy } = fieldConnections(form, field);
  const issues = checkFormHealth(form).filter((issue) => issue.fieldId === field.id);

  const chip = (item: { id: string; label: string }) => (
    <button
      className="rounded-md border bg-background px-2 py-0.5 text-xs text-foreground transition hover:border-primary/40 hover:bg-primary/10"
      key={item.id}
      onClick={() => onJump(item.id)}
      type="button"
    >
      {item.label}
    </button>
  );

  return (
    <section className="mt-4 rounded-lg border bg-panel p-3">
      <div className="flex items-start gap-2">
        <Info aria-hidden="true" className="mt-0.5 text-primary" size={15} />
        <div className="min-w-0 flex-1">
          <p className="text-sm">
            <span className="font-semibold">{field.label || "This question"}</span>
            {summary ? <span className="text-muted-foreground"> — {summary}.</span> : <span className="text-muted-foreground"> — a basic question with no logic or links.</span>}
          </p>

          {dependsOn.length > 0 || usedBy.length > 0 ? (
            <div className="mt-2 space-y-1 text-xs">
              {dependsOn.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <ArrowLeftRight aria-hidden="true" size={12} /> Depends on
                  </span>
                  {dependsOn.map(chip)}
                </div>
              ) : null}
              {usedBy.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-muted-foreground">Used by</span>
                  {usedBy.map(chip)}
                </div>
              ) : null}
            </div>
          ) : null}

          {issues.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {issues.map((issue, index) => (
                <li className="flex items-start gap-1.5 text-xs" key={index}>
                  <AlertTriangle
                    aria-hidden="true"
                    className={issue.severity === "error" ? "mt-0.5 text-destructive" : "mt-0.5 text-amber-500"}
                    size={12}
                  />
                  <span className="text-muted-foreground">{issue.message}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {issues.length > 0 ? (
          <Badge tone={issues.some((i) => i.severity === "error") ? "danger" : "warning"}>
            {issues.length} issue{issues.length === 1 ? "" : "s"}
          </Badge>
        ) : null}
      </div>
    </section>
  );
}
