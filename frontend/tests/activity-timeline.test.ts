import { describe, expect, it } from "vitest";

import { activityRouteForEvent } from "@/components/ActivityTimeline";

describe("activity timeline routing", () => {
  it("prefers focused routes for operational actions", () => {
    expect(
      activityRouteForEvent({
        route: "/data-quality/duplicates",
        view: "data",
      }),
    ).toBe("/data-quality/duplicates");
    expect(
      activityRouteForEvent({
        route: "/submissions/pending-review",
        view: "submissions",
      }),
    ).toBe("/submissions/pending-review");
    expect(
      activityRouteForEvent({
        route: "/governance/approvals",
        view: "workflows",
      }),
    ).toBe("/governance/approvals");
    expect(
      activityRouteForEvent({
        route: "/field-operations/field-monitoring",
        view: "connectivity",
      }),
    ).toBe("/field-operations/field-monitoring");
  });
});
