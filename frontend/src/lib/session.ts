"use client";

const tokenKey = "enterprise-data-platform-token";

export function readToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(tokenKey);
}

export function writeToken(token: string): void {
  window.localStorage.setItem(tokenKey, token);
}

export function clearToken(): void {
  window.localStorage.removeItem(tokenKey);
}

