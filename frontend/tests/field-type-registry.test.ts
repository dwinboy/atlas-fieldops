import { describe, expect, it } from "vitest";

import {
  FIELD_TYPE_REGISTRY,
  type FieldCapability,
  type FieldType,
  fieldTypeHasCapability,
  fieldTypesWithCapability,
} from "@/lib/forms";

/**
 * The registry is the single source of truth for response-type capabilities. These tests lock the
 * derived capability sets to the values they had before the registry existed, so the refactor can be
 * proven to change no behavior — and guard against a future type being mis-classified.
 */
const EXPECTED: Record<FieldCapability, FieldType[]> = {
  choice: ["select", "dropdown", "multiselect", "radio", "checkbox", "ranking", "likert", "yes_no", "constant_sum"],
  multiSelect: ["multiselect", "checkbox", "tags"],
  numeric: ["number", "decimal", "currency", "rating", "nps", "percentage", "counter", "measurement", "slider", "duration"],
  decimal: ["decimal", "currency", "measurement"],
  text: ["text", "textarea", "email", "url", "phone", "password"],
  date: ["date", "time", "datetime", "month", "date_range"],
  location: ["gps", "geolocation", "map", "geofence", "polygon", "path"],
  shape: ["polygon", "path"],
  media: ["photo", "image", "signature", "audio", "video", "file", "pdf", "scan_document"],
  displayOnly: ["article", "auto_id", "hidden", "timestamp"],
};

describe("field type capability registry", () => {
  it("every registered type resolves to an array (exhaustive table)", () => {
    for (const [type, capabilities] of Object.entries(FIELD_TYPE_REGISTRY)) {
      expect(Array.isArray(capabilities), `${type} must declare a capability list`).toBe(true);
    }
  });

  it.each(Object.entries(EXPECTED))("derives the %s capability set unchanged", (capability, expected) => {
    expect(fieldTypesWithCapability(capability as FieldCapability).sort()).toEqual([...expected].sort());
  });

  it("answers capability membership for individual types", () => {
    expect(fieldTypeHasCapability("polygon", "shape")).toBe(true);
    expect(fieldTypeHasCapability("polygon", "location")).toBe(true);
    expect(fieldTypeHasCapability("measurement", "decimal")).toBe(true);
    expect(fieldTypeHasCapability("text", "numeric")).toBe(false);
  });
});
