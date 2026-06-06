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

export const mobileAppConfig: MobileAppConfig = {
  appEnv,
  apiBaseUrl:
    runtimeEnv.EXPO_PUBLIC_API_BASE_URL ??
    runtimeEnv.API_BASE_URL ??
    "https://atlasfieldops.com/api/v1",
  apiVersion: "v1",
  requestTimeoutMs: 30000,
  syncBatchSize: 25,
  appVersion: runtimeEnv.EXPO_PUBLIC_APP_VERSION ?? "1.0.0-test",
};
