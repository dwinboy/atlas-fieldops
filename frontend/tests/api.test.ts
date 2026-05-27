import { describe, expect, it, vi } from "vitest";

import { ApiError, getHealth, login } from "@/lib/api";

describe("api config", () => {
  it("keeps tests wired", () => {
    expect("frontend").toBe("frontend");
  });

  it("sends JSON login payloads", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ access_token: "abc", token_type: "bearer" })));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      login({ email: "admin@example.com", password: "ChangeMe12345!", organization_slug: "acme" })
    ).resolves.toEqual({ access_token: "abc", token_type: "bearer" });

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(options.method).toBe("POST");
    expect(options.body).toContain("admin@example.com");
    vi.unstubAllGlobals();
  });

  it("throws typed errors for failed requests", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("Unauthorized", { status: 401 })));

    await expect(getHealth()).rejects.toBeInstanceOf(ApiError);
    vi.unstubAllGlobals();
  });
});
