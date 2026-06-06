import type { MobileSubmission } from "@/models/contracts";
import { LocalDatabase } from "@/storage/localDatabase";
import { SyncQueueService } from "@/sync/syncQueue";
import { nowIso } from "@/utils/ids";

export type ReturnedCorrection = {
  submissionLocalId: string;
  reviewerComments: string;
  fieldsToCorrect: string[];
  correctionDeadline: string | null;
};

export class ReturnedSubmissionService {
  constructor(
    private readonly database: LocalDatabase,
    private readonly queue = new SyncQueueService(database),
  ) {}

  listReturned(): MobileSubmission[] {
    return this.database.draftSubmissions.list().filter((draft) => draft.status === "ReturnedForCorrection");
  }

  applyReturn(draftLocalId: string, correction: ReturnedCorrection): MobileSubmission {
    const draft = this.database.draftSubmissions.get(draftLocalId);
    if (!draft) {
      throw new Error("Returned submission draft was not found.");
    }
    return this.database.draftSubmissions.upsert({
      ...draft,
      status: "ReturnedForCorrection",
      syncStatus: "ReturnedForCorrection",
      updatedAt: nowIso(),
      responses: [
        ...draft.responses,
        {
          questionId: "__reviewer_comments",
          variableName: "__reviewer_comments",
          value: correction,
          updatedAt: nowIso(),
        },
      ],
    });
  }

  queueCorrection(draftLocalId: string): MobileSubmission {
    const draft = this.database.draftSubmissions.get(draftLocalId);
    if (!draft) {
      throw new Error("Returned submission draft was not found.");
    }
    const updated = this.database.draftSubmissions.upsert({
      ...draft,
      status: "Queued",
      syncStatus: "Queued",
      submittedAt: nowIso(),
      updatedAt: nowIso(),
    });
    this.queue.enqueue("SUBMIT_CORRECTION", { draftLocalId });
    return updated;
  }
}
