import type { MobileSyncOperation, MobileSyncStatus } from "@/models/contracts";

export const syncStatuses: MobileSyncStatus[] = [
  "Pending",
  "NotSynced",
  "Queued",
  "Syncing",
  "Synced",
  "Failed",
  "Conflict",
  "ReturnedForCorrection",
  "Returned",
];

export const syncOperations: MobileSyncOperation[] = [
  "CREATE_SUBMISSION",
  "UPDATE_DRAFT",
  "UPLOAD_ATTACHMENT",
  "SUBMIT_CORRECTION",
  "UPLOAD_AUDIT_EVENT",
  "MARK_NOTIFICATION_READ",
  "RESOLVE_CONFLICT",
];
