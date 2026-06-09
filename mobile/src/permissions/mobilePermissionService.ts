import type { MobileAssignment, MobileFormVersion, MobileOfflineRules, MobilePermissionSet } from "@/models/contracts";
import { LocalDatabase } from "@/storage/localDatabase";
import { mobileAppConfig } from "@/config/appConfig";

export type MobilePermissionDecision = {
  allowed: boolean;
  message: string | null;
};

function latest<T extends { updatedAt: string }>(items: T[]): T | null {
  return [...items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;
}

function compareVersion(left: string, right: string): number {
  const a = left.replace(/[^0-9.]/g, "").split(".").map((part) => Number(part || 0));
  const b = right.replace(/[^0-9.]/g, "").split(".").map((part) => Number(part || 0));
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const delta = (a[index] ?? 0) - (b[index] ?? 0);
    if (delta !== 0) return delta;
  }
  return 0;
}

export class MobilePermissionService {
  constructor(private readonly database: LocalDatabase) {}

  permissionSet(): MobilePermissionSet | null {
    return latest(this.database.permissionSets.list());
  }

  mobileRules(): MobileOfflineRules | null {
    return latest(this.database.mobileRules.list());
  }

  canStartCollection(assignment: MobileAssignment, formVersion: MobileFormVersion): MobilePermissionDecision {
    const permissions = this.permissionSet();
    const rules = this.mobileRules();
    if (!permissions?.canCollectData) {
      return {
        allowed: false,
        message: "Your account is not allowed to collect data. Contact your supervisor or administrator.",
      };
    }
    if (assignment.status === "Cancelled" || assignment.status === "Paused") {
      return {
        allowed: false,
        message: "This assignment is no longer active. Existing drafts are kept, but new submissions are blocked.",
      };
    }
    if (rules && compareVersion(mobileAppConfig.appVersion, rules.minimumAppVersion) < 0) {
      return {
        allowed: false,
        message: `Update Atlas FieldOps before collecting data. Minimum supported version is ${rules.minimumAppVersion}.`,
      };
    }
    if (rules?.syncRequired && !rules.offlineCollectionAllowed) {
      return {
        allowed: false,
        message: "Sync is required before collection can continue. Connect to the internet and tap Sync Now.",
      };
    }
    if (!formVersion.offlineCompatible && rules?.offlineCollectionAllowed) {
      return {
        allowed: false,
        message: "This form is not ready for offline collection. Ask your manager to review the form settings.",
      };
    }
    const questions = formVersion.sections.flatMap((section) => section.questions);
    const needsGps = Boolean(rules?.gpsRequired) || questions.some((question) => question.type === "GPS" || question.qualityControls?.captureGps);
    if (needsGps && permissions && !permissions.canUseGps) {
      return {
        allowed: false,
        message: "This assigned form requires GPS evidence, but GPS is disabled for your account. Ask your supervisor to enable GPS permission or reassign the form.",
      };
    }
    const needsMedia = Boolean(rules?.photoRequired) || questions.some((question) => ["Photo", "Video", "Audio", "FileUpload", "Signature"].includes(question.type) || question.qualityControls?.photoEvidence);
    if (needsMedia && permissions && !permissions.canUploadMedia) {
      return {
        allowed: false,
        message: "This assigned form requires media evidence, but media upload is disabled for your account. Ask your supervisor to enable media permission or update the form controls.",
      };
    }
    return { allowed: true, message: null };
  }

  canUseGps(): MobilePermissionDecision {
    const permissions = this.permissionSet();
    if (!permissions?.canUseGps) {
      return { allowed: false, message: "GPS capture is disabled for your account." };
    }
    return { allowed: true, message: null };
  }

  canUploadMedia(): MobilePermissionDecision {
    const permissions = this.permissionSet();
    if (!permissions?.canUploadMedia) {
      return { allowed: false, message: "Media uploads are disabled for your account." };
    }
    return { allowed: true, message: null };
  }
}
