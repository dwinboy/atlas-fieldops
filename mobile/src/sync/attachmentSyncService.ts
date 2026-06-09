import { createMobileApis } from "@/api/mobileApis";
import type { MobileAttachment } from "@/models/contracts";
import { AuditEventService } from "@/services/auditEventService";
import { LocalDatabase } from "@/storage/localDatabase";
import { SyncQueueService } from "@/sync/syncQueue";
import { createLocalId, nowIso } from "@/utils/ids";

export type AttachmentInput = {
  submissionLocalId?: string;
  activityLocalId?: string;
  contextType?: MobileAttachment["contextType"];
  type: MobileAttachment["type"];
  localUri: string;
  mimeType: string;
  size: number;
  encrypted?: boolean;
};

export class AttachmentSyncService {
  private readonly queue: SyncQueueService;
  private readonly audit: AuditEventService;

  constructor(
    private readonly database: LocalDatabase,
    private readonly apis = createMobileApis(),
  ) {
    this.queue = new SyncQueueService(database);
    this.audit = new AuditEventService(database);
  }

  addAttachment(input: AttachmentInput): MobileAttachment {
    const timestamp = nowIso();
    const attachment: MobileAttachment = {
      id: createLocalId("attachment"),
      localId: createLocalId("attachment-local"),
      serverId: null,
      submissionLocalId: input.submissionLocalId ?? "",
      activityLocalId: input.activityLocalId ?? null,
      contextType: input.contextType ?? "Submission",
      type: input.type,
      localUri: input.localUri,
      remoteUrl: null,
      mimeType: input.mimeType,
      size: input.size,
      encrypted: input.encrypted ?? true,
      uploadProgress: 0,
      errorMessage: null,
      syncStatus: "Queued",
      createdAt: timestamp,
      updatedAt: timestamp,
      lastSyncedAt: null,
      deviceId: null,
      conflictStatus: null,
      deletedAt: null,
    };
    this.database.attachments.upsert(attachment);
    this.queue.enqueue("UPLOAD_ATTACHMENT", { attachmentLocalId: attachment.localId });
    this.audit.queue("mobile.attachment_queued", { attachmentLocalId: attachment.localId, type: attachment.type });
    return attachment;
  }

  async uploadQueued(token: string): Promise<{ uploaded: number; failed: number }> {
    let uploaded = 0;
    let failed = 0;
    for (const attachment of this.database.attachments.list().filter((item) => item.syncStatus === "Queued" || item.syncStatus === "Failed")) {
      try {
        this.database.attachments.upsert({ ...attachment, syncStatus: "Syncing", uploadProgress: 25, updatedAt: nowIso() });
        const syncingAttachment = { ...attachment, uploadProgress: 50 };
        const activity =
          attachment.contextType === "OperationalActivity" && attachment.activityLocalId
            ? this.database.visitRequests.get(attachment.activityLocalId)
            : null;
        if (attachment.contextType === "OperationalActivity" && !activity?.serverId) {
          throw new Error("Sync the operational activity before uploading its evidence.");
        }
        const result = activity?.serverId
          ? await this.apis.attachments.uploadActivityAttachment(token, activity.serverId, syncingAttachment, activity)
          : await this.apis.attachments.uploadAttachment(token, syncingAttachment);
        this.database.attachments.upsert({
          ...attachment,
          serverId: result.status === "accepted" ? (result.serverId ?? attachment.id) : attachment.serverId,
          syncStatus: "Synced",
          uploadProgress: 100,
          errorMessage: null,
          lastSyncedAt: nowIso(),
          updatedAt: nowIso(),
        });
        uploaded += 1;
      } catch (error) {
        this.database.attachments.upsert({
          ...attachment,
          syncStatus: "Failed",
          uploadProgress: 0,
          errorMessage: error instanceof Error ? error.message : "Attachment upload failed",
          updatedAt: nowIso(),
        });
        failed += 1;
      }
    }
    return { uploaded, failed };
  }
}
