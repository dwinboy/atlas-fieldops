import type { BadgeProps } from "@/components/ui/badge";
import type { FieldOfficerRead, FieldVisitRequestRead, OperationsSummary } from "@/lib/api";
import { statusTone as canonicalStatusTone } from "@/lib/statusTones";
import type {
  FieldActivity,
  FieldAssignment,
  FieldOperationsSection,
  FieldOperationsSummary,
  OperationalTarget,
  SupervisorProfile,
} from "@/modules/field-operations/data";

export function statusTone(status: string): BadgeProps["tone"] {
  return canonicalStatusTone(status);
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
  const assignmentTarget = assignments.reduce((sum, assignment) => sum + assignment.targetCount, 0);
  const assignmentCompleted = assignments.reduce((sum, assignment) => sum + assignment.completedCount, 0);

  return {
    activeAssignments,
    activeSupervisors: supervisors.filter((supervisor) => supervisor.status === "Active").length,
    assignedFieldOfficers: activeOfficers,
    assignmentCompletionRate: assignments.length ? Math.round((completedAssignments / assignments.length) * 100) : 0,
    coverageProgress: totalTarget ? Math.round((totalAchieved / totalTarget) * 100) : 0,
    dailyCollectionProgress: assignmentTarget ? Math.round((assignmentCompleted / assignmentTarget) * 100) : 0,
    overdueAssignments: assignments.filter((assignment) => assignment.status === "Overdue").length,
    teamProductivity: officers.length ? Math.round((activeOfficers / officers.length) * 100) : 0,
    upcomingDeadlines: assignments.filter((assignment) => new Date(assignment.endDate).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000).length,
  };
}

function percent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

export function deriveSupervisors(
  officers: FieldOfficerRead[],
  visitRequests: FieldVisitRequestRead[],
): SupervisorProfile[] {
  const groups = new Map<string, { name: string; officers: FieldOfficerRead[] }>();
  for (const officer of officers) {
    if (!officer.supervisor_user_id) continue;
    const existing = groups.get(officer.supervisor_user_id);
    if (existing) {
      existing.officers.push(officer);
    } else {
      groups.set(officer.supervisor_user_id, {
        name: officer.supervisor_name ?? "Unnamed supervisor",
        officers: [officer],
      });
    }
  }

  return Array.from(groups.entries()).map(([supervisorId, group]) => {
    const assignedLocations = Array.from(
      new Set(group.officers.map((officer) => officer.home_region).filter((region): region is string => Boolean(region))),
    );
    const teamVisits = visitRequests.filter((visit) => visit.supervisor_user_id === supervisorId);
    const reviewedVisits = teamVisits.filter((visit) => visit.reviewed_at);
    const reviewSlaHours = reviewedVisits.length
      ? Math.round(
          reviewedVisits.reduce((sum, visit) => {
            const start = new Date(visit.check_in_at ?? visit.requested_start_at).getTime();
            const reviewed = new Date(visit.reviewed_at as string).getTime();
            return sum + Math.max(0, reviewed - start) / (1000 * 60 * 60);
          }, 0) / reviewedVisits.length,
        )
      : 0;

    return {
      id: supervisorId,
      name: group.name,
      team: assignedLocations.length
        ? `${assignedLocations[0]} field team${assignedLocations.length > 1 ? ` +${assignedLocations.length - 1}` : ""}`
        : "Unassigned team",
      assignedLocations,
      assignedProjects: [],
      managedOfficers: group.officers.length,
      status: group.officers.some((officer) => officer.is_active) ? "Active" : "Inactive",
      teamCompletionRate: percent(teamVisits.filter((visit) => visit.status === "completed").length, teamVisits.length),
      teamDataQualityScore:
        100 - percent(teamVisits.filter((visit) => ["flagged", "missed"].includes(visit.status)).length, teamVisits.length),
      teamCoverageRate: percent(
        group.officers.filter((officer) => officer.last_latitude !== null && officer.last_longitude !== null).length,
        group.officers.length,
      ),
      reviewSlaHours,
      approvalRate: percent(
        reviewedVisits.filter((visit) => ["approved", "completed"].includes(visit.status)).length,
        reviewedVisits.length,
      ),
    };
  });
}

export function deriveFieldActivities(
  officers: FieldOfficerRead[],
  visitRequests: FieldVisitRequestRead[],
): FieldActivity[] {
  return visitRequests
    .map((visit) => ({
      id: visit.id,
      actor: officers.find((officer) => officer.id === visit.field_officer_id)?.full_name ?? "Unassigned officer",
      assignment: visit.title,
      activityType: visit.activity_type,
      status: visit.status,
      location: visit.location_name,
      timestamp: visit.check_in_at ?? visit.requested_start_at,
    }))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
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

type AssignmentProjectOption = {
  id: string;
  name: string;
  country?: string | null;
  region?: string | null;
};

type AssignmentFormOption = {
  id: string;
  name: string;
  project_id?: string | null;
  project_name?: string | null;
  status?: string | null;
};

export function isPublishedFormStatus(status?: string | null): boolean {
  return String(status ?? "").toLowerCase() === "published";
}

export function listAssignableProjects<TProject extends AssignmentProjectOption, TForm extends AssignmentFormOption>(
  projects: TProject[],
  forms: TForm[],
): TProject[] {
  const publishedForms = forms.filter((form) => isPublishedFormStatus(form.status));
  const publishedProjectIds = new Set(
    publishedForms
      .map((form) => form.project_id)
      .filter((value): value is string => Boolean(value)),
  );
  const publishedProjectNames = new Set(
    publishedForms
      .map((form) => form.project_name)
      .filter((value): value is string => Boolean(value)),
  );
  return projects.filter(
    (project) =>
      publishedProjectIds.has(project.id) || publishedProjectNames.has(project.name),
  );
}

export function listAssignableForms<TProject extends Pick<AssignmentProjectOption, "id" | "name">, TForm extends AssignmentFormOption>(
  forms: TForm[],
  selectedProject?: TProject,
): TForm[] {
  return forms.filter((form) => {
    if (!isPublishedFormStatus(form.status)) return false;
    if (!selectedProject) return true;
    return (
      form.project_id === selectedProject.id ||
      form.project_name === selectedProject.name
    );
  });
}
