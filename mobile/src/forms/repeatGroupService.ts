import type { MobileSubmission } from "@/models/contracts";
import { DraftSubmissionService } from "@/submissions/draftSubmissionService";
import { nowIso } from "@/utils/ids";

export type RepeatRow = Record<string, unknown>;

export class RepeatGroupService {
  constructor(private readonly drafts: DraftSubmissionService) {}

  addRow(draft: MobileSubmission, repeatQuestionId: string, variableName: string, row: RepeatRow): MobileSubmission {
    const existing = draft.responses.find((response) => response.questionId === repeatQuestionId);
    const rows = Array.isArray(existing?.value) ? existing.value : [];
    return this.drafts.updateResponse(draft.localId, {
      questionId: repeatQuestionId,
      variableName,
      value: [...rows, row],
      updatedAt: nowIso(),
    });
  }

  removeRow(draft: MobileSubmission, repeatQuestionId: string, variableName: string, index: number): MobileSubmission {
    const existing = draft.responses.find((response) => response.questionId === repeatQuestionId);
    const rows = Array.isArray(existing?.value) ? existing.value : [];
    return this.drafts.updateResponse(draft.localId, {
      questionId: repeatQuestionId,
      variableName,
      value: rows.filter((_, rowIndex) => rowIndex !== index),
      updatedAt: nowIso(),
    });
  }
}
