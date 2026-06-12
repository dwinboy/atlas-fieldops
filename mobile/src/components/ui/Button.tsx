import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type PressableProps, type ViewStyle } from "react-native";

import { colors, fontFamily, radii, spacing } from "@/theme";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends Omit<PressableProps, "style" | "children"> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
}

const SIZE_STYLES: Record<ButtonSize, { height: number; paddingHorizontal: number; fontSize: number }> = {
  sm: { height: 36, paddingHorizontal: spacing.md, fontSize: 13 },
  md: { height: 46, paddingHorizontal: spacing.lg, fontSize: 14 },
  lg: { height: 52, paddingHorizontal: spacing.xl, fontSize: 16 },
};

const VARIANT_COLORS: Record<ButtonVariant, { bg: string; border: string; fg: string }> = {
  primary: { bg: colors.primary, border: colors.primary, fg: colors.primaryForeground },
  secondary: { bg: colors.panel, border: colors.border, fg: colors.foreground },
  ghost: { bg: "transparent", border: "transparent", fg: colors.foreground },
  danger: { bg: colors.danger, border: colors.danger, fg: colors.primaryForeground },
};

export function Button({
  children,
  variant = "secondary",
  size = "md",
  loading = false,
  disabled,
  leftIcon,
  rightIcon,
  fullWidth,
  style,
  ...props
}: ButtonProps) {
  const sizeStyle = SIZE_STYLES[size];
  const colorStyle = VARIANT_COLORS[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          height: sizeStyle.height,
          paddingHorizontal: sizeStyle.paddingHorizontal,
          backgroundColor: colorStyle.bg,
          borderColor: colorStyle.border,
          opacity: isDisabled ? 0.55 : pressed ? 0.85 : 1,
          width: fullWidth ? "100%" : undefined,
        },
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colorStyle.fg} />
      ) : (
        <>
          {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}
          <Text style={[styles.label, { color: colorStyle.fg, fontSize: sizeStyle.fontSize }]}>{children}</Text>
          {rightIcon ? <View style={styles.icon}>{rightIcon}</View> : null}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
  },
  icon: {
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: fontFamily.semibold,
    fontWeight: "600",
  },
});
