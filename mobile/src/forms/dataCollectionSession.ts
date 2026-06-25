import type { DuplicateCheckInput, FrequencyRule, MobileAssignment, MobileEntity, MobileForm, MobileFormVersion, MobileQuestion, MobileSubmission } from "@/models/contracts";
import { entityMatchesFormEntityScope, requiresEntitySelection } from "@/entities/entityCategoryUtils";
import { MobilePermissionService } from "@/permissions/mobilePermissionService";
import { AuditEventService } from "@/services/auditEventService";
import { DuplicateCheckService } from "@/services/duplicateCheckService";
import { FieldIntegrityService } from "@/services/fieldIntegrityService";
import { FrequencyRuleService } from "@/services/frequencyRuleService";
import { PrefillService, type PrefillResult } from "@/services/prefillService";
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

type EntityWorkflowMessage = {
  label: string;
  missingSelectionHint: string;
  missingSubmissionHint: string;
};

export class DataCollectionSessionService {
  private readonly drafts: DraftSubmissionService;
  private readonly queue: SyncQueueService;
  private readonly prefill = new PrefillService();
  private readonly validation = new FormValidationService();
  private readonly integrity = new FieldIntegrityService();
  private readonly frequencyRules = new FrequencyRuleService();
  private readonly duplicateCheck = new DuplicateCheckService();
  private readonly permissions: MobilePermissionService;
  private readonly audit: AuditEventService;

  constructor(private readonly database: LocalDatabase) {
    this.drafts = new DraftSubmissionService(database);
    this.queue = new SyncQueueService(database);
    this.permissions = new MobilePermissionService(database);
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
    const permission = this.permissions.canStartCollection(assignment, formVersion);
    if (!permission.allowed) {
      this.audit.queue("mobile.permission_denied", {
        assignmentId: assignment.id,
        formId: form.id,
        reason: permission.message,
      });
      throw new Error(permission.message ?? "You are not allowed to collect data for this form.");
    }
    const entity = entityLocalId ? this.database.entities.get(entityLocalId) : null;
    if (entity && assignment.entityIds.length > 0 && !assignment.entityIds.includes(entity.id)) {
      throw new Error("This record is not assigned to you for this form. Sync again or ask your supervisor to update the assignment.");
    }
    if (entity && !this.entityMatchesForm(entity, formVersion)) {
      throw new Error(`This record does not match the ${this.entityLabel(formVersion)} category required for this form.`);
    }
    const entityWorkflow = this.entityWorkflowMessage(formVersion);
    if (requiresEntitySelection(formVersion.entitySettings) && !entity) {
      throw new Error(entityWorkflow.missingSelectionHint);
    }
    const prefillResult = entity ? this.prefill.createPrefill(entity, formVersion) : null;
    const prefilled = prefillResult?.responses ?? [];
    const adjustedFormVersion = prefillResult
      ? this.applyPrefillRules(formVersion, prefillResult)
      : formVersion;
    const draft = this.drafts.createDraft({
      projectId: assignment.projectId,
      assignmentId: assignment.id,
      formId: form.id,
      formVersionId: formVersion.id,
      entityId: entity?.id ?? null,
      linkedEntityIds: entity ? [...new Set([...entity.parentEntityIds, ...entity.childEntityIds])] : [],
      entityType: entity?.entityType ?? formVersion.entitySettings.entityType,
      prefilledResponses: prefilled,
      frequencyPeriod: this.computeFrequencyPeriod(formVersion.entitySettings.frequencyRule, new Date()),
    });
    this.audit.queue("mobile.form_opened", { formId: form.id, assignmentId: assignment.id, entityId: entity?.id ?? null });
    return { assignment, form, formVersion: adjustedFormVersion, entity, draft };
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
    const assignment = draft.assignmentId ? this.database.assignments.list().find((item) => item.id === draft.assignmentId) : null;
    if (assignment) {
      const permission = this.permissions.canStartCollection(assignment, formVersion);
      if (!permission.allowed) {
        this.audit.queue("mobile.permission_denied", {
          draftLocalId,
          assignmentId: assignment.id,
          reason: permission.message,
        });
        throw new Error(permission.message ?? "This draft cannot be submitted under the current mobile rules.");
      }
    }
    const issues = [
      ...this.validation.validate(formVersion, draft, this.database.referenceLists.list()),
      ...this.evaluateRiskIssues(draft, formVersion),
    ];
    if (issues.some((issue) => issue.severity === "Error")) {
      return { draft, issues, queued: false };
    }
    const integritySignals = this.integrity.evaluate(draft, formVersion, assignment ?? null);
    const integrityDraft = this.drafts.updateIntegritySignals(draftLocalId, integritySignals);
    const queuedDraft = this.drafts.markQueued(integrityDraft.localId);
    this.queue.enqueue("CREATE_SUBMISSION", { draftLocalId: queuedDraft.localId });
    this.audit.queue("mobile.submission_queued", {
      draftLocalId: queuedDraft.localId,
      formId: queuedDraft.formId,
      integrityRiskLevel: integritySignals.riskLevel,
      integrityScore: integritySignals.score,
      signalCount: integritySignals.signals.length,
    });
    return { draft: queuedDraft, issues, queued: true };
  }

  evaluateRiskIssues(draft: MobileSubmission, formVersion: MobileFormVersion): FormValidationIssue[] {
    const issues: FormValidationIssue[] = [];
    const entitySettings = formVersion.entitySettings;
    const entityWorkflow = this.entityWorkflowMessage(formVersion);
    if (requiresEntitySelection(entitySettings) && !draft.entityId) {
      issues.push({
        questionId: "_entity_link",
        label: "Entity selection",
        message: entityWorkflow.missingSubmissionHint,
        fixHint: `Go back to entity selection, pick the right ${entityWorkflow.label.toLowerCase()}, then continue the form.`,
        severity: "Error",
      });
    }
    if (draft.entityId) {
      const decision = this.frequencyRules.validate(
        entitySettings.frequencyRule,
        draft,
        this.database.draftSubmissions.list(),
        new Date(),
      );
      if (!decision.allowed) {
        issues.push({
          questionId: "_frequency_check",
          label: "Submission frequency",
          message: decision.reason,
          fixHint: "This entity does not qualify for another submission on this form right now. Confirm with your supervisor if you believe this is incorrect.",
          severity: decision.severity === "Warn" ? "Warning" : "Error",
        });
      }
    }
    if (entitySettings.createsNewEntity && !draft.entityId) {
      const input = this.buildDuplicateCheckInput(draft, formVersion);
      if (input.phone || input.nationalId || input.householdId || (input.name && input.village)) {
        const matches = this.duplicateCheck.check(input, this.entityCandidates(formVersion), entitySettings.duplicateThreshold);
        const topMatch = matches[0];
        if (topMatch) {
          issues.push({
            questionId: "_duplicate_check",
            label: `Possible duplicate ${this.entityLabel(formVersion)}`,
            message: `This record looks similar to an existing entry for ${topMatch.entity?.name ?? `a known ${this.entityLabel(formVersion)}`} (matched on ${topMatch.matchedFields.join(", ")}).`,
            fixHint: "Double-check whether this entity record is already registered before submitting. The server will review this during sync either way.",
            severity: "Warning",
          });
        }
      }
    }
    return issues;
  }

  private buildDuplicateCheckInput(draft: MobileSubmission, formVersion: MobileFormVersion): DuplicateCheckInput {
    const values = new Map(draft.responses.map((response) => [response.variableName.toLowerCase(), response.value]));
    const stringValue = (...keys: string[]): string | undefined => {
      for (const key of keys) {
        const value = values.get(key);
        if (typeof value === "string" && value.trim().length > 0) {
          return value.trim();
        }
      }
      return undefined;
    };
    const firstName = stringValue("first_name", "firstname");
    const lastName = stringValue("last_name", "lastname", "surname");
    const name = stringValue("full_name", "farmer_name", "beneficiary_name", "respondent", "name")
      ?? (firstName && lastName ? `${firstName} ${lastName}` : undefined);
    return {
      phone: stringValue("phone_number", "phone", "mobile", "farmer_phone"),
      nationalId: stringValue("national_id", "nationalid", "id_number"),
      householdId: stringValue("household_id", "householdid", "household"),
      village: stringValue("village", "community"),
      name,
      customIdentifiers: this.customDuplicateIdentifiers(formVersion, values),
    };
  }

  private customDuplicateIdentifiers(
    formVersion: MobileFormVersion,
    values: Map<string, unknown>,
  ): Array<{ fieldKey: string; label: string; value: string }> {
    const categoryId = formVersion.entitySettings.entityCategoryId;
    const category = categoryId ? this.database.entityCategories.list().find((item) => item.id === categoryId) : null;
    if (!category) return [];
    return category.attributes
      .filter((attribute) => /(^|_)(id|code|uid|number|registration|license)(_|$)/i.test(attribute.fieldKey))
      .map((attribute) => {
        const value = values.get(attribute.fieldKey.toLowerCase());
        return typeof value === "string" && value.trim()
          ? { fieldKey: attribute.fieldKey, label: attribute.label, value: value.trim() }
          : null;
      })
      .filter((item): item is { fieldKey: string; label: string; value: string } => Boolean(item));
  }

  private entityLabel(formVersion: MobileFormVersion): string {
    const categoryId = formVersion.entitySettings.entityCategoryId;
    const category = categoryId ? this.database.entityCategories.list().find((item) => item.id === categoryId) : null;
    return (category?.name ?? formVersion.entitySettings.entityType ?? "entity").toLowerCase();
  }

  private entityWorkflowMessage(formVersion: MobileFormVersion): EntityWorkflowMessage {
    const label = this.entityLabel(formVersion);
    const explicitMode = formVersion.entitySettings.respondentIdentityMode;
    const createsNewEntity = formVersion.entitySettings.createsNewEntity;
    const updatesExistingEntity = formVersion.entitySettings.updatesExistingEntity;
    const requiresExistingEntity = formVersion.entitySettings.requiresExistingEntity;
    const linkedToEntity = formVersion.entitySettings.linkedToEntity;
    const mode =
      explicitMode
        ? explicitMode
        : createsNewEntity && updatesExistingEntity
          ? "existing_or_new"
          : createsNewEntity
            ? "new_registration"
            : updatesExistingEntity || requiresExistingEntity
              ? "existing_beneficiary"
              : linkedToEntity
                ? null
                : "anonymous_allowed";
    if (mode === "existing_beneficiary") {
      return {
        label,
        missingSelectionHint: `Search for and select an existing ${label} before opening this follow-up form.`,
        missingSubmissionHint: `Select an existing ${label} before submitting this follow-up record.`,
      };
    }
    if (mode === "existing_or_new") {
      return {
        label,
        missingSelectionHint: `Search for the right ${label} first. If it does not exist, continue without one to register a new ${label}.`,
        missingSubmissionHint: `Choose the existing ${label} you are updating, or return to continue without one if this submission should register a new ${label}.`,
      };
    }
    if (mode === "new_registration" || mode === "anonymous_allowed") {
      return {
        label,
        missingSelectionHint: `You can continue without selecting a ${label} first for this workflow.`,
        missingSubmissionHint: `This workflow can continue without linking an existing ${label} record first.`,
      };
    }
    return {
      label,
      missingSelectionHint: `Select a ${label} before opening this form.`,
      missingSubmissionHint: `Select a ${label} before submitting this record.`,
    };
  }

  private entityCandidates(formVersion: MobileFormVersion): MobileEntity[] {
    return this.database.entities.list().filter((entity) => this.entityMatchesForm(entity, formVersion));
  }

  private entityMatchesForm(entity: MobileEntity, formVersion: MobileFormVersion): boolean {
    return entityMatchesFormEntityScope(entity, formVersion, this.database.entityCategories.list());
  }

  private applyPrefillRules(
    formVersion: MobileFormVersion,
    prefillResult: PrefillResult,
  ): MobileFormVersion {
    const locked = new Set(prefillResult.lockedQuestionIds);
    const editableWithReason = new Set(prefillResult.editableWithReasonQuestionIds);
    const valuesByQuestionId = new Map(
      prefillResult.responses.map((response) => [response.questionId, response.value]),
    );
    const applyQuestion = (question: MobileQuestion): MobileQuestion => {
      const prefilledValue = valuesByQuestionId.get(question.id);
      const nextQuestion: MobileQuestion = {
        ...question,
        defaultValue: prefilledValue ?? question.defaultValue,
      };
      if (locked.has(question.id)) {
        nextQuestion.readOnly = true;
        nextQuestion.mobileControls = {
          ...question.mobileControls,
          blockedHelp: question.mobileControls?.blockedHelp ?? "This value is prefilled from the entity profile and locked for this form.",
        };
      } else if (editableWithReason.has(question.id)) {
        nextQuestion.governanceControls = {
          ...question.governanceControls,
          changeReasonRequired: true,
        };
        nextQuestion.mobileControls = {
          ...question.mobileControls,
          blockedHelp: question.mobileControls?.blockedHelp ?? "If you change this prefilled value, record the reason before submitting.",
        };
      }
      return nextQuestion;
    };

    return {
      ...formVersion,
      sections: formVersion.sections.map((section) => ({
        ...section,
        questions: section.questions.map(applyQuestion),
      })),
    };
  }

  private computeFrequencyPeriod(rule: FrequencyRule, now: Date): string | null {
    if (rule === "OncePerYearPerEntity") {
      return `${now.getUTCFullYear()}`;
    }
    if (rule === "OncePerQuarterPerEntity") {
      const quarter = Math.floor(now.getUTCMonth() / 3) + 1;
      return `${now.getUTCFullYear()}-Q${quarter}`;
    }
    if (rule === "OncePerMonthPerEntity") {
      return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    }
    return null;
  }
}
