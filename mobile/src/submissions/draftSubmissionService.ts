import type { MobileAttachment, MobileSubmission, MobileSubmissionResponse } from "@/models/contracts";
import { LocalDatabase } from "@/storage/localDatabase";
import { createLocalId, nowIso } from "@/utils/ids";

export type DraftSubmissionInput = {
  projectId: string;
  assignmentId: string | null;
  formId: string;
  formVersionId: string;
  entityId: string | null;
  linkedEntityIds?: string[];
  entityType?: string | null;
  deviceId?: string | null;
  appVersion?: string | null;
  prefilledResponses?: MobileSubmissionResponse[];
  frequencyPeriod?: string | null;
  eventId?: string | null;
};

export class DraftSubmissionService {
  constructor(private readonly database: LocalDatabase) {}

  createDraft(input: DraftSubmissionInput): MobileSubmission {
    const timestamp = nowIso();
    const localId = createLocalId("draft");
    const responses = input.prefilledResponses ?? [];
    const draft: MobileSubmission = {
      id: createLocalId("submission"),
      localId,
      serverId: null,
      projectId: input.projectId,
      assignmentId: input.assignmentId,
      formId: input.formId,
      formVersionId: input.formVersionId,
      entityId: input.entityId,
      linkedEntityIds: input.linkedEntityIds ?? [],
      entityType: input.entityType ?? null,
      status: "Draft",
      frequencyPeriod: input.frequencyPeriod ?? null,
      eventId: input.eventId ?? null,
      responses,
      attachments: buildDraftAttachments({
        draftLocalId: localId,
        responses,
        existingAttachments: [],
        timestamp,
      }),
      location: deriveDraftLocation(responses),
      submittedAt: null,
      appVersion: input.appVersion ?? null,
      integritySignals: null,
      reviewStatus: null,
      reviewComments: null,
      reviewedAt: null,
      approvedAt: null,
      syncStatus: "NotSynced",
      createdAt: timestamp,
      updatedAt: timestamp,
      lastSyncedAt: null,
      deviceId: input.deviceId ?? null,
      conflictStatus: null,
      deletedAt: null,
    };
    return this.database.draftSubmissions.upsert(draft);
  }

  updateResponse(draftLocalId: string, response: MobileSubmissionResponse): MobileSubmission {
    const draft = this.database.draftSubmissions.get(draftLocalId);
    if (!draft) {
      throw new Error("Draft submission not found");
    }
    const responses = draft.responses.filter((item) => item.questionId !== response.questionId);
    const nextResponses = [...responses, response];
    const updatedAt = nowIso();
    const updated = {
      ...draft,
      responses: nextResponses,
      attachments: buildDraftAttachments({
        draftLocalId: draft.localId,
        responses: nextResponses,
        existingAttachments: draft.attachments,
        timestamp: updatedAt,
      }),
      location: deriveDraftLocation(nextResponses),
      syncStatus: "NotSynced" as const,
      updatedAt,
    };
    return this.database.draftSubmissions.upsert(updated);
  }

  markReady(draftLocalId: string): MobileSubmission {
    const draft = this.database.draftSubmissions.get(draftLocalId);
    if (!draft) {
      throw new Error("Draft submission not found");
    }
    return this.database.draftSubmissions.upsert({
      ...draft,
      status: "ReadyToSubmit",
      syncStatus: "Queued",
      submittedAt: nowIso(),
      updatedAt: nowIso(),
    });
  }

  markQueued(draftLocalId: string): MobileSubmission {
    const ready = this.markReady(draftLocalId);
    return this.database.draftSubmissions.upsert({
      ...ready,
      status: "Queued",
      syncStatus: "Queued",
      updatedAt: nowIso(),
    });
  }

  updateIntegritySignals(draftLocalId: string, integritySignals: MobileSubmission["integritySignals"]): MobileSubmission {
    const draft = this.database.draftSubmissions.get(draftLocalId);
    if (!draft) {
      throw new Error("Draft submission not found");
    }
    return this.database.draftSubmissions.upsert({
      ...draft,
      integritySignals,
      syncStatus: "NotSynced",
      updatedAt: nowIso(),
    });
  }

  markSynced(draftLocalId: string, serverId: string, syncedAt: string): MobileSubmission {
    const draft = this.database.draftSubmissions.get(draftLocalId);
    if (!draft) {
      throw new Error("Draft submission not found");
    }
    return this.database.draftSubmissions.upsert({
      ...draft,
      serverId,
      status: "Synced",
      syncStatus: "Synced",
      attachments: draft.attachments.map((attachment) => ({
        ...attachment,
        syncStatus: "Synced",
        lastSyncedAt: syncedAt,
        updatedAt: nowIso(),
      })),
      lastSyncedAt: syncedAt,
      updatedAt: nowIso(),
    });
  }

  markFailed(draftLocalId: string): MobileSubmission {
    const draft = this.database.draftSubmissions.get(draftLocalId);
    if (!draft) {
      throw new Error("Draft submission not found");
    }
    return this.database.draftSubmissions.upsert({
      ...draft,
      status: "Failed",
      syncStatus: "Failed",
      updatedAt: nowIso(),
    });
  }
}

/**
 * Rebuilds the attachment list from a submission's responses. Used both for locally created
 * drafts and for server-returned submissions, which arrive without an attachments array.
 */
export function buildSubmissionAttachments(
  draftLocalId: string,
  responses: MobileSubmissionResponse[],
  existingAttachments: MobileAttachment[] = [],
  timestamp: string = nowIso(),
): MobileAttachment[] {
  return buildDraftAttachments({ draftLocalId, responses, existingAttachments, timestamp });
}

/** Derives the representative location from a submission's responses (GPS/polygon answers). */
export function deriveSubmissionLocation(responses: MobileSubmissionResponse[]): MobileSubmission["location"] | null {
  return deriveDraftLocation(responses);
}

function buildDraftAttachments(input: {
  draftLocalId: string;
  responses: MobileSubmissionResponse[];
  existingAttachments: MobileAttachment[];
  timestamp: string;
}): MobileAttachment[] {
  const existingByLocalId = new Map(input.existingAttachments.map((attachment) => [attachment.localId, attachment]));
  const attachments: MobileAttachment[] = [];

  for (const response of input.responses) {
    collectMediaAttachments({
      draftLocalId: input.draftLocalId,
      questionId: response.questionId,
      value: response.value,
      timestamp: input.timestamp,
      existingByLocalId,
      attachments,
    });
  }

  return attachments;
}

function collectMediaAttachments(input: {
  draftLocalId: string;
  questionId: string;
  value: unknown;
  timestamp: string;
  existingByLocalId: Map<string, MobileAttachment>;
  attachments: MobileAttachment[];
  path?: string[];
}): void {
  const path = input.path ?? [];
  const localId = attachmentLocalId(input.draftLocalId, input.questionId, path);
  const candidate = attachmentCandidate(input.value);
  if (candidate) {
    const existing = input.existingByLocalId.get(localId);
    input.attachments.push({
      id: existing?.id ?? localId,
      localId,
      serverId: existing?.serverId ?? null,
      submissionLocalId: input.draftLocalId,
      activityLocalId: null,
      contextType: "Submission",
      type: candidate.type,
      localUri: candidate.localUri,
      remoteUrl: existing?.remoteUrl ?? null,
      mimeType: candidate.mimeType,
      size: candidate.size,
      encrypted: existing?.encrypted ?? true,
      uploadProgress: existing?.uploadProgress ?? 0,
      errorMessage: existing?.errorMessage ?? null,
      syncStatus: existing?.syncStatus ?? "Queued",
      createdAt: existing?.createdAt ?? input.timestamp,
      updatedAt: input.timestamp,
      lastSyncedAt: existing?.lastSyncedAt ?? null,
      deviceId: existing?.deviceId ?? null,
      conflictStatus: existing?.conflictStatus ?? null,
      deletedAt: existing?.deletedAt ?? null,
    });
    return;
  }

  if (Array.isArray(input.value)) {
    input.value.forEach((item, index) =>
      collectMediaAttachments({
        ...input,
        value: item,
        path: [...path, String(index)],
      }),
    );
    return;
  }

  if (isRecord(input.value)) {
    Object.entries(input.value).forEach(([key, value]) =>
      collectMediaAttachments({
        ...input,
        value,
        path: [...path, key],
      }),
    );
  }
}

function attachmentLocalId(draftLocalId: string, questionId: string, path: string[]): string {
  const suffix = path.length > 0 ? `:${path.join(":")}` : "";
  return `attachment:${draftLocalId}:${questionId}${suffix}`;
}

function attachmentCandidate(value: unknown): {
  type: MobileAttachment["type"];
  localUri: string;
  mimeType: string;
  size: number;
} | null {
  if (!isRecord(value)) return null;
  const localUri = String(value.uri ?? value.localUri ?? "").trim();
  if (!localUri) return null;

  const mimeType = String(value.mimeType ?? value.mime_type ?? inferredMimeType(value) ?? "application/octet-stream").trim();
  const size = parseAttachmentSize(value.fileSize ?? value.file_size ?? value.size);

  return {
    type: attachmentTypeForValue(value, mimeType),
    localUri,
    mimeType,
    size,
  };
}

function attachmentTypeForValue(value: Record<string, unknown>, mimeType: string): MobileAttachment["type"] {
  if (typeof value.durationMillis === "number") return "Audio";
  if (String(value.mediaType ?? "").toLowerCase() === "video" || mimeType.toLowerCase().startsWith("video/")) {
    return "Video";
  }
  if (
    String(value.mediaType ?? "").toLowerCase() === "photo" ||
    mimeType.toLowerCase().startsWith("image/") ||
    typeof value.width === "number" ||
    typeof value.height === "number"
  ) {
    return typeof value.width === "number" || typeof value.height === "number" ? "Photo" : "Signature";
  }
  if (typeof value.capturedAt === "string") return "Signature";
  return "FileUpload";
}

function inferredMimeType(value: Record<string, unknown>): string | null {
  if (typeof value.durationMillis === "number") return "audio/x-m4a";
  if (String(value.mediaType ?? "").toLowerCase() === "video") return "video/mp4";
  if (String(value.mediaType ?? "").toLowerCase() === "photo") return "image/jpeg";
  if (typeof value.capturedAt === "string") return "image/png";
  return null;
}

function parseAttachmentSize(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function locationFromResponseValue(value: unknown): MobileSubmission["location"] | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const nestedLocation = locationFromResponseValue(item);
      if (nestedLocation) return nestedLocation;
    }
    return null;
  }

  if (!isRecord(value)) {
    return null;
  }

  const candidate = value as {
    type?: unknown;
    coordinates?: unknown;
    latitude?: unknown;
    longitude?: unknown;
    altitude?: unknown;
    accuracy?: unknown;
    timestamp?: unknown;
  };

  if (candidate.type === "Polygon" && Array.isArray(candidate.coordinates)) {
    const ring = candidate.coordinates[0];
    const firstVertex = Array.isArray(ring) ? ring[0] : null;
    if (!Array.isArray(firstVertex)) return null;
    const longitude = Number(firstVertex[0]);
    const latitude = Number(firstVertex[1]);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }
    return {
      latitude,
      longitude,
      altitude: null,
      accuracy: null,
      timestamp: nowIso(),
    };
  }

  const latitude = Number(candidate.latitude);
  const longitude = Number(candidate.longitude);
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return {
      latitude,
      longitude,
      altitude: candidate.altitude == null ? null : Number(candidate.altitude),
      accuracy: candidate.accuracy == null ? null : Number(candidate.accuracy),
      timestamp: typeof candidate.timestamp === "string" ? candidate.timestamp : nowIso(),
    };
  }

  for (const nestedValue of Object.values(candidate)) {
    const nestedLocation = locationFromResponseValue(nestedValue);
    if (nestedLocation) {
      return nestedLocation;
    }
  }

  return null;
}

function deriveDraftLocation(responses: MobileSubmissionResponse[]): MobileSubmission["location"] | null {
  for (const response of responses) {
    const location = locationFromResponseValue(response.value);
    if (location) {
      return location;
    }
  }
  return null;
}
