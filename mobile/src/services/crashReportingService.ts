import { createMobileApis } from "@/api/mobileApis";
import type { MobileCrashReport } from "@/models/contracts";
import { mobileAppConfig } from "@/config/appConfig";
import { AuditEventService } from "@/services/auditEventService";
import { LocalDatabase } from "@/storage/localDatabase";
import { nowIso } from "@/utils/ids";

export class CrashReportingService {
  constructor(
    private readonly database: LocalDatabase,
    private readonly tokenProvider: () => Promise<string | null>,
    private readonly apis = createMobileApis(),
    private readonly audit = new AuditEventService(database),
  ) {}

  createReport(input: {
    deviceId: string;
    userId?: string | null;
    severity?: MobileCrashReport["severity"];
    message: string;
    stackTrace?: string | null;
    context?: Record<string, unknown>;
  }): MobileCrashReport {
    return {
      deviceId: input.deviceId,
      userId: input.userId ?? null,
      appVersion: mobileAppConfig.appVersion,
      timestamp: nowIso(),
      severity: input.severity ?? "High",
      message: input.message,
      stackTrace: input.stackTrace ?? null,
      context: input.context ?? {},
    };
  }

  async capture(input: Parameters<CrashReportingService["createReport"]>[0]): Promise<void> {
    const report = this.createReport(input);
    this.audit.queue("mobile.crash_captured", {
      deviceId: report.deviceId,
      severity: report.severity,
      message: report.message,
      sensitiveAnswersIncluded: false,
    });
    const token = await this.tokenProvider();
    if (token) {
      await this.apis.operations.submitCrash(token, report);
    }
  }
}
