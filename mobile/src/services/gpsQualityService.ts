export type GPSCapture = {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  timestamp: string | null;
  source?: "GPS" | "Manual" | "Network" | "Unknown";
};

export type GPSQualityIssue = {
  code: "MissingGPS" | "PoorAccuracy" | "ManualCoordinates" | "DuplicateGPS" | "OutsideBoundaryPlaceholder";
  severity: "Warning" | "Block";
  message: string;
};

export class GPSQualityService {
  validate(capture: GPSCapture | null, previousCaptures: GPSCapture[] = [], accuracyThreshold = 50): GPSQualityIssue[] {
    const issues: GPSQualityIssue[] = [];
    if (!capture || capture.latitude === null || capture.longitude === null) {
      return [{ code: "MissingGPS", severity: "Warning", message: "GPS is missing. Collect location when possible." }];
    }
    if (capture.accuracy !== null && capture.accuracy > accuracyThreshold) {
      issues.push({
        code: "PoorAccuracy",
        severity: "Warning",
        message: `GPS accuracy is ${capture.accuracy}m. Move to an open area and capture again if possible.`,
      });
    }
    if (capture.source === "Manual") {
      issues.push({ code: "ManualCoordinates", severity: "Warning", message: "Manual coordinates should be reviewed by a supervisor." });
    }
    const duplicate = previousCaptures.some(
      (item) => item.latitude === capture.latitude && item.longitude === capture.longitude && item.timestamp !== capture.timestamp,
    );
    if (duplicate) {
      issues.push({ code: "DuplicateGPS", severity: "Warning", message: "This GPS point matches another saved record." });
    }
    issues.push({
      code: "OutsideBoundaryPlaceholder",
      severity: "Warning",
      message: "Boundary validation will run against Mapping services during sync.",
    });
    return issues;
  }
}
