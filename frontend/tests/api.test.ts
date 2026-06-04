import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ApiError,
  getHealth,
  createOrganizationSupportSession,
  inviteFieldOfficer,
  listPlatformOrganizations,
  listSubmissions,
  login,
  resolveApiBaseUrl,
  updatePlatformOrganizationStatus,
  reviewSubmission
} from "@/lib/api";

describe("api config", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("keeps tests wired", () => {
    expect("frontend").toBe("frontend");
  });

  it("requires NEXT_PUBLIC_API_URL", () => {
    expect(() => resolveApiBaseUrl(undefined)).toThrow("NEXT_PUBLIC_API_URL is required");
  });

  it("normalizes backend root URLs to the versioned API path", () => {
    expect(resolveApiBaseUrl("https://api.example.com")).toBe("https://api.example.com/api/v1");
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
  });

  it("throws typed errors for failed requests", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("Unauthorized", { status: 401 })));

    await expect(getHealth()).rejects.toBeInstanceOf(ApiError);
  });

  it("calls mobile-ready collection workflow endpoints", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify([])));
    vi.stubGlobal("fetch", fetchMock);

    await listSubmissions("token", "under_review");

    expect(fetchMock.mock.calls[0][0]).toContain("/submissions?status=under_review");
    expect((fetchMock.mock.calls[0][1] as RequestInit).headers).toBeInstanceOf(Headers);
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
  });

  it("uses platform organization support endpoints", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ access_token: "support-token", token_type: "bearer" })));
    vi.stubGlobal("fetch", fetchMock);

    await listPlatformOrganizations("token");
    await updatePlatformOrganizationStatus("token", "org-1", false);
    await createOrganizationSupportSession("token", "org-1");

    expect(fetchMock.mock.calls[0][0]).toContain("/organizations/platform");
    expect(fetchMock.mock.calls[1][0]).toContain("/organizations/platform/org-1");
    expect((fetchMock.mock.calls[1][1] as RequestInit).body).toContain("false");
    expect(fetchMock.mock.calls[2][0]).toContain("/organizations/platform/org-1/support-session");
  });
});
