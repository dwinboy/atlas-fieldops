import { describe, expect, it } from "vitest";

import { formsTemplateBuilderRoute } from "@/modules/forms/FormsModule";

describe("forms template routing", () => {
  it("opens template actions in the builder route", () => {
    expect(formsTemplateBuilderRoute()).toBe("/forms/create");
  });
});
