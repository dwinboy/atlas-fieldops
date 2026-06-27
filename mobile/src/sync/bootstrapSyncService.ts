import { createMobileApis } from "@/api/mobileApis";
import type { MobileEntityCategory, MobileSubmission, MobileSyncPackage } from "@/models/contracts";
import { normalizeEntityCategoryRecord } from "@/entities/entityCategoryUtils";
import { buildSubmissionAttachments, deriveSubmissionLocation } from "@/submissions/draftSubmissionService";
import { AuditEventService } from "@/services/auditEventService";
import { LocalDatabase } from "@/storage/localDatabase";
import { ConflictService } from "@/sync/conflictService";
import { nowIso } from "@/utils/ids";

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
    if (!bootstrap?.user?.id) {
      throw new Error("Mobile setup is incomplete for this account. Ask your administrator to refresh the field officer profile and mobile access.");
    }
    if (!bootstrap.permissionSet?.id || !bootstrap.mobileRules?.id || !bootstrap.blockedState) {
      throw new Error("Mobile permissions are not ready for this field officer. Ask your administrator to review mobile access settings.");
    }

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
    for (const entityCategory of syncPackage.entityCategories) {
      this.database.entityCategories.upsert(this.database.importServerRecord(normalizeEntityCategoryRecord(entityCategory)));
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
    try {
      const visitRequests = await this.apis.visitRequests.list(token);
      for (const visitRequest of visitRequests) {
        this.database.visitRequests.upsert(visitRequest);
      }
    } catch {
      this.audit.queue("mobile.sync_failed", {
        operation: "DOWNLOAD_VISIT_REQUESTS",
        message: "Visit requests could not be refreshed. Existing approved visits remain on this device.",
      });
    }
    for (const returnedSubmission of syncPackage.returnedSubmissions) {
      this.database.draftSubmissions.upsert(this.hydrateReturnedSubmission(returnedSubmission));
    }
    this.database.linkedRecords.replaceAll(
      (syncPackage.linkedRecords ?? []).map((record) => this.database.importServerRecord(record)),
    );
    for (const submissionStatus of syncPackage.submissionStatuses) {
      const draft = this.database.draftSubmissions.get(submissionStatus.clientSubmissionId);
      if (!draft) continue;
      this.database.draftSubmissions.upsert({
        ...draft,
        reviewStatus: submissionStatus.reviewStatus,
        reviewComments: submissionStatus.reviewComments,
        reviewedAt: submissionStatus.reviewedAt,
        approvedAt: submissionStatus.approvedAt,
        updatedAt: nowIso(),
      });
    }

    this.audit.queue("mobile.bootstrap_synced", {
      assignments: syncPackage.assignments.length,
      forms: syncPackage.forms.length,
      entities: syncPackage.entities.length,
      entityCategories: syncPackage.entityCategories.length,
      locations: syncPackage.locations.length,
      returnedSubmissions: syncPackage.returnedSubmissions.length,
    });
    return syncPackage;
  }

  /**
   * The server's returned-submission payload only carries the review fields and responses — it
   * omits the device-side draft fields (linkedEntityIds, attachments, location). Importing it as-is
   * produced a draft with `linkedEntityIds === undefined`, which crashed the form-fill screen the
   * moment a field officer tapped a returned submission to correct it (it read on as a logout).
   * Hydrate it into a complete draft so it opens, edits, and re-uploads like any other draft.
   */
  private hydrateReturnedSubmission(record: MobileSubmission): MobileSubmission {
    const imported = this.database.importServerRecord(record);
    const responses = Array.isArray(record.responses) ? record.responses : [];
    return {
      ...imported,
      linkedEntityIds: Array.isArray(record.linkedEntityIds) ? record.linkedEntityIds : [],
      entityType: record.entityType ?? null,
      attachments: buildSubmissionAttachments(imported.localId, responses, [], imported.updatedAt),
      location: deriveSubmissionLocation(responses),
      submittedAt: record.submittedAt ?? null,
      appVersion: record.appVersion ?? null,
      integritySignals: record.integritySignals ?? null,
      reviewStatus: record.reviewStatus ?? "returned",
      syncStatus: "ReturnedForCorrection",
    };
  }
}
