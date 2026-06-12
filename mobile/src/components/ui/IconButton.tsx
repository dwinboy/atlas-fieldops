import { Pressable, StyleSheet, type PressableProps, type ViewStyle } from "react-native";
import type { LucideIcon } from "lucide-react-native";

import { colors, radii } from "@/theme";

export interface IconButtonProps extends Omit<PressableProps, "style" | "children"> {
  icon: LucideIcon;
  accessibilityLabel: string;
  size?: number;
  color?: string;
  variant?: "ghost" | "filled";
  style?: ViewStyle;
}

export function IconButton({
  icon: Icon,
  accessibilityLabel,
  size = 20,
  color = colors.foreground,
  variant = "ghost",
  style,
  ...props
}: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={({ pressed }) => [
        styles.base,
        variant === "filled" ? { backgroundColor: colors.muted } : null,
        { opacity: pressed ? 0.6 : 1 },
        style,
      ]}
      {...props}
    >
      <Icon size={size} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    borderRadius: radii.full,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
});
