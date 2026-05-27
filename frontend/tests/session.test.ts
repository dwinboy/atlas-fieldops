import { afterEach, describe, expect, it, vi } from "vitest";

import { clearToken, readToken, writeToken } from "@/lib/session";

describe("session token storage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null on the server", () => {
    vi.stubGlobal("window", undefined);

    expect(readToken()).toBeNull();
  });

  it("writes and clears token in browser storage", () => {
    const values = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key)
      }
    });

    writeToken("token-1");
    expect(readToken()).toBe("token-1");

    clearToken();
    expect(readToken()).toBeNull();
  });
});
