import type { MobileAssignment, MobileEntity, MobileForm, MobileFormVersion, MobileSubmission } from "@/models/contracts";
import { AuditEventService } from "@/services/auditEventService";
import { PrefillService } from "@/services/prefillService";
import { FormValidationIssue, FormValidationService } from "@/forms/formValidationService";
import { LocalDatabase } from "@/storage/localDatabase";
import { DraftSubmissionService } from "@/submissions/draftSubmissionService";
import { SyncQueueService } from "@/sync/syncQueue";
import { nowIso } from "@/utils/ids";

export type StartFormResult = {
  assignment: MobileAssignment;
  form: MobileForm;
  formVersion: MobileFormVersion;
  entity: MobileEntity | null;
  draft: MobileSubmission;
};

export type SubmitDraftResult = {
  draft: MobileSubmission;
  issues: FormValidationIssue[];
  queued: boolean;
};

export class DataCollectionSessionService {
  private readonly drafts: DraftSubmissionService;
  private readonly queue: SyncQueueService;
  private readonly prefill = new PrefillService();
  private readonly validation = new FormValidationService();
  private readonly audit: AuditEventService;

  constructor(private readonly database: LocalDatabase) {
    this.drafts = new DraftSubmissionService(database);
    this.queue = new SyncQueueService(database);
    this.audit = new AuditEventService(database);
  }

  startForm(assignmentLocalId: string, entityLocalId: string | null): StartFormResult {
    const assignment = this.database.assignments.get(assignmentLocalId);
    if (!assignment) {
      throw new Error("Assignment was not found on this device.");
    }
    if (!assignment.formId || !assignment.formVersionId) {
      throw new Error("This assignment does not have a published mobile form yet.");
    }
    const form = this.database.forms.list().find((item) => item.id === assignment.formId);
    const formVersion = this.database.formVersions.list().find((item) => item.id === assignment.formVersionId);
    if (!form || !formVersion) {
      throw new Error("The assigned form is not downloaded on this device. Sync and try again.");
    }
    const entity = entityLocalId ? this.database.entities.get(entityLocalId) : null;
    if (formVersion.entitySettings.requiresExistingEntity && !entity) {
      throw new Error("Select a beneficiary before opening this entity-linked form.");
    }
    const prefilled = entity ? this.prefill.createPrefill(entity, formVersion).responses : [];
    const draft = this.drafts.createDraft({
      projectId: assignment.projectId,
      assignmentId: assignment.id,
      formId: form.id,
      formVersionId: formVersion.id,
      entityId: entity?.id ?? null,
      entityType: entity?.entityType ?? formVersion.entitySettings.entityType,
      prefilledResponses: prefilled,
    });
    this.audit.queue("mobile.form_opened", { formId: form.id, assignmentId: assignment.id, entityId: entity?.id ?? null });
    return { assignment, form, formVersion, entity, draft };
  }

  answerQuestion(draftLocalId: string, questionId: string, variableName: string, value: unknown): MobileSubmission {
    const draft = this.drafts.updateResponse(draftLocalId, {
      questionId,
      variableName,
      value,
      updatedAt: nowIso(),
    });
    this.audit.queue("mobile.draft_saved", { draftLocalId, questionId });
    return draft;
  }

  submitDraft(draftLocalId: string): SubmitDraftResult {
    const draft = this.database.draftSubmissions.get(draftLocalId);
    if (!draft) {
      throw new Error("Draft submission was not found on this device.");
    }
    const formVersion = this.database.formVersions.list().find((item) => item.id === draft.formVersionId);
    if (!formVersion) {
      throw new Error("The form version for this draft is no longer available. Sync and try again.");
    }
    const issues = this.validation.validate(formVersion, draft);
    if (issues.some((issue) => issue.severity === "Error")) {
      return { draft, issues, queued: false };
    }
    const queuedDraft = this.drafts.markQueued(draftLocalId);
    this.queue.enqueue("CREATE_SUBMISSION", { draftLocalId: queuedDraft.localId });
    this.audit.queue("mobile.submission_queued", { draftLocalId: queuedDraft.localId, formId: queuedDraft.formId });
    return { draft: queuedDraft, issues, queued: true };
  }
}
