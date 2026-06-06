import type { MobileSubmission, MobileSubmissionResponse } from "@/models/contracts";
import { LocalDatabase } from "@/storage/localDatabase";
import { createLocalId, nowIso } from "@/utils/ids";

export type DraftSubmissionInput = {
  projectId: string;
  assignmentId: string | null;
  formId: string;
  formVersionId: string;
  entityId: string | null;
  entityType?: string | null;
  deviceId?: string | null;
  appVersion?: string | null;
  prefilledResponses?: MobileSubmissionResponse[];
};

export class DraftSubmissionService {
  constructor(private readonly database: LocalDatabase) {}

  createDraft(input: DraftSubmissionInput): MobileSubmission {
    const timestamp = nowIso();
    const draft: MobileSubmission = {
      id: createLocalId("submission"),
      localId: createLocalId("draft"),
      serverId: null,
      projectId: input.projectId,
      assignmentId: input.assignmentId,
      formId: input.formId,
      formVersionId: input.formVersionId,
      entityId: input.entityId,
      entityType: input.entityType ?? null,
      status: "Draft",
      frequencyPeriod: null,
      eventId: null,
      responses: input.prefilledResponses ?? [],
      attachments: [],
      location: null,
      submittedAt: null,
      appVersion: input.appVersion ?? null,
      syncStatus: "NotSynced",
      createdAt: timestamp,
      updatedAt: timestamp,
      lastSyncedAt: null,
      deviceId: input.deviceId ?? null,
      conflictStatus: null,
      deletedAt: null,
    };
    return this.database.draftSubmissions.upsert(draft);
  }

  updateResponse(draftLocalId: string, response: MobileSubmissionResponse): MobileSubmission {
    const draft = this.database.draftSubmissions.get(draftLocalId);
    if (!draft) {
      throw new Error("Draft submission not found");
    }
    const responses = draft.responses.filter((item) => item.questionId !== response.questionId);
    const updated = {
      ...draft,
      responses: [...responses, response],
      syncStatus: "NotSynced" as const,
      updatedAt: nowIso(),
    };
    return this.database.draftSubmissions.upsert(updated);
  }

  markReady(draftLocalId: string): MobileSubmission {
    const draft = this.database.draftSubmissions.get(draftLocalId);
    if (!draft) {
      throw new Error("Draft submission not found");
    }
    return this.database.draftSubmissions.upsert({
      ...draft,
      status: "ReadyToSubmit",
      syncStatus: "Queued",
      submittedAt: nowIso(),
      updatedAt: nowIso(),
    });
  }

  markQueued(draftLocalId: string): MobileSubmission {
    const ready = this.markReady(draftLocalId);
    return this.database.draftSubmissions.upsert({
      ...ready,
      status: "Queued",
      syncStatus: "Queued",
      updatedAt: nowIso(),
    });
  }

  markSynced(draftLocalId: string, serverId: string, syncedAt: string): MobileSubmission {
    const draft = this.database.draftSubmissions.get(draftLocalId);
    if (!draft) {
      throw new Error("Draft submission not found");
    }
    return this.database.draftSubmissions.upsert({
      ...draft,
      serverId,
      status: "Synced",
      syncStatus: "Synced",
      lastSyncedAt: syncedAt,
      updatedAt: nowIso(),
    });
  }

  markFailed(draftLocalId: string): MobileSubmission {
    const draft = this.database.draftSubmissions.get(draftLocalId);
    if (!draft) {
      throw new Error("Draft submission not found");
    }
    return this.database.draftSubmissions.upsert({
      ...draft,
      status: "Failed",
      syncStatus: "Failed",
      updatedAt: nowIso(),
    });
  }
}
