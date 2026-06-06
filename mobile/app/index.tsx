import { useEffect, useState } from "react";
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
import { mobileAppConfig } from "@/config/appConfig";
import { emptyMobileAppState } from "@/state/mobileAppState";
import type { MobileSession } from "@/auth/sessionStore";
import { homeScreen } from "@/screens/placeholderScreens";
import { syncCenterModel } from "@/screens/mvpWorkflowScreens";
import { localDatabase } from "@/storage/localDatabase";

const authService = new AuthService(new ExpoSecureSessionStore());

export default function HomeScreen() {
  const model = homeScreen(emptyMobileAppState);
  const sync = syncCenterModel(emptyMobileAppState);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizationSlug, setOrganizationSlug] = useState("");
  const [session, setSession] = useState<MobileSession | null>(null);
  const [message, setMessage] = useState("Ready for production login.");
  const [isLoading, setIsLoading] = useState(false);

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

  async function login() {
    setIsLoading(true);
    setMessage("Signing in and syncing assigned work...");
    try {
      const nextSession = await authService.login(email.trim(), password, organizationSlug.trim());
      setSession(nextSession);
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
    setMessage("Logged out.");
  }

  const assignmentCount = localDatabase.assignments.list().length;
  const formCount = localDatabase.forms.list().length;
  const entityCount = localDatabase.entities.list().length;
  const queueCount = localDatabase.syncQueue.list().length;

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: "center" }}>
      <Text style={{ fontSize: 24, fontWeight: "600" }}>Atlas FieldOps Mobile</Text>
      <Text style={{ marginTop: 8 }}>Environment: {mobileAppConfig.appEnv}</Text>
      <Text style={{ marginTop: 4 }}>API: {mobileAppConfig.apiBaseUrl}</Text>
      <Text style={{ marginTop: 4 }}>Version: {mobileAppConfig.appVersion}</Text>
      <Text style={{ marginTop: 12, fontSize: 18, fontWeight: "600" }}>{model.title}</Text>
      <Text style={{ marginTop: 8 }}>{model.summary}</Text>

      {session ? (
        <View style={{ marginTop: 20, gap: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: "600" }}>
            Signed in as {session.bootstrap.user.fullName ?? session.bootstrap.user.email ?? "Mobile user"}
          </Text>
          <Text>Organization: {session.bootstrap.organization.name ?? session.bootstrap.organization.slug}</Text>
          <Text>Assignments downloaded: {assignmentCount}</Text>
          <Text>Forms downloaded: {formCount}</Text>
          <Text>Entities downloaded: {entityCount}</Text>
          <Text>Queued sync items: {queueCount}</Text>
          <Pressable
            onPress={logout}
            style={{ marginTop: 12, borderRadius: 10, backgroundColor: "#d33f49", padding: 14 }}
          >
            <Text style={{ color: "white", fontWeight: "700", textAlign: "center" }}>Log out</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ marginTop: 20, gap: 10 }}>
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
            placeholder="Organization slug"
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
              Log in and sync
            </Text>
          </Pressable>
        </View>
      )}

      <Text style={{ marginTop: 18 }}>{message}</Text>
      <Text style={{ marginTop: 20, fontSize: 16, fontWeight: "600" }}>{sync.title}</Text>
      <Text style={{ marginTop: 6 }}>{sync.onlineLabel}</Text>
      <Text style={{ marginTop: 4 }}>{sync.pendingUploads} pending uploads</Text>
      <Text style={{ marginTop: 4 }}>{sync.downloadedAssignments} downloaded assignments</Text>
    </ScrollView>
  );
}
