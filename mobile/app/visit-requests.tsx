import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Camera,
  ClipboardList,
  LogIn,
  LogOut,
  MapPin,
  Navigation,
  PenLine,
  RefreshCw,
  Send,
  Video,
} from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Badge, Button, Card, EmptyState, Input, SectionHeader } from "@/components/ui";
import { DateTimeField } from "@/components/ui/DateTimeField";
import { createMobileApis } from "@/api/mobileApis";
import { useAppContext } from "@/context/AppContext";
import { useGPS } from "@/hooks/useGPS";
import { usePhotoCapture } from "@/hooks/usePhotoCapture";
import type { MobileVisitRequest } from "@/models/contracts";
import { AuditEventService } from "@/services/auditEventService";
import { localDatabase } from "@/storage/localDatabase";
import { AttachmentSyncService } from "@/sync/attachmentSyncService";
import { SyncQueueService } from "@/sync/syncQueue";
import { colors, fontFamily, radii, spacing, type Tone, typography } from "@/theme";
import { createLocalId, nowIso } from "@/utils/ids";

const apis = createMobileApis();
const audit = new AuditEventService(localDatabase);
const attachments = new AttachmentSyncService(localDatabase);
const queue = new SyncQueueService(localDatabase);
const activityTypes: Array<{ label: string; value: MobileVisitRequest["activityType"] }> = [
  { label: "Field visit", value: "field_visit" },
  { label: "Office visit", value: "office_visit" },
  { label: "Stakeholder meeting", value: "stakeholder_meeting" },
  { label: "Training support", value: "training_support" },
  { label: "Incident report", value: "incident_report" },
  { label: "Equipment delivery", value: "equipment_delivery" },
  { label: "Partner coordination", value: "partner_coordination" },
  { label: "Observation", value: "general_observation" },
];

export default function VisitRequestsScreen() {
  const router = useRouter();
  const { session, refresh, refreshKey, isOnline, syncQueue } = useAppContext();
  const gps = useGPS();
  const photoCapture = usePhotoCapture();
  const [title, setTitle] = useState("");
  const [purpose, setPurpose] = useState("");
  const [locationName, setLocationName] = useState("");
  const [requestedStartAt, setRequestedStartAt] = useState(() => new Date(Date.now() + 60 * 60 * 1000).toISOString());
  const [requestedEndAt, setRequestedEndAt] = useState(() => new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString());
  const [activityType, setActivityType] = useState<MobileVisitRequest["activityType"]>("field_visit");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  if (!session) {
    router.replace("/login");
    return null;
  }

  const accessToken = session.accessToken;

  const visits = useMemo(
    () => localDatabase.visitRequests.list().sort((a, b) => b.requestedStartAt.localeCompare(a.requestedStartAt)),
    [refreshKey],
  );
  const officer = localDatabase.officerProfiles.list()[0] ?? session.bootstrap?.fieldOfficerProfile ?? null;
  const organizationId = session.bootstrap?.organization.id ?? "";
  const projects = localDatabase.projects.list();
  const firstProject = projects[0] ?? null;

  async function submitRequest() {
    if (!title.trim() || !locationName.trim()) {
      setMessage("Add a visit title and the place you need to visit.");
      return;
    }
    if (new Date(requestedEndAt).getTime() <= new Date(requestedStartAt).getTime()) {
      setMessage("The end time must be after the start time.");
      return;
    }
    setSaving(true);
    const location = gps.result;
    try {
      if (isOnline && accessToken) {
        const saved = await apis.visitRequests.create(accessToken, {
          beneficiaryId: null,
          activityScope: firstProject ? "project" : "organization",
          activityType,
          latitude: location?.latitude ?? null,
          longitude: location?.longitude ?? null,
          locationName: locationName.trim(),
          plannedActivities: [],
          priority: "normal",
          projectId: firstProject?.id ?? null,
          purpose: purpose.trim() || null,
          requiresApproval: true,
          requestedEndAt,
          requestedStartAt,
          title: title.trim(),
        });
        localDatabase.visitRequests.upsert(saved);
      } else {
        const localId = createLocalId("visit");
        const timestamp = nowIso();
        const localVisit: MobileVisitRequest = {
          id: localId,
          localId,
          serverId: null,
          syncStatus: "Queued",
          createdAt: timestamp,
          updatedAt: timestamp,
          lastSyncedAt: null,
          deviceId: null,
          conflictStatus: null,
          deletedAt: null,
          organizationId,
          projectId: firstProject?.id ?? null,
          beneficiaryId: null,
          fieldOfficerId: officer?.id ?? localId,
          supervisorUserId: officer?.supervisorId ?? null,
          title: title.trim(),
          activityType,
          activityScope: firstProject ? "project" : "organization",
          requiresApproval: true,
          purpose: purpose.trim() || null,
          locationName: locationName.trim(),
          latitude: location?.latitude ?? null,
          longitude: location?.longitude ?? null,
          requestedStartAt,
          requestedEndAt,
          priority: "normal",
          status: "pending",
          requiredFormIds: [],
          plannedActivities: [],
          supervisorInstructions: null,
          reviewedByUserId: null,
          reviewedAt: null,
          checkInAt: null,
          checkInLatitude: null,
          checkInLongitude: null,
          checkInAccuracy: null,
          checkInNote: null,
          checkOutAt: null,
          checkOutLatitude: null,
          checkOutLongitude: null,
          checkOutAccuracy: null,
          checkOutSummary: null,
          verificationStatus: "not_checked_in",
          distanceFromPlannedMeters: null,
          metadata: {},
        };
        localDatabase.visitRequests.upsert(localVisit);
        queue.enqueue("CREATE_VISIT_REQUEST", { visitLocalId: localId });
      }
      audit.queue("mobile.operational_activity_requested", { activityType, locationName, requestedStartAt });
      setTitle("");
      setPurpose("");
      setLocationName("");
      setMessage("Visit request saved. Your supervisor will see it after sync.");
      refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Visit request could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function captureVisitEvidence(visit: MobileVisitRequest, mode: "check-in" | "check-out") {
    if (!["approved", "scheduled", "checked_in", "flagged"].includes(visit.status)) {
      setMessage("This visit must be approved by your supervisor before GPS evidence can be sent.");
      return;
    }
    const location = await gps.capture();
    if (!location) {
      setMessage(gps.error ?? "GPS could not be captured. Move to an open area and try again.");
      return;
    }
    const timestamp = location.timestamp;
    try {
      if (isOnline && accessToken && visit.serverId) {
        const saved =
          mode === "check-in"
            ? await apis.visitRequests.checkIn(accessToken, visit.serverId, {
                accuracy: location.accuracy,
                latitude: location.latitude,
                longitude: location.longitude,
                note: "Arrived at planned visit location.",
                timestamp,
              })
            : await apis.visitRequests.checkOut(accessToken, visit.serverId, {
                accuracy: location.accuracy,
                latitude: location.latitude,
                longitude: location.longitude,
                summary: "Visit completed from mobile.",
                timestamp,
              });
        localDatabase.visitRequests.upsert(saved);
      } else {
        localDatabase.visitRequests.upsert({
          ...visit,
          status: mode === "check-in" ? "checked_in" : "completed",
          syncStatus: "Queued",
          updatedAt: nowIso(),
          checkInAt: mode === "check-in" ? timestamp : visit.checkInAt,
          checkInLatitude: mode === "check-in" ? location.latitude : visit.checkInLatitude,
          checkInLongitude: mode === "check-in" ? location.longitude : visit.checkInLongitude,
          checkInAccuracy: mode === "check-in" ? location.accuracy : visit.checkInAccuracy,
          checkOutAt: mode === "check-out" ? timestamp : visit.checkOutAt,
          checkOutLatitude: mode === "check-out" ? location.latitude : visit.checkOutLatitude,
          checkOutLongitude: mode === "check-out" ? location.longitude : visit.checkOutLongitude,
          checkOutAccuracy: mode === "check-out" ? location.accuracy : visit.checkOutAccuracy,
        });
        queue.enqueue(mode === "check-in" ? "VISIT_CHECK_IN" : "VISIT_CHECK_OUT", {
          accuracy: location.accuracy,
          latitude: location.latitude,
          longitude: location.longitude,
          timestamp,
          visitLocalId: visit.localId,
        });
      }
      audit.queue(mode === "check-in" ? "mobile.visit_checked_in" : "mobile.visit_checked_out", {
        accuracy: location.accuracy,
        visitRequestId: visit.id,
      });
      setMessage(mode === "check-in" ? "Check-in saved and ready for supervisor review." : "Check-out saved.");
      refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Visit evidence could not be saved.");
    }
  }

  async function addActivityAttachment(visit: MobileVisitRequest, type: "photo" | "video" | "signature") {
    if (!["approved", "scheduled", "checked_in", "flagged", "completed", "change_requested"].includes(visit.status)) {
      setMessage("Your supervisor must approve this activity before evidence can be attached.");
      return;
    }
    if (type === "signature") {
      attachments.addAttachment({
        activityLocalId: visit.localId,
        contextType: "OperationalActivity",
        localUri: `signature://${visit.localId}/${Date.now()}`,
        mimeType: "application/vnd.atlas.signature",
        size: 0,
        type: "Signature",
      });
      audit.queue("mobile.operational_activity_signature_queued", { visitRequestId: visit.id });
      setMessage("Signature evidence queued. Sync when online so the supervisor can review it.");
      refresh();
      return;
    }
    const captured = await photoCapture.takePhoto(type);
    if (!captured) {
      setMessage(photoCapture.error ?? `Could not capture ${type} evidence.`);
      return;
    }
    attachments.addAttachment({
      activityLocalId: visit.localId,
      contextType: "OperationalActivity",
      localUri: captured.uri,
      mimeType: captured.mimeType,
      size: captured.fileSize ?? 0,
      type: type === "video" ? "Video" : "Photo",
    });
    audit.queue("mobile.operational_activity_attachment_queued", { mediaType: type, visitRequestId: visit.id });
    setMessage(`${type === "video" ? "Video" : "Photo"} evidence queued. Sync when online so the supervisor can review it.`);
    refresh();
  }

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Operations</Text>
          <Text style={styles.headerSubtitle}>
            Request supervisor approval for field movement, meetings, support work, incidents, deliveries, or other organization activities.
          </Text>
        </View>

        <Card padding="lg" style={{ gap: spacing.md }}>
          <SectionHeader title="Request an activity" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -2 }}>
            <View style={styles.chipRow}>
              {activityTypes.map((option) => {
                const active = activityType === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setActivityType(option.value)}
                    style={[styles.chip, active ? styles.chipActive : null]}
                  >
                    <Text style={[styles.chipLabel, active ? styles.chipLabelActive : null]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <Input value={title} onChangeText={setTitle} placeholder="Example: Partner coordination visit" />
          <Input value={locationName} onChangeText={setLocationName} placeholder="Place or village" />
          <Input
            multiline
            value={purpose}
            onChangeText={setPurpose}
            placeholder="Why do you need to visit?"
          />

          <View style={{ gap: spacing.xs }}>
            <Text style={styles.fieldLabel}>Start time</Text>
            <DateTimeField mode="datetime" value={isoToFieldValue(requestedStartAt)} onChange={(v) => setRequestedStartAt(fieldValueToIso(v, requestedStartAt))} />
          </View>
          <View style={{ gap: spacing.xs }}>
            <Text style={styles.fieldLabel}>End time</Text>
            <DateTimeField mode="datetime" value={isoToFieldValue(requestedEndAt)} onChange={(v) => setRequestedEndAt(fieldValueToIso(v, requestedEndAt))} />
          </View>

          <View style={styles.actionsRow}>
            <Button
              variant="secondary"
              leftIcon={<Navigation size={16} color={colors.foreground} />}
              loading={gps.isCapturing}
              onPress={gps.capture}
              style={{ flex: 1 }}
            >
              {gps.isCapturing ? "Getting GPS" : "Add GPS"}
            </Button>
            <Button
              variant="primary"
              leftIcon={<Send size={16} color={colors.primaryForeground} />}
              loading={saving}
              onPress={submitRequest}
              style={{ flex: 1 }}
            >
              {saving ? "Saving" : "Send request"}
            </Button>
          </View>
          {gps.result ? (
            <Text style={styles.gpsText}>
              GPS added: {gps.result.latitude.toFixed(5)}, {gps.result.longitude.toFixed(5)}
            </Text>
          ) : null}
        </Card>

        {message ? <Text style={styles.message}>{message}</Text> : null}

        <View style={{ gap: spacing.sm }}>
          <SectionHeader title="My operational plan" />
          {visits.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No visit requests yet" description="Activities you request will appear here." />
          ) : (
            visits.map((visit) => {
              const evidenceCount = localDatabase.attachments.list().filter((attachment) => attachment.activityLocalId === visit.localId).length;
              const canCheckIn = ["approved", "scheduled"].includes(visit.status);
              const canCheckOut = Boolean(visit.checkInAt);
              return (
                <Card key={visit.localId} padding="lg" style={{ gap: spacing.sm }}>
                  <View style={styles.visitTitleRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.visitTitle}>{visit.title}</Text>
                      <Text style={styles.visitMeta}>
                        {visit.activityType.replaceAll("_", " ")} · {visit.activityScope} · {visit.locationName}
                      </Text>
                    </View>
                    <Badge label={visit.status.replaceAll("_", " ")} tone={statusTone(visit.status)} />
                  </View>

                  <View style={styles.metaRow}>
                    <MapPin size={14} color={colors.mutedForeground} />
                    <Text style={styles.visitMeta}>
                      {new Date(visit.requestedStartAt).toLocaleString()} - {new Date(visit.requestedEndAt).toLocaleString()}
                    </Text>
                  </View>

                  {visit.supervisorInstructions ? (
                    <Text style={styles.supervisorNote}>Supervisor: {visit.supervisorInstructions}</Text>
                  ) : null}

                  <Text style={styles.visitMeta}>
                    GPS: {visit.verificationStatus.replaceAll("_", " ")}
                    {visit.distanceFromPlannedMeters === null ? "" : ` · ${Math.round(visit.distanceFromPlannedMeters)}m`}
                  </Text>
                  <Text style={styles.visitMeta}>Evidence files: {evidenceCount}</Text>

                  <View style={styles.actionsRow}>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={!canCheckIn || gps.isCapturing}
                      leftIcon={<LogIn size={16} color={colors.foreground} />}
                      onPress={() => captureVisitEvidence(visit, "check-in")}
                      style={{ flex: 1 }}
                    >
                      Check in
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={!canCheckOut || gps.isCapturing}
                      leftIcon={<LogOut size={16} color={colors.primaryForeground} />}
                      onPress={() => captureVisitEvidence(visit, "check-out")}
                      style={{ flex: 1 }}
                    >
                      Check out
                    </Button>
                  </View>
                  <View style={styles.actionsRow}>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={photoCapture.isCapturing}
                      leftIcon={<Camera size={16} color={colors.foreground} />}
                      onPress={() => addActivityAttachment(visit, "photo")}
                      style={{ flex: 1 }}
                    >
                      Photo
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={photoCapture.isCapturing}
                      leftIcon={<Video size={16} color={colors.foreground} />}
                      onPress={() => addActivityAttachment(visit, "video")}
                      style={{ flex: 1 }}
                    >
                      Video
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<PenLine size={16} color={colors.foreground} />}
                      onPress={() => addActivityAttachment(visit, "signature")}
                      style={{ flex: 1 }}
                    >
                      Signature
                    </Button>
                  </View>
                </Card>
              );
            })
          )}
        </View>

        <Button variant="secondary" leftIcon={<RefreshCw size={16} color={colors.foreground} />} onPress={syncQueue}>
          Sync visit evidence
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

function statusTone(status: string): Tone {
  if (status === "approved" || status === "completed") return "success";
  if (status === "rejected" || status === "flagged") return "danger";
  return "warning";
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function isoToFieldValue(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const mo = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  const h = pad2(date.getHours());
  const mi = pad2(date.getMinutes());
  return `${y}-${mo}-${d} ${h}:${mi}`;
}

function fieldValueToIso(value: string, fallback: string): string {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})$/);
  if (!match) return fallback;
  const [, y, mo, d, h, mi] = match;
  return new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi)).toISOString();
}

const styles = StyleSheet.create({
  actionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: colors.muted,
    borderColor: colors.border,
    borderRadius: radii.full,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipLabel: {
    ...typography.small,
    color: colors.foreground,
    fontFamily: fontFamily.semibold,
    fontWeight: "700",
  },
  chipLabelActive: {
    color: colors.primaryForeground,
  },
  chipRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: 2,
  },
  content: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing["3xl"],
  },
  fieldLabel: {
    ...typography.small,
    color: colors.mutedForeground,
    fontFamily: fontFamily.medium,
    fontWeight: "500",
  },
  gpsText: {
    ...typography.small,
    color: colors.mutedForeground,
  },
  header: {
    gap: spacing.xs,
  },
  headerSubtitle: {
    ...typography.small,
    color: colors.mutedForeground,
  },
  headerTitle: {
    ...typography.display,
    color: colors.foreground,
    fontFamily: fontFamily.semibold,
  },
  message: {
    ...typography.small,
    color: colors.foreground,
    fontFamily: fontFamily.semibold,
    fontWeight: "700",
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  supervisorNote: {
    ...typography.small,
    color: colors.foreground,
  },
  visitMeta: {
    ...typography.small,
    color: colors.mutedForeground,
  },
  visitTitle: {
    ...typography.headingSm,
    color: colors.foreground,
    fontFamily: fontFamily.semibold,
  },
  visitTitleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
});
