import { describe, expect, it } from "vitest";

import { surveyRouteForAction } from "@/components/SurveyManagement";

describe("survey management routing", () => {
  it("uses focused routes for survey workflow shortcuts", () => {
    expect(
      surveyRouteForAction({ route: "/forms/create", view: "forms" }),
    ).toBe("/forms/create");
    expect(
      surveyRouteForAction({
        route: "/submissions/pending-review",
        view: "submissions",
      }),
    ).toBe("/submissions/pending-review");
    expect(
      surveyRouteForAction({
        route: "/field-operations/field-officers",
        view: "officers",
      }),
    ).toBe("/field-operations/field-officers");
    expect(
      surveyRouteForAction({ route: "/mapping/coverage-maps", view: "map" }),
    ).toBe("/mapping/coverage-maps");
    expect(surveyRouteForAction({ view: "analytics" })).toBe("/reports");
  });
});
