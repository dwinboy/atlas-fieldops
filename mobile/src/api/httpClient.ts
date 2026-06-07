import { mobileAppConfig } from "@/config/appConfig";

export type MobileApiSession = {
  accessToken: string | null;
  refreshToken: string | null;
};

export type MobileRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  token?: string | null;
  headers?: Record<string, string>;
};

export class MobileApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "MobileApiError";
    this.status = status;
    this.payload = payload;
  }
}

export class MobileHttpClient {
  constructor(private readonly baseUrl: string = mobileAppConfig.apiBaseUrl) {}

  async request<T>(path: string, options: MobileRequestOptions = {}): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), mobileAppConfig.requestTimeoutMs);
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
      method: options.method ?? "GET",
      headers: {
        Accept: "application/json",
        "X-Mobile-Contract-Version": mobileAppConfig.apiVersion,
        "X-Mobile-App-Version": mobileAppConfig.appVersion,
        ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...options.headers,
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
    } catch (error) {
      const message =
        error instanceof Error && error.name === "AbortError"
          ? "Connection timed out. Check your internet connection and try again."
          : "Cannot reach Atlas FieldOps. Check your internet connection and try again.";
      throw new MobileApiError(message, 0, null);
    } finally {
      clearTimeout(timeout);
    }
    const text = await response.text();
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    const looksLikeJson = contentType.includes("application/json") || /^[\s\n\r]*[\[{]/.test(text);
    let payload: unknown = null;
    if (text && looksLikeJson) {
      try {
        payload = JSON.parse(text) as unknown;
      } catch {
        payload = null;
      }
    }
    if (text && !looksLikeJson) {
      const htmlHint = text.toLowerCase().includes("<html") || text.toLowerCase().includes("<!doctype");
      const message = htmlHint
        ? "The mobile app reached the website instead of the API. Update the app API URL to https://backend-production-13c9.up.railway.app/api/v1 and try again."
        : "Atlas FieldOps returned an unexpected server response. Try again or contact support.";
      throw new MobileApiError(message, response.status, { contentType, preview: text.slice(0, 160) });
    }
    if (!response.ok) {
      const detail =
        payload && typeof payload === "object" && "detail" in payload
          ? String((payload as { detail?: unknown }).detail)
          : null;
      const fallback =
        response.status === 401
          ? "Login failed. Check your email, password, and organization code."
          : response.status === 403
            ? "Your account is active, but it does not have mobile access yet. Ask your administrator to assign mobile sync and field collection permissions."
            : "Mobile API request failed. Check your connection and try again.";
      throw new MobileApiError(detail || fallback, response.status, payload);
    }
    return payload as T;
  }
}
