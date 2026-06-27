import { describe, expect, it } from "vitest";

import {
  fieldAppearanceWithMetadata,
  fieldAppearanceWithTag,
  fieldMetadataValue,
  hasFieldTag,
} from "@/components/forms/fieldMetadata";
import { type FormField } from "@/lib/forms";

/**
 * The Evidence/Mobile/Privacy/Governance settings panels read and write behaviour tags and key:value
 * metadata in a field's appearance.helpText through these four helpers. These tests lock that
 * round-trip so the extracted panels keep behaving exactly as the original inline editor did.
 */
const field = (helpText?: string): FormField => ({
  id: "q1",
  label: "Q",
  type: "photo",
  required: false,
  sectionId: "main",
  appearance: helpText ? { helpText } : undefined,
});

describe("field metadata tag helpers (drive the settings panels)", () => {
  it("toggles a boolean tag on and off (Mobile/Evidence checkboxes)", () => {
    const enabled = fieldAppearanceWithTag(field(), "offline-compatible", true);
    expect(enabled?.helpText).toContain("[offline-compatible]");
    expect(hasFieldTag({ ...field(), appearance: enabled }, "offline-compatible")).toBe(true);

    const disabled = fieldAppearanceWithTag({ ...field(), appearance: enabled }, "offline-compatible", false);
    expect(disabled?.helpText ?? "").not.toContain("[offline-compatible]");
    expect(hasFieldTag({ ...field(), appearance: disabled }, "offline-compatible")).toBe(false);
  });

  it("preserves other tags when toggling one", () => {
    const withTwo = fieldAppearanceWithTag(
      { ...field(), appearance: fieldAppearanceWithTag(field(), "capture-gps", true) },
      "photo-evidence",
      true,
    );
    expect(hasFieldTag({ ...field(), appearance: withTwo }, "capture-gps")).toBe(true);
    expect(hasFieldTag({ ...field(), appearance: withTwo }, "photo-evidence")).toBe(true);
  });

  it("sets, reads, and clears a key:value metadata entry (display mode, min-seconds, blocked-help)", () => {
    const set = fieldAppearanceWithMetadata(field(), "mobile", "compact");
    expect(fieldMetadataValue({ ...field(), appearance: set }, "mobile")).toBe("compact");

    const updated = fieldAppearanceWithMetadata({ ...field(), appearance: set }, "mobile", "full-screen");
    expect(fieldMetadataValue({ ...field(), appearance: updated }, "mobile")).toBe("full-screen");

    const cleared = fieldAppearanceWithMetadata({ ...field(), appearance: updated }, "mobile", "");
    expect(fieldMetadataValue({ ...field(), appearance: cleared }, "mobile")).toBe("");
  });

  it("keeps tags and metadata independent", () => {
    const withTag = fieldAppearanceWithTag(field(), "offline-compatible", true);
    const withBoth = fieldAppearanceWithMetadata({ ...field(), appearance: withTag }, "blocked-help", "Ask supervisor");
    expect(hasFieldTag({ ...field(), appearance: withBoth }, "offline-compatible")).toBe(true);
    expect(fieldMetadataValue({ ...field(), appearance: withBoth }, "blocked-help")).toBe("Ask supervisor");
  });
});
