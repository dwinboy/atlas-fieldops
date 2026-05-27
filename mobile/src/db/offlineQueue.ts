export type OfflineSubmission = {
  id: string;
  organizationId: string;
  formId: string;
  payloadJson: string;
  syncStatus: "pending" | "syncing" | "synced" | "failed";
  createdAt: string;
};

export const offlineQueueSchema = `
CREATE TABLE IF NOT EXISTS offline_submissions (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL,
  form_id TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  sync_status TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`;

