import type { BadgeProps } from "@/components/ui/badge";
import type { FieldOfficerRead, OperationsSummary } from "@/lib/api";
import type {
  FieldAssignment,
  FieldOperationsSection,
  FieldOperationsSummary,
  OperationalTarget,
  SupervisorProfile,
} from "@/modules/field-operations/data";

export function statusTone(status: string): BadgeProps["tone"] {
  const normalized = status.toLowerCase();
  if (["active", "assigned", "in progress", "completed", "healthy", "synced"].includes(normalized)) return "success";
  if (["draft", "on leave", "warning", "attention"].includes(normalized)) return "warning";
  if (["overdue", "cancelled", "suspended", "inactive", "critical"].includes(normalized)) return "danger";
  return "neutral";
}

export function priorityTone(priority: string): BadgeProps["tone"] {
  const normalized = priority.toLowerCase();
  if (normalized === "urgent") return "danger";
  if (normalized === "high") return "warning";
  if (normalized === "normal") return "accent";
  return "neutral";
}

export function progressPercent(completed: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((completed / target) * 100));
}

export function computeFieldOperationsSummary({
  assignments,
  officers,
  operationsSummary,
  supervisors,
  targets,
}: {
  assignments: FieldAssignment[];
  officers: FieldOfficerRead[];
  operationsSummary: OperationsSummary;
  supervisors: SupervisorProfile[];
  targets: OperationalTarget[];
}): FieldOperationsSummary {
  const activeAssignments = assignments.filter((assignment) =>
    ["Assigned", "In Progress"].includes(assignment.status),
  ).length;
  const completedAssignments = assignments.filter((assignment) => assignment.status === "Completed").length;
  const activeOfficers = officers.filter((officer) => officer.is_active).length;
  const totalTarget = targets.reduce((sum, target) => sum + target.value, 0);
  const totalAchieved = targets.reduce((sum, target) => sum + target.achieved, 0);
  return {
    activeAssignments,
    activeSupervisors: supervisors.filter((supervisor) => supervisor.status === "Active").length,
    assignedFieldOfficers: activeOfficers,
    assignmentCompletionRate: assignments.length ? Math.round((completedAssignments / assignments.length) * 100) : 0,
    coverageProgress: totalTarget ? Math.round((totalAchieved / totalTarget) * 100) : 0,
    dailyCollectionProgress: operationsSummary.sync_health_percent,
    overdueAssignments: assignments.filter((assignment) => assignment.status === "Overdue").length,
    teamProductivity: officers.length ? Math.round((activeOfficers / officers.length) * 100) : 0,
    upcomingDeadlines: assignments.filter((assignment) => new Date(assignment.endDate).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000).length,
  };
}

export function filterAssignments(assignments: FieldAssignment[], section: FieldOperationsSection): FieldAssignment[] {
  if (section === "dashboard" || section === "assignments") return assignments;
  return assignments;
}

export function formatDate(value?: string | null): string {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatTime(value?: string | null): string {
  if (!value) return "Never";
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

export function toCsv(rows: Record<string, string | number | boolean | null | undefined>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return [
    headers.map(escape).join(","),
    ...rows.map((row) => headers.map((header) => escape(row[header])).join(",")),
  ].join("\n");
}
