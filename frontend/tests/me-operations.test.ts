import { describe, expect, it } from "vitest";

import { meOperationsRouteForView } from "@/components/MEOperations";

describe("ME operations route helpers", () => {
  it("routes operational next-step actions to real workspaces", () => {
    expect(meOperationsRouteForView("organizations")).toBe("/users-teams");
    expect(meOperationsRouteForView("programs")).toBe("/projects");
    expect(meOperationsRouteForView("data")).toBe("/administration/imports-migration");
    expect(meOperationsRouteForView("forms")).toBe("/forms");
    expect(meOperationsRouteForView("indicators")).toBe("/indicators");
    expect(meOperationsRouteForView("officers")).toBe("/field-operations");
  });
});
