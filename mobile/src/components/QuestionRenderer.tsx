import { useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { BarcodeCapture } from "@/components/BarcodeCapture";
import { GPSCapture } from "@/components/GPSCapture";
import { PhotoCapture } from "@/components/PhotoCapture";
import type { FormValidationIssue } from "@/forms/formValidationService";
import type { GPSResult } from "@/hooks/useGPS";
import type { PhotoResult } from "@/hooks/usePhotoCapture";
import type { MobileQuestion } from "@/models/contracts";

type QuestionRendererProps = {
  question: MobileQuestion;
  value: unknown;
  onAnswer: (questionId: string, variableName: string, value: unknown) => void;
  issues: FormValidationIssue[];
  visible?: boolean;
};

export function QuestionRenderer({ question, value, onAnswer, issues, visible = true }: QuestionRendererProps) {
  if (!visible) return null;

  const hasError = issues.some((i) => i.questionId === question.id && i.severity === "Error");
  const hasWarning = issues.some((i) => i.questionId === question.id && i.severity === "Warning");

  const borderColor = hasError ? "#fca5a5" : hasWarning ? "#fed7aa" : "#dbe7e2";

  function answer(v: unknown) {
    onAnswer(question.id, question.variableName, v);
  }

  return (
    <View style={{
      backgroundColor: "white",
      borderColor,
      borderRadius: 16,
      borderWidth: 1,
      padding: 16,
      gap: 10,
    }}>
      {/* Label */}
      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 6 }}>
          <Text style={{ color: "#12332b", fontWeight: "800", fontSize: 15, flex: 1 }}>
            {question.label}
          </Text>
          {question.required && (
            <Text style={{ color: "#b42318", fontWeight: "800", marginTop: 2 }}>*</Text>
          )}
        </View>
        {question.helpText ? (
          <Text style={{ color: "#49635a", fontSize: 13 }}>{question.helpText}</Text>
        ) : null}
      </View>

      {/* Input by type */}
      {renderInput(question, value, answer)}

      {/* Validation messages */}
      {issues
        .filter((i) => i.questionId === question.id)
        .map((issue) => (
          <View key={issue.message} style={{
            backgroundColor: issue.severity === "Error" ? "#fee2e2" : "#fff7ed",
            borderRadius: 8,
            padding: 8,
          }}>
            <Text style={{ color: issue.severity === "Error" ? "#b42318" : "#9a3412", fontSize: 13, fontWeight: "600" }}>
              {issue.message}
            </Text>
          </View>
        ))}
    </View>
  );
}

// ─── Input renderers ─────────────────────────────────────────────────────────

function renderInput(question: MobileQuestion, value: unknown, answer: (v: unknown) => void) {
  const { type } = question;

  // ── GPS ──────────────────────────────────────────────────────────────────
  if (type === "GPS") {
    return (
      <GPSCapture
        value={value as GPSResult | null}
        onChange={(r) => answer(r)}
        required={question.required}
      />
    );
  }

  // ── Photo / Video ────────────────────────────────────────────────────────
  if (type === "Photo" || type === "Video") {
    return (
      <PhotoCapture
        value={value as PhotoResult | null}
        onChange={(r) => answer(r)}
        required={question.required}
        label={type === "Video" ? "Video" : "Photo"}
      />
    );
  }

  // ── Barcode / QR ─────────────────────────────────────────────────────────
  if (type === "Barcode" || type === "QRCode") {
    return (
      <BarcodeCapture
        value={String(value ?? "")}
        onChange={(code) => answer(code)}
        mode={type === "QRCode" ? "qr" : "barcode"}
        required={question.required}
      />
    );
  }

  // ── Consent ──────────────────────────────────────────────────────────────
  if (type === "Consent") {
    return (
      <Pressable
        onPress={() => answer(value === true ? false : true)}
        style={{
          backgroundColor: value === true ? "#12332b" : "white",
          borderColor: value === true ? "#12332b" : "#dbe7e2",
          borderRadius: 12,
          borderWidth: 1,
          paddingVertical: 16,
          paddingHorizontal: 20,
          alignItems: "center",
        }}
      >
        <Text style={{
          color: value === true ? "white" : "#12332b",
          fontWeight: "800",
          fontSize: 15,
        }}>
          {value === true ? "✓ Consent given" : "Tap to confirm consent"}
        </Text>
      </Pressable>
    );
  }

  // ── Single select / Dropdown ──────────────────────────────────────────────
  if (type === "SingleSelect" || type === "Dropdown") {
    return (
      <View style={{ gap: 8 }}>
        {question.options.map((opt) => {
          const selected = String(value) === opt.value;
          return (
            <Pressable
              key={opt.id}
              onPress={() => answer(opt.value)}
              style={{
                borderColor: selected ? "#12332b" : "#dbe7e2",
                borderRadius: 12,
                borderWidth: selected ? 2 : 1,
                padding: 12,
                backgroundColor: selected ? "#f0fdf4" : "white",
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}
            >
              <View style={{
                width: 18,
                height: 18,
                borderRadius: 9,
                borderWidth: 2,
                borderColor: selected ? "#12332b" : "#b0c5bc",
                backgroundColor: selected ? "#12332b" : "transparent",
                alignItems: "center",
                justifyContent: "center",
              }}>
                {selected && <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: "white" }} />}
              </View>
              <Text style={{ color: "#12332b", fontWeight: selected ? "700" : "500", flex: 1 }}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  // ── Multi select ──────────────────────────────────────────────────────────
  if (type === "MultiSelect") {
    const selected = Array.isArray(value) ? value.map(String) : [];
    return (
      <View style={{ gap: 8 }}>
        {question.options.map((opt) => {
          const isSelected = selected.includes(opt.value);
          return (
            <Pressable
              key={opt.id}
              onPress={() => {
                const next = isSelected
                  ? selected.filter((v) => v !== opt.value)
                  : [...selected, opt.value];
                answer(next);
              }}
              style={{
                borderColor: isSelected ? "#12332b" : "#dbe7e2",
                borderRadius: 12,
                borderWidth: isSelected ? 2 : 1,
                padding: 12,
                backgroundColor: isSelected ? "#f0fdf4" : "white",
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}
            >
              <View style={{
                width: 18,
                height: 18,
                borderRadius: 4,
                borderWidth: 2,
                borderColor: isSelected ? "#12332b" : "#b0c5bc",
                backgroundColor: isSelected ? "#12332b" : "transparent",
                alignItems: "center",
                justifyContent: "center",
              }}>
                {isSelected && <Text style={{ color: "white", fontSize: 11, fontWeight: "800" }}>✓</Text>}
              </View>
              <Text style={{ color: "#12332b", fontWeight: isSelected ? "700" : "500", flex: 1 }}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  // ── Date / DateTime ───────────────────────────────────────────────────────
  if (type === "Date" || type === "DateTime") {
    const dateValue = String(value ?? "");
    return (
      <View style={{ gap: 8 }}>
        <TextInput
          onChangeText={(text) => answer(normalizeDateEntry(text, type))}
          placeholder={type === "DateTime" ? "YYYY-MM-DD HH:MM" : "YYYY-MM-DD"}
          placeholderTextColor="#b0c5bc"
          style={inputStyle}
          value={dateValue}
          keyboardType="numbers-and-punctuation"
        />
        <Text style={{ color: "#49635a", fontSize: 12 }}>
          Use {type === "DateTime" ? "YYYY-MM-DD HH:MM" : "YYYY-MM-DD"}. Example: {type === "DateTime" ? "2026-06-08 14:30" : "2026-06-08"}.
        </Text>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <Pressable
            onPress={() => answer(type === "DateTime" ? nowDateTimeValue() : todayDateValue())}
            style={smallDateButton}
          >
            <Text style={smallDateButtonText}>{type === "DateTime" ? "Use now" : "Use today"}</Text>
          </Pressable>
          {dateValue ? (
            <Pressable onPress={() => answer("")} style={smallDateButton}>
              <Text style={smallDateButtonText}>Clear date</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  // ── Signature ─────────────────────────────────────────────────────────────
  if (type === "Signature") {
    return (
      <View style={{
        backgroundColor: "#f6faf8",
        borderColor: "#dbe7e2",
        borderRadius: 12,
        borderWidth: 1,
        borderStyle: "dashed",
        padding: 24,
        alignItems: "center",
        gap: 4,
      }}>
        {value ? (
          <Text style={{ color: "#0f766e", fontWeight: "700" }}>✓ Signature captured</Text>
        ) : (
          <>
            <Text style={{ fontSize: 28 }}>✍️</Text>
            <Text style={{ color: "#49635a", fontWeight: "600" }}>Signature capture</Text>
            <Text style={{ color: "#8aa79b", fontSize: 12, textAlign: "center" }}>
              Signature pad will be enabled in the next update. Record the person's name for now.
            </Text>
          </>
        )}
        <TextInput
          onChangeText={(t) => answer(t)}
          placeholder="Enter full name as signature reference"
          placeholderTextColor="#b0c5bc"
          style={{ ...inputStyle, marginTop: 8, width: "100%" }}
          value={String(value ?? "")}
        />
      </View>
    );
  }

  // ── Audio ─────────────────────────────────────────────────────────────────
  if (type === "Audio") {
    return (
      <View style={{
        backgroundColor: "#fff7ed",
        borderColor: "#fed7aa",
        borderRadius: 12,
        borderWidth: 1,
        padding: 14,
        alignItems: "center",
        gap: 6,
      }}>
        <Text style={{ fontSize: 28 }}>🎙</Text>
        <Text style={{ color: "#9a3412", fontWeight: "700" }}>Audio recording</Text>
        <Text style={{ color: "#9a3412", fontSize: 12, textAlign: "center" }}>
          Audio capture will be available in the next update. Use a text note for now.
        </Text>
        <TextInput
          onChangeText={(t) => answer(t)}
          placeholder="Describe the audio content or key points"
          placeholderTextColor="#b0c5bc"
          multiline
          style={{ ...inputStyle, minHeight: 70, width: "100%", marginTop: 8 }}
          value={String(value ?? "")}
        />
      </View>
    );
  }

  // ── FileUpload ────────────────────────────────────────────────────────────
  if (type === "FileUpload") {
    return (
      <View style={{
        backgroundColor: "#f6faf8",
        borderColor: "#dbe7e2",
        borderRadius: 12,
        borderWidth: 1,
        borderStyle: "dashed",
        padding: 20,
        alignItems: "center",
        gap: 4,
      }}>
        <Text style={{ fontSize: 28 }}>📎</Text>
        <Text style={{ color: "#49635a", fontWeight: "600" }}>File upload</Text>
        <Text style={{ color: "#8aa79b", fontSize: 12, textAlign: "center" }}>
          File attachment will be available in the next update.
        </Text>
      </View>
    );
  }

  // ── Number / Decimal / Currency ───────────────────────────────────────────
  if (type === "Number" || type === "Decimal" || type === "Currency") {
    return (
      <TextInput
        keyboardType="numeric"
        onChangeText={(t) => {
          const n = type === "Number" ? parseInt(t, 10) : parseFloat(t);
          answer(Number.isNaN(n) ? t : n);
        }}
        placeholder={type === "Currency" ? "0.00" : "0"}
        placeholderTextColor="#b0c5bc"
        style={inputStyle}
        value={String(value ?? "")}
      />
    );
  }

  // ── LongText ──────────────────────────────────────────────────────────────
  if (type === "LongText") {
    return (
      <TextInput
        multiline
        numberOfLines={4}
        onChangeText={(t) => answer(t)}
        placeholder="Enter your answer…"
        placeholderTextColor="#b0c5bc"
        style={{ ...inputStyle, minHeight: 100, textAlignVertical: "top" }}
        value={String(value ?? "")}
      />
    );
  }

  // ── Calculated (read-only display) ────────────────────────────────────────
  if (type === "Calculated") {
    return (
      <View style={{
        backgroundColor: "#f0f5f3",
        borderRadius: 12,
        padding: 14,
      }}>
        <Text style={{ color: "#12332b", fontWeight: "700", fontSize: 15 }}>
          {String(value ?? "—")}
        </Text>
        <Text style={{ color: "#8aa79b", fontSize: 12, marginTop: 4 }}>
          Calculated automatically
        </Text>
      </View>
    );
  }

  // ── Default: Text ─────────────────────────────────────────────────────────
  return (
    <TextInput
      autoCapitalize="sentences"
      onChangeText={(t) => answer(t)}
      placeholder="Enter answer…"
      placeholderTextColor="#b0c5bc"
      style={inputStyle}
      value={String(value ?? "")}
    />
  );
}

function normalizeDateEntry(text: string, type: MobileQuestion["type"]): string {
  const normalized = text.trim();
  if (!normalized) return "";
  const dateOnly = normalized.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dateOnly) {
    const [, day, month, year] = dateOnly;
    return `${year}-${pad2(month)}-${pad2(day)}`;
  }
  const dateWithTime = normalized.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})\s+(\d{1,2}):(\d{2})$/);
  if (dateWithTime && type === "DateTime") {
    const [, day, month, year, hour, minute] = dateWithTime;
    return `${year}-${pad2(month)}-${pad2(day)} ${pad2(hour)}:${minute}`;
  }
  return text;
}

function pad2(value: string): string {
  return value.padStart(2, "0");
}

function todayDateValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function nowDateTimeValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

const inputStyle = {
  backgroundColor: "#f6faf8",
  borderColor: "#dbe7e2",
  borderRadius: 12,
  borderWidth: 1,
  color: "#12332b",
  fontSize: 15,
  padding: 14,
} as const;

const smallDateButton = {
  backgroundColor: "#f0f5f3",
  borderColor: "#dbe7e2",
  borderRadius: 10,
  borderWidth: 1,
  paddingHorizontal: 12,
  paddingVertical: 8,
} as const;

const smallDateButtonText = {
  color: "#12332b",
  fontSize: 12,
  fontWeight: "700",
} as const;
