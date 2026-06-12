/**
 * Color tokens mirrored from frontend/app/globals.css `:root` (light mode).
 * React Native 0.74 supports `hsl(h s% l%)` color strings natively.
 */
export const colors = {
  background: "hsl(60, 9%, 98%)",
  foreground: "hsl(24, 10%, 10%)",
  panel: "hsl(0, 0%, 100%)",
  panelForeground: "hsl(24, 10%, 10%)",
  muted: "hsl(60, 5%, 96%)",
  mutedForeground: "hsl(25, 5%, 45%)",
  border: "hsl(20, 6%, 90%)",
  input: "hsl(24, 6%, 83%)",
  ring: "hsl(142, 72%, 29%)",
  primary: "hsl(143, 64%, 24%)",
  primaryForeground: "hsl(0, 0%, 100%)",
  accent: "hsl(24, 7%, 16%)",
  accentForeground: "hsl(0, 0%, 100%)",
  success: "hsl(142, 72%, 29%)",
  warning: "hsl(26, 90%, 37%)",
  danger: "hsl(0, 72%, 51%)",
  info: "hsl(221, 83%, 53%)",
} as const;

export type ColorToken = keyof typeof colors;

export type Tone = "success" | "warning" | "danger" | "info" | "neutral";

export interface ToneColors {
  bg: string;
  fg: string;
  border: string;
}

/**
 * Tinted background/foreground/border triplets for status pills, banners,
 * and tone-aware cards. Mirrors the ad-hoc statusInfo()/STATUS_TONES helpers
 * that were duplicated across screens.
 */
export function tone(value: Tone): ToneColors {
  switch (value) {
    case "success":
      return { bg: "hsl(142, 72%, 95%)", fg: "hsl(142, 72%, 24%)", border: "hsl(142, 60%, 85%)" };
    case "warning":
      return { bg: "hsl(26, 90%, 95%)", fg: "hsl(26, 90%, 32%)", border: "hsl(26, 80%, 85%)" };
    case "danger":
      return { bg: "hsl(0, 72%, 96%)", fg: "hsl(0, 72%, 45%)", border: "hsl(0, 65%, 88%)" };
    case "info":
      return { bg: "hsl(221, 83%, 96%)", fg: "hsl(221, 83%, 48%)", border: "hsl(221, 70%, 88%)" };
    case "neutral":
    default:
      return { bg: "hsl(60, 5%, 96%)", fg: "hsl(25, 5%, 45%)", border: "hsl(20, 6%, 90%)" };
  }
}
