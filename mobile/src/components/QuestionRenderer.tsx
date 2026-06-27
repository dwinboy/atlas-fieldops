import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { AudioCapture, type AudioResult } from "@/components/AudioCapture";
import { BarcodeCapture } from "@/components/BarcodeCapture";
import { GPSCapture } from "@/components/GPSCapture";
import { PhotoCapture } from "@/components/PhotoCapture";
import { PolygonCapture } from "@/components/PolygonCapture";
import { SignatureCapture, type SignatureResult } from "@/components/SignatureCapture";
import { DateTimeField } from "@/components/ui";
import type { FormValidationIssue } from "@/forms/formValidationService";
import { evaluateQuestionLogicStates } from "@/forms/logicEngine";
import { isCascadeBlocked, resolveQuestionOptions, type SimpleOption } from "@/forms/optionResolver";
import { localDatabase } from "@/storage/localDatabase";
import type { GPSResult } from "@/hooks/useGPS";
import type { PhotoResult } from "@/hooks/usePhotoCapture";
import type {
  MobileEntity,
  MobileLogicRule,
  MobilePolygonGeometry,
  MobileQuestion,
  MobileQuestionOption,
  MobileQuestionType,
  MobileReferenceList,
  MobileValidationRule,
} from "@/models/contracts";

export type { SimpleOption };

type EvidenceReference = {
  kind: "FileUpload";
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
  allResponses?: Map<string, unknown>;
  referenceLists?: MobileReferenceList[];
  /** Active language name; when it matches a question translation, the label/hint are localized. */
  activeLanguage?: string;
};

/** Resolves a question's label and help text for the active language, falling back to the base text. */
export function localizedQuestionText(
  question: MobileQuestion,
  activeLanguage?: string,
): { label: string; helpText: string | null } {
  const translation = activeLanguage && question.translations ? question.translations[activeLanguage] : undefined;
  return {
    label: translation?.label?.trim() ? translation.label : question.label,
    helpText: translation?.hint?.trim() ? translation.hint : question.helpText,
  };
}

export function QuestionRenderer({
  question,
  value,
  onAnswer,
  issues,
  visible = true,
  allResponses,
  referenceLists,
  activeLanguage,
}: QuestionRendererProps) {
  if (!visible || question.type === "Hidden") return null;

  const localized = localizedQuestionText(question, activeLanguage);

  const hasError = issues.some((i) => i.questionId === question.id && i.severity === "Error");
  const hasWarning = issues.some((i) => i.questionId === question.id && i.severity === "Warning");
  const responses = allResponses ?? new Map<string, unknown>();
  const reasonQuestionId = changeReasonQuestionId(question.id);
  const reasonVariableName = `${question.variableName}__change_reason`;
  const requiresChangeReason = Boolean(question.governanceControls?.changeReasonRequired);
  const changedPrefilledValue = requiresChangeReason && hasPrefilledValueChanged(question, value);
  const changeReason = typeof responses.get(reasonQuestionId) === "string" ? String(responses.get(reasonQuestionId) ?? "") : "";

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
            {localized.label}
          </Text>
          {question.required && (
            <Text style={{ color: "#b42318", fontWeight: "800", marginTop: 2 }}>*</Text>
          )}
        </View>
        {localized.helpText ? (
          <Text style={{ color: "#49635a", fontSize: 13 }}>{localized.helpText}</Text>
        ) : null}
        <QuestionControlHints question={question} />
      </View>

      {/* Input by type */}
      {question.readOnly && question.type !== "CalculatedField" && String(question.type) !== "Calculated"
        ? renderReadOnlyValue(question, value)
        : renderInput(question, value, answer, responses, referenceLists ?? [], activeLanguage)}

      {changedPrefilledValue ? (
        <View style={{ gap: 6 }}>
          <Text style={{ color: "#49635a", fontSize: 12, fontWeight: "700" }}>
            Reason for changing the prefilled value
          </Text>
          <TextInput
            onChangeText={(text) => onAnswer(reasonQuestionId, reasonVariableName, text)}
            placeholder="Explain why this profile value changed in the field"
            placeholderTextColor="#94a3b8"
            style={inputStyle}
            value={changeReason}
          />
        </View>
      ) : null}

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

export function changeReasonQuestionId(questionId: string): string {
  return `${questionId}__change_reason`;
}

export function hasPrefilledValueChanged(question: MobileQuestion, value: unknown): boolean {
  return JSON.stringify(question.defaultValue ?? null) !== JSON.stringify(value ?? null);
}

// ─── Input renderers ─────────────────────────────────────────────────────────

const SEARCHABLE_OPTION_THRESHOLD = 8;
const OTHER_OPTION_VALUE = "__other__";

/** Reads the text after a `prefix:` in a Custom validation rule (e.g. unit:kg → "kg"). */
function customRuleSuffix(question: MobileQuestion, prefix: string): string | null {
  const rule = question.validationRules.find(
    (item) => item.ruleType === "Custom" && typeof item.value === "string" && item.value.startsWith(prefix),
  );
  return rule && typeof rule.value === "string" ? rule.value.slice(prefix.length) : null;
}

function questionAllowsOther(question: MobileQuestion): boolean {
  return question.validationRules.some((item) => item.ruleType === "Custom" && item.value === "allowOther:true");
}

/** Overrides static option labels with the active language's translations (parallel to the
 * question's original option order). Options sourced from reference lists are left unchanged. */
function localizeOptions(question: MobileQuestion, options: SimpleOption[], activeLanguage?: string): SimpleOption[] {
  const translated = activeLanguage && question.translations ? question.translations[activeLanguage]?.options : undefined;
  if (!Array.isArray(translated) || translated.length === 0) return options;
  const indexByValue = new Map(question.options.map((option, index) => [option.value, index]));
  return options.map((option) => {
    const index = indexByValue.get(option.value);
    const label =
      index !== undefined && typeof translated[index] === "string" && translated[index].trim()
        ? translated[index]
        : option.label;
    return { ...option, label };
  });
}

/** Single/multi choice list that adds a filter box for long option lists so field officers can
 * search reference data (districts, facilities, categories, …) instead of scrolling. */
function SearchableOptionList({
  options,
  value,
  onChange,
  multi,
  allowOther = false,
}: {
  options: SimpleOption[];
  value: unknown;
  onChange: (next: unknown) => void;
  multi: boolean;
  allowOther?: boolean;
}) {
  const [query, setQuery] = useState("");
  const knownValues = useMemo(() => new Set(options.map((option) => option.value)), [options]);
  const selectedValues = multi && Array.isArray(value) ? value.map(String) : [];
  // Persisted "Other" text = a stored value that isn't one of the known options.
  const singleOtherValue =
    !multi && typeof value === "string" && value !== "" && !knownValues.has(value) ? value : "";
  const multiOtherValue = multi ? selectedValues.find((item) => !knownValues.has(item)) ?? "" : "";
  const [otherOpen, setOtherOpen] = useState(Boolean(singleOtherValue) || Boolean(multiOtherValue));

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(needle) ||
        String(option.value).toLowerCase().includes(needle) ||
        (option.search ? option.search.toLowerCase().includes(needle) : false),
    );
  }, [options, query]);

  function toggle(option: SimpleOption) {
    if (multi) {
      const next = new Set(selectedValues);
      if (next.has(option.value)) next.delete(option.value);
      else next.add(option.value);
      onChange(Array.from(next));
    } else {
      setOtherOpen(false);
      onChange(String(value) === option.value ? "" : option.value);
    }
  }

  function setMultiOther(text: string) {
    const base = selectedValues.filter((item) => knownValues.has(item));
    onChange(text.trim() ? [...base, text] : base);
  }

  const otherSelected = otherOpen || Boolean(singleOtherValue) || Boolean(multiOtherValue);

  return (
    <View style={{ gap: 8 }}>
      {options.length > SEARCHABLE_OPTION_THRESHOLD ? (
        <TextInput
          onChangeText={setQuery}
          placeholder={`Search ${options.length} options…`}
          placeholderTextColor="#b0c5bc"
          style={inputStyle}
          value={query}
        />
      ) : null}
      {filtered.length === 0 ? (
        <Text style={{ color: "#8aa79b", fontSize: 12 }}>No options match your search.</Text>
      ) : null}
      {filtered.map((option) => {
        const selected = multi ? selectedValues.includes(option.value) : String(value) === option.value;
        return (
          <Pressable
            key={option.id}
            onPress={() => toggle(option)}
            style={optionRowStyle(selected)}
          >
            <View style={optionMarkStyle(selected, multi)}>
              {selected ? (
                <View style={{ backgroundColor: "white", borderRadius: multi ? 2 : 4, height: 7, width: 7 }} />
              ) : null}
            </View>
            <Text style={{ color: "#12332b", flex: 1, fontWeight: selected ? "700" : "500" }}>{option.label}</Text>
          </Pressable>
        );
      })}
      {allowOther && !query ? (
        <>
          <Pressable
            key={OTHER_OPTION_VALUE}
            onPress={() => {
              if (multi) {
                setOtherOpen((open) => !open);
              } else if (otherSelected) {
                setOtherOpen(false);
                onChange("");
              } else {
                setOtherOpen(true);
                onChange("");
              }
            }}
            style={optionRowStyle(otherSelected)}
          >
            <View style={optionMarkStyle(otherSelected, multi)}>
              {otherSelected ? (
                <View style={{ backgroundColor: "white", borderRadius: multi ? 2 : 4, height: 7, width: 7 }} />
              ) : null}
            </View>
            <Text style={{ color: "#12332b", flex: 1, fontWeight: otherSelected ? "700" : "500" }}>Other (specify)</Text>
          </Pressable>
          {otherSelected ? (
            <TextInput
              onChangeText={(text) => (multi ? setMultiOther(text) : onChange(text))}
              placeholder="Type your answer"
              placeholderTextColor="#b0c5bc"
              style={inputStyle}
              value={multi ? multiOtherValue : singleOtherValue}
            />
          ) : null}
        </>
      ) : null}
    </View>
  );
}

function optionRowStyle(selected: boolean) {
  return {
    alignItems: "center",
    backgroundColor: selected ? "#f0fdf4" : "white",
    borderColor: selected ? "#12332b" : "#dbe7e2",
    borderRadius: 12,
    borderWidth: selected ? 2 : 1,
    flexDirection: "row",
    gap: 10,
    padding: 12,
  } as const;
}

function optionMarkStyle(selected: boolean, multi: boolean) {
  return {
    alignItems: "center",
    backgroundColor: selected ? "#12332b" : "transparent",
    borderColor: selected ? "#12332b" : "#b0c5bc",
    borderRadius: multi ? 5 : 9,
    borderWidth: 2,
    height: 18,
    justifyContent: "center",
    width: 18,
  } as const;
}

/** Reads a single comparable string from a response value (handles arrays and {id,label} objects). */
function responseScalar(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return responseScalar(value[0]);
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return String(record.value ?? record.id ?? record.code ?? "");
  }
  return String(value);
}

/** Applies a record (entity) selection's relationship/column filters offline. Supports the common
 * parent-child case (column `parent`) via the entity's parentEntityIds, plus generic column equality
 * against entity fields — enough for relational lookups like "farms in the chosen household". */
function matchesEntityFilters(
  entity: MobileEntity,
  selection: NonNullable<MobileQuestion["selection"]> | null,
  responses: Map<string, unknown>,
): boolean {
  for (const filter of selection?.filters ?? []) {
    const target = (
      filter.fromQuestionId ? responseScalar(responses.get(filter.fromQuestionId)) : filter.value ?? ""
    )
      .trim()
      .toLowerCase();
    if (!target) continue;
    if (["parent", "parententityid", "parententityids"].includes(filter.column.toLowerCase())) {
      const parents = entity.parentEntityIds.map((id) => String(id).toLowerCase());
      if (!parents.includes(target)) return false;
      continue;
    }
    const actual = String((entity as unknown as Record<string, unknown>)[filter.column] ?? "")
      .trim()
      .toLowerCase();
    const ok =
      filter.op === "neq"
        ? actual !== target
        : filter.op === "contains"
          ? actual.includes(target)
          : filter.op === "in"
            ? target.split(",").map((item) => item.trim()).includes(actual)
            : actual === target;
    if (!ok) return false;
  }
  return true;
}

/** Search-and-pick over an on-device dataset: registered records (entities), entity categories,
 * or reference data. Works offline from the local database; reuses the searchable option list. */
function LookupQuestion({
  question,
  value,
  answer,
  referenceLists,
  allResponses,
}: {
  question: MobileQuestion;
  value: unknown;
  answer: (v: unknown) => void;
  referenceLists: MobileReferenceList[];
  allResponses: Map<string, unknown>;
}) {
  const selection = question.selection ?? null;
  // The `selection` config is authoritative when present; otherwise fall back to the legacy
  // defaultValue.lookupSource. A dataset selection resolves to a reference list; a record
  // selection searches registered entities (filtered by type/relationship); categories are legacy.
  const legacySource = isRecord(question.defaultValue)
    ? String(question.defaultValue.lookupSource ?? "entities")
    : "entities";
  const source = selection
    ? selection.source === "dataset"
      ? "reference"
      : selection.recordSource === "form"
        ? "form"
        : "entities"
    : legacySource;

  const blocked = isCascadeBlocked(question, allResponses);

  const options = useMemo<SimpleOption[]>(() => {
    if (blocked) return [];
    if (source === "categories") {
      return localDatabase.entityCategories
        .list()
        .map((category) => ({ id: category.id, label: category.name, value: category.name }));
    }
    if (source === "reference") {
      return resolveQuestionOptions(question, allResponses, referenceLists);
    }
    // Registered records (entities). Honor an entity-type filter and any dynamic relationship
    // filters (e.g. only children of the household chosen in another question) so cross-form
    // relational lookups stay simple and offline.
    return localDatabase.entities
      .list()
      .filter((entity) =>
        selection?.entityType ? entity.entityType === selection.entityType : true,
      )
      .filter((entity) => matchesEntityFilters(entity, selection, allResponses))
      .map((entity) => ({
        id: entity.id,
        label: entity.name || entity.entityUid,
        value: entity.id,
        search: [entity.name, entity.entityUid, entity.nationalId, entity.householdId]
          .filter(Boolean)
          .join(" "),
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, referenceLists, question.id, blocked, allResponses]);

  if (blocked) {
    return (
      <View style={emptySubCard}>
        <Text style={{ color: "#49635a", fontWeight: "700" }}>Answer the previous question first</Text>
        <Text style={{ color: "#8aa79b", fontSize: 12 }}>
          This list is filtered by an earlier answer. Choose that first to see matching options.
        </Text>
      </View>
    );
  }

  if (options.length === 0) {
    return (
      <View style={emptySubCard}>
        <Text style={{ color: "#49635a", fontWeight: "700" }}>Nothing to search yet</Text>
        <Text style={{ color: "#8aa79b", fontSize: 12 }}>
          {source === "form"
            ? "No linked records are available yet for this question."
            : `Sync to download ${source === "categories" ? "categories" : source === "reference" ? "reference data" : "records"} for this question.`}
        </Text>
      </View>
    );
  }
  return <SearchableOptionList multi={false} onChange={answer} options={options} value={value} />;
}

/** Date/date-time field that pre-fills today on first open when the question is set to default
 * to today. The default is applied once and the officer can still change it. */
function DefaultableDate({
  question,
  value,
  answer,
}: {
  question: MobileQuestion;
  value: unknown;
  answer: (v: unknown) => void;
}) {
  useEffect(() => {
    const empty = value === null || value === undefined || value === "";
    const wantsToday = question.validationRules.some(
      (rule) => rule.ruleType === "Custom" && rule.value === "defaultToday:true",
    );
    if (empty && wantsToday) {
      const today = new Date().toISOString().slice(0, 10);
      answer(question.type === "DateTime" ? `${today} 00:00` : today);
    }
    // Apply once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <DateTimeField
      mode={question.type === "DateTime" ? "datetime" : "date"}
      onChange={(next) => answer(next)}
      value={String(value ?? "")}
    />
  );
}

function renderInput(
  question: MobileQuestion,
  value: unknown,
  answer: (v: unknown) => void,
  allResponses: Map<string, unknown>,
  referenceLists: MobileReferenceList[],
  activeLanguage?: string,
) {
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

  // ── Polygon / boundary ──────────────────────────────────────────────────
  if (type === "Polygon") {
    const minVerticesRule = question.validationRules.find(
      (rule) => rule.ruleType === "Custom" && typeof rule.value === "string" && rule.value.startsWith("minVertices:"),
    );
    const minVertices = typeof minVerticesRule?.value === "string"
      ? Number(minVerticesRule.value.replace("minVertices:", "")) || 3
      : 3;
    return (
      <PolygonCapture
        minVertices={minVertices}
        onChange={(r) => answer(r)}
        required={question.required}
        value={value as MobilePolygonGeometry | null}
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
    const consentValue = value === true ? true : value === false ? false : null;
    return (
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {[
            {
              label: "Yes, consent given",
              selected: consentValue === true,
              activeBackground: "#12332b",
              activeBorder: "#12332b",
              activeText: "white",
              inactiveText: "#12332b",
              nextValue: consentValue === true ? null : true,
            },
            {
              label: "No consent",
              selected: consentValue === false,
              activeBackground: "#fff1f2",
              activeBorder: "#fda4af",
              activeText: "#9f1239",
              inactiveText: "#7f1d1d",
              nextValue: consentValue === false ? null : false,
            },
          ].map((option) => (
            <Pressable
              key={option.label}
              onPress={() => answer(option.nextValue)}
              style={{
                flex: 1,
                backgroundColor: option.selected ? option.activeBackground : "white",
                borderColor: option.selected ? option.activeBorder : "#dbe7e2",
                borderRadius: 12,
                borderWidth: 1,
                paddingVertical: 16,
                paddingHorizontal: 16,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: option.selected ? option.activeText : option.inactiveText,
                  fontWeight: "800",
                  fontSize: 14,
                  textAlign: "center",
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={{ color: "#6b7f77", fontSize: 12 }}>
          {consentValue === null
            ? "Choose whether consent was given before you continue."
            : "Tap the selected option again to clear this answer."}
        </Text>
      </View>
    );
  }

  // ── Single select / Dropdown ──────────────────────────────────────────────
  if (type === "SingleSelect" || type === "Dropdown") {
    if (isCascadeBlocked(question, allResponses)) {
      return (
        <View style={emptySubCard}>
          <Text style={{ color: "#49635a", fontWeight: "700" }}>Answer the related question above first</Text>
          <Text style={{ color: "#8aa79b", fontSize: 12 }}>Choices for this question depend on a previous answer.</Text>
        </View>
      );
    }
    const cascadeOptions = localizeOptions(question, resolveQuestionOptions(question, allResponses, referenceLists), activeLanguage);
    if (cascadeOptions.length === 0) {
      return (
        <View style={emptySubCard}>
          <Text style={{ color: "#49635a", fontWeight: "700" }}>No options available</Text>
          <Text style={{ color: "#8aa79b", fontSize: 12 }}>This question does not have any approved choices right now. Sync again or ask your manager to update the form options.</Text>
        </View>
      );
    }
    return <SearchableOptionList allowOther={questionAllowsOther(question)} multi={false} onChange={answer} options={cascadeOptions} value={value} />;
  }

  // ── Multi select ──────────────────────────────────────────────────────────
  if (type === "MultiSelect") {
    if (isCascadeBlocked(question, allResponses)) {
      return (
        <View style={emptySubCard}>
          <Text style={{ color: "#49635a", fontWeight: "700" }}>Answer the related question above first</Text>
          <Text style={{ color: "#8aa79b", fontSize: 12 }}>Choices for this question depend on a previous answer.</Text>
        </View>
      );
    }
    const cascadeOptions = localizeOptions(question, resolveQuestionOptions(question, allResponses, referenceLists), activeLanguage);
    if (cascadeOptions.length === 0) {
      return (
        <View style={emptySubCard}>
          <Text style={{ color: "#49635a", fontWeight: "700" }}>No options available</Text>
          <Text style={{ color: "#8aa79b", fontSize: 12 }}>This question does not have any approved choices right now. Sync again or ask your manager to update the form options.</Text>
        </View>
      );
    }
    return <SearchableOptionList allowOther={questionAllowsOther(question)} multi onChange={answer} options={cascadeOptions} value={value} />;
  }

  // ── Date / DateTime ───────────────────────────────────────────────────────
  if (type === "Date" || type === "DateTime") {
    return <DefaultableDate answer={answer} question={question} value={value} />;
  }

  // ── Time ─────────────────────────────────────────────────────────────────
  if (type === "Time") {
    return (
      <DateTimeField
        mode="time"
        value={String(value ?? "")}
        onChange={(next) => answer(next)}
      />
    );
  }

  // ── Signature ─────────────────────────────────────────────────────────────
  if (type === "Signature") {
    return (
      <SignatureCapture
        value={value as SignatureResult | null}
        onChange={(result) => answer(result)}
        required={question.required}
      />
    );
  }

  // ── Audio ─────────────────────────────────────────────────────────────────
  if (type === "Audio") {
    return (
      <AudioCapture
        value={value as AudioResult | null}
        onChange={(result) => answer(result)}
        required={question.required}
      />
    );
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
    const unit = customRuleSuffix(question, "unit:");
    const input = (
      <TextInput
        keyboardType={numericKeyboardType(type)}
        onChangeText={(t) => {
          answer(coerceNumericInput(t, type));
        }}
        placeholder={type === "Currency" ? "0.00" : "0"}
        placeholderTextColor="#b0c5bc"
        style={unit ? { ...inputStyle, flex: 1 } : inputStyle}
        value={String(value ?? "")}
      />
    );
    if (!unit) return input;
    return (
      <View style={{ alignItems: "center", flexDirection: "row", gap: 8 }}>
        {input}
        <Text style={{ color: "#49635a", fontSize: 14, fontWeight: "700" }}>{unit}</Text>
      </View>
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
        secureTextEntry={Boolean(question.privacyControls?.maskOnScreen)}
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
    if (question.repeatSettings?.countFromVariable) {
      return (
        <CountDrivenRepeatGroup
          allResponses={allResponses}
          answer={answer}
          question={question}
          referenceLists={referenceLists}
          value={value}
        />
      );
    }
    return renderRepeatGroup(question, value, answer, referenceLists);
  }

  // ── Matrix ───────────────────────────────────────────────────────────────
  if (type === "Matrix") {
    return renderMatrix(question, value, answer, activeLanguage);
  }

  // ── Lookup (search records, categories, or reference data) ────────────────
  if (type === "Lookup") {
    return (
      <LookupQuestion
        allResponses={allResponses}
        answer={answer}
        question={question}
        referenceLists={referenceLists}
        value={value}
      />
    );
  }

  // ── Ranking ──────────────────────────────────────────────────────────────
  if (type === "Ranking") {
    return renderRanking(question, value, answer, allResponses, referenceLists);
  }

  // ── Rating (stars) ───────────────────────────────────────────────────────
  if (type === "Rating") {
    const max = 5;
    const current = Number(value) || 0;
    return (
      <View style={{ flexDirection: "row", gap: 6 }}>
        {Array.from({ length: max }, (_, index) => index + 1).map((star) => (
          <Pressable key={star} onPress={() => answer(star === current ? null : star)} hitSlop={6}>
            <Text style={{ fontSize: 28, color: star <= current ? "#f59e0b" : "#dbe7e2" }}>
              {star <= current ? "★" : "☆"}
            </Text>
          </Pressable>
        ))}
      </View>
    );
  }

  // ── NPS (0-10 score) ─────────────────────────────────────────────────────
  if (type === "Nps") {
    const current = value === null || value === undefined || value === "" ? null : Number(value);
    return (
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {Array.from({ length: 11 }, (_, score) => score).map((score) => {
            const selected = current === score;
            return (
              <Pressable
                key={score}
                onPress={() => answer(current === score ? null : score)}
                style={{
                  alignItems: "center",
                  backgroundColor: selected ? "#12332b" : "white",
                  borderColor: selected ? "#12332b" : "#dbe7e2",
                  borderRadius: 8,
                  borderWidth: 1,
                  height: 32,
                  justifyContent: "center",
                  width: 32,
                }}
              >
                <Text style={{ color: selected ? "white" : "#12332b", fontSize: 12, fontWeight: "700" }}>{score}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ color: "#8aa79b", fontSize: 11 }}>Not likely</Text>
          <Text style={{ color: "#8aa79b", fontSize: 11 }}>Very likely</Text>
        </View>
      </View>
    );
  }

  // ── Default: Text ─────────────────────────────────────────────────────────
  const inputModeProps = textInputModeProps(question.inputMode);
  return (
    <TextInput
      autoCapitalize={inputModeProps.autoCapitalize ?? "sentences"}
      keyboardType={inputModeProps.keyboardType}
      textContentType={inputModeProps.textContentType}
      onChangeText={(t) => answer(t)}
      placeholder="Enter answer…"
      placeholderTextColor="#b0c5bc"
      secureTextEntry={Boolean(question.privacyControls?.maskOnScreen)}
      style={inputStyle}
      value={String(value ?? "")}
    />
  );
}

function textInputModeProps(inputMode: MobileQuestion["inputMode"]): {
  keyboardType?: "default" | "email-address" | "phone-pad" | "url";
  autoCapitalize?: "none" | "sentences";
  textContentType?: "emailAddress" | "telephoneNumber" | "URL";
} {
  switch (inputMode) {
    case "email":
      return { keyboardType: "email-address", autoCapitalize: "none", textContentType: "emailAddress" };
    case "phone":
      return { keyboardType: "phone-pad", autoCapitalize: "none", textContentType: "telephoneNumber" };
    case "url":
      return { keyboardType: "url", autoCapitalize: "none", textContentType: "URL" };
    default:
      return {};
  }
}

function numericKeyboardType(type: MobileQuestionType): "number-pad" | "decimal-pad" {
  return type === "Number" ? "number-pad" : "decimal-pad";
}

function coerceNumericInput(text: string, type: MobileQuestionType): string | number {
  const trimmed = text.trim();
  if (!trimmed) {
    return "";
  }

  if (type === "Number") {
    return /^-?\d+$/.test(trimmed) ? Number.parseInt(trimmed, 10) : text;
  }

  return /^-?(?:\d+|\d+\.\d+|\.\d+)$/.test(trimmed) ? Number.parseFloat(trimmed) : text;
}

function QuestionControlHints({ question }: { question: MobileQuestion }) {
  const hints: { label: string; tone: "warning" | "danger" | "success" | "neutral" }[] = [];
  if (question.qualityControls?.captureGps) hints.push({ label: "GPS evidence", tone: question.qualityControls.integrityAction === "block_submission" ? "danger" : "warning" });
  if (question.qualityControls?.photoEvidence) hints.push({ label: "Photo evidence", tone: question.qualityControls.integrityAction === "block_submission" ? "danger" : "warning" });
  if (question.privacyControls?.consentRequired) hints.push({ label: "Consent required", tone: "danger" });
  if (question.privacyControls?.maskOnScreen) hints.push({ label: "Masked", tone: "neutral" });
  if (question.beneficiaryMapping?.beneficiaryField) hints.push({ label: `Profile: ${humanize(question.beneficiaryMapping.beneficiaryField)}`, tone: "success" });
  if (question.referenceControls?.offlineRequired || question.referenceListId) hints.push({ label: "Offline list", tone: "neutral" });
  if (!hints.length && !question.mobileControls?.blockedHelp) return null;
  return (
    <View style={{ gap: 6 }}>
      {question.mobileControls?.blockedHelp ? (
        <View style={{ backgroundColor: "#fff7ed", borderColor: "#fed7aa", borderRadius: 10, borderWidth: 1, padding: 8 }}>
          <Text style={{ color: "#9a3412", fontSize: 12, fontWeight: "700" }}>{question.mobileControls.blockedHelp}</Text>
        </View>
      ) : null}
      {hints.length ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {hints.map((hint) => (
            <View
              key={hint.label}
              style={{
                backgroundColor: hint.tone === "danger" ? "#fee2e2" : hint.tone === "warning" ? "#fff7ed" : hint.tone === "success" ? "#f0fdf4" : "#f0f5f3",
                borderRadius: 999,
                paddingHorizontal: 8,
                paddingVertical: 4,
              }}
            >
              <Text
                style={{
                  color: hint.tone === "danger" ? "#b42318" : hint.tone === "warning" ? "#9a3412" : hint.tone === "success" ? "#0f766e" : "#49635a",
                  fontSize: 11,
                  fontWeight: "800",
                }}
              >
                {hint.label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function humanize(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
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

function renderReadOnlyValue(question: MobileQuestion, value: unknown) {
  return (
    <View style={{
      backgroundColor: "#f0f5f3",
      borderColor: "#dbe7e2",
      borderRadius: 12,
      borderWidth: 1,
      padding: 14,
      gap: 6,
    }}>
      <Text style={{ color: "#49635a", fontSize: 12, fontWeight: "700", textTransform: "uppercase" }}>
        Read only
      </Text>
      <Text style={{ color: "#12332b", fontSize: 15, fontWeight: "700" }}>
        {readOnlyDisplayValue(question, value)}
      </Text>
    </View>
  );
}

function readOnlyDisplayValue(question: MobileQuestion, value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "No value";
  }
  if (question.type === "GPS" && isRecord(value)) {
    const latitude = Number(value.latitude);
    const longitude = Number(value.longitude);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
    }
  }
  if (question.type === "Polygon" && isRecord(value) && Array.isArray(value.coordinates)) {
    const ring = Array.isArray(value.coordinates[0]) ? value.coordinates[0] : [];
    const vertexCount = Math.max(0, ring.length - 1);
    return vertexCount > 0 ? `${vertexCount} boundary point(s) recorded` : "Boundary recorded";
  }
  if (["Photo", "Video", "Audio", "FileUpload", "Signature"].includes(question.type) && isRecord(value)) {
    const reference = value.reference ?? value.uri ?? value.localUri ?? value.fileName ?? value.name;
    if (typeof reference === "string" && reference.trim().length > 0) {
      return reference.trim();
    }
    return "Evidence captured";
  }
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join(", ");
  }
  if (isRecord(value)) {
    return Object.values(value).flatMap((item) => Array.isArray(item) ? item.map(String) : [String(item)]).join(", ");
  }
  return String(value);
}

/** Repeat group whose row count is driven by another question's number answer. Answering
 * "how many farms? → 3" auto-creates 3 rows (each with the repeat's questions, e.g. a polygon).
 * Officers can still edit each row; reducing the count trims trailing rows. */
function CountDrivenRepeatGroup({
  question,
  value,
  answer,
  referenceLists,
  allResponses,
}: {
  question: MobileQuestion;
  value: unknown;
  answer: (v: unknown) => void;
  referenceLists: MobileReferenceList[];
  allResponses: Map<string, unknown>;
}) {
  const countVariable = question.repeatSettings?.countFromVariable ?? null;
  const rawCount = countVariable ? allResponses.get(countVariable) : null;
  const target = typeof rawCount === "number" ? rawCount : Number(rawCount);

  useEffect(() => {
    if (!countVariable || !Number.isFinite(target) || target < 0) return;
    const max = question.repeatSettings?.maxRepeats ?? null;
    const desired = max !== null ? Math.min(target, max) : target;
    const rows = asRecordArray(value);
    if (rows.length === desired) return;
    const fields = repeatFields(question);
    if (rows.length < desired) {
      const additions = Array.from({ length: desired - rows.length }, () =>
        applyRepeatRowDerivedState(
          fields,
          Object.fromEntries(fields.map((field) => [field.id, blankRepeatValue(field)])),
          referenceLists,
        ),
      );
      answer([...rows, ...additions]);
    } else {
      // Count decreased: only drop trailing rows that have no answers, so entered data is never lost.
      let end = rows.length;
      while (end > desired && isRepeatRowEmpty(rows[end - 1], fields)) end -= 1;
      if (end !== rows.length) answer(rows.slice(0, end));
    }
    // Re-sync only when the source count changes — not on every row edit (which would loop).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, countVariable]);

  return (
    <View style={{ gap: 8 }}>
      {countVariable && !Number.isFinite(target) ? (
        <Text style={{ color: "#8aa79b", fontSize: 12 }}>
          Answer the count question above to create the items to fill here.
        </Text>
      ) : null}
      {renderRepeatGroup(question, value, answer, referenceLists)}
    </View>
  );
}

function renderRepeatGroup(
  question: MobileQuestion,
  value: unknown,
  answer: (v: unknown) => void,
  referenceLists: MobileReferenceList[],
) {
  const rows = asRecordArray(value);
  const fields = repeatFields(question);
  const maxRepeats = question.repeatSettings?.maxRepeats ?? null;
  const minRepeats = question.repeatSettings?.minRepeats ?? null;
  const canAdd = maxRepeats === null || rows.length < maxRepeats;

  function updateRow(rowIndex: number, fieldId: string, fieldValue: unknown) {
    answer(
      rows.map((row, index) =>
        index === rowIndex
          ? applyRepeatRowDerivedState(fields, { ...row, [fieldId]: fieldValue }, referenceLists)
          : row,
      ),
    );
  }

  function addRow() {
    const blank = Object.fromEntries(fields.map((field) => [field.id, blankRepeatValue(field)]));
    answer([...rows, applyRepeatRowDerivedState(fields, blank, referenceLists)]);
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
          {(() => {
            const rowResponses = new Map(Object.entries(row));
            const rowLogic = evaluateQuestionLogicStates(fields, rowResponses);
            const visibleFields = fields.filter((field) => field.type !== "Hidden" && rowLogic[field.id]?.visible !== false);
            return (
              <>
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
          {visibleFields.map((field) => (
            <View key={field.id} style={{ gap: 4 }}>
              <Text style={{ color: "#49635a", fontSize: 12, fontWeight: "700" }}>
                {field.label}{rowLogic[field.id]?.required ? " *" : ""}
              </Text>
              {renderRepeatFieldInput(
                field,
                row[field.id] ?? row[field.variableName],
                (next) => updateRow(rowIndex, field.id, next),
                row,
                referenceLists,
              )}
            </View>
          ))}
              </>
            );
          })()}
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

function applyLabelOverrides(options: SimpleOption[], labels?: string[]): SimpleOption[] {
  if (!Array.isArray(labels) || labels.length === 0) return options;
  return options.map((option, index) =>
    typeof labels[index] === "string" && labels[index].trim() ? { ...option, label: labels[index] } : option,
  );
}

function renderMatrix(question: MobileQuestion, value: unknown, answer: (v: unknown) => void, activeLanguage?: string) {
  const base = matrixMetadata(question);
  const translation = activeLanguage && question.translations ? question.translations[activeLanguage] : undefined;
  const rows = applyLabelOverrides(base.rows, translation?.matrixRows);
  const columns = applyLabelOverrides(base.columns, translation?.matrixColumns);
  const multi = base.multi;
  const matrix = isRecord(value) ? value : {};

  function toggle(rowValue: string, columnValue: string) {
    if (multi) {
      const current = Array.isArray(matrix[rowValue]) ? (matrix[rowValue] as unknown[]).map(String) : [];
      const next = current.includes(columnValue)
        ? current.filter((item) => item !== columnValue)
        : [...current, columnValue];
      answer(updateMatrixRowValue(matrix, rowValue, next.length > 0 ? next : undefined));
      return;
    }
    const current = String(matrix[rowValue] ?? "");
    answer(updateMatrixRowValue(matrix, rowValue, current === columnValue ? undefined : columnValue));
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

function updateMatrixRowValue(
  matrix: Record<string, unknown>,
  rowValue: string,
  nextValue: unknown,
): Record<string, unknown> {
  if (nextValue === undefined) {
    const nextMatrix = { ...matrix };
    delete nextMatrix[rowValue];
    return nextMatrix;
  }
  return { ...matrix, [rowValue]: nextValue };
}

function renderRanking(
  question: MobileQuestion,
  value: unknown,
  answer: (v: unknown) => void,
  allResponses: Map<string, unknown>,
  referenceLists: MobileReferenceList[],
) {
  if (isCascadeBlocked(question, allResponses)) {
    return (
      <View style={emptySubCard}>
        <Text style={{ color: "#49635a", fontWeight: "700" }}>Answer the related question above first</Text>
        <Text style={{ color: "#8aa79b", fontSize: 12 }}>Ranking choices for this question depend on a previous answer.</Text>
      </View>
    );
  }
  const options = resolveQuestionOptions(question, allResponses, referenceLists);
  if (options.length === 0) {
    return (
      <View style={emptySubCard}>
        <Text style={{ color: "#49635a", fontWeight: "700" }}>No ranking choices available</Text>
        <Text style={{ color: "#8aa79b", fontSize: 12 }}>This ranking question does not have any approved choices right now. Sync again or ask your manager to update the form options.</Text>
      </View>
    );
  }
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

function renderRepeatFieldInput(
  field: MobileQuestion,
  value: unknown,
  onChange: (v: unknown) => void,
  row: Record<string, unknown>,
  referenceLists: MobileReferenceList[],
) {
  if (field.type === "Hidden") {
    return null;
  }
  if (field.readOnly && field.type !== "CalculatedField" && String(field.type) !== "Calculated") {
    return renderReadOnlyValue(field, value);
  }
  return renderInput(field, value, onChange, new Map(Object.entries(row)), referenceLists);
}

function applyRepeatRowDerivedState(
  fields: MobileQuestion[],
  row: Record<string, unknown>,
  referenceLists: MobileReferenceList[],
): Record<string, unknown> {
  const nextRow = { ...row };
  let updated = false;

  while (true) {
    const rowResponses = new Map(Object.entries(nextRow));
    const rowLogic = evaluateQuestionLogicStates(fields, rowResponses);
    let loopUpdated = false;

    for (const field of fields) {
      if (field.type === "CalculatedField" || String(field.type) === "Calculated") {
        const calculated = rowLogic[field.id]?.calculatedValue ?? null;
        const currentValue = nextRow[field.id] ?? nextRow[field.variableName];
        if (calculated === null) {
          if (hasRepeatFieldAnswer(currentValue, field.type)) {
            setRepeatFieldValue(nextRow, field, blankRepeatValue(field));
            loopUpdated = true;
          }
          continue;
        }
        if (currentValue !== calculated) {
          setRepeatFieldValue(nextRow, field, calculated);
          loopUpdated = true;
        }
        continue;
      }

      const currentValue = nextRow[field.id] ?? nextRow[field.variableName];
      if (rowLogic[field.id]?.visible === false && hasRepeatFieldAnswer(currentValue, field.type)) {
        setRepeatFieldValue(nextRow, field, blankRepeatValue(field));
        loopUpdated = true;
        continue;
      }

      if (!hasRepeatFieldAnswer(currentValue, field.type)) {
        continue;
      }

      if (isCascadeBlocked(field, rowResponses)) {
        setRepeatFieldValue(nextRow, field, blankRepeatValue(field));
        loopUpdated = true;
        continue;
      }

      const validOptions = resolveQuestionOptions(field, rowResponses, referenceLists);
      if (!["SingleSelect", "Dropdown", "MultiSelect", "Ranking"].includes(field.type)) {
        continue;
      }
      const validValues = new Set(validOptions.map((option) => option.value));
      const stillValid = Array.isArray(currentValue)
        ? currentValue.every((item) => validValues.has(String(item)))
        : validValues.has(String(currentValue));
      if (!stillValid) {
        setRepeatFieldValue(nextRow, field, blankRepeatValue(field));
        loopUpdated = true;
      }
    }

    if (!loopUpdated) {
      break;
    }
    updated = true;
  }

  return updated ? nextRow : row;
}

function setRepeatFieldValue(row: Record<string, unknown>, field: MobileQuestion, value: unknown): void {
  row[field.id] = value;
  if (field.variableName && field.variableName !== field.id && field.variableName in row) {
    row[field.variableName] = value;
  }
}

function isRepeatRowEmpty(row: Record<string, unknown>, fields: MobileQuestion[]): boolean {
  return fields.every((field) => !hasRepeatFieldAnswer(row[field.id] ?? row[field.variableName], field.type));
}

function hasRepeatFieldAnswer(value: unknown, questionType: MobileQuestion["type"]): boolean {
  if (value === null || value === undefined || (typeof value === "string" && value.trim() === "")) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (questionType === "Matrix") {
    return hasMeaningfulMatrixAnswers(value);
  }
  if (questionType === "GPS" && isRecord(value)) {
    return Number.isFinite(Number(value.latitude)) && Number.isFinite(Number(value.longitude));
  }
  if (["Photo", "Video", "Audio", "FileUpload", "Signature"].includes(questionType) && isRecord(value)) {
    const reference = value.reference ?? value.uri ?? value.localUri;
    return String(reference ?? "").trim().length > 0;
  }
  return true;
}

function hasMeaningfulMatrixAnswers(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  return Object.values(value).some((item) => {
    if (item === null || item === undefined || item === "") {
      return false;
    }
    if (Array.isArray(item)) {
      return item.length > 0;
    }
    return true;
  });
}

function blankRepeatValue(field: MobileQuestion): unknown {
  if (field.type === "MultiSelect" || field.type === "Ranking") return [];
  if (field.type === "Matrix") return {};
  if (field.type === "RepeatGroup") return [];
  if (field.type === "Consent") return null;
  if (
    [
      "GPS",
      "Photo",
      "Audio",
      "Video",
      "FileUpload",
      "Signature",
      "Barcode",
      "QRCode",
      "CalculatedField",
      "Polygon",
      "Hidden",
    ].includes(field.type)
  ) {
    return null;
  }
  return "";
}

function repeatFields(question: MobileQuestion): MobileQuestion[] {
  const metadata = isRecord(question.defaultValue) ? question.defaultValue : {};
  const rawFields = firstNonEmptyArray(metadata.fields, metadata.questions, metadata.children);
  if (rawFields.length > 0) {
    return rawFields.map((field, index) => normalizeRepeatField(field, question, index));
  }
  if (Array.isArray(question.defaultValue) && question.defaultValue.length > 0) {
    return question.defaultValue.map((field, index) => normalizeRepeatField(field, question, index));
  }
  if (question.options.length > 0) {
    return question.options.map((option, index) => normalizeRepeatField(option, question, index));
  }
  return [normalizeRepeatField({ id: "description", label: "Description" }, question, 0)];
}

function firstNonEmptyArray(...lists: unknown[]): unknown[] {
  for (const list of lists) {
    if (Array.isArray(list) && list.length > 0) return list;
  }
  return [];
}

function normalizeRepeatField(raw: unknown, parent: MobileQuestion, index: number): MobileQuestion {
  if (isRecord(raw) && typeof raw.id === "string" && typeof raw.type === "string") {
    const referenceControls = isRecord(raw.referenceControls) ? raw.referenceControls : {};
    const qualityControls = isRecord(raw.qualityControls) ? raw.qualityControls : {};
    const privacyControls = isRecord(raw.privacyControls) ? raw.privacyControls : {};
    const mobileControls = isRecord(raw.mobileControls) ? raw.mobileControls : {};
    const governanceControls = isRecord(raw.governanceControls) ? raw.governanceControls : {};
    const indicatorMapping = isRecord(raw.indicatorMapping) ? raw.indicatorMapping : {};
    const beneficiaryMapping = isRecord(raw.beneficiaryMapping) ? raw.beneficiaryMapping : {};
    return {
      id: raw.id,
      sectionId: typeof raw.sectionId === "string" ? raw.sectionId : parent.id,
      variableName: typeof raw.variableName === "string" ? raw.variableName : raw.id,
      label: String(raw.label ?? raw.id),
      helpText: typeof raw.helpText === "string" ? raw.helpText : null,
      type: raw.type as MobileQuestionType,
      inputMode:
        raw.inputMode === "phone" || raw.inputMode === "email" || raw.inputMode === "url"
          ? raw.inputMode
          : null,
      required: Boolean(raw.required),
      readOnly: Boolean(raw.readOnly),
      defaultValue: raw.defaultValue ?? null,
      options: Array.isArray(raw.options) ? (raw.options as MobileQuestionOption[]) : [],
      validationRules: Array.isArray(raw.validationRules) ? (raw.validationRules as MobileValidationRule[]) : [],
      logicRules: Array.isArray(raw.logicRules) ? (raw.logicRules as MobileLogicRule[]) : [],
      referenceListId: typeof raw.referenceListId === "string" ? raw.referenceListId : null,
      cascadingParentQuestionId:
        typeof raw.cascadingParentQuestionId === "string"
          ? raw.cascadingParentQuestionId
          : typeof referenceControls.parentQuestionId === "string"
            ? referenceControls.parentQuestionId
            : null,
      sensitive: Boolean(raw.sensitive),
      metadataTags: Array.isArray(raw.metadataTags) ? raw.metadataTags.filter((tag): tag is string => typeof tag === "string") : undefined,
      indicatorMapping: Object.keys(indicatorMapping).length > 0 ? {
        indicatorId: typeof indicatorMapping.indicatorId === "string" ? indicatorMapping.indicatorId : null,
        component: typeof indicatorMapping.component === "string" ? indicatorMapping.component : null,
        unit: typeof indicatorMapping.unit === "string" ? indicatorMapping.unit : null,
        reportingPeriod: typeof indicatorMapping.reportingPeriod === "string" ? indicatorMapping.reportingPeriod : null,
        disaggregation: typeof indicatorMapping.disaggregation === "string" ? indicatorMapping.disaggregation : null,
        donorTag: typeof indicatorMapping.donorTag === "string" ? indicatorMapping.donorTag : null,
      } : undefined,
      beneficiaryMapping: Object.keys(beneficiaryMapping).length > 0 ? {
        profileImpact: typeof beneficiaryMapping.profileImpact === "string" ? beneficiaryMapping.profileImpact : null,
        beneficiaryField: typeof beneficiaryMapping.beneficiaryField === "string" ? beneficiaryMapping.beneficiaryField : null,
        profileUpdateRule: typeof beneficiaryMapping.profileUpdateRule === "string" ? beneficiaryMapping.profileUpdateRule : null,
        duplicateKey: Boolean(beneficiaryMapping.duplicateKey),
        sourceOfTruth: Boolean(beneficiaryMapping.sourceOfTruth),
        lineageRequired: Boolean(beneficiaryMapping.lineageRequired),
      } : undefined,
      referenceControls: Object.keys(referenceControls).length > 0 ? {
        referenceListId: typeof referenceControls.referenceListId === "string" ? referenceControls.referenceListId : null,
        parentQuestionId: typeof referenceControls.parentQuestionId === "string" ? referenceControls.parentQuestionId : null,
        newReferencePolicy: typeof referenceControls.newReferencePolicy === "string" ? referenceControls.newReferencePolicy : null,
        offlineRequired: Boolean(referenceControls.offlineRequired),
        searchable: Boolean(referenceControls.searchable),
        versionLocked: Boolean(referenceControls.versionLocked),
      } : undefined,
      qualityControls: Object.keys(qualityControls).length > 0 ? {
        captureTimestamp: Boolean(qualityControls.captureTimestamp),
        captureGps: Boolean(qualityControls.captureGps),
        photoEvidence: Boolean(qualityControls.photoEvidence),
        backCheckCandidate: Boolean(qualityControls.backCheckCandidate),
        staticGpsWarning: Boolean(qualityControls.staticGpsWarning),
        fastInterviewWarning: Boolean(qualityControls.fastInterviewWarning),
        minimumSeconds:
          typeof qualityControls.minimumSeconds === "string" || typeof qualityControls.minimumSeconds === "number"
            ? qualityControls.minimumSeconds
            : null,
        integrityAction: typeof qualityControls.integrityAction === "string" ? qualityControls.integrityAction : null,
      } : undefined,
      privacyControls: Object.keys(privacyControls).length > 0 ? {
        sensitivity: typeof privacyControls.sensitivity === "string" ? privacyControls.sensitivity : null,
        consentField: typeof privacyControls.consentField === "string" ? privacyControls.consentField : null,
        maskOnScreen: Boolean(privacyControls.maskOnScreen),
        maskOnExport: Boolean(privacyControls.maskOnExport),
        encryptAtRest: Boolean(privacyControls.encryptAtRest),
        hideAfterSubmit: Boolean(privacyControls.hideAfterSubmit),
        screenshotRestricted: Boolean(privacyControls.screenshotRestricted),
        consentRequired: Boolean(privacyControls.consentRequired),
      } : undefined,
      mobileControls: Object.keys(mobileControls).length > 0 ? {
        displayMode: typeof mobileControls.displayMode === "string" ? mobileControls.displayMode : null,
        blockedHelp: typeof mobileControls.blockedHelp === "string" ? mobileControls.blockedHelp : null,
        offlineCompatible: Boolean(mobileControls.offlineCompatible),
        lowBandwidth: Boolean(mobileControls.lowBandwidth),
        prefillAllowed: Boolean(mobileControls.prefillAllowed),
        saveDraftAfterAnswer: Boolean(mobileControls.saveDraftAfterAnswer),
        reviewBeforeSubmit: Boolean(mobileControls.reviewBeforeSubmit),
        syncPriority: Boolean(mobileControls.syncPriority),
      } : undefined,
      governanceControls: Object.keys(governanceControls).length > 0 ? {
        editRule: typeof governanceControls.editRule === "string" ? governanceControls.editRule : null,
        reviewerRole: typeof governanceControls.reviewerRole === "string" ? governanceControls.reviewerRole : null,
        auditLabel: typeof governanceControls.auditLabel === "string" ? governanceControls.auditLabel : null,
        changeReasonRequired: Boolean(governanceControls.changeReasonRequired),
        approvedDataLock: Boolean(governanceControls.approvedDataLock),
        reviewerCommentRequired: Boolean(governanceControls.reviewerCommentRequired),
        includeInDataFreeze: Boolean(governanceControls.includeInDataFreeze),
        qualityFlagVisible: Boolean(governanceControls.qualityFlagVisible),
        sourceLineageVisible: Boolean(governanceControls.sourceLineageVisible),
      } : undefined,
      repeatSettings: null,
      order: typeof raw.order === "number" ? raw.order : index + 1,
    };
  }

  // Legacy `{id,label,value}` option shape — render as a plain text field.
  const id = isRecord(raw) ? String(raw.id ?? raw.value ?? raw.label ?? `field_${index + 1}`) : String(raw || `field_${index + 1}`);
  const label = isRecord(raw) ? String(raw.label ?? raw.name ?? id) : String(raw || id);
  return {
    id,
    sectionId: parent.id,
    variableName: id,
    label,
    helpText: null,
    type: "Text",
    required: false,
    readOnly: false,
    defaultValue: null,
    options: [],
    validationRules: [],
    logicRules: [],
    referenceListId: null,
    cascadingParentQuestionId: null,
    sensitive: false,
    repeatSettings: null,
    order: index + 1,
  };
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

const inputStyle = {
  backgroundColor: "#f6faf8",
  borderColor: "#dbe7e2",
  borderRadius: 12,
  borderWidth: 1,
  color: "#12332b",
  fontSize: 15,
  padding: 14,
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
