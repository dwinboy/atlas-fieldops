import type { MobileConflictRecord, MobileConflictType } from "@/models/contracts";
import { LocalDatabase } from "@/storage/localDatabase";
import { SyncQueueService } from "@/sync/syncQueue";
import { createLocalId, nowIso } from "@/utils/ids";

export class ConflictService {
  constructor(
    private readonly database: LocalDatabase,
    private readonly queue = new SyncQueueService(database),
  ) {}

  recordConflict(input: {
    conflictType: MobileConflictType;
    localEntityType: string;
    localEntityId: string;
    serverEntityId?: string | null;
    summary: string;
    localValue: Record<string, unknown>;
    serverValue: Record<string, unknown>;
  }): MobileConflictRecord {
    const timestamp = nowIso();
    const conflict: MobileConflictRecord = {
      id: createLocalId("conflict"),
      localId: createLocalId("conflict-local"),
      serverId: null,
      conflictType: input.conflictType,
      localEntityType: input.localEntityType,
      localEntityId: input.localEntityId,
      serverEntityId: input.serverEntityId ?? null,
      summary: input.summary,
      localValue: input.localValue,
      serverValue: input.serverValue,
      resolution: "ReviewLater",
      resolvedAt: null,
      syncStatus: "Conflict",
      createdAt: timestamp,
      updatedAt: timestamp,
      lastSyncedAt: null,
      deviceId: null,
      conflictStatus: "PendingReview",
      deletedAt: null,
    };
    return this.database.conflicts.upsert(conflict);
  }

  resolve(localId: string, resolution: NonNullable<MobileConflictRecord["resolution"]>): MobileConflictRecord {
    const conflict = this.database.conflicts.get(localId);
    if (!conflict) {
      throw new Error("Conflict record not found");
    }
    const resolved = this.database.conflicts.upsert({
      ...conflict,
      resolution,
      resolvedAt: nowIso(),
      syncStatus: "Queued",
      conflictStatus: resolution === "ReviewLater" ? "PendingReview" : "Merged",
      updatedAt: nowIso(),
    });
    this.queue.enqueue("RESOLVE_CONFLICT", { conflictLocalId: localId, resolution });
    return resolved;
  }

  detectAssignmentCancellation(assignmentId: string): MobileConflictRecord | null {
    const assignment = this.database.assignments.list().find((item) => item.id === assignmentId);
    const openDrafts = this.database.draftSubmissions.list().filter((draft) => draft.assignmentId === assignmentId && draft.status !== "Synced");
    if (assignment?.status === "Cancelled" && openDrafts.length > 0) {
      return this.recordConflict({
        conflictType: "AssignmentCancelled",
        localEntityType: "Assignment",
        localEntityId: assignmentId,
        summary: "This assignment was cancelled on the server. Existing drafts may continue, but new submissions are blocked.",
        localValue: { drafts: openDrafts.map((draft) => draft.localId) },
        serverValue: { assignmentStatus: assignment.status },
      });
    }
    return null;
  }
}
