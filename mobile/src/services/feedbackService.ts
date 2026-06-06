import { createMobileApis } from "@/api/mobileApis";
import type { MobileFeedback, MobileFeedbackCategory } from "@/models/contracts";
import { MobileDiagnosticsService } from "@/services/mobileDiagnosticsService";
import { nowIso } from "@/utils/ids";

export class FeedbackService {
  constructor(
    private readonly diagnostics: MobileDiagnosticsService,
    private readonly tokenProvider: () => Promise<string | null>,
    private readonly apis = createMobileApis(),
  ) {}

  buildFeedback(input: {
    category: MobileFeedbackCategory;
    description: string;
    screenshotLocalUri?: string | null;
    includeDiagnostics?: boolean;
  }): MobileFeedback {
    return {
      category: input.category,
      description: input.description,
      screenshotLocalUri: input.screenshotLocalUri ?? null,
      includeDiagnostics: input.includeDiagnostics ?? true,
      diagnostics: input.includeDiagnostics === false ? null : this.diagnostics.report(),
      createdAt: nowIso(),
    };
  }

  async send(input: Parameters<FeedbackService["buildFeedback"]>[0]): Promise<{ queued: boolean; sent: boolean }> {
    const feedback = this.buildFeedback(input);
    const token = await this.tokenProvider();
    if (!token) {
      return { queued: true, sent: false };
    }
    await this.apis.operations.submitFeedback(token, feedback);
    return { queued: false, sent: true };
  }
}
