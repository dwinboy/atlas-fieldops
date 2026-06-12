import { useState } from "react";
import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";

import { colors, fontFamily, radii, spacing, typography } from "@/theme";

export interface InputProps extends TextInputProps {
  label?: string;
  helperText?: string;
  error?: string;
  warning?: string;
}

export function Input({ label, helperText, error, warning, style, onFocus, onBlur, ...props }: InputProps) {
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? colors.danger
    : warning
      ? colors.warning
      : focused
        ? colors.ring
        : colors.input;

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.mutedForeground}
        style={[styles.input, { borderColor }, props.multiline ? styles.multiline : null, style]}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        {...props}
      />
      {error ? (
        <Text style={[styles.helperText, { color: colors.danger }]}>{error}</Text>
      ) : warning ? (
        <Text style={[styles.helperText, { color: colors.warning }]}>{warning}</Text>
      ) : helperText ? (
        <Text style={[styles.helperText, { color: colors.mutedForeground }]}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  helperText: {
    ...typography.small,
  },
  input: {
    backgroundColor: colors.panel,
    borderColor: colors.input,
    borderRadius: radii.lg,
    borderWidth: 1,
    color: colors.foreground,
    fontFamily: fontFamily.regular,
    fontSize: typography.body.fontSize,
    minHeight: 46,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  label: {
    ...typography.small,
    color: colors.mutedForeground,
    fontFamily: fontFamily.medium,
    fontWeight: "500",
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: "top",
  },
});
