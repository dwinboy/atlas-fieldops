import { MobileHttpClient } from "@/api/httpClient";
import type {
  MobileAssignment,
  MobileActionAccepted,
  MobileAttachment,
  MobileAuditEvent,
  MobileBootstrapPackage,
  MobileCrashReport,
  MobileDeviceRegistration,
  MobileEntity,
  MobileFeedback,
  MobileForm,
  MobileFormVersion,
  MobileLocation,
  MobileNotification,
  MobilePageRequest,
  MobileProject,
  MobileReferenceList,
  MobileSubmission,
  MobileSubmissionUploadResult,
  MobileSyncPackage,
  MobileSyncQueueItem,
  MobileVersionState,
} from "@/models/contracts";

function pageQuery(page?: MobilePageRequest): string {
  if (!page) {
    return "";
  }
  const params = new URLSearchParams();
  if (page.cursor) {
    params.set("cursor", page.cursor);
  }
  if (page.limit) {
    params.set("limit", String(page.limit));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export class AuthApi {
  constructor(private readonly http: MobileHttpClient) {}

  async login(payload: { email: string; password: string; organizationSlug: string }) {
    const token = await this.http.request<{
      access_token: string;
      token_type: string;
      refresh_token?: string | null;
      expires_in?: number | null;
    }>("/auth/login", {
      method: "POST",
      body: {
        email: payload.email,
        password: payload.password,
        organization_slug: payload.organizationSlug,
      },
    });
    return {
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? null,
      expiresIn: token.expires_in ?? null,
      tokenType: token.token_type,
    };
  }

  async refresh(refreshToken: string) {
    const token = await this.http.request<{
      access_token: string;
      token_type: string;
      refresh_token?: string | null;
      expires_in?: number | null;
    }>("/auth/refresh", {
      method: "POST",
      body: { refresh_token: refreshToken },
    });
    return {
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? refreshToken,
      expiresIn: token.expires_in ?? null,
      tokenType: token.token_type,
    };
  }

  currentUser(token: string) {
    return this.http.request<MobileBootstrapPackage>("/mobile/bootstrap", { token });
  }

  registerDevice(token: string, payload: MobileDeviceRegistration) {
    return this.http.request<{
      deviceId: string;
      status: string;
      registeredAt: string;
      lastSeenAt: string;
      remoteLogoutRequired: boolean;
      remoteWipeRequired: boolean;
    }>("/mobile/devices/register", { method: "POST", token, body: payload });
  }

  async versionPolicy(token: string): Promise<MobileVersionState> {
    const policy = await this.http.request<{
      currentProductionVersion: string;
      minimumSupportedVersion: string;
      stagingVersion: string;
      updateAvailable: boolean;
      updateRequired: boolean;
      message: string | null;
    }>("/mobile/version-policy", { token });
    return {
      currentVersion: policy.currentProductionVersion,
      minimumSupportedVersion: policy.minimumSupportedVersion,
      updateAvailable: policy.updateAvailable,
      updateRequired: policy.updateRequired,
      message: policy.message,
    };
  }
}

export class ProjectsApi {
  constructor(private readonly http: MobileHttpClient) {}

  assignedProjects(token: string, page?: MobilePageRequest) {
    return this.http.request<MobileProject[]>(`/mobile/projects${pageQuery(page)}`, { token });
  }
}

export class AssignmentsApi {
  constructor(private readonly http: MobileHttpClient) {}

  assignedAssignments(token: string, page?: MobilePageRequest) {
    return this.http.request<MobileAssignment[]>(`/mobile/assignments${pageQuery(page)}`, { token });
  }
}

export class FormsApi {
  constructor(private readonly http: MobileHttpClient) {}

  assignedForms(token: string, page?: MobilePageRequest) {
    return this.http.request<MobileForm[]>(`/mobile/forms${pageQuery(page)}`, { token });
  }

  formVersions(token: string, page?: MobilePageRequest) {
    return this.http.request<MobileFormVersion[]>(`/mobile/form-versions${pageQuery(page)}`, { token });
  }
}

export class EntitiesApi {
  constructor(private readonly http: MobileHttpClient) {}

  assignedEntities(token: string, page?: MobilePageRequest) {
    return this.http.request<MobileEntity[]>(`/mobile/entities${pageQuery(page)}`, { token });
  }
}

export class LocationsApi {
  constructor(private readonly http: MobileHttpClient) {}

  assignedLocations(token: string, page?: MobilePageRequest) {
    return this.http.request<MobileLocation[]>(`/mobile/locations${pageQuery(page)}`, { token });
  }
}

export class ReferenceDataApi {
  constructor(private readonly http: MobileHttpClient) {}

  referenceData(token: string, page?: MobilePageRequest) {
    return this.http.request<MobileReferenceList[]>(`/mobile/reference-data${pageQuery(page)}`, { token });
  }
}

export class SubmissionsApi {
  constructor(private readonly http: MobileHttpClient) {}

  returnedSubmissions(token: string) {
    return this.http.request<MobileSubmission[]>("/mobile/returned-submissions", { token });
  }

  uploadSubmission(token: string, submission: MobileSubmission) {
    return this.http.request<MobileSubmissionUploadResult>("/mobile/submissions", {
      method: "POST",
      token,
      body: {
        localId: submission.localId,
        projectId: submission.projectId,
        assignmentId: submission.assignmentId,
        formId: submission.formId,
        formVersionId: submission.formVersionId,
        entityId: submission.entityId,
        entityType: submission.entityType,
        frequencyPeriod: submission.frequencyPeriod,
        eventId: submission.eventId,
        responses: submission.responses,
        attachments: submission.attachments,
        location: submission.location,
        integritySignals: submission.integritySignals,
        deviceId: submission.deviceId,
        appVersion: submission.appVersion,
        createdAt: submission.createdAt,
        submittedAt: submission.submittedAt,
      },
    });
  }
}

export class AttachmentsApi {
  constructor(private readonly http: MobileHttpClient) {}

  uploadAttachment(token: string, attachment: MobileAttachment) {
    return this.http.request<MobileActionAccepted>("/mobile/attachments", {
      method: "POST",
      token,
      body: attachment,
    });
  }
}

export class NotificationsApi {
  constructor(private readonly http: MobileHttpClient) {}

  list(token: string) {
    return this.http.request<MobileNotification[]>("/mobile/notifications", { token });
  }
}

export class SyncApi {
  constructor(private readonly http: MobileHttpClient) {}

  syncPackage(token: string) {
    return this.http.request<MobileSyncPackage>("/mobile/sync", { token });
  }

  uploadQueue(token: string, items: MobileSyncQueueItem[]) {
    return this.http.request<{ accepted: number; failed: number }>("/mobile/sync", {
      method: "POST",
      token,
      body: { items },
    });
  }
}

export class AuditApi {
  constructor(private readonly http: MobileHttpClient) {}

  uploadAuditEvents(token: string, events: MobileAuditEvent[]) {
    return this.http.request<{ accepted: number }>("/mobile/audit-events", {
      method: "POST",
      token,
      body: { events },
    });
  }
}

export class MobileOperationsApi {
  constructor(private readonly http: MobileHttpClient) {}

  submitCrash(token: string, report: MobileCrashReport) {
    return this.http.request<{ id: string }>("/administration/mobile-monitoring/crashes", {
      method: "POST",
      token,
      body: {
        device_id: report.deviceId,
        app_version: report.appVersion,
        severity: report.severity,
        message: report.message,
        stack_trace: report.stackTrace,
        context: report.context,
      },
    });
  }

  submitFeedback(token: string, feedback: MobileFeedback) {
    return this.http.request<{ id: string }>("/administration/mobile-feedback", {
      method: "POST",
      token,
      body: {
        category: feedback.category,
        description: feedback.description,
        screenshot_url: feedback.screenshotLocalUri,
        diagnostics_json: feedback.diagnostics ?? {},
      },
    });
  }
}

export function createMobileApis(http = new MobileHttpClient()) {
  return {
    auth: new AuthApi(http),
    projects: new ProjectsApi(http),
    assignments: new AssignmentsApi(http),
    forms: new FormsApi(http),
    entities: new EntitiesApi(http),
    locations: new LocationsApi(http),
    referenceData: new ReferenceDataApi(http),
    submissions: new SubmissionsApi(http),
    attachments: new AttachmentsApi(http),
    notifications: new NotificationsApi(http),
    sync: new SyncApi(http),
    audit: new AuditApi(http),
    operations: new MobileOperationsApi(http),
  };
}
