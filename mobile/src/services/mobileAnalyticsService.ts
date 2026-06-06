import { LocalDatabase } from "@/storage/localDatabase";
import { createLocalId, nowIso } from "@/utils/ids";

export type MobileAnalyticsEvent =
  | "LoginSuccess"
  | "LoginFailure"
  | "DraftCreated"
  | "SubmissionQueued"
  | "SubmissionSynced"
  | "SyncFailure"
  | "AttachmentFailure";

export class MobileAnalyticsService {
  constructor(private readonly database: LocalDatabase) {}

  track(event: MobileAnalyticsEvent, metadata: Record<string, unknown> = {}): void {
    const timestamp = nowIso();
    this.database.auditEvents.upsert({
      id: createLocalId("analytics"),
      localId: createLocalId("analytics-local"),
      serverId: null,
      eventType: `analytics.${event}`,
      module: "Sync",
      entityType: null,
      entityId: null,
      metadata: { ...metadata, sensitiveAnswersIncluded: false },
      occurredAt: timestamp,
      syncStatus: "Queued",
      createdAt: timestamp,
      updatedAt: timestamp,
      lastSyncedAt: null,
      deviceId: null,
      conflictStatus: null,
      deletedAt: null,
    });
  }
}
