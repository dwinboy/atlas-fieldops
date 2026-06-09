import { openDatabaseSync, type SQLiteDatabase } from "expo-sqlite";

import type {
  MobileAssignment,
  MobileAuditEvent,
  MobileAttachment,
  MobileConflictRecord,
  MobileDeviceRecord,
  MobileEntity,
  MobileForm,
  MobileFormVersion,
  MobileLocation,
  MobileNotification,
  MobileOfflineRules,
  MobileOfficerProfile,
  MobilePermissionSet,
  MobileProject,
  MobileReferenceList,
  MobileSupervisorProfile,
  MobileSubmission,
  MobileSyncLog,
  MobileSyncQueueItem,
  MobileVisitRequest,
} from "@/models/contracts";
import { nowIso } from "@/utils/ids";

type LocalCollectionMap = {
  assignments: MobileAssignment;
  attachments: MobileAttachment;
  auditEvents: MobileAuditEvent;
  conflicts: MobileConflictRecord;
  deviceRecords: MobileDeviceRecord;
  entities: MobileEntity;
  forms: MobileForm;
  formVersions: MobileFormVersion;
  locations: MobileLocation;
  mobileRules: MobileOfflineRules;
  notifications: MobileNotification;
  officerProfiles: MobileOfficerProfile;
  permissionSets: MobilePermissionSet;
  projects: MobileProject;
  referenceLists: MobileReferenceList;
  supervisorProfiles: MobileSupervisorProfile;
  visitRequests: MobileVisitRequest;
  draftSubmissions: MobileSubmission;
  syncLogs: MobileSyncLog;
  syncQueue: MobileSyncQueueItem;
};

export type LocalDatabaseSnapshot = { [K in keyof LocalCollectionMap]: LocalCollectionMap[K][] };

export class LocalRepository<T extends { localId: string }> {
  private readonly records = new Map<string, T>();

  constructor(private readonly onChange?: () => void) {}

  list(): T[] {
    return [...this.records.values()];
  }

  count(): number {
    return this.records.size;
  }

  page(limit: number, offset = 0): T[] {
    return this.list().slice(offset, offset + limit);
  }

  filter(predicate: (record: T) => boolean, limit = 100, offset = 0): T[] {
    return this.list().filter(predicate).slice(offset, offset + limit);
  }

  get(localId: string): T | null {
    return this.records.get(localId) ?? null;
  }

  upsert(record: T): T {
    this.records.set(record.localId, record);
    this.onChange?.();
    return record;
  }

  replaceAll(records: T[]): void {
    this.records.clear();
    for (const record of records) {
      this.records.set(record.localId, record);
    }
    this.onChange?.();
  }

  remove(localId: string): void {
    this.records.delete(localId);
    this.onChange?.();
  }
}

export class LocalDatabase {
  readonly assignments = new LocalRepository<LocalCollectionMap["assignments"]>(() => this.persistSnapshot());
  readonly attachments = new LocalRepository<LocalCollectionMap["attachments"]>(() => this.persistSnapshot());
  readonly auditEvents = new LocalRepository<LocalCollectionMap["auditEvents"]>(() => this.persistSnapshot());
  readonly conflicts = new LocalRepository<LocalCollectionMap["conflicts"]>(() => this.persistSnapshot());
  readonly deviceRecords = new LocalRepository<LocalCollectionMap["deviceRecords"]>(() => this.persistSnapshot());
  readonly entities = new LocalRepository<LocalCollectionMap["entities"]>(() => this.persistSnapshot());
  readonly forms = new LocalRepository<LocalCollectionMap["forms"]>(() => this.persistSnapshot());
  readonly formVersions = new LocalRepository<LocalCollectionMap["formVersions"]>(() => this.persistSnapshot());
  readonly locations = new LocalRepository<LocalCollectionMap["locations"]>(() => this.persistSnapshot());
  readonly mobileRules = new LocalRepository<LocalCollectionMap["mobileRules"]>(() => this.persistSnapshot());
  readonly notifications = new LocalRepository<LocalCollectionMap["notifications"]>(() => this.persistSnapshot());
  readonly officerProfiles = new LocalRepository<LocalCollectionMap["officerProfiles"]>(() => this.persistSnapshot());
  readonly permissionSets = new LocalRepository<LocalCollectionMap["permissionSets"]>(() => this.persistSnapshot());
  readonly projects = new LocalRepository<LocalCollectionMap["projects"]>(() => this.persistSnapshot());
  readonly referenceLists = new LocalRepository<LocalCollectionMap["referenceLists"]>(() => this.persistSnapshot());
  readonly supervisorProfiles = new LocalRepository<LocalCollectionMap["supervisorProfiles"]>(() => this.persistSnapshot());
  readonly visitRequests = new LocalRepository<LocalCollectionMap["visitRequests"]>(() => this.persistSnapshot());
  readonly draftSubmissions = new LocalRepository<LocalCollectionMap["draftSubmissions"]>(() => this.persistSnapshot());
  readonly syncLogs = new LocalRepository<LocalCollectionMap["syncLogs"]>(() => this.persistSnapshot());
  readonly syncQueue = new LocalRepository<LocalCollectionMap["syncQueue"]>(() => this.persistSnapshot());

  private persistence: SQLiteDatabase | null = null;
  private isRestoring = false;

  constructor() {
    this.initializePersistence();
    this.restorePersistedSnapshot();
  }

  importServerRecord<T extends { id: string }>(record: T): T & {
    localId: string;
    serverId: string;
    syncStatus: "Synced";
    createdAt: string;
    updatedAt: string;
    lastSyncedAt: string;
    deviceId: null;
    conflictStatus: null;
    deletedAt: null;
  } {
    const timestamp = nowIso();
    return {
      ...record,
      localId: record.id,
      serverId: record.id,
      syncStatus: "Synced",
      createdAt: timestamp,
      updatedAt: timestamp,
      lastSyncedAt: timestamp,
      deviceId: null,
      conflictStatus: null,
      deletedAt: null,
    };
  }

  exportSnapshot(): LocalDatabaseSnapshot {
    return {
      assignments: this.assignments.list(),
      attachments: this.attachments.list(),
      auditEvents: this.auditEvents.list(),
      conflicts: this.conflicts.list(),
      deviceRecords: this.deviceRecords.list(),
      entities: this.entities.list(),
      forms: this.forms.list(),
      formVersions: this.formVersions.list(),
      locations: this.locations.list(),
      mobileRules: this.mobileRules.list(),
      notifications: this.notifications.list(),
      officerProfiles: this.officerProfiles.list(),
      permissionSets: this.permissionSets.list(),
      projects: this.projects.list(),
      referenceLists: this.referenceLists.list(),
      supervisorProfiles: this.supervisorProfiles.list(),
      visitRequests: this.visitRequests.list(),
      draftSubmissions: this.draftSubmissions.list(),
      syncLogs: this.syncLogs.list(),
      syncQueue: this.syncQueue.list(),
    };
  }

  restoreSnapshot(snapshot: Partial<LocalDatabaseSnapshot>): void {
    this.isRestoring = true;
    try {
      this.assignments.replaceAll(snapshot.assignments ?? []);
      this.attachments.replaceAll(snapshot.attachments ?? []);
      this.auditEvents.replaceAll(snapshot.auditEvents ?? []);
      this.conflicts.replaceAll(snapshot.conflicts ?? []);
      this.deviceRecords.replaceAll(snapshot.deviceRecords ?? []);
      this.entities.replaceAll(snapshot.entities ?? []);
      this.forms.replaceAll(snapshot.forms ?? []);
      this.formVersions.replaceAll(snapshot.formVersions ?? []);
      this.locations.replaceAll(snapshot.locations ?? []);
      this.mobileRules.replaceAll(snapshot.mobileRules ?? []);
      this.notifications.replaceAll(snapshot.notifications ?? []);
      this.officerProfiles.replaceAll(snapshot.officerProfiles ?? []);
      this.permissionSets.replaceAll(snapshot.permissionSets ?? []);
      this.projects.replaceAll(snapshot.projects ?? []);
      this.referenceLists.replaceAll(snapshot.referenceLists ?? []);
      this.supervisorProfiles.replaceAll(snapshot.supervisorProfiles ?? []);
      this.visitRequests.replaceAll(snapshot.visitRequests ?? []);
      this.draftSubmissions.replaceAll(snapshot.draftSubmissions ?? []);
      this.syncLogs.replaceAll(snapshot.syncLogs ?? []);
      this.syncQueue.replaceAll(snapshot.syncQueue ?? []);
    } finally {
      this.isRestoring = false;
    }
    this.persistSnapshot();
  }

  initialize(): { ready: true; collections: string[] } {
    return {
      ready: true,
      collections: [
        "projects",
        "assignments",
        "attachments",
        "conflicts",
        "deviceRecords",
        "entities",
        "forms",
        "formVersions",
        "locations",
        "mobileRules",
        "referenceLists",
        "officerProfiles",
        "permissionSets",
        "supervisorProfiles",
        "visitRequests",
        "draftSubmissions",
        "syncLogs",
        "syncQueue",
        "notifications",
        "auditEvents",
      ],
    };
  }

  private initializePersistence(): void {
    try {
      this.persistence = openDatabaseSync("atlas-fieldops-mobile.db");
      this.persistence.execSync(`
        CREATE TABLE IF NOT EXISTS local_snapshot (
          id TEXT PRIMARY KEY NOT NULL,
          payload_json TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
    } catch {
      this.persistence = null;
    }
  }

  private restorePersistedSnapshot(): void {
    if (!this.persistence) return;
    try {
      const row = this.persistence.getFirstSync<{ payload_json: string }>(
        "SELECT payload_json FROM local_snapshot WHERE id = ?",
        "current",
      );
      if (!row?.payload_json) return;
      const parsed = JSON.parse(row.payload_json) as Partial<LocalDatabaseSnapshot>;
      this.restoreSnapshot(parsed);
    } catch {
      // If local storage is corrupted, keep the app usable. The next sync can
      // rebuild assigned work; queued data remains protected unless explicitly cleared.
    }
  }

  private persistSnapshot(): void {
    if (this.isRestoring || !this.persistence) return;
    try {
      this.persistence.runSync(
        "INSERT OR REPLACE INTO local_snapshot (id, payload_json, updated_at) VALUES (?, ?, ?)",
        "current",
        JSON.stringify(this.exportSnapshot()),
        nowIso(),
      );
    } catch {
      // Persistence failure should not block field collection during this app run.
    }
  }
}

export const localDatabase = new LocalDatabase();
