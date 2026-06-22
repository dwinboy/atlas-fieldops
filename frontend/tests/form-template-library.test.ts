import { describe, expect, it } from "vitest";

import { templateRouteForAction } from "@/components/FormTemplateLibrary";

describe("form template routing", () => {
  it("uses focused template destinations", () => {
    expect(
      templateRouteForAction({ route: "/forms/create", view: "forms" }),
    ).toBe("/forms/create");
    expect(
      templateRouteForAction({ route: "/forms/draft", view: "forms" }),
    ).toBe("/forms/draft");
    expect(
      templateRouteForAction({ route: "/surveys", view: "surveys" }),
    ).toBe("/surveys");
  });
});
