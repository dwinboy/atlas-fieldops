import type { MobileReferenceList, MobileReferenceValue } from "@/models/contracts";
import { LocalDatabase } from "@/storage/localDatabase";

export class ReferenceDataService {
  constructor(private readonly database: LocalDatabase) {}

  list(slugOrId: string): MobileReferenceList | null {
    return this.database.referenceLists.list().find((list) => list.id === slugOrId || list.slug === slugOrId) ?? null;
  }

  values(slugOrId: string, parentCode?: string | null): MobileReferenceValue[] {
    const list = this.list(slugOrId);
    if (!list) {
      return [];
    }
    return list.values
      .filter((value) => value.active)
      .filter((value) => (parentCode ? value.parentCode === parentCode : true))
      .sort((left, right) => left.order - right.order);
  }
}
