"use client";

const tokenKey = "enterprise-data-platform-token";

export function readToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage?.getItem(tokenKey) ?? null;
  } catch {
    return null;
  }
}

export function writeToken(token: string): void {
  try {
    window.localStorage?.setItem(tokenKey, token);
  } catch {
    // Some embedded or private browser contexts disable storage. Auth should
    // still work for the active session even when persistence is unavailable.
  }
}

export function clearToken(): void {
  try {
    window.localStorage?.removeItem(tokenKey);
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
}
