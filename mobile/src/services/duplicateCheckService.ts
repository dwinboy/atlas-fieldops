import type { DuplicateCheckInput, DuplicateCheckResult, MobileEntity } from "@/models/contracts";

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export class DuplicateCheckService {
  check(input: DuplicateCheckInput, candidates: MobileEntity[]): DuplicateCheckResult[] {
    return candidates
      .map((entity) => {
        const matchedFields: string[] = [];
        let score = 0;
        if (input.entityUid && normalize(input.entityUid) === normalize(entity.entityUid)) {
          score += 100;
          matchedFields.push("Entity ID");
        }
        if (input.phone && normalize(input.phone) === normalize(entity.phone)) {
          score += 80;
          matchedFields.push("Phone");
        }
        if (input.nationalId && normalize(input.nationalId) === normalize(entity.nationalId)) {
          score += 100;
          matchedFields.push("National ID");
        }
        if (input.householdId && normalize(input.householdId) === normalize(entity.householdId)) {
          score += 90;
          matchedFields.push("Household ID");
        }
        if (input.name && input.village && normalize(input.name) === normalize(entity.name) && normalize(input.village) === normalize(entity.location.village)) {
          score += 60;
          matchedFields.push("Name + Village");
        }
        return {
          entity,
          matchedFields,
          score: Math.min(score, 100),
          level: score >= 90 ? "LikelyDuplicate" : score >= 60 ? "PossibleDuplicate" : "NoMatch",
        } satisfies DuplicateCheckResult;
      })
      .filter((result) => result.level !== "NoMatch")
      .sort((a, b) => b.score - a.score);
  }
}
