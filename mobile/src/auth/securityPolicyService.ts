import type { MobileSession, SecureSessionStore } from "@/auth/sessionStore";

export type AppLockState = {
  pinEnabled: boolean;
  biometricEnabled: boolean;
  screenshotProtectionEnabled: boolean;
  locked: boolean;
};

export class SecurityPolicyService {
  private lastActiveAt: number = Date.now();
  private lockState: AppLockState = {
    pinEnabled: false,
    biometricEnabled: false,
    screenshotProtectionEnabled: false,
    locked: false,
  };

  constructor(
    private readonly store: SecureSessionStore,
    private readonly sessionTimeoutMs = 30 * 60 * 1000,
  ) {}

  touch(): void {
    this.lastActiveAt = Date.now();
  }

  shouldExpireSession(now = Date.now()): boolean {
    return now - this.lastActiveAt > this.sessionTimeoutMs;
  }

  async enforceSessionTimeout(): Promise<MobileSession | null> {
    if (this.shouldExpireSession()) {
      await this.store.clear();
      this.lockState = { ...this.lockState, locked: true };
      return null;
    }
    return this.store.load();
  }

  configureLock(input: Partial<Omit<AppLockState, "locked">>): AppLockState {
    this.lockState = { ...this.lockState, ...input };
    return this.lockState;
  }

  lock(): AppLockState {
    this.lockState = { ...this.lockState, locked: true };
    return this.lockState;
  }

  unlock(): AppLockState {
    this.lockState = { ...this.lockState, locked: false };
    this.touch();
    return this.lockState;
  }

  deviceRegistrationPayload(deviceId: string): Record<string, string> {
    return { deviceId, platform: "android-ready", remoteLogoutReady: "true", remoteWipeReady: "true" };
  }
}
