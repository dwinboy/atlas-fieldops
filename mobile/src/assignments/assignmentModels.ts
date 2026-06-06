import type { MobileAssignment } from "@/models/contracts";

export type AssignmentListItem = {
  id: string;
  title: string;
  status: string;
  progressLabel: string;
  deadlineLabel: string;
};

export function buildAssignmentList(assignments: MobileAssignment[]): AssignmentListItem[] {
  return assignments.map((assignment) => ({
    id: assignment.id,
    title: assignment.formId ? `Form assignment ${assignment.formId}` : `Project assignment ${assignment.projectId}`,
    status: assignment.status,
    progressLabel: `${assignment.completedCount}/${assignment.targetCount} completed`,
    deadlineLabel: assignment.endDate ?? "No deadline",
  }));
}
