import { describe, expect, it } from "vitest";

import {
  previewAssignments,
  previewOfficers,
  previewOperationsSummary,
  previewSupervisors,
  previewTargets,
} from "@/modules/field-operations/data";
import {
  computeFieldOperationsSummary,
  priorityTone,
  progressPercent,
  statusTone,
} from "@/modules/field-operations/utils";

describe("Field Operations module helpers", () => {
  it("computes operational dashboard metrics from assignments, officers, supervisors, targets, and sync health", () => {
    const summary = computeFieldOperationsSummary({
      assignments: previewAssignments,
      officers: previewOfficers,
      operationsSummary: previewOperationsSummary,
      supervisors: previewSupervisors,
      targets: previewTargets,
    });

    expect(summary.activeAssignments).toBe(previewAssignments.filter((assignment) => ["Assigned", "In Progress"].includes(assignment.status)).length);
    expect(summary.assignedFieldOfficers).toBe(previewOfficers.filter((officer) => officer.is_active).length);
    expect(summary.activeSupervisors).toBe(previewSupervisors.filter((supervisor) => supervisor.status === "Active").length);
    expect(summary.overdueAssignments).toBe(previewAssignments.filter((assignment) => assignment.status === "Overdue").length);
    expect(summary.dailyCollectionProgress).toBe(Math.round((previewAssignments.reduce((sum, assignment) => sum + assignment.completedCount, 0) / previewAssignments.reduce((sum, assignment) => sum + assignment.targetCount, 0)) * 100));
  });

  it("calculates target progress safely", () => {
    expect(progressPercent(86, 120)).toBe(72);
    expect(progressPercent(20, 0)).toBe(0);
    expect(progressPercent(150, 100)).toBe(100);
  });

  it("maps operational statuses and priorities to interface tones", () => {
    expect(statusTone("In Progress")).toBe("success");
    expect(statusTone("Overdue")).toBe("danger");
    expect(priorityTone("Urgent")).toBe("danger");
    expect(priorityTone("Normal")).toBe("accent");
  });
});
