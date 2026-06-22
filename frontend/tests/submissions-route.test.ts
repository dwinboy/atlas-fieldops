import { describe, expect, it } from "vitest";

import { submissionSectionFromPath } from "@/modules/submissions/data";

describe("submissions route helpers", () => {
  it("maps submissions routes to the correct section", () => {
    expect(submissionSectionFromPath("/submissions")).toBe("dashboard");
    expect(submissionSectionFromPath("/submissions/all")).toBe("all");
    expect(submissionSectionFromPath("/submissions/data")).toBe("data");
    expect(submissionSectionFromPath("/submissions/pending-review")).toBe("pending-review");
    expect(submissionSectionFromPath("/submissions/approved")).toBe("approved");
    expect(submissionSectionFromPath("/submissions/rejected")).toBe("rejected");
    expect(submissionSectionFromPath("/submissions/returned")).toBe("returned");
    expect(submissionSectionFromPath("/submissions/archived")).toBe("archived");
    expect(submissionSectionFromPath("/submissions/unknown")).toBeNull();
  });
});
