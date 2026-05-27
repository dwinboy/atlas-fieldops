import { describe, expect, it, vi } from "vitest";

import { ApiError, getHealth, inviteFieldOfficer, listSubmissions, login, reviewSubmission } from "@/lib/api";

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

  it("calls mobile-ready collection workflow endpoints", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify([])));
    vi.stubGlobal("fetch", fetchMock);

    await listSubmissions("token", "under_review");

    expect(fetchMock.mock.calls[0][0]).toContain("/submissions?status=under_review");
    expect((fetchMock.mock.calls[0][1] as RequestInit).headers).toBeInstanceOf(Headers);
    vi.unstubAllGlobals();
  });

  it("sends review and field officer management payloads", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: "created" })));
    vi.stubGlobal("fetch", fetchMock);

    await reviewSubmission("token", "sub-1", { action: "approve", comment: "Looks complete" });
    await inviteFieldOfficer("token", {
      email: "officer@example.com",
      full_name: "Field Officer",
      temporary_password: "ChangeMe12345!"
    });

    expect(fetchMock.mock.calls[0][0]).toContain("/submissions/sub-1/review");
    expect((fetchMock.mock.calls[0][1] as RequestInit).body).toContain("approve");
    expect(fetchMock.mock.calls[1][0]).toContain("/field-officers");
    expect((fetchMock.mock.calls[1][1] as RequestInit).body).toContain("officer@example.com");
    vi.unstubAllGlobals();
  });
});
