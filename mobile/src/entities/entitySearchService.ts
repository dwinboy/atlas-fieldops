import type { MobileEntity } from "@/models/contracts";

function includes(value: string | null | undefined, query: string): boolean {
  return (value ?? "").toLowerCase().includes(query.toLowerCase());
}

export class EntitySearchService {
  search(query: string, entities: MobileEntity[]): MobileEntity[] {
    if (!query.trim()) {
      return entities;
    }
    return entities.filter(
      (entity) =>
        includes(entity.entityUid, query) ||
        includes(entity.name, query) ||
        includes(entity.phone, query) ||
        includes(entity.nationalId, query) ||
        includes(entity.householdId, query) ||
        includes(entity.location.village, query) ||
        includes(entity.location.community, query),
    );
  }
}
