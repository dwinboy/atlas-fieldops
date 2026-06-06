import type { MobileVersionState } from "@/models/contracts";
import { mobileAppConfig } from "@/config/appConfig";

function compareVersions(left: string, right: string): number {
  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);
  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    const diff = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }
  return 0;
}

export class ProductionReadinessService {
  versionState(input?: { minimumSupportedVersion?: string; latestVersion?: string }): MobileVersionState {
    const currentVersion = mobileAppConfig.appVersion;
    const minimumSupportedVersion = input?.minimumSupportedVersion ?? "0.1.0";
    const latestVersion = input?.latestVersion ?? currentVersion;
    const updateRequired = compareVersions(currentVersion, minimumSupportedVersion) < 0;
    const updateAvailable = compareVersions(currentVersion, latestVersion) < 0;
    return {
      currentVersion,
      minimumSupportedVersion,
      updateRequired,
      updateAvailable,
      message: updateRequired
        ? "This mobile app version is no longer supported. Update before collecting data."
        : updateAvailable
          ? "A newer version is available."
          : null,
    };
  }

  crashReportingPlaceholder(): { enabled: false; provider: "future"; note: string } {
    return {
      enabled: false,
      provider: "future",
      note: "Crash reporting provider can be connected before Play Store release without changing field workflow services.",
    };
  }
}
