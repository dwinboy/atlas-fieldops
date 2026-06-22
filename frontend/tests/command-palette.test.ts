import { describe, expect, it } from "vitest";

import { commandPaletteEmptyStateHelpRoute } from "@/components/CommandPalette";

describe("command palette routing", () => {
  it("opens the help guide route from the empty state", () => {
    expect(commandPaletteEmptyStateHelpRoute()).toBe("/app/help");
  });
});
