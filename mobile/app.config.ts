import type { ExpoConfig } from "expo/config";

const productionApiBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://atlasfieldops.com/api/v1";
const appEnv = process.env.EXPO_PUBLIC_APP_ENV ?? process.env.APP_ENV ?? "production";
const appVersion = process.env.EXPO_PUBLIC_APP_VERSION ?? "1.0.0-test";

const config: ExpoConfig = {
  name: "Atlas FieldOps",
  slug: "atlas-fieldops",
  scheme: "atlasfieldops",
  version: appVersion,
  orientation: "portrait",
  userInterfaceStyle: "light",
  platforms: ["android"],
  extra: {
    apiBaseUrl: productionApiBaseUrl,
    appEnv,
  },
  android: {
    package: "com.atlasfieldops.mobile",
    versionCode: 1,
    adaptiveIcon: {
      backgroundColor: "#12332b",
    },
    permissions: [
      "android.permission.INTERNET",
      "android.permission.ACCESS_NETWORK_STATE",
      "android.permission.CAMERA",
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.ACCESS_COARSE_LOCATION",
      "android.permission.RECORD_AUDIO",
      "android.permission.READ_MEDIA_IMAGES",
      "android.permission.POST_NOTIFICATIONS",
    ],
  },
};

export default config;

