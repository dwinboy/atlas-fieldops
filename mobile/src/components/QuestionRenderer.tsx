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

type SimpleOption = {
  id: string;
  label: string;
  value: string;
};

type EvidenceReference = {
  kind: "Audio" | "FileUpload" | "Signature";
  reference: string;
  notes: string;
  capturedAt: string | null;
};

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
            {issue.fixHint ? (
              <Text style={{ color: issue.severity === "Error" ? "#7f1d1d" : "#9a3412", fontSize: 12, marginTop: 4 }}>
                How to fix: {issue.fixHint}
              </Text>
            ) : null}
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
        mediaType={type === "Video" ? "video" : "photo"}
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

  // ── Time ─────────────────────────────────────────────────────────────────
  if (type === "Time") {
    const timeValue = String(value ?? "");
    return (
      <View style={{ gap: 8 }}>
        <TextInput
          onChangeText={(text) => answer(normalizeTimeEntry(text))}
          placeholder="HH:MM"
          placeholderTextColor="#b0c5bc"
          style={inputStyle}
          value={timeValue}
          keyboardType="numbers-and-punctuation"
        />
        <Text style={{ color: "#49635a", fontSize: 12 }}>
          Use 24-hour time. Example: 14:30.
        </Text>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <Pressable onPress={() => answer(nowTimeValue())} style={smallDateButton}>
            <Text style={smallDateButtonText}>Use current time</Text>
          </Pressable>
          {timeValue ? (
            <Pressable onPress={() => answer("")} style={smallDateButton}>
              <Text style={smallDateButtonText}>Clear time</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  // ── Signature ─────────────────────────────────────────────────────────────
  if (type === "Signature") {
    return renderEvidenceReference("Signature", value, answer, {
      icon: "✍️",
      title: "Signature",
      referencePlaceholder: "Enter signer full name",
      notesPlaceholder: "Add consent/signature note if needed",
      help: "The saved signer name acts as a signature reference for this mobile build.",
    });
  }

  // ── Audio ─────────────────────────────────────────────────────────────────
  if (type === "Audio") {
    return renderEvidenceReference("Audio", value, answer, {
      icon: "🎙",
      title: "Audio evidence",
      referencePlaceholder: "Enter audio file name or recorder reference",
      notesPlaceholder: "Summarize the audio content",
      help: "If audio recording is required, record it on the device and enter the file/reference here for supervisor review.",
    });
  }

  // ── FileUpload ────────────────────────────────────────────────────────────
  if (type === "FileUpload") {
    return renderEvidenceReference("FileUpload", value, answer, {
      icon: "📎",
      title: "File evidence",
      referencePlaceholder: "Enter file name, receipt number, or document reference",
      notesPlaceholder: "Describe the file or where it is stored",
      help: "This stores the file reference with the submission so the web reviewer knows what evidence belongs to the record.",
    });
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
  if (type === "CalculatedField" || String(type) === "Calculated") {
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

  // ── Repeat group ─────────────────────────────────────────────────────────
  if (type === "RepeatGroup") {
    return renderRepeatGroup(question, value, answer);
  }

  // ── Matrix ───────────────────────────────────────────────────────────────
  if (type === "Matrix") {
    return renderMatrix(question, value, answer);
  }

  // ── Ranking ──────────────────────────────────────────────────────────────
  if (type === "Ranking") {
    return renderRanking(question, value, answer);
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

function renderEvidenceReference(
  kind: EvidenceReference["kind"],
  value: unknown,
  answer: (v: unknown) => void,
  copy: { icon: string; title: string; referencePlaceholder: string; notesPlaceholder: string; help: string },
) {
  const evidence = evidenceValue(kind, value);
  const hasReference = evidence.reference.trim().length > 0;

  function update(next: Partial<EvidenceReference>) {
    const reference = next.reference ?? evidence.reference;
    answer({
      ...evidence,
      ...next,
      capturedAt: reference.trim() ? evidence.capturedAt ?? new Date().toISOString() : null,
    });
  }

  return (
    <View style={{
      backgroundColor: hasReference ? "#f0fdf4" : "#f6faf8",
      borderColor: hasReference ? "#bbf7d0" : "#dbe7e2",
      borderRadius: 12,
      borderWidth: 1,
      padding: 14,
      gap: 10,
    }}>
      <View style={{ alignItems: "center", gap: 4 }}>
        <Text style={{ fontSize: 28 }}>{copy.icon}</Text>
        <Text style={{ color: "#12332b", fontWeight: "800" }}>
          {hasReference ? `${copy.title} recorded` : copy.title}
        </Text>
        <Text style={{ color: "#49635a", fontSize: 12, textAlign: "center" }}>{copy.help}</Text>
      </View>
      <TextInput
        onChangeText={(text) => update({ reference: text })}
        placeholder={copy.referencePlaceholder}
        placeholderTextColor="#b0c5bc"
        style={inputStyle}
        value={evidence.reference}
      />
      <TextInput
        multiline
        onChangeText={(text) => update({ notes: text })}
        placeholder={copy.notesPlaceholder}
        placeholderTextColor="#b0c5bc"
        style={{ ...inputStyle, minHeight: 70, textAlignVertical: "top" }}
        value={evidence.notes}
      />
    </View>
  );
}

function renderRepeatGroup(question: MobileQuestion, value: unknown, answer: (v: unknown) => void) {
  const rows = asRecordArray(value);
  const fields = repeatFields(question);
  const maxRepeats = question.repeatSettings?.maxRepeats ?? null;
  const minRepeats = question.repeatSettings?.minRepeats ?? null;
  const canAdd = maxRepeats === null || rows.length < maxRepeats;

  function updateRow(rowIndex: number, fieldId: string, fieldValue: string) {
    answer(rows.map((row, index) => index === rowIndex ? { ...row, [fieldId]: fieldValue } : row));
  }

  function addRow() {
    const blank = Object.fromEntries(fields.map((field) => [field.id, ""]));
    answer([...rows, blank]);
  }

  return (
    <View style={{ gap: 10 }}>
      {minRepeats !== null || maxRepeats !== null ? (
        <Text style={{ color: "#49635a", fontSize: 12 }}>
          Repeat rows: {rows.length}{minRepeats !== null ? ` · minimum ${minRepeats}` : ""}{maxRepeats !== null ? ` · maximum ${maxRepeats}` : ""}
        </Text>
      ) : null}
      {rows.length === 0 ? (
        <View style={emptySubCard}>
          <Text style={{ color: "#49635a", fontWeight: "700" }}>No rows added yet</Text>
          <Text style={{ color: "#8aa79b", fontSize: 12 }}>Add one row for each household member, item, crop, or repeated record.</Text>
        </View>
      ) : rows.map((row, rowIndex) => (
        <View key={`row-${rowIndex + 1}`} style={repeatRowCard}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ color: "#12332b", fontWeight: "800" }}>Row {rowIndex + 1}</Text>
            <Pressable
              disabled={minRepeats !== null && rows.length <= minRepeats}
              onPress={() => answer(rows.filter((_, index) => index !== rowIndex))}
              style={{ opacity: minRepeats !== null && rows.length <= minRepeats ? 0.35 : 1 }}
            >
              <Text style={{ color: "#b42318", fontWeight: "700", fontSize: 12 }}>Remove</Text>
            </Pressable>
          </View>
          {fields.map((field) => (
            <View key={field.id} style={{ gap: 4 }}>
              <Text style={{ color: "#49635a", fontSize: 12, fontWeight: "700" }}>{field.label}</Text>
              <TextInput
                onChangeText={(text) => updateRow(rowIndex, field.id, text)}
                placeholder={`Enter ${field.label.toLowerCase()}`}
                placeholderTextColor="#b0c5bc"
                style={inputStyle}
                value={String(row[field.id] ?? "")}
              />
            </View>
          ))}
        </View>
      ))}
      <Pressable
        disabled={!canAdd}
        onPress={addRow}
        style={{
          ...secondaryActionButton,
          opacity: canAdd ? 1 : 0.45,
        }}
      >
        <Text style={secondaryActionText}>{question.repeatSettings?.addButtonLabel ?? "Add row"}</Text>
      </Pressable>
    </View>
  );
}

function renderMatrix(question: MobileQuestion, value: unknown, answer: (v: unknown) => void) {
  const { rows, columns, multi } = matrixMetadata(question);
  const matrix = isRecord(value) ? value : {};

  function toggle(rowValue: string, columnValue: string) {
    if (multi) {
      const current = Array.isArray(matrix[rowValue]) ? (matrix[rowValue] as unknown[]).map(String) : [];
      const next = current.includes(columnValue)
        ? current.filter((item) => item !== columnValue)
        : [...current, columnValue];
      answer({ ...matrix, [rowValue]: next });
      return;
    }
    answer({ ...matrix, [rowValue]: columnValue });
  }

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: "#49635a", fontSize: 12 }}>
        {multi ? "Select all choices that apply for each row." : "Select one choice for each row."}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View style={{ gap: 8, minWidth: 320 }}>
          {rows.map((row) => (
            <View key={row.id} style={matrixRowCard}>
              <Text style={{ color: "#12332b", fontWeight: "800", marginBottom: 8 }}>{row.label}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {columns.map((column) => {
                  const current = matrix[row.value];
                  const selected = multi
                    ? (Array.isArray(current) ? current.map(String).includes(column.value) : false)
                    : String(current ?? "") === column.value;
                  return (
                    <Pressable
                      key={column.id}
                      onPress={() => toggle(row.value, column.value)}
                      style={{
                        backgroundColor: selected ? "#12332b" : "white",
                        borderColor: selected ? "#12332b" : "#dbe7e2",
                        borderRadius: 10,
                        borderWidth: 1,
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                      }}
                    >
                      <Text style={{ color: selected ? "white" : "#12332b", fontSize: 12, fontWeight: "700" }}>{column.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function renderRanking(question: MobileQuestion, value: unknown, answer: (v: unknown) => void) {
  const options = question.options.length ? question.options : optionListFromUnknown(question.defaultValue, "options");
  const ranked = Array.isArray(value) ? value.map(String).filter((item) => options.some((option) => option.value === item)) : [];
  const remaining = options.filter((option) => !ranked.includes(option.value));

  function move(valueToMove: string, direction: -1 | 1) {
    const index = ranked.indexOf(valueToMove);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= ranked.length) return;
    const next = [...ranked];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    answer(next);
  }

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: "#49635a", fontSize: 12 }}>Tap choices to build the ranking. Use arrows to adjust the order.</Text>
      {ranked.length > 0 ? (
        <View style={{ gap: 8 }}>
          {ranked.map((optionValue, index) => {
            const option = options.find((item) => item.value === optionValue);
            return (
              <View key={optionValue} style={rankingRow}>
                <Text style={{ color: "#12332b", fontWeight: "800", width: 28 }}>{index + 1}</Text>
                <Text style={{ color: "#12332b", fontWeight: "700", flex: 1 }}>{option?.label ?? optionValue}</Text>
                <Pressable onPress={() => move(optionValue, -1)}><Text style={rankingAction}>↑</Text></Pressable>
                <Pressable onPress={() => move(optionValue, 1)}><Text style={rankingAction}>↓</Text></Pressable>
                <Pressable onPress={() => answer(ranked.filter((item) => item !== optionValue))}><Text style={{ ...rankingAction, color: "#b42318" }}>×</Text></Pressable>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={emptySubCard}>
          <Text style={{ color: "#49635a", fontWeight: "700" }}>No choices ranked yet</Text>
        </View>
      )}
      {remaining.length > 0 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {remaining.map((option) => (
            <Pressable key={option.id} onPress={() => answer([...ranked, option.value])} style={secondaryActionButton}>
              <Text style={secondaryActionText}>+ {option.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function evidenceValue(kind: EvidenceReference["kind"], value: unknown): EvidenceReference {
  if (isRecord(value)) {
    return {
      kind,
      reference: String(value.reference ?? ""),
      notes: String(value.notes ?? ""),
      capturedAt: typeof value.capturedAt === "string" ? value.capturedAt : null,
    };
  }
  return {
    kind,
    reference: typeof value === "string" ? value : "",
    notes: "",
    capturedAt: typeof value === "string" && value.trim() ? new Date().toISOString() : null,
  };
}

function asRecordArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function repeatFields(question: MobileQuestion): SimpleOption[] {
  const metadata = isRecord(question.defaultValue) ? question.defaultValue : {};
  const fields = firstNonEmptyOptionList(
    optionListFromUnknown(metadata.fields, "fields"),
    optionListFromUnknown(metadata.questions, "questions"),
    optionListFromUnknown(metadata.children, "children"),
  );
  if (fields.length > 0) return fields;
  if (question.options.length > 0) return question.options;
  return [{ id: "description", label: "Description", value: "description" }];
}

function matrixMetadata(question: MobileQuestion): { rows: SimpleOption[]; columns: SimpleOption[]; multi: boolean } {
  const metadata = isRecord(question.defaultValue) ? question.defaultValue : {};
  const rows = firstNonEmptyOptionList(
    optionListFromUnknown(metadata.rows, "rows"),
    optionListFromUnknown(metadata.matrixRows, "matrixRows"),
    optionListFromUnknown(metadata.statements, "statements"),
  );
  const columns = firstNonEmptyOptionList(
    optionListFromUnknown(metadata.columns, "columns"),
    optionListFromUnknown(metadata.matrixColumns, "matrixColumns"),
    question.options,
  );
  const mode = String(metadata.mode ?? metadata.matrixMode ?? metadata.type ?? "").toLowerCase();
  const multiRule = question.validationRules.some((rule) => rule.ruleType === "Custom" && String(rule.value).toLowerCase() === "matrixmode:multi");
  return {
    rows: rows.length ? rows : [{ id: question.id, label: question.label, value: question.variableName || question.id }],
    columns: columns.length ? columns : [
      { id: "yes", label: "Yes", value: "yes" },
      { id: "no", label: "No", value: "no" },
    ],
    multi: mode.includes("multi") || multiRule,
  };
}

function optionListFromUnknown(value: unknown, fallbackKey: string): SimpleOption[] {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => {
    if (isRecord(item)) {
      const rawValue = item.value ?? item.id ?? item.name ?? item.label ?? `${fallbackKey}_${index + 1}`;
      const label = String(item.label ?? item.name ?? item.text ?? rawValue);
      return {
        id: String(item.id ?? rawValue),
        label,
        value: String(rawValue),
      };
    }
    const label = String(item || `${fallbackKey} ${index + 1}`);
    return {
      id: label,
      label,
      value: label,
    };
  });
}

function firstNonEmptyOptionList(...lists: SimpleOption[][]): SimpleOption[] {
  return lists.find((list) => list.length > 0) ?? [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

function normalizeTimeEntry(text: string): string {
  const normalized = text.trim();
  if (!normalized) return "";
  const compact = normalized.match(/^(\d{1,2})(\d{2})$/);
  if (compact) {
    const [, hour, minute] = compact;
    return `${pad2(hour)}:${minute}`;
  }
  const withSeparator = normalized.match(/^(\d{1,2})[:.](\d{2})$/);
  if (withSeparator) {
    const [, hour, minute] = withSeparator;
    return `${pad2(hour)}:${minute}`;
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

function nowTimeValue(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
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

const emptySubCard = {
  backgroundColor: "#f6faf8",
  borderColor: "#dbe7e2",
  borderRadius: 12,
  borderWidth: 1,
  padding: 12,
} as const;

const repeatRowCard = {
  backgroundColor: "#f6faf8",
  borderColor: "#dbe7e2",
  borderRadius: 12,
  borderWidth: 1,
  gap: 10,
  padding: 12,
} as const;

const matrixRowCard = {
  backgroundColor: "#f6faf8",
  borderColor: "#dbe7e2",
  borderRadius: 12,
  borderWidth: 1,
  padding: 12,
} as const;

const rankingRow = {
  alignItems: "center",
  backgroundColor: "#f6faf8",
  borderColor: "#dbe7e2",
  borderRadius: 12,
  borderWidth: 1,
  flexDirection: "row",
  gap: 8,
  padding: 10,
} as const;

const rankingAction = {
  color: "#12332b",
  fontSize: 18,
  fontWeight: "800",
  paddingHorizontal: 4,
} as const;

const secondaryActionButton = {
  backgroundColor: "#f0f5f3",
  borderColor: "#dbe7e2",
  borderRadius: 10,
  borderWidth: 1,
  paddingHorizontal: 12,
  paddingVertical: 8,
} as const;

const secondaryActionText = {
  color: "#12332b",
  fontSize: 12,
  fontWeight: "700",
} as const;
