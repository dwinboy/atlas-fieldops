import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { AuthService } from "@/auth/authService";
import { ExpoSecureSessionStore } from "@/auth/expoSecureSessionStore.native";
import type { MobileSession } from "@/auth/sessionStore";
import type { MobileAssignment, MobileEntity, MobileQuestion, MobileSubmission } from "@/models/contracts";
import { DataCollectionSessionService } from "@/forms/dataCollectionSession";
import type { FormValidationIssue } from "@/forms/formValidationService";
import { localDatabase } from "@/storage/localDatabase";
import { BootstrapSyncService } from "@/sync/bootstrapSyncService";
import { NetworkStatusService } from "@/sync/networkStatus";
import { SyncEngine } from "@/sync/syncEngine";

const authService = new AuthService(new ExpoSecureSessionStore());
const bootstrapSyncService = new BootstrapSyncService(localDatabase);
const dataCollection = new DataCollectionSessionService(localDatabase);

type ViewMode = "home" | "entity" | "form";

function cardStyle(tone: "primary" | "neutral" | "warning" = "neutral") {
  return {
    backgroundColor: tone === "primary" ? "#12332b" : tone === "warning" ? "#fff7ed" : "white",
    borderColor: tone === "warning" ? "#fed7aa" : "#dbe7e2",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  };
}

function projectName(projectId: string): string {
  return localDatabase.projects.list().find((project) => project.id === projectId)?.name ?? "Assigned project";
}

function formName(formId: string | null): string {
  if (!formId) {
    return "No form assigned";
  }
  return localDatabase.forms.list().find((form) => form.id === formId)?.name ?? "Assigned form";
}

function formVersionFor(assignment: MobileAssignment) {
  if (!assignment.formVersionId) {
    return null;
  }
  return localDatabase.formVersions.list().find((version) => version.id === assignment.formVersionId) ?? null;
}

function questionsFor(draft: MobileSubmission | null): MobileQuestion[] {
  if (!draft) {
    return [];
  }
  const formVersion = localDatabase.formVersions.list().find((version) => version.id === draft.formVersionId);
  if (!formVersion) {
    return [];
  }
  return formVersion.sections
    .slice()
    .sort((a, b) => a.order - b.order)
    .flatMap((section) => section.questions.slice().sort((a, b) => a.order - b.order));
}

function responseValue(draft: MobileSubmission | null, questionId: string): unknown {
  return draft?.responses.find((response) => response.questionId === questionId)?.value ?? "";
}

function gpsText(location: MobileSubmission["location"]): string {
  if (location?.latitude === null || location?.latitude === undefined || location.longitude === null || location.longitude === undefined) {
    return "";
  }
  return [location.latitude, location.longitude, location.accuracy].filter((item) => item !== null && item !== undefined).join(", ");
}

function parseGps(value: string) {
  const [latitudeText, longitudeText, accuracyText] = value.split(",").map((item) => item.trim());
  const latitude = Number(latitudeText);
  const longitude = Number(longitudeText);
  const accuracy = accuracyText ? Number(accuracyText) : null;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }
  return {
    latitude,
    longitude,
    altitude: null,
    accuracy: Number.isFinite(accuracy) ? accuracy : null,
    timestamp: new Date().toISOString(),
  };
}

export default function HomeScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizationSlug, setOrganizationSlug] = useState("");
  const [session, setSession] = useState<MobileSession | null>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [view, setView] = useState<ViewMode>("home");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [issues, setIssues] = useState<FormValidationIssue[]>([]);
  const [entitySearch, setEntitySearch] = useState("");
  const [locationText, setLocationText] = useState("");

  useEffect(() => {
    authService
      .currentSession()
      .then((current) => {
        setSession(current);
        if (current) {
          setMessage("Session restored from secure storage.");
        }
      })
      .catch(() => setMessage("Session restore failed. Please log in again."));
  }, []);

  const assignments = localDatabase.assignments.list();
  const selectedAssignment = selectedAssignmentId ? localDatabase.assignments.get(selectedAssignmentId) : null;
  const activeDraft = activeDraftId ? localDatabase.draftSubmissions.get(activeDraftId) : null;
  const activeQuestions = questionsFor(activeDraft);
  const formCount = localDatabase.forms.list().length + refreshKey * 0;
  const entityCount = localDatabase.entities.list().length;
  const draftCount = localDatabase.draftSubmissions.list().filter((draft) => draft.status === "Draft").length;
  const queueCount = localDatabase.syncQueue.list().filter((item) => item.status === "Queued" || item.status === "Failed").length;
  const readyAssignments = assignments.filter((assignment) => assignment.formId && assignment.formVersionId).length;

  const assignmentEntities = useMemo(() => {
    if (!selectedAssignment) {
      return [];
    }
    const normalized = entitySearch.trim().toLowerCase();
    return localDatabase.entities
      .list()
      .filter((entity) => selectedAssignment.entityIds.includes(entity.id))
      .filter((entity) => {
        if (!normalized) {
          return true;
        }
        return [entity.entityUid, entity.name, entity.phone, entity.householdId, entity.location.village, entity.location.community]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalized));
      });
  }, [selectedAssignment, entitySearch, refreshKey]);

  async function login() {
    if (!email.trim() || !password || !organizationSlug.trim()) {
      setMessage("Enter your email, password, and organization code exactly as provided by your administrator.");
      return;
    }
    setIsLoading(true);
    setMessage("Signing in...");
    try {
      const nextSession = await authService.login(email.trim(), password, organizationSlug.trim());
      setSession(nextSession);
      setRefreshKey((current) => current + 1);
      setMessage("Login successful. Assigned work synced to this device.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login failed. Check credentials and try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function logout() {
    await authService.logout();
    setSession(null);
    setView("home");
    setActiveDraftId(null);
    setSelectedAssignmentId(null);
    setMessage("Logged out.");
  }

  async function syncAssignedWork() {
    if (!session?.accessToken) {
      setMessage("Sign in before syncing assigned work.");
      return;
    }
    setIsSyncing(true);
    setMessage("Syncing assigned work...");
    try {
      const syncPackage = await bootstrapSyncService.syncAssignedWork(session.accessToken);
      setSession({ ...session, bootstrap: syncPackage.bootstrap });
      setRefreshKey((current) => current + 1);
      setMessage(
        `Sync complete: ${syncPackage.assignments.length} assignment(s), ${syncPackage.forms.length} form(s), ${syncPackage.entities.length} beneficiary record(s).`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sync failed. Check your connection and try again.");
    } finally {
      setIsSyncing(false);
    }
  }

  async function syncQueuedSubmissions() {
    if (!session?.accessToken) {
      setMessage("Sign in before syncing submissions.");
      return;
    }
    setIsSyncing(true);
    setMessage("Uploading queued submissions...");
    try {
      const engine = new SyncEngine(localDatabase, new NetworkStatusService(), async () => session.accessToken);
      const result = await engine.syncNow("Manual");
      setRefreshKey((current) => current + 1);
      setMessage(result.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sync failed. Your records are still stored on this device.");
    } finally {
      setIsSyncing(false);
    }
  }

  function openAssignment(assignment: MobileAssignment) {
    const formVersion = formVersionFor(assignment);
    if (!assignment.formId || !assignment.formVersionId || !formVersion) {
      setMessage("This assignment is waiting for a published mobile form. Sync again or ask your supervisor.");
      return;
    }
    setSelectedAssignmentId(assignment.localId);
    setIssues([]);
    setEntitySearch("");
    if (formVersion.entitySettings.requiresExistingEntity) {
      setView("entity");
      return;
    }
    startDraft(assignment.localId, null);
  }

  function startDraft(assignmentLocalId: string, entityLocalId: string | null) {
    try {
      const result = dataCollection.startForm(assignmentLocalId, entityLocalId);
      setActiveDraftId(result.draft.localId);
      setLocationText(gpsText(result.draft.location));
      setSelectedAssignmentId(assignmentLocalId);
      setView("form");
      setIssues([]);
      setRefreshKey((current) => current + 1);
      setMessage(entityLocalId ? "Beneficiary selected. Complete the form." : "Form started. Complete the questions below.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not start this form.");
    }
  }

  function answer(question: MobileQuestion, value: unknown) {
    if (!activeDraftId) {
      return;
    }
    const updated = dataCollection.answerQuestion(activeDraftId, question.id, question.variableName, value);
    if (question.type === "GPS" && typeof value === "object" && value !== null) {
      localDatabase.draftSubmissions.upsert({ ...updated, location: value as MobileSubmission["location"] });
    }
    setRefreshKey((current) => current + 1);
  }

  function updateDraftLocation(value: string) {
    if (!activeDraft) {
      return;
    }
    setLocationText(value);
    const location = parseGps(value);
    if (!location) {
      return;
    }
    localDatabase.draftSubmissions.upsert({
      ...activeDraft,
      location,
      updatedAt: new Date().toISOString(),
    });
    setRefreshKey((current) => current + 1);
  }

  function submitDraft() {
    if (!activeDraftId) {
      setMessage("No active draft is open.");
      return;
    }
    const draft = localDatabase.draftSubmissions.get(activeDraftId);
    if (
      draft?.location?.latitude === null ||
      draft?.location?.latitude === undefined ||
      draft.location.longitude === null ||
      draft.location.longitude === undefined
    ) {
      setMessage("Record the submission GPS location before queueing.");
      return;
    }
    try {
      const result = dataCollection.submitDraft(activeDraftId);
      setIssues(result.issues);
      if (!result.queued) {
        setMessage("Fix the highlighted questions before submitting.");
        return;
      }
      setView("home");
      setActiveDraftId(null);
      setLocationText("");
      setSelectedAssignmentId(null);
      setRefreshKey((current) => current + 1);
      setMessage("Submission saved and queued. Tap Sync queued submissions when internet is available.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not queue this submission.");
    }
  }

  function renderQuestion(question: MobileQuestion) {
    const value = responseValue(activeDraft, question.id);
    const questionIssues = issues.filter((issue) => issue.questionId === question.id);
    const label = `${question.label}${question.required ? " *" : ""}`;
    const common = (
      <View style={{ gap: 6 }}>
        <Text style={{ color: "#12332b", fontWeight: "800" }}>{label}</Text>
        {question.helpText ? <Text style={{ color: "#49635a" }}>{question.helpText}</Text> : null}
      </View>
    );

    if (["SingleSelect", "Dropdown"].includes(question.type)) {
      return (
        <View key={question.id} style={cardStyle()}>
          {common}
          <View style={{ gap: 8, marginTop: 10 }}>
            {question.options.map((option) => {
              const selected = String(value) === option.value;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => answer(question, option.value)}
                  style={{
                    borderColor: selected ? "#12332b" : "#dbe7e2",
                    borderRadius: 12,
                    borderWidth: 1,
                    padding: 12,
                    backgroundColor: selected ? "#e5f4ee" : "white",
                  }}
                >
                  <Text style={{ color: "#12332b", fontWeight: selected ? "800" : "500" }}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
          {renderIssues(questionIssues)}
        </View>
      );
    }

    if (question.type === "MultiSelect") {
      const values = Array.isArray(value) ? value.map(String) : [];
      return (
        <View key={question.id} style={cardStyle()}>
          {common}
          <View style={{ gap: 8, marginTop: 10 }}>
            {question.options.map((option) => {
              const selected = values.includes(option.value);
              return (
                <Pressable
                  key={option.id}
                  onPress={() =>
                    answer(
                      question,
                      selected ? values.filter((item) => item !== option.value) : [...values, option.value],
                    )
                  }
                  style={{
                    borderColor: selected ? "#12332b" : "#dbe7e2",
                    borderRadius: 12,
                    borderWidth: 1,
                    padding: 12,
                    backgroundColor: selected ? "#e5f4ee" : "white",
                  }}
                >
                  <Text style={{ color: "#12332b", fontWeight: selected ? "800" : "500" }}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
          {renderIssues(questionIssues)}
        </View>
      );
    }

    if (question.type === "Consent") {
      return (
        <View key={question.id} style={cardStyle()}>
          {common}
          <Pressable
            onPress={() => answer(question, value === true ? false : true)}
            style={{
              backgroundColor: value === true ? "#12332b" : "white",
              borderColor: "#12332b",
              borderRadius: 12,
              borderWidth: 1,
              marginTop: 10,
              padding: 12,
            }}
          >
            <Text style={{ color: value === true ? "white" : "#12332b", fontWeight: "800" }}>
              {value === true ? "Consent captured" : "Tap to capture consent"}
            </Text>
          </Pressable>
          {renderIssues(questionIssues)}
        </View>
      );
    }

    if (question.type === "GPS") {
      const textValue =
        typeof value === "object" && value !== null && "latitude" in value
          ? `${String((value as { latitude?: unknown }).latitude ?? "")}, ${String((value as { longitude?: unknown }).longitude ?? "")}`
          : "";
      return (
        <View key={question.id} style={cardStyle()}>
          {common}
          <TextInput
            onChangeText={(text) => {
              const gps = parseGps(text);
              if (gps) {
                answer(question, gps);
              }
            }}
            placeholder="Latitude, longitude, accuracy"
            style={{ borderColor: "#c9d6d0", borderRadius: 10, borderWidth: 1, marginTop: 10, padding: 12 }}
            value={textValue}
          />
          <Text style={{ color: "#49635a", marginTop: 6 }}>
            Native GPS capture is prepared in the architecture; this field accepts coordinates until the device GPS module is connected.
          </Text>
          {renderIssues(questionIssues)}
        </View>
      );
    }

    if (["Photo", "Audio", "Video", "FileUpload", "Signature", "Barcode", "QRCode"].includes(question.type)) {
      return (
        <View key={question.id} style={cardStyle("warning")}>
          {common}
          <Text style={{ color: "#9a3412", marginTop: 10 }}>
            {question.type} capture is prepared in the mobile contract. Device capture UI is the next native integration step.
          </Text>
          {renderIssues(questionIssues)}
        </View>
      );
    }

    return (
      <View key={question.id} style={cardStyle()}>
        {common}
        <TextInput
          editable={!question.readOnly}
          keyboardType={["Number", "Decimal", "Currency"].includes(question.type) ? "numeric" : "default"}
          multiline={question.type === "LongText"}
          onChangeText={(text) => answer(question, ["Number", "Decimal", "Currency"].includes(question.type) ? Number(text) : text)}
          placeholder="Enter answer"
          style={{
            borderColor: "#c9d6d0",
            borderRadius: 10,
            borderWidth: 1,
            marginTop: 10,
            minHeight: question.type === "LongText" ? 86 : 44,
            padding: 12,
          }}
          value={String(value ?? "")}
        />
        {renderIssues(questionIssues)}
      </View>
    );
  }

  function renderIssues(questionIssues: FormValidationIssue[]) {
    if (!questionIssues.length) {
      return null;
    }
    return (
      <View style={{ gap: 4, marginTop: 10 }}>
        {questionIssues.map((issue) => (
          <Text key={`${issue.questionId}-${issue.message}`} style={{ color: issue.severity === "Error" ? "#b42318" : "#9a3412" }}>
            {issue.message}
          </Text>
        ))}
      </View>
    );
  }

  if (!session) {
    return (
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          padding: 24,
          backgroundColor: "#f6faf8",
        }}
      >
        <View style={{ gap: 18 }}>
          <Text style={{ color: "#12332b", fontSize: 28, fontWeight: "800" }}>Atlas FieldOps</Text>

          <View style={{ backgroundColor: "white", borderColor: "#dbe7e2", borderRadius: 16, borderWidth: 1, gap: 12, padding: 16 }}>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="Email"
              style={{ borderColor: "#c9d6d0", borderRadius: 10, borderWidth: 1, padding: 12 }}
              value={email}
            />
            <TextInput
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry
              style={{ borderColor: "#c9d6d0", borderRadius: 10, borderWidth: 1, padding: 12 }}
              value={password}
            />
            <TextInput
              autoCapitalize="none"
              onChangeText={setOrganizationSlug}
              placeholder="Organization code"
              style={{ borderColor: "#c9d6d0", borderRadius: 10, borderWidth: 1, padding: 12 }}
              value={organizationSlug}
            />
            <Pressable
              disabled={isLoading}
              onPress={login}
              style={{
                alignItems: "center",
                borderRadius: 10,
                backgroundColor: isLoading ? "#8aa79b" : "#12332b",
                flexDirection: "row",
                justifyContent: "center",
                minHeight: 48,
                padding: 14,
              }}
            >
              {isLoading ? <ActivityIndicator color="white" /> : null}
              <Text style={{ color: "white", fontWeight: "700", marginLeft: isLoading ? 8 : 0 }}>
                Sign in
              </Text>
            </Pressable>
          </View>

          {message ? <Text style={{ color: message.includes("successful") ? "#0f766e" : "#9a3412" }}>{message}</Text> : null}
        </View>
      </ScrollView>
    );
  }

  if (view === "entity" && selectedAssignment) {
    const formVersion = formVersionFor(selectedAssignment);
    return (
      <ScrollView contentContainerStyle={{ gap: 14, padding: 20, paddingBottom: 32, backgroundColor: "#f6faf8" }}>
        <Pressable onPress={() => setView("home")}>
          <Text style={{ color: "#12332b", fontWeight: "800" }}>Back to assigned work</Text>
        </Pressable>
        <View style={cardStyle("primary")}>
          <Text style={{ color: "white", fontSize: 18, fontWeight: "800" }}>Select beneficiary</Text>
          <Text style={{ color: "#d7efe7", marginTop: 6 }}>
            {formName(selectedAssignment.formId)} requires an existing {formVersion?.entitySettings.entityType ?? "beneficiary"}.
          </Text>
        </View>
        <TextInput
          autoCapitalize="none"
          onChangeText={setEntitySearch}
          placeholder="Search by name, ID, phone, household, or village"
          style={{ backgroundColor: "white", borderColor: "#c9d6d0", borderRadius: 12, borderWidth: 1, padding: 12 }}
          value={entitySearch}
        />
        {assignmentEntities.length ? (
          assignmentEntities.map((entity: MobileEntity) => (
            <Pressable key={entity.localId} onPress={() => startDraft(selectedAssignment.localId, entity.localId)} style={cardStyle()}>
              <Text style={{ color: "#12332b", fontSize: 16, fontWeight: "800" }}>{entity.name}</Text>
              <Text style={{ color: "#49635a", marginTop: 4 }}>{entity.entityUid}</Text>
              <Text style={{ color: "#49635a", marginTop: 4 }}>
                {entity.location.village ?? entity.location.community ?? entity.location.district ?? "No location"}{entity.phone ? ` · ${entity.phone}` : ""}
              </Text>
            </Pressable>
          ))
        ) : (
          <View style={cardStyle("warning")}>
            <Text style={{ color: "#9a3412", fontWeight: "800" }}>No assigned beneficiaries found</Text>
            <Text style={{ color: "#9a3412", marginTop: 6 }}>Sync assigned work or ask your supervisor to assign beneficiaries.</Text>
          </View>
        )}
      </ScrollView>
    );
  }

  if (view === "form" && activeDraft) {
    const form = localDatabase.forms.list().find((item) => item.id === activeDraft.formId);
    return (
      <ScrollView contentContainerStyle={{ gap: 14, padding: 20, paddingBottom: 32, backgroundColor: "#f6faf8" }}>
        <Pressable onPress={() => setView("home")}>
          <Text style={{ color: "#12332b", fontWeight: "800" }}>Back to assigned work</Text>
        </Pressable>
        <View style={cardStyle("primary")}>
          <Text style={{ color: "white", fontSize: 18, fontWeight: "800" }}>{form?.name ?? "Mobile form"}</Text>
          <Text style={{ color: "#d7efe7", marginTop: 6 }}>
            Answer the questions below. Your draft is saved on this device.
          </Text>
        </View>
        <View style={cardStyle()}>
          <Text style={{ color: "#12332b", fontWeight: "800" }}>Record location *</Text>
          <Text style={{ color: "#49635a", marginTop: 6 }}>
            Enter latitude, longitude, and optional accuracy. This is required before sync.
          </Text>
          <TextInput
            onChangeText={updateDraftLocation}
            placeholder="Latitude, longitude, accuracy"
            style={{ borderColor: "#c9d6d0", borderRadius: 10, borderWidth: 1, marginTop: 10, padding: 12 }}
            value={locationText || gpsText(activeDraft.location)}
          />
        </View>
        {activeQuestions.length ? activeQuestions.map(renderQuestion) : (
          <View style={cardStyle("warning")}>
            <Text style={{ color: "#9a3412", fontWeight: "800" }}>No questions downloaded</Text>
            <Text style={{ color: "#9a3412", marginTop: 6 }}>Sync this assignment again or check the published form.</Text>
          </View>
        )}
        <Pressable onPress={submitDraft} style={{ ...cardStyle("primary"), alignItems: "center" }}>
          <Text style={{ color: "white", fontWeight: "800" }}>Save and queue submission</Text>
        </Pressable>
        {message ? <Text style={{ color: message.includes("Fix") ? "#9a3412" : "#0f766e" }}>{message}</Text> : null}
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ gap: 16, padding: 20, paddingBottom: 32, backgroundColor: "#f6faf8" }}>
      <View style={{ gap: 6 }}>
        <Text style={{ color: "#12332b", fontSize: 26, fontWeight: "800" }}>Atlas FieldOps</Text>
        <Text style={{ color: "#49635a" }}>
          {session.bootstrap.user.fullName ?? session.bootstrap.user.email ?? "Mobile user"}
        </Text>
        <Text style={{ color: "#49635a" }}>
          {session.bootstrap.organization.name ?? session.bootstrap.organization.slug}
        </Text>
      </View>

      <View style={cardStyle("primary")}>
        <Text style={{ color: "white", fontSize: 18, fontWeight: "800" }}>Today's field work</Text>
        <Text style={{ color: "#d7efe7", marginTop: 6 }}>
          Sync first, open your assigned work, collect records, then sync submissions when internet is available.
        </Text>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
          <Pressable
            disabled={isSyncing}
            onPress={syncAssignedWork}
            style={{ alignItems: "center", backgroundColor: "white", borderRadius: 12, flex: 1, minHeight: 46, justifyContent: "center", padding: 12 }}
          >
            <Text style={{ color: "#12332b", fontWeight: "800" }}>{isSyncing ? "Syncing..." : "Sync work"}</Text>
          </Pressable>
          <Pressable
            disabled={isSyncing}
            onPress={syncQueuedSubmissions}
            style={{ alignItems: "center", backgroundColor: "#d7efe7", borderRadius: 12, flex: 1, minHeight: 46, justifyContent: "center", padding: 12 }}
          >
            <Text style={{ color: "#12332b", fontWeight: "800" }}>Sync queue</Text>
          </Pressable>
        </View>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {[
          ["Assignments", assignments.length],
          ["Ready forms", readyAssignments],
          ["Beneficiaries", entityCount],
          ["Drafts", draftCount],
          ["Sync queue", queueCount],
          ["Forms", formCount],
        ].map(([label, value]) => (
          <View key={label} style={{ ...cardStyle(), minWidth: "30%", flexGrow: 1 }}>
            <Text style={{ color: "#49635a", fontSize: 12, fontWeight: "700" }}>{label}</Text>
            <Text style={{ color: "#12332b", fontSize: 22, fontWeight: "800", marginTop: 4 }}>{value}</Text>
          </View>
        ))}
      </View>

      <View style={cardStyle()}>
        <Text style={{ color: "#12332b", fontSize: 18, fontWeight: "800" }}>Assigned work</Text>
        {assignments.length === 0 ? (
          <View style={{ ...cardStyle("warning"), marginTop: 12 }}>
            <Text style={{ color: "#9a3412", fontWeight: "800" }}>No assigned work on this device</Text>
            <Text style={{ color: "#9a3412", marginTop: 6 }}>
              Ask your supervisor to assign a published project form, then tap Sync work.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10, marginTop: 12 }}>
            {assignments.map((assignment) => {
              const ready = Boolean(assignment.formId && assignment.formVersionId);
              return (
                <Pressable key={assignment.localId} onPress={() => openAssignment(assignment)} style={cardStyle(ready ? "neutral" : "warning")}>
                  <Text style={{ color: "#12332b", fontSize: 16, fontWeight: "800" }}>
                    {formName(assignment.formId)}
                  </Text>
                  <Text style={{ color: "#49635a", marginTop: 4 }}>{projectName(assignment.projectId)}</Text>
                  <Text style={{ color: "#49635a", marginTop: 4 }}>
                    Progress: {assignment.completedCount} of {assignment.targetCount || assignment.entityIds.length || 0}
                  </Text>
                  <Text style={{ color: ready ? "#0f766e" : "#9a3412", fontWeight: "700", marginTop: 8 }}>
                    {ready ? "Tap to start data collection" : "Waiting for a published mobile form"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      <View style={cardStyle()}>
        <Text style={{ color: "#12332b", fontSize: 18, fontWeight: "800" }}>Sync status</Text>
        <Text style={{ color: "#49635a", marginTop: 6 }}>
          Queued or failed submissions stay on this device until they sync successfully.
        </Text>
        <Text style={{ color: queueCount > 0 ? "#9a3412" : "#0f766e", fontWeight: "800", marginTop: 10 }}>
          {queueCount > 0 ? `${queueCount} item(s) need sync` : "No pending uploads"}
        </Text>
      </View>

      {isSyncing ? <ActivityIndicator color="#12332b" /> : null}
      {message ? (
        <Text style={{ color: message.includes("failed") || message.includes("No assigned") ? "#9a3412" : "#0f766e" }}>
          {message}
        </Text>
      ) : null}

      <Pressable
        onPress={logout}
        style={{ borderRadius: 12, borderColor: "#d33f49", borderWidth: 1, padding: 14 }}
      >
        <Text style={{ color: "#d33f49", fontWeight: "800", textAlign: "center" }}>Log out</Text>
      </Pressable>
    </ScrollView>
  );
}
