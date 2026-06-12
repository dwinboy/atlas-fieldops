import { StyleSheet, View, type ViewProps, type ViewStyle } from "react-native";

import { colors, radii, spacing, tone as resolveTone, type Tone } from "@/theme";

export type CardTone = Tone | "primary" | "neutral";

export interface CardProps extends ViewProps {
  tone?: CardTone;
  padding?: keyof typeof spacing;
}

export function Card({ tone = "neutral", padding = "lg", style, children, ...props }: CardProps) {
  return (
    <View style={[styles.base, { padding: spacing[padding] }, toneStyle(tone), style]} {...props}>
      {children}
    </View>
  );
}

function toneStyle(cardTone: CardTone): ViewStyle {
  if (cardTone === "primary") {
    return { backgroundColor: colors.primary, borderColor: colors.primary };
  }
  if (cardTone === "neutral") {
    return { backgroundColor: colors.panel, borderColor: colors.border };
  }
  const t = resolveTone(cardTone);
  return { backgroundColor: t.bg, borderColor: t.border };
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.xl,
    borderWidth: 1,
  },
});
