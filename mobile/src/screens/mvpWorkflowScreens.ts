import { buildAssignmentList } from "@/assignments/assignmentModels";
import { entityMatchesFormEntityScope } from "@/entities/entityCategoryUtils";
import type { FormValidationIssue } from "@/forms/formValidationService";
import { FormValidationService } from "@/forms/formValidationService";
import type { MobileAppState } from "@/state/mobileAppState";
import { LocalDatabase } from "@/storage/localDatabase";

export type AssignmentDetailModel = {
  title: string;
  projectName: string;
  formName: string;
  targetProgress: string;
  entityCount: number;
  canStartForm: boolean;
  emptyState: string | null;
};

export type EntitySelectionModel = {
  title: string;
  entities: Array<{
    localId: string;
    entityUid: string;
    name: string;
    location: string;
    phone: string | null;
    hierarchySummary: string | null;
  }>;
  emptyState: string | null;
};

export type FormFillModel = {
  title: string;
  sectionTitle: string;
  questionCount: number;
  progressLabel: string;
  issues: FormValidationIssue[];
};

export type SyncCenterModel = {
  title: string;
  onlineLabel: string;
  pendingUploads: number;
  failedUploads: number;
  syncedSubmissions: number;
  downloadedAssignments: number;
  downloadedForms: number;
  referenceDataStatus: string;
};

export function assignmentListModel(state: MobileAppState) {
  return buildAssignmentList(state.assignments);
}

export function assignmentDetailModel(database: LocalDatabase, assignmentLocalId: string): AssignmentDetailModel {
  const assignment = database.assignments.get(assignmentLocalId);
  if (!assignment) {
    return {
      title: "Assignment not found",
      projectName: "-",
      formName: "-",
      targetProgress: "0 / 0",
      entityCount: 0,
      canStartForm: false,
      emptyState: "Sync assigned work and try again.",
    };
  }
  const project = database.projects.list().find((item) => item.id === assignment.projectId);
  const form = assignment.formId ? database.forms.list().find((item) => item.id === assignment.formId) : null;
  return {
    title: "Assignment Detail",
    projectName: project?.name ?? "Assigned project",
    formName: form?.name ?? "No published form downloaded",
    targetProgress: `${assignment.completedCount} / ${assignment.targetCount}`,
    entityCount: assignment.entityIds.length,
    canStartForm: Boolean(form && assignment.formVersionId),
    emptyState: form ? null : "No published mobile-ready form is available for this assignment yet.",
  };
}

export function entitySelectionModel(database: LocalDatabase, assignmentLocalId: string, query = ""): EntitySelectionModel {
  const assignment = database.assignments.get(assignmentLocalId);
  if (!assignment) {
    return { title: "Select entity", entities: [], emptyState: "Assignment not found on this device." };
  }
  const normalized = query.trim().toLowerCase();
  const formVersion = assignment.formVersionId ? database.formVersions.get(assignment.formVersionId) : null;
  const categories = database.entityCategories.list();
  const entities = database.entities
    .list()
    .filter((entity) => assignment.entityIds.includes(entity.id))
    .filter((entity) => !formVersion || entityMatchesFormEntityScope(entity, formVersion, categories))
    .filter((entity) => {
      if (!normalized) {
        return true;
      }
      return [entity.entityUid, entity.name, entity.phone, entity.householdId, entity.location.village, entity.location.community]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized));
    })
    .map((entity) => ({
      localId: entity.localId,
      entityUid: entity.entityUid,
      name: entity.name,
      location: entity.location.village ?? entity.location.community ?? entity.location.district ?? "No location",
      phone: entity.phone,
      hierarchySummary:
        entity.parentEntityIds.length || entity.childEntityIds.length
          ? [
              entity.parentEntityIds.length ? `${entity.parentEntityIds.length} parent` : null,
              entity.childEntityIds.length ? `${entity.childEntityIds.length} child` : null,
            ]
              .filter(Boolean)
              .join(" · ")
          : null,
    }));
  return {
    title: "Select entity",
    entities,
    emptyState: entities.length === 0 ? "No assigned records found. Sync or create a new registration if the form allows it." : null,
  };
}

export function formFillModel(database: LocalDatabase, draftLocalId: string): FormFillModel {
  const draft = database.draftSubmissions.get(draftLocalId);
  if (!draft) {
    return { title: "Form draft", sectionTitle: "Draft missing", questionCount: 0, progressLabel: "0%", issues: [] };
  }
  const form = database.forms.list().find((item) => item.id === draft.formId);
  const formVersion = database.formVersions.list().find((item) => item.id === draft.formVersionId);
  if (!formVersion) {
    return { title: form?.name ?? "Form draft", sectionTitle: "Form version missing", questionCount: 0, progressLabel: "0%", issues: [] };
  }
  const validation = new FormValidationService();
  const progress = validation.progress(formVersion, draft, database.referenceLists.list());
  return {
    title: form?.name ?? "Form draft",
    sectionTitle: formVersion.sections[0]?.title ?? "Questions",
    questionCount: progress.total,
    progressLabel: `${progress.percent}% complete`,
    issues: validation.validateRequired(formVersion, draft, database.referenceLists.list()),
  };
}

export function syncCenterModel(state: MobileAppState): SyncCenterModel {
  return {
    title: "Sync Center",
    onlineLabel: state.network.isOnline ? "Online" : "Offline",
    pendingUploads: state.syncQueue.filter((item) => item.status === "Queued" || item.status === "Syncing").length,
    failedUploads: state.syncQueue.filter((item) => item.status === "Failed").length,
    syncedSubmissions: state.drafts.filter((draft) => draft.status === "Synced").length,
    downloadedAssignments: state.assignments.length,
    downloadedForms: state.forms.length,
    referenceDataStatus: "Downloaded reference lists are stored for offline use.",
  };
}
