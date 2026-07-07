import type { MobileEntity, MobileFormVersion, MobileSubmissionResponse, PrefillMapping } from "@/models/contracts";
import { nowIso } from "@/utils/ids";

export type PrefillResult = {
  responses: MobileSubmissionResponse[];
  lockedQuestionIds: string[];
  editableWithReasonQuestionIds: string[];
};

function readEntityField(entity: MobileEntity, sourceField: string): unknown {
  const directFields: Record<string, unknown> = {
    name: entity.name,
    phone: entity.phone,
    gender: entity.gender,
    dateOfBirth: entity.dateOfBirth,
    householdId: entity.householdId,
    village: entity.location.village,
    community: entity.location.community,
    district: entity.location.district,
    region: entity.location.region,
    country: entity.location.country,
    gps: entity.gps.latitude != null && entity.gps.longitude != null
      ? {
          latitude: entity.gps.latitude,
          longitude: entity.gps.longitude,
          accuracy: entity.gps.accuracy,
        }
      : null,
    latitude: entity.gps.latitude,
    longitude: entity.gps.longitude,
  };
  return directFields[sourceField] ?? entity.profile[sourceField] ?? null;
}

export class PrefillService {
  createPrefill(entity: MobileEntity, formVersion: MobileFormVersion): PrefillResult {
    const mappings = formVersion.entitySettings.prefillMappings;
    const questionsById = new Map(
      formVersion.sections.flatMap((section) =>
        section.questions.map((question) => [question.id, question] as const),
      ),
    );
    const responses = mappings.flatMap((mapping: PrefillMapping) => {
      const question = questionsById.get(mapping.targetQuestionId);
      if (!question) return [];
      const value = readEntityField(entity, mapping.sourceEntityField);
      if (value === null || value === undefined || (typeof value === "string" && value.trim() === "")) return [];
      return [{
        questionId: question.id,
        variableName: question.variableName,
        value,
        updatedAt: nowIso(),
      }];
    });
    return {
      responses,
      lockedQuestionIds: mappings
        .filter((mapping) => mapping.lockBehavior === "ReadOnly" && questionsById.has(mapping.targetQuestionId))
        .map((mapping) => mapping.targetQuestionId),
      editableWithReasonQuestionIds: mappings
        .filter((mapping) => mapping.lockBehavior === "EditableWithReason" && questionsById.has(mapping.targetQuestionId))
        .map((mapping) => mapping.targetQuestionId),
    };
  }
}
