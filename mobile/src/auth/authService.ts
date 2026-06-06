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
    await this.devices.register(token.accessToken, {
      deviceId,
      deviceName: "Atlas FieldOps Android",
      osVersion: null,
    });
    const syncPackage = await new BootstrapSyncService(this.database, this.apis).syncAssignedWork(token.accessToken);
    new AuditEventService(this.database).queue("mobile.login", { deviceId, organizationSlug });
    const session: MobileSession = {
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      bootstrap: syncPackage.bootstrap,
      expiresAt: null,
    };
    await this.store.save(session);
    return session;
  }

  async currentSession(): Promise<MobileSession | null> {
    return this.store.load();
  }

  async logout(): Promise<void> {
    new AuditEventService(this.database).queue("mobile.logout");
    await this.store.clear();
  }
}
