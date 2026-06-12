import { StyleSheet, Text, View } from "react-native";

import { fontFamily, radii, spacing, tone as resolveTone, type Tone } from "@/theme";

export interface BadgeProps {
  label: string;
  tone?: Tone;
}

export function Badge({ label, tone = "neutral" }: BadgeProps) {
  const t = resolveTone(tone);
  return (
    <View style={[styles.base, { backgroundColor: t.bg, borderColor: t.border }]}>
      <Text style={[styles.label, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: "flex-start",
    borderRadius: radii.full,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  label: {
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
});
