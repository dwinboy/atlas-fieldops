import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";

import { colors, fontFamily, radii, spacing, typography } from "@/theme";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {Icon ? (
        <View style={styles.iconWrap}>
          <Icon size={24} color={colors.mutedForeground} strokeWidth={1.75} />
        </View>
      ) : null}
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    marginTop: spacing.md,
  },
  container: {
    alignItems: "center",
    backgroundColor: colors.muted,
    borderColor: colors.border,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing["2xl"],
  },
  description: {
    ...typography.small,
    color: colors.mutedForeground,
    textAlign: "center",
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: colors.panel,
    borderRadius: radii.full,
    height: 48,
    justifyContent: "center",
    marginBottom: spacing.xs,
    width: 48,
  },
  title: {
    ...typography.headingSm,
    color: colors.foreground,
    fontFamily: fontFamily.semibold,
    textAlign: "center",
  },
});
