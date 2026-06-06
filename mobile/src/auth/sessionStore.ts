import type { MobileBootstrapPackage } from "@/models/contracts";

export type MobileSession = {
  accessToken: string;
  refreshToken: string | null;
  bootstrap: MobileBootstrapPackage;
  expiresAt: string | null;
};

export interface SecureSessionStore {
  load(): Promise<MobileSession | null>;
  save(session: MobileSession): Promise<void>;
  clear(): Promise<void>;
}

export class MemorySessionStore implements SecureSessionStore {
  private session: MobileSession | null = null;

  async load(): Promise<MobileSession | null> {
    return this.session;
  }

  async save(session: MobileSession): Promise<void> {
    this.session = session;
  }

  async clear(): Promise<void> {
    this.session = null;
  }
}
