import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { Calendar, Clock, X } from "lucide-react-native";

import { colors, fontFamily, radii, spacing, typography } from "@/theme";
import { Input } from "./Input";

export type DateTimeFieldMode = "date" | "time" | "datetime";

export interface DateTimeFieldProps {
  mode: DateTimeFieldMode;
  value: string;
  onChange: (value: string) => void;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function DateTimeField({ mode, value, onChange }: DateTimeFieldProps) {
  const [manualEntry, setManualEntry] = useState(false);
  const Icon = mode === "time" ? Clock : Calendar;

  function openPicker() {
    const initial = parseValue(value, mode) ?? new Date();

    if (mode === "time") {
      DateTimePickerAndroid.open({
        value: initial,
        mode: "time",
        is24Hour: true,
        onChange: (event, selected) => {
          if (event.type !== "set" || !selected) return;
          onChange(formatValue(selected, "time"));
        },
      });
      return;
    }

    DateTimePickerAndroid.open({
      value: initial,
      mode: "date",
      onChange: (dateEvent, selectedDate) => {
        if (dateEvent.type !== "set" || !selectedDate) return;
        if (mode === "date") {
          onChange(formatValue(selectedDate, "date"));
          return;
        }
        DateTimePickerAndroid.open({
          value: selectedDate,
          mode: "time",
          is24Hour: true,
          onChange: (timeEvent, selectedTime) => {
            if (timeEvent.type !== "set" || !selectedTime) return;
            const combined = new Date(selectedDate);
            combined.setHours(selectedTime.getHours(), selectedTime.getMinutes());
            onChange(formatValue(combined, "datetime"));
          },
        });
      },
    });
  }

  return (
    <View style={{ gap: spacing.sm }}>
      <Pressable style={styles.field} onPress={openPicker}>
        <Icon size={18} color={colors.mutedForeground} />
        <Text style={[styles.fieldText, !value ? styles.placeholder : null]}>
          {value ? formatDisplay(value, mode) : placeholderFor(mode)}
        </Text>
        {value ? (
          <Pressable hitSlop={8} onPress={() => onChange("")}>
            <X size={16} color={colors.mutedForeground} />
          </Pressable>
        ) : null}
      </Pressable>

      <View style={styles.actionsRow}>
        <Pressable style={styles.actionButton} onPress={() => onChange(formatValue(new Date(), mode))}>
          <Text style={styles.actionButtonText}>
            {mode === "date" ? "Use today" : mode === "time" ? "Use current time" : "Use now"}
          </Text>
        </Pressable>
        <Pressable style={styles.actionButton} onPress={() => setManualEntry((prev) => !prev)}>
          <Text style={styles.actionButtonText}>{manualEntry ? "Use picker" : "Enter manually"}</Text>
        </Pressable>
      </View>

      {manualEntry ? (
        <Input
          value={value}
          onChangeText={(text) => onChange(normalizeManualEntry(text, mode))}
          placeholder={manualPlaceholder(mode)}
          keyboardType="numbers-and-punctuation"
          helperText={`Use ${manualPlaceholder(mode)}.`}
        />
      ) : null}
    </View>
  );
}

function placeholderFor(mode: DateTimeFieldMode): string {
  if (mode === "time") return "Select a time";
  if (mode === "datetime") return "Select a date and time";
  return "Select a date";
}

function manualPlaceholder(mode: DateTimeFieldMode): string {
  if (mode === "time") return "HH:MM";
  if (mode === "datetime") return "YYYY-MM-DD HH:MM";
  return "YYYY-MM-DD";
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function parseValue(value: string, mode: DateTimeFieldMode): Date | null {
  if (!value) return null;
  if (mode === "time") {
    const match = value.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const date = new Date();
    date.setHours(Number(match[1]), Number(match[2]), 0, 0);
    return date;
  }
  if (mode === "date") {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]));
}

function formatValue(date: Date, mode: DateTimeFieldMode): string {
  const y = date.getFullYear();
  const mo = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  const h = pad2(date.getHours());
  const mi = pad2(date.getMinutes());
  if (mode === "date") return `${y}-${mo}-${d}`;
  if (mode === "time") return `${h}:${mi}`;
  return `${y}-${mo}-${d} ${h}:${mi}`;
}

function formatDisplay(value: string, mode: DateTimeFieldMode): string {
  const parsed = parseValue(value, mode);
  if (!parsed) return value;
  if (mode === "time") {
    return formatTimeDisplay(parsed);
  }
  const dateLabel = `${MONTH_NAMES[parsed.getMonth()]} ${parsed.getDate()}, ${parsed.getFullYear()}`;
  if (mode === "date") return dateLabel;
  return `${dateLabel}, ${formatTimeDisplay(parsed)}`;
}

function formatTimeDisplay(date: Date): string {
  const hours24 = date.getHours();
  const minutes = pad2(date.getMinutes());
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${minutes} ${period}`;
}

function normalizeManualEntry(text: string, mode: DateTimeFieldMode): string {
  const normalized = text.trim();
  if (!normalized) return "";

  if (mode === "time") {
    const compact = normalized.match(/^(\d{1,2})(\d{2})$/);
    if (compact) return `${pad2(Number(compact[1]))}:${compact[2]}`;
    const withSeparator = normalized.match(/^(\d{1,2})[:.](\d{2})$/);
    if (withSeparator) return `${pad2(Number(withSeparator[1]))}:${withSeparator[2]}`;
    return text;
  }

  const dateOnly = normalized.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dateOnly) {
    const [, day, month, year] = dateOnly;
    return `${year}-${pad2(Number(month))}-${pad2(Number(day))}`;
  }

  if (mode === "datetime") {
    const dateWithTime = normalized.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})\s+(\d{1,2}):(\d{2})$/);
    if (dateWithTime) {
      const [, day, month, year, hour, minute] = dateWithTime;
      return `${year}-${pad2(Number(month))}-${pad2(Number(day))} ${pad2(Number(hour))}:${minute}`;
    }
  }

  return text;
}

const styles = StyleSheet.create({
  actionButton: {
    backgroundColor: colors.muted,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  actionButtonText: {
    ...typography.small,
    color: colors.foreground,
    fontFamily: fontFamily.semibold,
    fontWeight: "600",
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  field: {
    alignItems: "center",
    backgroundColor: colors.panel,
    borderColor: colors.input,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 46,
    paddingHorizontal: spacing.md,
  },
  fieldText: {
    ...typography.body,
    color: colors.foreground,
    flex: 1,
  },
  placeholder: {
    color: colors.mutedForeground,
  },
});
