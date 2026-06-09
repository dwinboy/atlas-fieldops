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
  MobileVisitRequest,
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

  async loginWithQr(qrToken: string) {
    const token = await this.http.request<{
      access_token: string;
      token_type: string;
      refresh_token?: string | null;
      expires_in?: number | null;
    }>("/auth/mobile-qr-login", {
      method: "POST",
      body: {
        qr_token: qrToken,
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

  async uploadActivityAttachment(token: string, activityId: string, attachment: MobileAttachment, activity: MobileVisitRequest) {
    const mediaTypeByAttachmentType: Record<MobileAttachment["type"], "photo" | "audio" | "video" | "signature" | "file"> = {
      Audio: "audio",
      FileUpload: "file",
      Photo: "photo",
      Signature: "signature",
      Video: "video",
    };
    const evidence = await this.http.request<{ id: string }>(`/mobile/operational-activities/${activityId}/attachments`, {
      method: "POST",
      token,
      body: {
        activity_id: activityId,
        captured_at: attachment.createdAt,
        file_name: attachment.localUri.split("/").pop() || `${attachment.type.toLowerCase()}-${attachment.localId}`,
        latitude: activity.checkInLatitude ?? activity.latitude,
        longitude: activity.checkInLongitude ?? activity.longitude,
        media_type: mediaTypeByAttachmentType[attachment.type],
        metadata_json: {
          contextType: "OperationalActivity",
          encrypted: attachment.encrypted,
          localAttachmentId: attachment.localId,
          localUri: attachment.localUri,
          uploadProgress: attachment.uploadProgress,
        },
        mime_type: attachment.mimeType,
        size_bytes: attachment.size,
        storage_url: attachment.remoteUrl ?? attachment.localUri,
      },
    });
    return {
      localId: attachment.localId,
      message: "Operational activity evidence accepted.",
      serverId: evidence.id,
      status: "accepted" as const,
    };
  }
}

export class NotificationsApi {
  constructor(private readonly http: MobileHttpClient) {}

  list(token: string) {
    return this.http.request<MobileNotification[]>("/mobile/notifications", { token });
  }
}

type ServerFieldVisitRequest = {
  id: string;
  organization_id: string;
  project_id: string | null;
  beneficiary_id: string | null;
  field_officer_id: string;
  supervisor_user_id: string | null;
  title: string;
  activity_type: MobileVisitRequest["activityType"];
  activity_scope: MobileVisitRequest["activityScope"];
  requires_approval: boolean;
  purpose: string | null;
  location_name: string;
  latitude: number | null;
  longitude: number | null;
  requested_start_at: string;
  requested_end_at: string;
  priority: "low" | "normal" | "high" | "urgent";
  status: MobileVisitRequest["status"];
  required_form_ids: string[];
  planned_activities: string[];
  supervisor_instructions: string | null;
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
  check_in_at: string | null;
  check_in_latitude: number | null;
  check_in_longitude: number | null;
  check_in_accuracy: number | null;
  check_in_note: string | null;
  check_out_at: string | null;
  check_out_latitude: number | null;
  check_out_longitude: number | null;
  check_out_accuracy: number | null;
  check_out_summary: string | null;
  verification_status: MobileVisitRequest["verificationStatus"];
  distance_from_planned_meters: number | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

function mapVisitRequest(visit: ServerFieldVisitRequest): MobileVisitRequest {
  return {
    id: visit.id,
    localId: visit.id,
    serverId: visit.id,
    syncStatus: "Synced",
    createdAt: visit.created_at,
    updatedAt: visit.updated_at,
    lastSyncedAt: new Date().toISOString(),
    deviceId: null,
    conflictStatus: null,
    deletedAt: null,
    organizationId: visit.organization_id,
    projectId: visit.project_id,
    beneficiaryId: visit.beneficiary_id,
    fieldOfficerId: visit.field_officer_id,
    supervisorUserId: visit.supervisor_user_id,
    title: visit.title,
    activityType: visit.activity_type,
    activityScope: visit.activity_scope,
    requiresApproval: visit.requires_approval,
    purpose: visit.purpose,
    locationName: visit.location_name,
    latitude: visit.latitude,
    longitude: visit.longitude,
    requestedStartAt: visit.requested_start_at,
    requestedEndAt: visit.requested_end_at,
    priority: visit.priority,
    status: visit.status,
    requiredFormIds: visit.required_form_ids,
    plannedActivities: visit.planned_activities,
    supervisorInstructions: visit.supervisor_instructions,
    reviewedByUserId: visit.reviewed_by_user_id,
    reviewedAt: visit.reviewed_at,
    checkInAt: visit.check_in_at,
    checkInLatitude: visit.check_in_latitude,
    checkInLongitude: visit.check_in_longitude,
    checkInAccuracy: visit.check_in_accuracy,
    checkInNote: visit.check_in_note,
    checkOutAt: visit.check_out_at,
    checkOutLatitude: visit.check_out_latitude,
    checkOutLongitude: visit.check_out_longitude,
    checkOutAccuracy: visit.check_out_accuracy,
    checkOutSummary: visit.check_out_summary,
    verificationStatus: visit.verification_status,
    distanceFromPlannedMeters: visit.distance_from_planned_meters,
    metadata: visit.metadata_json,
  };
}

export class VisitRequestsApi {
  constructor(private readonly http: MobileHttpClient) {}

  async list(token: string) {
    const visits = await this.http.request<ServerFieldVisitRequest[]>("/mobile/operational-activities", { token });
    return visits.map(mapVisitRequest);
  }

  async create(
    token: string,
    payload: {
      projectId: string | null;
      beneficiaryId: string | null;
      title: string;
      activityType: MobileVisitRequest["activityType"];
      activityScope: MobileVisitRequest["activityScope"];
      requiresApproval: boolean;
      purpose: string | null;
      locationName: string;
      latitude: number | null;
      longitude: number | null;
      requestedStartAt: string;
      requestedEndAt: string;
      priority: "low" | "normal" | "high" | "urgent";
      plannedActivities: string[];
    },
  ) {
    const visit = await this.http.request<ServerFieldVisitRequest>("/mobile/operational-activities", {
      method: "POST",
      token,
      body: {
        project_id: payload.projectId,
        beneficiary_id: payload.beneficiaryId,
        title: payload.title,
        activity_type: payload.activityType,
        activity_scope: payload.activityScope,
        requires_approval: payload.requiresApproval,
        purpose: payload.purpose,
        location_name: payload.locationName,
        latitude: payload.latitude,
        longitude: payload.longitude,
        requested_start_at: payload.requestedStartAt,
        requested_end_at: payload.requestedEndAt,
        priority: payload.priority,
        planned_activities: payload.plannedActivities,
        required_form_ids: [],
        metadata_json: {},
      },
    });
    return mapVisitRequest(visit);
  }

  async checkIn(
    token: string,
    visitRequestId: string,
    payload: { latitude: number; longitude: number; accuracy: number | null; timestamp: string; note: string | null },
  ) {
    const visit = await this.http.request<ServerFieldVisitRequest>(`/mobile/operational-activities/${visitRequestId}/check-in`, {
      method: "POST",
      token,
      body: payload,
    });
    return mapVisitRequest(visit);
  }

  async checkOut(
    token: string,
    visitRequestId: string,
    payload: { latitude: number; longitude: number; accuracy: number | null; timestamp: string; summary: string | null },
  ) {
    const visit = await this.http.request<ServerFieldVisitRequest>(`/mobile/operational-activities/${visitRequestId}/check-out`, {
      method: "POST",
      token,
      body: payload,
    });
    return mapVisitRequest(visit);
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
    visitRequests: new VisitRequestsApi(http),
    sync: new SyncApi(http),
    audit: new AuditApi(http),
    operations: new MobileOperationsApi(http),
  };
}
