import { describe, expect, it } from "vitest";

import { helpRouteForAction } from "@/components/ProductHelpCenter";

describe("product help routing", () => {
  it("uses route overrides when guidance needs a focused destination", () => {
    expect(
      helpRouteForAction({ route: "/forms/create", view: "forms" }),
    ).toBe("/forms/create");
    expect(helpRouteForAction({ view: "dashboard" })).toBe("/dashboard");
    expect(helpRouteForAction({ view: "platform" })).toBe("/platform");
  });
});
