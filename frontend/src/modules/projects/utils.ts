import type { ProjectListItemRead, ProjectSummaryRead } from "@/lib/api";

export function healthTone(status: string | undefined): "success" | "warning" | "danger" | "neutral" {
  const normalized = (status ?? "").toLowerCase();
  if (["excellent", "good", "active", "approved"].includes(normalized)) return "success";
  if (["needs attention", "draft", "planning", "suspended"].includes(normalized)) return "warning";
  if (["critical", "closed", "archived"].includes(normalized)) return "danger";
  return "neutral";
}

export function statusTone(status: string | undefined): "success" | "warning" | "danger" | "neutral" {
  const normalized = (status ?? "").toLowerCase();
  if (["active", "approved", "completed"].includes(normalized)) return "success";
  if (["draft", "planning", "suspended"].includes(normalized)) return "warning";
  if (["closed", "archived", "critical"].includes(normalized)) return "danger";
  return "neutral";
}

export function formatDate(value?: string | null): string {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function computeProjectSummary(projects: ProjectListItemRead[]): ProjectSummaryRead {
  const active = projects.filter((project) => project.status === "active").length;
  const closed = projects.filter((project) => ["closed", "archived", "completed"].includes(project.status)).length;
  const draft = Math.max(projects.length - active - closed, 0);
  return {
    active_field_officers: projects.reduce((sum, project) => sum + project.active_assignments, 0),
    active_forms: projects.reduce((sum, project) => sum + project.active_forms, 0),
    active_projects: active,
    attention_projects: projects.filter((project) => project.health_score < 70).length,
    closed_projects: closed,
    draft_projects: draft,
    indicator_achievement_rate: projects.length ? Math.round(projects.reduce((sum, project) => sum + project.health_score, 0) / projects.length) : 0,
    project_completion_rate: projects.length ? Math.round(projects.reduce((sum, project) => sum + project.progress_percent, 0) / projects.length) : 0,
    risk_alerts: projects.filter((project) => project.health_status === "Critical").length,
    total_beneficiaries: projects.reduce((sum, project) => sum + project.beneficiary_count, 0),
    total_projects: projects.length,
    total_submissions: projects.reduce((sum, project) => sum + project.total_submissions, 0),
  };
}

export function filterProjects(projects: ProjectListItemRead[], section: string): ProjectListItemRead[] {
  if (section === "active") return projects.filter((project) => project.status === "active");
  if (section === "draft") return projects.filter((project) => ["draft", "planning"].includes(project.status));
  if (section === "closed") return projects.filter((project) => ["closed", "completed", "archived"].includes(project.status));
  return projects;
}

export function projectCodeFromName(name: string): string {
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
}

export function toCsv(rows: Record<string, string | number | boolean | null | undefined>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.map((header) => JSON.stringify(header)).join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => JSON.stringify(row[header] ?? "")).join(","));
  }
  return lines.join("\n");
}

