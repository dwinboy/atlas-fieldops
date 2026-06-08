import { createMobileApis } from "@/api/mobileApis";
import type { MobileSyncPackage } from "@/models/contracts";
import { AuditEventService } from "@/services/auditEventService";
import { LocalDatabase } from "@/storage/localDatabase";
import { ConflictService } from "@/sync/conflictService";

export class BootstrapSyncService {
  constructor(
    private readonly database: LocalDatabase,
    private readonly apis = createMobileApis(),
    private readonly audit = new AuditEventService(database),
    private readonly conflicts = new ConflictService(database),
  ) {}

  async syncAssignedWork(token: string): Promise<MobileSyncPackage> {
    const syncPackage = await this.apis.sync.syncPackage(token);
    const bootstrap = syncPackage.bootstrap;

    if (bootstrap.fieldOfficerProfile) {
      this.database.officerProfiles.upsert(this.database.importServerRecord(bootstrap.fieldOfficerProfile));
    }
    if (bootstrap.supervisor) {
      this.database.supervisorProfiles.upsert(this.database.importServerRecord(bootstrap.supervisor));
    }
    this.database.permissionSets.upsert(this.database.importServerRecord(bootstrap.permissionSet));
    this.database.mobileRules.upsert(this.database.importServerRecord(bootstrap.mobileRules));
    if (bootstrap.device) {
      this.database.deviceRecords.upsert(this.database.importServerRecord(bootstrap.device));
    }
    if (bootstrap.blockedState.blocked) {
      this.conflicts.recordConflict({
        conflictType: "AccountOrDeviceBlocked",
        localEntityType: "Account",
        localEntityId: bootstrap.user.id,
        summary: bootstrap.blockedState.reason ?? "This account or device is blocked for mobile collection.",
        localValue: { userId: bootstrap.user.id },
        serverValue: bootstrap.blockedState,
      });
    }

    for (const project of bootstrap.assignedProjects) {
      this.database.projects.upsert(this.database.importServerRecord(project));
    }
    for (const assignment of syncPackage.assignments) {
      this.database.assignments.upsert(this.database.importServerRecord(assignment));
      this.conflicts.detectAssignmentCancellation(assignment.id);
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
    for (const returnedSubmission of syncPackage.returnedSubmissions) {
      this.database.draftSubmissions.upsert(this.database.importServerRecord(returnedSubmission));
    }

    this.audit.queue("mobile.bootstrap_synced", {
      assignments: syncPackage.assignments.length,
      forms: syncPackage.forms.length,
      entities: syncPackage.entities.length,
      locations: syncPackage.locations.length,
      returnedSubmissions: syncPackage.returnedSubmissions.length,
    });
    return syncPackage;
  }
}
