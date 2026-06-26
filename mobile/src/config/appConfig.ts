export type MobileAppConfig = {
  appEnv: "development" | "staging" | "production";
  apiBaseUrl: string;
  apiVersion: "v1";
  requestTimeoutMs: number;
  syncBatchSize: number;
  appVersion: string;
  mapTileUrl: string;
  mapTileMaxZoom: number;
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
  "https://atlasfieldops.com/api/v1";

function normalizeApiBaseUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) {
    return "https://atlasfieldops.com/api/v1";
  }
  if (trimmed.endsWith("/api/v1")) {
    return trimmed;
  }
  if (trimmed.endsWith("/api")) {
    return `${trimmed}/v1`;
  }
  return `${trimmed}/api/v1`;
}

const configuredMapTileMaxZoom = Number(runtimeEnv.EXPO_PUBLIC_MAP_TILE_MAX_ZOOM);

export const mobileAppConfig: MobileAppConfig = {
  appEnv,
  apiBaseUrl: normalizeApiBaseUrl(configuredApiBaseUrl),
  apiVersion: "v1",
  requestTimeoutMs: 30000,
  syncBatchSize: 25,
  appVersion: runtimeEnv.EXPO_PUBLIC_APP_VERSION ?? "1.0.0",
  // Map basemap tiles. Defaults to OpenStreetMap; set EXPO_PUBLIC_MAP_TILE_URL to a keyed
  // provider (e.g. Mapbox/MapTiler satellite) for production field use.
  mapTileUrl:
    runtimeEnv.EXPO_PUBLIC_MAP_TILE_URL ??
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  mapTileMaxZoom: Number.isFinite(configuredMapTileMaxZoom) && configuredMapTileMaxZoom > 0 ? configuredMapTileMaxZoom : 19,
};
