import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";

import { colors, fontFamily, spacing, typography } from "@/theme";

export interface SectionHeaderAction {
  label: string;
  onPress: () => void;
}

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: SectionHeaderAction;
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.titleGroup}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {action ? (
        <Pressable style={styles.action} onPress={action.onPress} hitSlop={8}>
          <Text style={styles.actionLabel}>{action.label}</Text>
          <ChevronRight size={14} color={colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: "center",
    flexDirection: "row",
    gap: 2,
  },
  actionLabel: {
    ...typography.small,
    color: colors.primary,
    fontFamily: fontFamily.semibold,
    fontWeight: "600",
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.small,
    color: colors.mutedForeground,
  },
  title: {
    ...typography.headingSm,
    color: colors.foreground,
    fontFamily: fontFamily.semibold,
  },
  titleGroup: {
    gap: 2,
  },
});
