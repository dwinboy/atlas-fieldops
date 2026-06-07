export type MobileAppConfig = {
  appEnv: "development" | "staging" | "production";
  apiBaseUrl: string;
  apiVersion: "v1";
  requestTimeoutMs: number;
  syncBatchSize: number;
  appVersion: string;
};

type RuntimeGlobal = typeof globalThis & {
  process?: {
    env?: Record<string, string | undefined>;
  };
};

const runtimeEnv = (globalThis as RuntimeGlobal).process?.env ?? {};
const appEnv = (runtimeEnv.APP_ENV ?? runtimeEnv.EXPO_PUBLIC_APP_ENV ?? "production") as
  | "development"
  | "staging"
  | "production";
const configuredApiBaseUrl =
  runtimeEnv.EXPO_PUBLIC_API_BASE_URL ??
  runtimeEnv.API_BASE_URL ??
  "https://backend-production-13c9.up.railway.app/api/v1";

function normalizeApiBaseUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) {
    return "https://backend-production-13c9.up.railway.app/api/v1";
  }
  if (trimmed.endsWith("/api/v1")) {
    return trimmed;
  }
  if (trimmed.endsWith("/api")) {
    return `${trimmed}/v1`;
  }
  return `${trimmed}/api/v1`;
}

export const mobileAppConfig: MobileAppConfig = {
  appEnv,
  apiBaseUrl: normalizeApiBaseUrl(configuredApiBaseUrl),
  apiVersion: "v1",
  requestTimeoutMs: 30000,
  syncBatchSize: 25,
  appVersion: runtimeEnv.EXPO_PUBLIC_APP_VERSION ?? "1.0.0-test",
};
