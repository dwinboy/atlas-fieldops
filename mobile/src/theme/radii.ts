/**
 * Mirrors web's --radius: 8px and the calc(var(--radius) + 4px) variant
 * used for larger panels.
 */
export const radii = {
  sm: 8,
  md: 8,
  lg: 8,
  xl: 12,
  full: 999,
} as const;

export type RadiusToken = keyof typeof radii;
