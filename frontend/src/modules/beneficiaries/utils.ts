import type { FieldOfficerRead, ProjectListItemRead, SubmissionRead } from "@/lib/api";
import type {
  BeneficiaryEntity,
  DuplicateCandidate,
  EntityRegistrationDraft,
} from "@/modules/beneficiaries/data";

function compact(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function digits(value: string | undefined): string {
  return (value ?? "").replace(/\D+/g, "");
}

function roughDistanceMeters(
  latitudeA?: number,
  longitudeA?: number,
  latitudeB?: number,
  longitudeB?: number,
): number | null {
  if (
    latitudeA === undefined ||
    longitudeA === undefined ||
    latitudeB === undefined ||
    longitudeB === undefined
  ) {
    return null;
  }
  const latMeters = (latitudeA - latitudeB) * 111_320;
  const longMeters =
    (longitudeA - longitudeB) *
    111_320 *
    Math.cos(((latitudeA + latitudeB) / 2) * (Math.PI / 180));
  return Math.sqrt(latMeters * latMeters + longMeters * longMeters);
}

export function scoreDuplicate(
  draft: EntityRegistrationDraft,
  entity: BeneficiaryEntity,
): DuplicateCandidate {
  let score = 0;
  const matchedFields: string[] = [];
  const draftName = compact(`${draft.firstName} ${draft.lastName}`);
  const entityName = compact(entity.fullName);
  const draftLat = Number.parseFloat(draft.latitude);
  const draftLong = Number.parseFloat(draft.longitude);
  const distance = roughDistanceMeters(
    Number.isFinite(draftLat) ? draftLat : undefined,
    Number.isFinite(draftLong) ? draftLong : undefined,
    entity.latitude,
    entity.longitude,
  );

  if (draft.nationalId && compact(draft.nationalId) === compact(entity.nationalId)) {
    score += 100;
    matchedFields.push("National ID");
  }
  if (draft.phoneNumber && digits(draft.phoneNumber) === digits(entity.phoneNumber)) {
    score += 80;
    matchedFields.push("Phone number");
  }
  if (draft.householdId && compact(draft.householdId) === compact(entity.householdId)) {
    score += 90;
    matchedFields.push("Household ID");
  }
  if (
    draftName &&
    draftName === entityName &&
    draft.dateOfBirth &&
    draft.dateOfBirth === entity.dateOfBirth
  ) {
    score += 75;
    matchedFields.push("Name + date of birth");
  }
  if (
    draftName &&
    (draftName === entityName || entityName.includes(draftName) || draftName.includes(entityName)) &&
    draft.village &&
    compact(draft.village) === compact(entity.village)
  ) {
    score += 60;
    matchedFields.push("Name + village");
  }
  if (distance !== null && distance <= 50) {
    score += 40;
    matchedFields.push(`GPS within ${Math.max(1, Math.round(distance))}m`);
  }

  const cappedScore = Math.min(score, 100);
  return {
    entity,
    level:
      cappedScore >= 90
        ? "Likely duplicate"
        : cappedScore >= 60
          ? "Possible duplicate"
          : "No strong duplicate",
    matchedFields,
    score: cappedScore,
  };
}

export function findDuplicateCandidates(
  draft: EntityRegistrationDraft,
  entities: BeneficiaryEntity[],
): DuplicateCandidate[] {
  return entities
    .map((entity) => scoreDuplicate(draft, entity))
    .filter((candidate) => candidate.score >= 40)
    .sort((left, right) => right.score - left.score);
}

export function generateEntityId(entityType: string, count: number): string {
  const prefix =
    entityType === "Farmer"
      ? "FRM"
      : entityType === "Household"
        ? "HH"
        : entityType === "Facility"
          ? "FAC"
          : entityType === "School"
            ? "SCH"
            : "BEN";
  return `${prefix}-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`;
}

export function entityFromDraft(
  draft: EntityRegistrationDraft,
  count: number,
): BeneficiaryEntity {
  const fullName =
    draft.entityType === "Facility" || draft.entityType === "School"
      ? draft.firstName.trim()
      : `${draft.firstName} ${draft.lastName}`.trim();
  const latitude = Number.parseFloat(draft.latitude);
  const longitude = Number.parseFloat(draft.longitude);
  return {
    assignedOfficer: "Unassigned",
    community: draft.community,
    consentStatus: draft.consentStatus,
    country: draft.country,
    dateOfBirth: draft.dateOfBirth || undefined,
    district: draft.district,
    duplicateStatus: "Clear",
    entityId: generateEntityId(draft.entityType, count),
    entityType: draft.entityType,
    firstName: draft.firstName,
    formsCompleted: 0,
    fullName,
    gender: draft.gender,
    householdId: draft.householdId || undefined,
    id: `entity-local-${Date.now()}`,
    lastName: draft.lastName,
    latitude: Number.isFinite(latitude) ? latitude : undefined,
    longitude: Number.isFinite(longitude) ? longitude : undefined,
    nationalId: draft.nationalId || undefined,
    phoneNumber: draft.phoneNumber || undefined,
    profileJson: {
      source: "Web",
      projectEnrollments: [
        {
          enrollmentDate: new Date().toISOString(),
          projectId: draft.projectId,
          status: "active",
        },
      ],
    },
    projectId: draft.projectId,
    projectName: draft.projectName,
    qualityFlags: 0,
    region: draft.region,
    registrationDate: new Date().toISOString(),
    registrationSource: "Web",
    status: "Active",
    village: draft.village,
  };
}

export function enrichEntity(
  entity: BeneficiaryEntity,
  submissions: SubmissionRead[],
  projects: Map<string, ProjectListItemRead>,
  officers: Map<string, FieldOfficerRead>,
): BeneficiaryEntity {
  const latestOfficerSubmission = [...submissions]
    .filter((submission) => submission.field_officer_id)
    .sort((left, right) => new Date(right.submitted_at).getTime() - new Date(left.submitted_at).getTime())[0];
  const assignedOfficer = latestOfficerSubmission
    ? officers.get(latestOfficerSubmission.field_officer_id as string)?.full_name ?? entity.assignedOfficer
    : entity.assignedOfficer;
  return {
    ...entity,
    assignedOfficer,
    formsCompleted: submissions.length,
    projectName: projects.get(entity.projectId)?.name ?? entity.projectName,
  };
}

export function formatEntityDate(value?: string): string {
  if (!value) return "Not recorded";
  return new Date(value).toLocaleDateString();
}

export function frequencyLabel(value: string): string {
  return value
    .replace(/^once_/, "Once ")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function toCsv(rows: Record<string, string | number | boolean | null | undefined>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return [
    headers.map(escape).join(","),
    ...rows.map((row) => headers.map((header) => escape(row[header])).join(",")),
  ].join("\n");
}
