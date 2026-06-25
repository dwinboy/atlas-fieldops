import type { MobileNotification } from "@/models/contracts";
import { LocalDatabase } from "@/storage/localDatabase";
import { SyncQueueService } from "@/sync/syncQueue";
import { createLocalId, nowIso } from "@/utils/ids";

export type NotificationType = "AssignmentCreated" | "AssignmentUpdated" | "SubmissionReturned" | "SyncFailed" | "FormUpdated" | "ReferenceDataUpdated";

export class NotificationService {
  constructor(
    private readonly database: LocalDatabase,
    private readonly queue = new SyncQueueService(database),
  ) {}

  create(type: NotificationType, title: string, body: string): MobileNotification {
    const timestamp = nowIso();
    const notification: MobileNotification = {
      id: createLocalId("notification"),
      localId: createLocalId("notification-local"),
      serverId: null,
      title,
      body,
      eventType: null,
      resourceType: null,
      resourceId: null,
      readAt: null,
      createdByServerAt: timestamp,
      syncStatus: "NotSynced",
      createdAt: timestamp,
      updatedAt: timestamp,
      lastSyncedAt: null,
      deviceId: null,
      conflictStatus: null,
      deletedAt: null,
    };
    return this.database.notifications.upsert(notification);
  }

  unread(): MobileNotification[] {
    return this.database.notifications.list().filter((notification) => notification.readAt === null && notification.deletedAt === null);
  }

  markRead(localId: string): MobileNotification {
    const notification = this.database.notifications.get(localId);
    if (!notification) {
      throw new Error("Notification not found");
    }
    const updated = this.database.notifications.upsert({ ...notification, readAt: nowIso(), updatedAt: nowIso() });
    this.queue.enqueue("MARK_NOTIFICATION_READ", { notificationLocalId: localId });
    return updated;
  }

  archive(localId: string): MobileNotification {
    const notification = this.database.notifications.get(localId);
    if (!notification) {
      throw new Error("Notification not found");
    }
    return this.database.notifications.upsert({ ...notification, deletedAt: nowIso(), updatedAt: nowIso() });
  }
}
