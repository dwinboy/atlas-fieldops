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
    const variableNames = new Map(
      formVersion.sections.flatMap((section) =>
        section.questions.map((question) => [question.id, question.variableName] as const),
      ),
    );
    const responses = mappings.map((mapping: PrefillMapping) => ({
      questionId: mapping.targetQuestionId,
      variableName: variableNames.get(mapping.targetQuestionId) ?? mapping.targetQuestionId,
      value: readEntityField(entity, mapping.sourceEntityField),
      updatedAt: nowIso(),
    }));
    return {
      responses,
      lockedQuestionIds: mappings.filter((mapping) => mapping.lockBehavior === "ReadOnly").map((mapping) => mapping.targetQuestionId),
      editableWithReasonQuestionIds: mappings
        .filter((mapping) => mapping.lockBehavior === "EditableWithReason")
        .map((mapping) => mapping.targetQuestionId),
    };
  }
}
