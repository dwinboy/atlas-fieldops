export type MobileEnvironmentName = "development" | "staging" | "production";

export type AndroidReleaseConfig = {
  environment: MobileEnvironmentName;
  apiUrl: string;
  featureFlags: Record<string, boolean>;
  loggingLevel: "debug" | "info" | "warn" | "error";
  appName: string;
  packageName: string;
  appIconPath: string;
  splashScreenPath: string;
  permissions: string[];
  privacyPolicyUrl: string;
  termsUrl: string;
  supportUrl: string;
  contactEmail: string;
};

export const androidReleaseConfig: AndroidReleaseConfig = {
  environment: "production",
  apiUrl: "https://atlasfieldops.com/api/v1",
  featureFlags: {
    offlineCollection: true,
    attachmentSync: true,
    supervisorMode: true,
    diagnostics: true,
  },
  loggingLevel: "info",
  appName: "Atlas FieldOps",
  packageName: "com.atlasfieldops.mobile",
  appIconPath: "mobile/assets/icon.png",
  splashScreenPath: "mobile/assets/splash.png",
  permissions: [
    "android.permission.INTERNET",
    "android.permission.ACCESS_NETWORK_STATE",
    "android.permission.ACCESS_FINE_LOCATION",
    "android.permission.ACCESS_COARSE_LOCATION",
    "android.permission.CAMERA",
    "android.permission.RECORD_AUDIO",
    "android.permission.READ_MEDIA_IMAGES",
    "android.permission.POST_NOTIFICATIONS",
  ],
  privacyPolicyUrl: "https://atlasfieldops.com/privacy",
  termsUrl: "https://atlasfieldops.com/terms",
  supportUrl: "https://atlasfieldops.com/help",
  contactEmail: "support@atlasfieldops.com",
};

export const releaseChannels = {
  development: {
    apiUrl: "http://localhost:8000/api/v1",
    loggingLevel: "debug",
  },
  staging: {
    apiUrl: "https://staging.atlasfieldops.com/api/v1",
    loggingLevel: "info",
  },
  production: {
    apiUrl: "https://atlasfieldops.com/api/v1",
    loggingLevel: "warn",
  },
} satisfies Record<
  MobileEnvironmentName,
  Pick<AndroidReleaseConfig, "apiUrl" | "loggingLevel">
>;
