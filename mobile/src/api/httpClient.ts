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
    const response = await fetch(`${this.baseUrl}${path}`, {
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
    });
    const text = await response.text();
    const payload = text ? (JSON.parse(text) as unknown) : null;
    if (!response.ok) {
      throw new MobileApiError("Mobile API request failed", response.status, payload);
    }
    return payload as T;
  }
}
