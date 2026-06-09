import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { createMobileApis } from "@/api/mobileApis";
import { useAppContext } from "@/context/AppContext";
import { useGPS } from "@/hooks/useGPS";
import { usePhotoCapture } from "@/hooks/usePhotoCapture";
import type { MobileVisitRequest } from "@/models/contracts";
import { AuditEventService } from "@/services/auditEventService";
import { localDatabase } from "@/storage/localDatabase";
import { AttachmentSyncService } from "@/sync/attachmentSyncService";
import { SyncQueueService } from "@/sync/syncQueue";
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
      if (isOnline && session.accessToken) {
        const saved = await apis.visitRequests.create(session.accessToken, {
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
      if (isOnline && session.accessToken && visit.serverId) {
        const saved =
          mode === "check-in"
            ? await apis.visitRequests.checkIn(session.accessToken, visit.serverId, {
                accuracy: location.accuracy,
                latitude: location.latitude,
                longitude: location.longitude,
                note: "Arrived at planned visit location.",
                timestamp,
              })
            : await apis.visitRequests.checkOut(session.accessToken, visit.serverId, {
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
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f6faf8" }} edges={["bottom"]}>
      <ScrollView contentContainerStyle={{ gap: 14, padding: 16, paddingBottom: 32 }}>
        <View style={{ gap: 4 }}>
          <Text style={{ color: "#12332b", fontSize: 22, fontWeight: "800" }}>Operations</Text>
          <Text style={{ color: "#49635a", fontSize: 13 }}>
            Request supervisor approval for field movement, meetings, support work, incidents, deliveries, or other organization activities.
          </Text>
        </View>

        <View style={card()}>
          <Text style={heading()}>Request an activity</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -2 }}>
            <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 2 }}>
              {activityTypes.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => setActivityType(option.value)}
                  style={{
                    backgroundColor: activityType === option.value ? "#12332b" : "#f8fbfa",
                    borderColor: "#dbe7e2",
                    borderRadius: 999,
                    borderWidth: 1,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  }}
                >
                  <Text style={{ color: activityType === option.value ? "white" : "#12332b", fontSize: 12, fontWeight: "800" }}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          <TextInput
            onChangeText={setTitle}
            placeholder="Example: Partner coordination visit"
            style={input()}
            value={title}
          />
          <TextInput
            onChangeText={setLocationName}
            placeholder="Place or village"
            style={input()}
            value={locationName}
          />
          <TextInput
            multiline
            onChangeText={setPurpose}
            placeholder="Why do you need to visit?"
            style={[input(), { minHeight: 74, textAlignVertical: "top" }]}
            value={purpose}
          />
          <TextInput
            autoCapitalize="none"
            onChangeText={setRequestedStartAt}
            placeholder="Start time ISO"
            style={input()}
            value={requestedStartAt}
          />
          <TextInput
            autoCapitalize="none"
            onChangeText={setRequestedEndAt}
            placeholder="End time ISO"
            style={input()}
            value={requestedEndAt}
          />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable disabled={gps.isCapturing} onPress={gps.capture} style={[button("#d7efe7"), { flex: 1 }]}>
              <Text style={{ color: "#12332b", fontWeight: "800" }}>{gps.isCapturing ? "Getting GPS" : "Add GPS"}</Text>
            </Pressable>
            <Pressable disabled={saving} onPress={submitRequest} style={[button("#12332b"), { flex: 1 }]}>
              <Text style={{ color: "white", fontWeight: "800" }}>{saving ? "Saving" : "Send request"}</Text>
            </Pressable>
          </View>
          {gps.result ? (
            <Text style={{ color: "#49635a", fontSize: 12 }}>
              GPS added: {gps.result.latitude.toFixed(5)}, {gps.result.longitude.toFixed(5)}
            </Text>
          ) : null}
        </View>

        {message ? <Text style={{ color: "#12332b", fontSize: 13, fontWeight: "700" }}>{message}</Text> : null}

        <View style={{ gap: 10 }}>
          <Text style={heading()}>My operational plan</Text>
          {visits.length === 0 ? (
            <View style={card()}>
              <Text style={{ color: "#49635a" }}>No visit requests yet.</Text>
            </View>
          ) : (
            visits.map((visit) => (
              <View key={visit.localId} style={card()}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#12332b", fontSize: 16, fontWeight: "800" }}>{visit.title}</Text>
                    <Text style={{ color: "#49635a", fontSize: 12 }}>
                      {visit.activityType.replaceAll("_", " ")} · {visit.activityScope} · {visit.locationName}
                    </Text>
                  </View>
                  <Text style={statusStyle(visit.status)}>{visit.status.replaceAll("_", " ")}</Text>
                </View>
                <Text style={{ color: "#49635a", fontSize: 12, marginTop: 8 }}>
                  {new Date(visit.requestedStartAt).toLocaleString()} - {new Date(visit.requestedEndAt).toLocaleString()}
                </Text>
                {visit.supervisorInstructions ? (
                  <Text style={{ color: "#12332b", fontSize: 12, marginTop: 8 }}>Supervisor: {visit.supervisorInstructions}</Text>
                ) : null}
                <Text style={{ color: "#49635a", fontSize: 12, marginTop: 8 }}>
                  GPS: {visit.verificationStatus.replaceAll("_", " ")}
                  {visit.distanceFromPlannedMeters === null ? "" : ` · ${Math.round(visit.distanceFromPlannedMeters)}m`}
                </Text>
                <Text style={{ color: "#49635a", fontSize: 12 }}>
                  Evidence files: {localDatabase.attachments.list().filter((attachment) => attachment.activityLocalId === visit.localId).length}
                </Text>
                <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                  <Pressable
                    disabled={!["approved", "scheduled"].includes(visit.status) || gps.isCapturing}
                    onPress={() => captureVisitEvidence(visit, "check-in")}
                    style={[button("#d7efe7"), { flex: 1, opacity: ["approved", "scheduled"].includes(visit.status) ? 1 : 0.45 }]}
                  >
                    <Text style={{ color: "#12332b", fontWeight: "800" }}>Check in</Text>
                  </Pressable>
                  <Pressable
                    disabled={!visit.checkInAt || gps.isCapturing}
                    onPress={() => captureVisitEvidence(visit, "check-out")}
                    style={[button("#12332b"), { flex: 1, opacity: visit.checkInAt ? 1 : 0.45 }]}
                  >
                    <Text style={{ color: "white", fontWeight: "800" }}>Check out</Text>
                  </Pressable>
                </View>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                  <Pressable
                    disabled={photoCapture.isCapturing}
                    onPress={() => addActivityAttachment(visit, "photo")}
                    style={[button("#ffffff"), { flex: 1 }]}
                  >
                    <Text style={{ color: "#12332b", fontSize: 12, fontWeight: "800" }}>Photo</Text>
                  </Pressable>
                  <Pressable
                    disabled={photoCapture.isCapturing}
                    onPress={() => addActivityAttachment(visit, "video")}
                    style={[button("#ffffff"), { flex: 1 }]}
                  >
                    <Text style={{ color: "#12332b", fontSize: 12, fontWeight: "800" }}>Video</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => addActivityAttachment(visit, "signature")}
                    style={[button("#ffffff"), { flex: 1 }]}
                  >
                    <Text style={{ color: "#12332b", fontSize: 12, fontWeight: "800" }}>Signature</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>

        <Pressable onPress={syncQueue} style={button("#ffffff")}>
          <Text style={{ color: "#12332b", fontWeight: "800", textAlign: "center" }}>Sync visit evidence</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function card() {
  return {
    backgroundColor: "white",
    borderColor: "#dbe7e2",
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  } as const;
}

function heading() {
  return { color: "#12332b", fontSize: 16, fontWeight: "800" as const };
}

function input() {
  return {
    backgroundColor: "#f8fbfa",
    borderColor: "#dbe7e2",
    borderRadius: 12,
    borderWidth: 1,
    color: "#12332b",
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 10,
  } as const;
}

function button(backgroundColor: string) {
  return {
    alignItems: "center" as const,
    backgroundColor,
    borderColor: "#dbe7e2",
    borderRadius: 12,
    borderWidth: backgroundColor === "#ffffff" ? 1 : 0,
    justifyContent: "center" as const,
    minHeight: 46,
    padding: 12,
  };
}

function statusStyle(status: string) {
  const backgroundColor = status === "approved" || status === "completed" ? "#dcfce7" : status === "rejected" || status === "flagged" ? "#fee2e2" : "#fef3c7";
  const color = status === "approved" || status === "completed" ? "#166534" : status === "rejected" || status === "flagged" ? "#991b1b" : "#92400e";
  return {
    backgroundColor,
    borderRadius: 999,
    color,
    fontSize: 11,
    fontWeight: "800" as const,
    overflow: "hidden" as const,
    paddingHorizontal: 8,
    paddingVertical: 4,
    textTransform: "capitalize" as const,
  };
}
