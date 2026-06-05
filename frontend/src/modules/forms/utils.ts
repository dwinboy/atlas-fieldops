import type { BadgeProps } from "@/components/ui/badge";
import type { FormListItem, FormsSection, FormsSummary } from "@/modules/forms/data";

export function statusTone(status: string): BadgeProps["tone"] {
  const normalized = status.toLowerCase();
  if (normalized === "published" || normalized === "active") return "success";
  if (normalized === "archived" || normalized === "suspended") return "neutral";
  if (normalized === "testing" || normalized === "pending") return "warning";
  return "accent";
}

export function qualityTone(score: number): BadgeProps["tone"] {
  if (score >= 85) return "success";
  if (score >= 70) return "accent";
  if (score >= 50) return "warning";
  return "danger";
}

export function computeFormsSummary(forms: FormListItem[]): FormsSummary {
  return {
    total_forms: forms.length,
    draft_forms: forms.filter((form) => form.status.toLowerCase() === "draft").length,
    published_forms: forms.filter((form) => form.status.toLowerCase() === "published").length,
    archived_forms: forms.filter((form) => form.status.toLowerCase() === "archived").length,
    pending_approval_forms: forms.filter((form) => form.pending_approval).length,
    active_collection_forms: forms.filter((form) => form.status.toLowerCase() === "published" && form.active_assignments > 0).length,
    forms_with_quality_issues: forms.filter((form) => form.has_quality_issues).length,
    recently_updated_forms: forms.filter((form) => form.recently_updated).length,
  };
}

export function filterForms(forms: FormListItem[], section: FormsSection): FormListItem[] {
  if (section === "all" || section === "dashboard" || section === "templates" || section === "reference-data") {
    return forms;
  }
  return forms.filter((form) => form.status.toLowerCase() === section);
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

export function toCsv(rows: Record<string, string | number | boolean | null | undefined>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0] ?? {});
  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  return [headers.join(","), ...rows.map((row) => headers.map((header) => escape(row[header])).join(","))].join("\n");
}
