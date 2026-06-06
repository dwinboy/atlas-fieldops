import type {
  MobileAssignment,
  MobileAuditEvent,
  MobileAttachment,
  MobileConflictRecord,
  MobileEntity,
  MobileForm,
  MobileFormVersion,
  MobileLocation,
  MobileNotification,
  MobileProject,
  MobileReferenceList,
  MobileSubmission,
  MobileSyncLog,
  MobileSyncQueueItem,
} from "@/models/contracts";
import { nowIso } from "@/utils/ids";

type LocalCollectionMap = {
  assignments: MobileAssignment;
  attachments: MobileAttachment;
  auditEvents: MobileAuditEvent;
  conflicts: MobileConflictRecord;
  entities: MobileEntity;
  forms: MobileForm;
  formVersions: MobileFormVersion;
  locations: MobileLocation;
  notifications: MobileNotification;
  projects: MobileProject;
  referenceLists: MobileReferenceList;
  draftSubmissions: MobileSubmission;
  syncLogs: MobileSyncLog;
  syncQueue: MobileSyncQueueItem;
};

export type LocalDatabaseSnapshot = { [K in keyof LocalCollectionMap]: LocalCollectionMap[K][] };

export class LocalRepository<T extends { localId: string }> {
  private readonly records = new Map<string, T>();

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
    return record;
  }

  replaceAll(records: T[]): void {
    this.records.clear();
    for (const record of records) {
      this.records.set(record.localId, record);
    }
  }

  remove(localId: string): void {
    this.records.delete(localId);
  }
}

export class LocalDatabase {
  readonly assignments = new LocalRepository<LocalCollectionMap["assignments"]>();
  readonly attachments = new LocalRepository<LocalCollectionMap["attachments"]>();
  readonly auditEvents = new LocalRepository<LocalCollectionMap["auditEvents"]>();
  readonly conflicts = new LocalRepository<LocalCollectionMap["conflicts"]>();
  readonly entities = new LocalRepository<LocalCollectionMap["entities"]>();
  readonly forms = new LocalRepository<LocalCollectionMap["forms"]>();
  readonly formVersions = new LocalRepository<LocalCollectionMap["formVersions"]>();
  readonly locations = new LocalRepository<LocalCollectionMap["locations"]>();
  readonly notifications = new LocalRepository<LocalCollectionMap["notifications"]>();
  readonly projects = new LocalRepository<LocalCollectionMap["projects"]>();
  readonly referenceLists = new LocalRepository<LocalCollectionMap["referenceLists"]>();
  readonly draftSubmissions = new LocalRepository<LocalCollectionMap["draftSubmissions"]>();
  readonly syncLogs = new LocalRepository<LocalCollectionMap["syncLogs"]>();
  readonly syncQueue = new LocalRepository<LocalCollectionMap["syncQueue"]>();

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
      entities: this.entities.list(),
      forms: this.forms.list(),
      formVersions: this.formVersions.list(),
      locations: this.locations.list(),
      notifications: this.notifications.list(),
      projects: this.projects.list(),
      referenceLists: this.referenceLists.list(),
      draftSubmissions: this.draftSubmissions.list(),
      syncLogs: this.syncLogs.list(),
      syncQueue: this.syncQueue.list(),
    };
  }

  restoreSnapshot(snapshot: Partial<LocalDatabaseSnapshot>): void {
    this.assignments.replaceAll(snapshot.assignments ?? []);
    this.attachments.replaceAll(snapshot.attachments ?? []);
    this.auditEvents.replaceAll(snapshot.auditEvents ?? []);
    this.conflicts.replaceAll(snapshot.conflicts ?? []);
    this.entities.replaceAll(snapshot.entities ?? []);
    this.forms.replaceAll(snapshot.forms ?? []);
    this.formVersions.replaceAll(snapshot.formVersions ?? []);
    this.locations.replaceAll(snapshot.locations ?? []);
    this.notifications.replaceAll(snapshot.notifications ?? []);
    this.projects.replaceAll(snapshot.projects ?? []);
    this.referenceLists.replaceAll(snapshot.referenceLists ?? []);
    this.draftSubmissions.replaceAll(snapshot.draftSubmissions ?? []);
    this.syncLogs.replaceAll(snapshot.syncLogs ?? []);
    this.syncQueue.replaceAll(snapshot.syncQueue ?? []);
  }

  initialize(): { ready: true; collections: string[] } {
    return {
      ready: true,
      collections: [
        "projects",
        "assignments",
        "attachments",
        "conflicts",
        "entities",
        "forms",
        "formVersions",
        "locations",
        "referenceLists",
        "draftSubmissions",
        "syncLogs",
        "syncQueue",
        "notifications",
        "auditEvents",
      ],
    };
  }
}

export const localDatabase = new LocalDatabase();
