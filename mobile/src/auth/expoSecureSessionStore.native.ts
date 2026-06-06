import * as SecureStore from "expo-secure-store";

import type { MobileSession, SecureSessionStore } from "@/auth/sessionStore";

const SESSION_KEY = "atlas_fieldops_mobile_session";

export class ExpoSecureSessionStore implements SecureSessionStore {
  async load(): Promise<MobileSession | null> {
    const raw = await SecureStore.getItemAsync(SESSION_KEY);
    return raw ? (JSON.parse(raw) as MobileSession) : null;
  }

  async save(session: MobileSession): Promise<void> {
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session), {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
  }

  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  }
}
