import { createMobileApis } from "@/api/mobileApis";
import { MobileApiError } from "@/api/httpClient";
import { mobileAppConfig } from "@/config/appConfig";
import { AuditEventService } from "@/services/auditEventService";
import { LocalDatabase } from "@/storage/localDatabase";
import { DraftSubmissionService } from "@/submissions/draftSubmissionService";
import { AttachmentSyncService } from "@/sync/attachmentSyncService";
import { BootstrapSyncService } from "@/sync/bootstrapSyncService";
import { ConflictService } from "@/sync/conflictService";
import { NetworkStatusService } from "@/sync/networkStatus";
import { SyncQueueService } from "@/sync/syncQueue";
import { createLocalId, nowIso } from "@/utils/ids";

export type SyncRunResult = {
  processed: number;
  synced: number;
  failed: number;
  conflicts: number;
  message: string;
};

export type SyncMode = "Manual" | "Automatic" | "Background" | "RetryFailed";

function friendlySyncError(error: unknown): string {
  if (error instanceof MobileApiError) {
    const detail = typeof error.payload === "object" && error.payload !== null && "detail" in error.payload ? String(error.payload.detail) : null;
    return detail ?? "The server rejected this submission. Review the form and try again.";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Sync failed. The submission is still safely stored on this device.";
}

export class SyncEngine {
  private readonly queue: SyncQueueService;
  private readonly drafts: DraftSubmissionService;
  private readonly audit: AuditEventService;
  private readonly attachments: AttachmentSyncService;
  private readonly conflicts: ConflictService;

  constructor(
    private readonly database: LocalDatabase,
    private readonly network: NetworkStatusService,
    private readonly tokenProvider: () => Promise<string | null>,
    private readonly apis = createMobileApis(),
  ) {
    this.queue = new SyncQueueService(database);
    this.drafts = new DraftSubmissionService(database);
    this.audit = new AuditEventService(database);
    this.attachments = new AttachmentSyncService(database, apis);
    this.conflicts = new ConflictService(database);
  }

  async syncNow(mode: SyncMode = "Manual"): Promise<SyncRunResult> {
    const startedAt = nowIso();
    const logLocalId = createLocalId("sync-log");
    const network = this.network.current();
    if (!network.isOnline) {
      return this.finishLog(logLocalId, startedAt, mode, 0, 0, 0, "No internet connection. Your submissions remain queued safely.");
    }
    const token = await this.tokenProvider();
    if (!token) {
      return this.finishLog(logLocalId, startedAt, mode, 0, 0, 0, "Sign in again before syncing submissions.");
    }
    const syncPackage = await new BootstrapSyncService(this.database, this.apis).syncAssignedWork(token);
    if (syncPackage.bootstrap.blockedState.blocked) {
      const message = syncPackage.bootstrap.blockedState.reason ?? "This account or device is blocked for mobile sync.";
      this.audit.queue("mobile.permission_denied", { reason: message });
      return this.finishLog(logLocalId, startedAt, mode, 0, 0, 0, message, 1);
    }
    const device = syncPackage.bootstrap.device ?? this.database.deviceRecords.list()[0] ?? null;
    if (device) {
      try {
        await this.apis.auth.registerDevice(token, {
          deviceId: device.deviceId,
          deviceName: device.deviceName,
          platform: "Android",
          appVersion: mobileAppConfig.appVersion,
          osVersion: device.osVersion,
          lastSeenAt: nowIso(),
        });
      } catch (error) {
        this.audit.queue("mobile.sync_failed", { operation: "DEVICE_STATUS", message: friendlySyncError(error) });
      }
    }
    const pending = this.queue.pending();
    let synced = 0;
    let failed = 0;
    let conflicts = 0;
    const queuedAuditEvents = this.database.auditEvents.list().filter((event) => event.syncStatus === "Queued");
    if (queuedAuditEvents.length > 0) {
      try {
        await this.apis.audit.uploadAuditEvents(token, queuedAuditEvents);
        const syncedAt = nowIso();
        for (const event of queuedAuditEvents) {
          this.database.auditEvents.upsert({
            ...event,
            syncStatus: "Synced",
            lastSyncedAt: syncedAt,
            updatedAt: syncedAt,
          });
        }
        synced += queuedAuditEvents.length;
      } catch (error) {
        failed += queuedAuditEvents.length;
        this.audit.queue("mobile.sync_failed", { operation: "UPLOAD_AUDIT_EVENTS", message: friendlySyncError(error) });
      }
    }
    const attachmentResult = await this.attachments.uploadQueued(token);
    synced += attachmentResult.uploaded;
    failed += attachmentResult.failed;
    for (const item of pending) {
      if (item.operation === "UPLOAD_ATTACHMENT") {
        this.queue.markSynced(item.localId);
        continue;
      }
      this.queue.markSyncing(item.localId);
      try {
        if (item.operation === "CREATE_SUBMISSION" || item.operation === "SUBMIT_CORRECTION") {
          const draftLocalId = String(item.payload.draftLocalId ?? "");
          const draft = this.database.draftSubmissions.get(draftLocalId);
          if (!draft) {
            throw new Error("Queued draft was not found on this device.");
          }
          const result = await this.apis.submissions.uploadSubmission(token, draft);
          if (result.status !== "synced" || !result.serverSubmissionId) {
            throw new Error(result.message || "The server did not accept this submission.");
          }
          this.drafts.markSynced(draft.localId, result.serverSubmissionId, result.syncedAt ?? new Date().toISOString());
        }
        if (item.operation === "UPLOAD_AUDIT_EVENT") {
          await this.apis.audit.uploadAuditEvents(token, this.database.auditEvents.list().filter((event) => event.syncStatus === "Queued"));
        }
        if (item.operation === "MARK_NOTIFICATION_READ") {
          const notificationLocalId = String(item.payload.notificationLocalId ?? "");
          const notification = this.database.notifications.get(notificationLocalId);
          if (!notification) {
            throw new Error("Notification was not found on this device.");
          }
        }
        if (item.operation === "RESOLVE_CONFLICT") {
          const conflictLocalId = String(item.payload.conflictLocalId ?? "");
          const conflict = this.database.conflicts.get(conflictLocalId);
          if (!conflict) {
            throw new Error("Conflict was not found on this device.");
          }
        }
        this.queue.markSynced(item.localId);
        synced += 1;
      } catch (error) {
        failed += 1;
        const message = friendlySyncError(error);
        this.queue.markFailed(item.localId, message);
        if (item.operation === "CREATE_SUBMISSION" || item.operation === "SUBMIT_CORRECTION") {
          const draftLocalId = String(item.payload.draftLocalId ?? "");
          if (draftLocalId) {
            const failedDraft = this.drafts.markFailed(draftLocalId);
            if (error instanceof MobileApiError && (error.status === 409 || error.status === 412)) {
              conflicts += 1;
              this.conflicts.recordConflict({
                conflictType: error.status === 409 ? "SubmissionRejected" : "FormVersionChanged",
                localEntityType: "Submission",
                localEntityId: failedDraft.localId,
                summary: message,
                localValue: { draft: failedDraft },
                serverValue: typeof error.payload === "object" && error.payload !== null ? (error.payload as Record<string, unknown>) : { detail: message },
              });
            }
          }
        }
        this.audit.queue("mobile.sync_failed", { queueItemId: item.id, message });
      }
    }
    if (synced > 0) {
      this.audit.queue("mobile.submission_synced", { synced });
    }
    return this.finishLog(
      logLocalId,
      startedAt,
      mode,
      pending.length + attachmentResult.uploaded + attachmentResult.failed,
      synced,
      failed,
      failed > 0 ? `${synced} synced, ${failed} failed. Failed items can be retried.` : `${synced} item(s) synced successfully.`,
      conflicts,
    );
  }

  async retryFailed(): Promise<SyncRunResult> {
    return this.syncNow("RetryFailed");
  }

  async syncAutomatically(): Promise<SyncRunResult> {
    return this.syncNow("Automatic");
  }

  async syncInBackground(): Promise<SyncRunResult> {
    return this.syncNow("Background");
  }

  private finishLog(
    localId: string,
    startedAt: string,
    mode: SyncMode,
    processed: number,
    synced: number,
    failed: number,
    message: string,
    conflicts = 0,
  ): SyncRunResult {
    const completedAt = nowIso();
    this.database.syncLogs.upsert({
      id: localId,
      localId,
      serverId: null,
      startedAt,
      completedAt,
      mode,
      status: failed > 0 ? "CompletedWithErrors" : "Completed",
      processed,
      synced,
      failed,
      message,
      syncStatus: "Synced",
      createdAt: startedAt,
      updatedAt: completedAt,
      lastSyncedAt: completedAt,
      deviceId: null,
      conflictStatus: conflicts > 0 ? "PendingReview" : null,
      deletedAt: null,
    });
    return { processed, synced, failed, conflicts, message };
  }
}
