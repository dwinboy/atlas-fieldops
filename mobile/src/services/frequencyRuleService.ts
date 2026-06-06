import type { FrequencyRule, MobileSubmission } from "@/models/contracts";

export type FrequencyDecision = {
  allowed: boolean;
  severity: "Allow" | "Warn" | "Block";
  reason: string;
};

function sameMonth(left: Date, right: Date): boolean {
  return left.getUTCFullYear() === right.getUTCFullYear() && left.getUTCMonth() === right.getUTCMonth();
}

export class FrequencyRuleService {
  validate(rule: FrequencyRule, draft: MobileSubmission, existingSubmissions: MobileSubmission[], now: Date = new Date()): FrequencyDecision {
    if (rule === "Unlimited" || !draft.entityId) {
      return { allowed: true, severity: "Allow", reason: "This form allows repeat or anonymous submissions." };
    }
    const existingForEntity = existingSubmissions.filter(
      (submission) => submission.entityId === draft.entityId && submission.formId === draft.formId && submission.status !== "Failed",
    );
    if (rule === "OnceEverPerEntity" && existingForEntity.length > 0) {
      return { allowed: false, severity: "Block", reason: "This entity already has a submission for this form." };
    }
    if (rule === "OncePerProjectPerEntity" && existingForEntity.some((submission) => submission.projectId === draft.projectId)) {
      return { allowed: false, severity: "Block", reason: "This entity already has a project submission for this form." };
    }
    if (rule === "OncePerMonthPerEntity") {
      const duplicate = existingForEntity.some((submission) => sameMonth(new Date(submission.updatedAt), now));
      if (duplicate) {
        return { allowed: false, severity: "Block", reason: "This entity already has a submission for this month." };
      }
    }
    if (rule === "OncePerEventPerEntity" && draft.eventId && existingForEntity.some((submission) => submission.eventId === draft.eventId)) {
      return { allowed: false, severity: "Block", reason: "This entity already has a submission for this event." };
    }
    return { allowed: true, severity: "Allow", reason: "No local frequency conflict was found. Server will re-check during sync." };
  }
}
