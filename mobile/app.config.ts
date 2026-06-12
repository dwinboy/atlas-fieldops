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
  icon: "./assets/atlas-fieldops-logo.png",
  userInterfaceStyle: "light",
  platforms: ["android"],
  extra: {
    apiBaseUrl: productionApiBaseUrl,
    appEnv,
    eas: {
      projectId: "71a567ed-0bac-4abb-9c00-2b49e693e69e",
    },
  },
  plugins: [
    "expo-image-picker",
    [
      "expo-camera",
      {
        cameraPermission:
          "Atlas FieldOps uses the camera to scan field officer QR login codes and capture form evidence.",
      },
    ],
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission: "Atlas FieldOps uses GPS to record submission locations.",
      },
    ],
    "expo-local-authentication",
    "expo-font",
    [
      "expo-av",
      {
        microphonePermission: "Atlas FieldOps uses the microphone to record audio evidence for form submissions.",
      },
    ],
  ],
  android: {
    package: "com.atlasfieldops.mobile",
    versionCode: 2,
    adaptiveIcon: {
      foregroundImage: "./assets/atlas-fieldops-logo.png",
      backgroundColor: "#12332b",
    },
    permissions: [
      "android.permission.INTERNET",
      "android.permission.ACCESS_NETWORK_STATE",
      "android.permission.CAMERA",
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.ACCESS_COARSE_LOCATION",
      "android.permission.READ_MEDIA_IMAGES",
      "android.permission.POST_NOTIFICATIONS",
      "android.permission.USE_BIOMETRIC",
      "android.permission.USE_FINGERPRINT",
      "android.permission.RECORD_AUDIO",
    ],
  },
};

export default config;
