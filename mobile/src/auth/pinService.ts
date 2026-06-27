import * as SecureStore from "expo-secure-store";

/**
 * Offline PIN unlock. After the first online sign-in (which downloads the session + assigned work),
 * the field officer can set a 4-digit PIN. On later app opens the PIN unlocks the already-stored
 * session with no internet. The PIN is held in the OS-encrypted secure store (Keychain/Keystore);
 * for a 4-digit code that hardware-backed storage plus attempt-limiting is the real protection.
 */
const PIN_KEY = "atlas_fieldops_pin";
const ATTEMPTS_KEY = "atlas_fieldops_pin_attempts";
const MAX_ATTEMPTS = 5;

const secureOptions = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY } as const;

export type PinVerifyResult = { ok: boolean; remainingAttempts: number; lockedOut: boolean };

export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

export const pinService = {
  async hasPin(): Promise<boolean> {
    return Boolean(await SecureStore.getItemAsync(PIN_KEY));
  },

  async setPin(pin: string): Promise<void> {
    if (!isValidPin(pin)) {
      throw new Error("PIN must be exactly 4 digits.");
    }
    await SecureStore.setItemAsync(PIN_KEY, pin, secureOptions);
    await SecureStore.deleteItemAsync(ATTEMPTS_KEY);
  },

  /** Verifies a PIN. On too many failures returns lockedOut so the caller can force online re-login. */
  async verifyPin(pin: string): Promise<PinVerifyResult> {
    const stored = await SecureStore.getItemAsync(PIN_KEY);
    if (!stored) {
      return { ok: false, remainingAttempts: 0, lockedOut: false };
    }
    if (stored === pin) {
      await SecureStore.deleteItemAsync(ATTEMPTS_KEY);
      return { ok: true, remainingAttempts: MAX_ATTEMPTS, lockedOut: false };
    }
    const attempts = Number((await SecureStore.getItemAsync(ATTEMPTS_KEY)) ?? "0") + 1;
    if (attempts >= MAX_ATTEMPTS) {
      return { ok: false, remainingAttempts: 0, lockedOut: true };
    }
    await SecureStore.setItemAsync(ATTEMPTS_KEY, String(attempts), secureOptions);
    return { ok: false, remainingAttempts: MAX_ATTEMPTS - attempts, lockedOut: false };
  },

  async clearPin(): Promise<void> {
    await SecureStore.deleteItemAsync(PIN_KEY);
    await SecureStore.deleteItemAsync(ATTEMPTS_KEY);
  },
};
