import { colors, tone } from "./colors";
import { radii } from "./radii";
import { spacing } from "./spacing";
import { fontFamily, typography } from "./typography";

export const theme = {
  colors,
  tone,
  spacing,
  radii,
  typography,
  fontFamily,
};

export type Theme = typeof theme;

export * from "./colors";
export * from "./spacing";
export * from "./radii";
export * from "./typography";
