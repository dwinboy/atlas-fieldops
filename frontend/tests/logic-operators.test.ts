import { describe, expect, it } from "vitest";

import { buildLogicConditionExpression } from "@/lib/forms";

describe("buildLogicConditionExpression", () => {
  it("quotes text equality and not-equality", () => {
    expect(buildLogicConditionExpression("gender", "equals", "Female")).toBe("${gender} = 'Female'");
    expect(buildLogicConditionExpression("status", "not_equals", "Done")).toBe("${status} != 'Done'");
  });

  it("emits numeric comparison operators without quotes", () => {
    expect(buildLogicConditionExpression("age", "at_least", "18")).toBe("${age} >= 18");
    expect(buildLogicConditionExpression("age", "at_most", "49")).toBe("${age} <= 49");
    expect(buildLogicConditionExpression("score", "greater", "0")).toBe("${score} > 0");
    expect(buildLogicConditionExpression("score", "less", "5")).toBe("${score} < 5");
  });

  it("encodes between as a comma pair and in as a list", () => {
    expect(buildLogicConditionExpression("age", "between", "12", "49")).toBe("${age} between 12,49");
    expect(buildLogicConditionExpression("region", "in", "Kano,Lagos")).toBe("${region} in Kano,Lagos");
  });

  it("supports text and presence operators", () => {
    expect(buildLogicConditionExpression("name", "contains", "ali")).toBe("${name} contains 'ali'");
    expect(buildLogicConditionExpression("code", "starts_with", "KN")).toBe("${code} starts_with 'KN'");
    expect(buildLogicConditionExpression("notes", "is_empty", "")).toBe("${notes} is empty");
    expect(buildLogicConditionExpression("notes", "is_not_empty", "")).toBe("${notes} is not empty");
  });

  it("escapes single quotes in values", () => {
    expect(buildLogicConditionExpression("name", "equals", "O'Brien")).toBe("${name} = 'O\\'Brien'");
  });
});
