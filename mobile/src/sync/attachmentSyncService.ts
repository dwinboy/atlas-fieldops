import { createMobileApis } from "@/api/mobileApis";
import type { MobileAttachment } from "@/models/contracts";
import { AuditEventService } from "@/services/auditEventService";
import { LocalDatabase } from "@/storage/localDatabase";
import { SyncQueueService } from "@/sync/syncQueue";
import { createLocalId, nowIso } from "@/utils/ids";

export type AttachmentInput = {
  submissionLocalId: string;
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
      submissionLocalId: input.submissionLocalId,
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
        const result = await this.apis.attachments.uploadAttachment(token, { ...attachment, uploadProgress: 50 });
        this.database.attachments.upsert({
          ...attachment,
          serverId: result.status === "accepted" ? attachment.id : attachment.serverId,
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
