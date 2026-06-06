import type { MobileSupervisorSummary } from "@/models/contracts";
import { LocalDatabase } from "@/storage/localDatabase";

export class SupervisorModeService {
  constructor(private readonly database: LocalDatabase) {}

  summary(): MobileSupervisorSummary {
    const assignments = this.database.assignments.list();
    const target = assignments.reduce((sum, assignment) => sum + assignment.targetCount, 0);
    const completed = assignments.reduce((sum, assignment) => sum + assignment.completedCount, 0);
    return {
      teamAssignments: assignments.length,
      fieldOfficerProgress: [
        {
          userId: "current-team",
          name: "Assigned team",
          completed,
          target,
        },
      ],
      returnedSubmissions: this.database.draftSubmissions.list().filter((draft) => draft.status === "ReturnedForCorrection").length,
      coverageProgress: target === 0 ? 0 : Math.round((completed / target) * 100),
      qualityAlerts: this.database.conflicts.list().filter((conflict) => conflict.syncStatus === "Conflict").length,
    };
  }
}
