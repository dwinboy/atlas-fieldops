import type { TextStyle } from "react-native";

/**
 * Mirrors frontend/tailwind.config.ts fontSize scale. Font weights map to
 * @expo-google-fonts/inter family names since RN ignores fontWeight when a
 * specific weighted font family is set.
 */
export const fontFamily = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
} as const;

interface TypeScale extends Pick<TextStyle, "fontSize" | "lineHeight" | "letterSpacing" | "fontFamily" | "fontWeight"> {}

export const typography: Record<"micro" | "small" | "body" | "headingSm" | "headingLg" | "display", TypeScale> = {
  micro: {
    fontSize: 11,
    lineHeight: 11 * 1.4,
    fontFamily: fontFamily.regular,
    fontWeight: "400",
  },
  small: {
    fontSize: 13,
    lineHeight: 13 * 1.5,
    fontFamily: fontFamily.regular,
    fontWeight: "400",
  },
  body: {
    fontSize: 14,
    lineHeight: 14 * 1.6,
    fontFamily: fontFamily.regular,
    fontWeight: "400",
  },
  headingSm: {
    fontSize: 16,
    lineHeight: 16 * 1.4,
    letterSpacing: -0.16,
    fontFamily: fontFamily.semibold,
    fontWeight: "600",
  },
  headingLg: {
    fontSize: 20,
    lineHeight: 20 * 1.3,
    letterSpacing: -0.2,
    fontFamily: fontFamily.semibold,
    fontWeight: "600",
  },
  display: {
    fontSize: 28,
    lineHeight: 28 * 1.2,
    letterSpacing: -0.28,
    fontFamily: fontFamily.semibold,
    fontWeight: "600",
  },
};

export type TypographyToken = keyof typeof typography;
