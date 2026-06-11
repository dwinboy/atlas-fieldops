import type { DuplicateCheckInput, FrequencyRule, MobileAssignment, MobileEntity, MobileForm, MobileFormVersion, MobileSubmission } from "@/models/contracts";
import { MobilePermissionService } from "@/permissions/mobilePermissionService";
import { AuditEventService } from "@/services/auditEventService";
import { DuplicateCheckService } from "@/services/duplicateCheckService";
import { FieldIntegrityService } from "@/services/fieldIntegrityService";
import { FrequencyRuleService } from "@/services/frequencyRuleService";
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
      frequencyPeriod: this.computeFrequencyPeriod(formVersion.entitySettings.frequencyRule, new Date()),
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
    const issues = [...this.validation.validate(formVersion, draft), ...this.evaluateRiskIssues(draft, formVersion)];
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
      const input = this.buildDuplicateCheckInput(draft);
      if (input.phone || input.nationalId || input.householdId || (input.name && input.village)) {
        const matches = this.duplicateCheck.check(input, this.database.entities.list(), entitySettings.duplicateThreshold);
        const topMatch = matches[0];
        if (topMatch) {
          issues.push({
            questionId: "_duplicate_check",
            label: "Possible duplicate beneficiary",
            message: `This record looks similar to an existing entry for ${topMatch.entity?.name ?? "a known beneficiary"} (matched on ${topMatch.matchedFields.join(", ")}).`,
            fixHint: "Double-check whether this person is already registered before submitting. The server will review this during sync either way.",
            severity: "Warning",
          });
        }
      }
    }
    return issues;
  }

  private buildDuplicateCheckInput(draft: MobileSubmission): DuplicateCheckInput {
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
    return null;
  }
}
