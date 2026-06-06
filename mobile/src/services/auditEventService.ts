import type { MobileAuditEvent } from "@/models/contracts";
import { LocalDatabase } from "@/storage/localDatabase";
import { createLocalId, nowIso } from "@/utils/ids";

export class AuditEventService {
  constructor(private readonly database: LocalDatabase) {}

  queue(
    eventType: string,
    metadata: Record<string, unknown> = {},
    entity?: { entityType: string; entityId: string },
  ): MobileAuditEvent {
    const timestamp = nowIso();
    const event: MobileAuditEvent = {
      id: createLocalId("audit"),
      localId: createLocalId("audit-local"),
      serverId: null,
      eventType,
      module: "Sync",
      entityType: entity?.entityType ?? null,
      entityId: entity?.entityId ?? null,
      metadata,
      occurredAt: timestamp,
      syncStatus: "Queued",
      createdAt: timestamp,
      updatedAt: timestamp,
      lastSyncedAt: null,
      deviceId: null,
      conflictStatus: null,
      deletedAt: null,
    };
    return this.database.auditEvents.upsert(event);
  }
}
