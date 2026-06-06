export const localDatabaseSchema = `
CREATE TABLE IF NOT EXISTS mobile_session (
  local_id TEXT PRIMARY KEY NOT NULL,
  server_id TEXT,
  access_token TEXT,
  refresh_token TEXT,
  user_json TEXT NOT NULL,
  organization_json TEXT NOT NULL,
  sync_status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_synced_at TEXT,
  device_id TEXT,
  conflict_status TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS projects (
  local_id TEXT PRIMARY KEY NOT NULL,
  server_id TEXT,
  payload_json TEXT NOT NULL,
  sync_status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_synced_at TEXT,
  device_id TEXT,
  conflict_status TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS assignments (
  local_id TEXT PRIMARY KEY NOT NULL,
  server_id TEXT,
  project_id TEXT NOT NULL,
  form_id TEXT,
  payload_json TEXT NOT NULL,
  sync_status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_synced_at TEXT,
  device_id TEXT,
  conflict_status TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS entities (
  local_id TEXT PRIMARY KEY NOT NULL,
  server_id TEXT,
  entity_uid TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  sync_status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_synced_at TEXT,
  device_id TEXT,
  conflict_status TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS locations (
  local_id TEXT PRIMARY KEY,
  server_id TEXT,
  organization_id TEXT NOT NULL,
  parent_id TEXT,
  name TEXT NOT NULL,
  code TEXT,
  level TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  boundary_version_id TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  payload_json TEXT NOT NULL,
  sync_status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_synced_at TEXT,
  device_id TEXT,
  conflict_status TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS forms (
  local_id TEXT PRIMARY KEY NOT NULL,
  server_id TEXT,
  project_id TEXT,
  payload_json TEXT NOT NULL,
  sync_status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_synced_at TEXT,
  device_id TEXT,
  conflict_status TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS form_versions (
  local_id TEXT PRIMARY KEY NOT NULL,
  server_id TEXT,
  form_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  payload_json TEXT NOT NULL,
  sync_status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_synced_at TEXT,
  device_id TEXT,
  conflict_status TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS questions (
  local_id TEXT PRIMARY KEY NOT NULL,
  server_id TEXT,
  form_version_id TEXT NOT NULL,
  section_id TEXT NOT NULL,
  variable_name TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  sync_status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_synced_at TEXT,
  device_id TEXT,
  conflict_status TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS reference_lists (
  local_id TEXT PRIMARY KEY NOT NULL,
  server_id TEXT,
  slug TEXT NOT NULL,
  version INTEGER NOT NULL,
  payload_json TEXT NOT NULL,
  sync_status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_synced_at TEXT,
  device_id TEXT,
  conflict_status TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS reference_values (
  local_id TEXT PRIMARY KEY NOT NULL,
  server_id TEXT,
  reference_list_id TEXT NOT NULL,
  code TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  sync_status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_synced_at TEXT,
  device_id TEXT,
  conflict_status TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS draft_submissions (
  local_id TEXT PRIMARY KEY NOT NULL,
  server_id TEXT,
  project_id TEXT NOT NULL,
  assignment_id TEXT,
  form_id TEXT NOT NULL,
  form_version_id TEXT NOT NULL,
  entity_id TEXT,
  payload_json TEXT NOT NULL,
  sync_status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_synced_at TEXT,
  device_id TEXT,
  conflict_status TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS submission_responses (
  local_id TEXT PRIMARY KEY NOT NULL,
  draft_submission_local_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  variable_name TEXT NOT NULL,
  value_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS attachments (
  local_id TEXT PRIMARY KEY NOT NULL,
  server_id TEXT,
  submission_local_id TEXT NOT NULL,
  attachment_type TEXT NOT NULL,
  local_uri TEXT NOT NULL,
  remote_url TEXT,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  encrypted INTEGER NOT NULL DEFAULT 0,
  upload_progress INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  sync_status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_synced_at TEXT,
  device_id TEXT,
  conflict_status TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS conflicts (
  local_id TEXT PRIMARY KEY NOT NULL,
  server_id TEXT,
  conflict_type TEXT NOT NULL,
  local_entity_type TEXT NOT NULL,
  local_entity_id TEXT NOT NULL,
  server_entity_id TEXT,
  summary TEXT NOT NULL,
  local_value_json TEXT NOT NULL,
  server_value_json TEXT NOT NULL,
  resolution TEXT,
  resolved_at TEXT,
  sync_status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_synced_at TEXT,
  device_id TEXT,
  conflict_status TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS sync_queue (
  local_id TEXT PRIMARY KEY NOT NULL,
  server_id TEXT,
  operation TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL,
  retry_count INTEGER NOT NULL,
  last_attempt_at TEXT,
  error_message TEXT,
  sync_status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_synced_at TEXT,
  device_id TEXT,
  conflict_status TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS sync_logs (
  local_id TEXT PRIMARY KEY NOT NULL,
  sync_batch_id TEXT,
  mode TEXT NOT NULL DEFAULT 'Manual',
  status TEXT NOT NULL,
  processed INTEGER NOT NULL DEFAULT 0,
  synced INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  message TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  finished_at TEXT
);

CREATE TABLE IF NOT EXISTS notifications (
  local_id TEXT PRIMARY KEY NOT NULL,
  server_id TEXT,
  payload_json TEXT NOT NULL,
  read_at TEXT,
  sync_status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_synced_at TEXT,
  device_id TEXT,
  conflict_status TEXT,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);
CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(name);
CREATE INDEX IF NOT EXISTS idx_entities_project_ids ON entities(project_ids_json);
CREATE INDEX IF NOT EXISTS idx_drafts_status ON draft_submissions(status);
CREATE INDEX IF NOT EXISTS idx_attachments_status ON attachments(sync_status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_conflicts_status ON conflicts(sync_status);

CREATE TABLE IF NOT EXISTS audit_events (
  local_id TEXT PRIMARY KEY NOT NULL,
  server_id TEXT,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  sync_status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_synced_at TEXT,
  device_id TEXT,
  conflict_status TEXT,
  deleted_at TEXT
);
`;
