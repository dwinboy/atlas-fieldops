import { createMobileApis } from "@/api/mobileApis";
import type { MobileSession, SecureSessionStore } from "@/auth/sessionStore";
import { AuditEventService } from "@/services/auditEventService";
import { DeviceRegistrationService } from "@/services/deviceRegistrationService";
import { localDatabase, LocalDatabase } from "@/storage/localDatabase";
import { BootstrapSyncService } from "@/sync/bootstrapSyncService";

function generatedDeviceId(email: string, organizationSlug: string): string {
  const input = `${organizationSlug}:${email}`.toLowerCase();
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return `atlas-android-${hash.toString(16).padStart(8, "0")}`;
}

function expiresAtFromSeconds(expiresIn: number | null): string | null {
  if (!expiresIn) return null;
  return new Date(Date.now() + expiresIn * 1000).toISOString();
}

function extractQrToken(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("The QR code is empty. Ask your supervisor to open your field officer profile and show the mobile QR code.");
  }
  if (trimmed.startsWith("{")) {
    try {
      const data = JSON.parse(trimmed) as { token?: unknown; qr_token?: unknown; qrToken?: unknown };
      const token = data.token ?? data.qr_token ?? data.qrToken;
      if (typeof token === "string") {
        return token.trim();
      }
    } catch {
      throw new Error("This QR code is not a valid Atlas FieldOps login code.");
    }
  }
  const tokenMatch = trimmed.match(/[?&]token=([^&]+)/);
  if (tokenMatch?.[1]) {
    return decodeURIComponent(tokenMatch[1]);
  }
  return trimmed;
}

type MobileToken = {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number | null;
  tokenType: string;
};

export class AuthService {
  constructor(
    private readonly store: SecureSessionStore,
    private readonly apis = createMobileApis(),
    private readonly database: LocalDatabase = localDatabase,
    private readonly devices = new DeviceRegistrationService(apis),
  ) {}

  async login(email: string, password: string, organizationSlug: string): Promise<MobileSession> {
    const token = await this.apis.auth.login({ email, password, organizationSlug });
    const deviceId = generatedDeviceId(email, organizationSlug);
    return this.startAuthenticatedSession(token, deviceId, organizationSlug, "mobile.login");
  }

  async loginWithQr(qrPayload: string): Promise<MobileSession> {
    const qrToken = extractQrToken(qrPayload);
    const token = await this.apis.auth.loginWithQr(qrToken);
    const deviceId = generatedDeviceId(qrToken, "qr-login");
    return this.startAuthenticatedSession(token, deviceId, "qr-login", "mobile.qr_login");
  }

  private async startAuthenticatedSession(
    token: MobileToken,
    deviceId: string,
    organizationSlug: string,
    auditAction: string,
  ): Promise<MobileSession> {
    // Device registration is best-effort — it tracks device info but is not
    // required for the field officer to collect data offline.
    try {
      await this.devices.register(token.accessToken, {
        deviceId,
        deviceName: "Atlas FieldOps Android",
        osVersion: null,
      });
    } catch {
      // Non-blocking: continue login even if device registration fails.
    }

    const syncPackage = await new BootstrapSyncService(this.database, this.apis).syncAssignedWork(token.accessToken);
    if (syncPackage.bootstrap.blockedState.blocked) {
      const message = syncPackage.bootstrap.blockedState.reason ?? "This mobile account is blocked. Contact your supervisor.";
      new AuditEventService(this.database).queue("mobile.permission_denied", { deviceId, organizationSlug, reason: message });
      throw new Error(message);
    }

    new AuditEventService(this.database).queue(auditAction, { deviceId, organizationSlug });
    const session: MobileSession = {
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      bootstrap: syncPackage.bootstrap,
      expiresAt: expiresAtFromSeconds(token.expiresIn),
    };
    await this.store.save(session);
    return session;
  }

  async currentSession(): Promise<MobileSession | null> {
    const session = await this.store.load();
    if (!session) return null;
    const expiresAt = session.expiresAt ? new Date(session.expiresAt).getTime() : null;
    if (expiresAt && expiresAt <= Date.now() + 60_000) {
      if (!session.refreshToken) {
        await this.store.clear();
        return null;
      }
      try {
        const token = await this.apis.auth.refresh(session.refreshToken);
        const refreshed: MobileSession = {
          ...session,
          accessToken: token.accessToken,
          refreshToken: token.refreshToken,
          expiresAt: expiresAtFromSeconds(token.expiresIn),
        };
        await this.store.save(refreshed);
        return refreshed;
      } catch {
        await this.store.clear();
        return null;
      }
    }
    if (expiresAt && expiresAt <= Date.now()) {
      await this.store.clear();
      return null;
    }
    if (session.bootstrap.blockedState.blocked) {
      await this.store.clear();
      return null;
    }
    return session;
  }

  async logout(): Promise<void> {
    new AuditEventService(this.database).queue("mobile.logout");
    await this.store.clear();
  }
}
