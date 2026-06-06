import type { MobileSyncOperation, MobileSyncQueueItem } from "@/models/contracts";
import { LocalDatabase } from "@/storage/localDatabase";
import { createLocalId, nowIso } from "@/utils/ids";

export class SyncQueueService {
  constructor(private readonly database: LocalDatabase) {}

  enqueue(operation: MobileSyncOperation, payload: Record<string, unknown>): MobileSyncQueueItem {
    const timestamp = nowIso();
    const item: MobileSyncQueueItem = {
      id: createLocalId("sync"),
      localId: createLocalId("queue"),
      serverId: null,
      operation,
      payload,
      status: "Queued",
      retryCount: 0,
      lastAttemptAt: null,
      errorMessage: null,
      syncStatus: "Queued",
      createdAt: timestamp,
      updatedAt: timestamp,
      lastSyncedAt: null,
      deviceId: null,
      conflictStatus: null,
      deletedAt: null,
    };
    return this.database.syncQueue.upsert(item);
  }

  pending(): MobileSyncQueueItem[] {
    return this.database.syncQueue.list().filter((item) => item.status === "Queued" || item.status === "Failed");
  }

  markFailed(localId: string, errorMessage: string): MobileSyncQueueItem {
    const item = this.database.syncQueue.get(localId);
    if (!item) {
      throw new Error("Sync queue item not found");
    }
    return this.database.syncQueue.upsert({
      ...item,
      status: "Failed",
      syncStatus: "Failed",
      retryCount: item.retryCount + 1,
      lastAttemptAt: nowIso(),
      errorMessage,
      updatedAt: nowIso(),
    });
  }

  markSyncing(localId: string): MobileSyncQueueItem {
    const item = this.database.syncQueue.get(localId);
    if (!item) {
      throw new Error("Sync queue item not found");
    }
    return this.database.syncQueue.upsert({
      ...item,
      status: "Syncing",
      syncStatus: "Syncing",
      lastAttemptAt: nowIso(),
      updatedAt: nowIso(),
    });
  }

  markSynced(localId: string): MobileSyncQueueItem {
    const item = this.database.syncQueue.get(localId);
    if (!item) {
      throw new Error("Sync queue item not found");
    }
    return this.database.syncQueue.upsert({
      ...item,
      status: "Synced",
      syncStatus: "Synced",
      errorMessage: null,
      lastSyncedAt: nowIso(),
      updatedAt: nowIso(),
    });
  }
}
