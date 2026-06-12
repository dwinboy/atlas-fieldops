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

    expect(summary.activeAssignments).toBe(2);
    expect(summary.assignedFieldOfficers).toBe(2);
    expect(summary.activeSupervisors).toBe(2);
    expect(summary.overdueAssignments).toBe(1);
    expect(summary.dailyCollectionProgress).toBe(66);
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
