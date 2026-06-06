import { createMobileApis } from "@/api/mobileApis";
import type { MobileSyncPackage } from "@/models/contracts";
import { AuditEventService } from "@/services/auditEventService";
import { LocalDatabase } from "@/storage/localDatabase";

export class BootstrapSyncService {
  constructor(
    private readonly database: LocalDatabase,
    private readonly apis = createMobileApis(),
    private readonly audit = new AuditEventService(database),
  ) {}

  async syncAssignedWork(token: string): Promise<MobileSyncPackage> {
    const syncPackage = await this.apis.sync.syncPackage(token);

    for (const project of syncPackage.bootstrap.assignedProjects) {
      this.database.projects.upsert(this.database.importServerRecord(project));
    }
    for (const assignment of syncPackage.assignments) {
      this.database.assignments.upsert(this.database.importServerRecord(assignment));
    }
    for (const entity of syncPackage.entities) {
      this.database.entities.upsert(this.database.importServerRecord(entity));
    }
    for (const form of syncPackage.forms) {
      this.database.forms.upsert(this.database.importServerRecord(form));
    }
    for (const version of syncPackage.formVersions) {
      this.database.formVersions.upsert(this.database.importServerRecord(version));
    }
    for (const location of syncPackage.locations) {
      this.database.locations.upsert(this.database.importServerRecord(location));
    }
    for (const referenceList of syncPackage.referenceLists) {
      this.database.referenceLists.upsert(this.database.importServerRecord(referenceList));
    }
    for (const notification of syncPackage.notifications) {
      this.database.notifications.upsert(this.database.importServerRecord(notification));
    }

    this.audit.queue("mobile.bootstrap_synced", {
      assignments: syncPackage.assignments.length,
      forms: syncPackage.forms.length,
      entities: syncPackage.entities.length,
    });
    return syncPackage;
  }
}
