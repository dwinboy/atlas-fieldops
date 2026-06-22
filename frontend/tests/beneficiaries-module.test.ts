import { describe, expect, it } from "vitest";

import { beneficiariesMappingRoute } from "@/modules/beneficiaries/BeneficiariesModule";
import { beneficiariesViewFromPath } from "@/modules/beneficiaries/data";

describe("beneficiaries route helpers", () => {
  it("routes beneficiary map actions to the mapping workspace", () => {
    expect(beneficiariesMappingRoute()).toBe("/mapping");
  });

  it("maps beneficiary routes to the correct workspace view", () => {
    expect(beneficiariesViewFromPath("/beneficiaries")).toBe("registry");
    expect(beneficiariesViewFromPath("/beneficiaries/import")).toBe("import");
    expect(beneficiariesViewFromPath("/beneficiaries/duplicates")).toBe("duplicates");
  });
});
