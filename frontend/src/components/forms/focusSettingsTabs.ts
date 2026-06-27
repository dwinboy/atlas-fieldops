import { fieldCollectsAnswer, fieldSupportsEntityMapping, fieldSupportsEvidence, fieldSupportsIndicator, fieldSupportsSelection, type FieldType } from "@/lib/forms";

export type FocusSettingsTab =
  | "common"
  | "response"
  | "logic"
  | "validation"
  | "data"
  | "indicator"
  | "beneficiary"
  | "reference"
  | "evidence"
  | "privacy"
  | "mobile"
  | "governance"
  | "appearance";

export function focusTabApplies(tab: FocusSettingsTab, type: FieldType): boolean {
  switch (tab) {
    case "reference":
      return fieldSupportsSelection(type);
    case "evidence":
      return fieldSupportsEvidence(type);
    case "indicator":
      return fieldSupportsIndicator(type);
    case "beneficiary":
      return fieldSupportsEntityMapping(type);
    case "privacy":
    case "governance":
      return fieldCollectsAnswer(type);
    default:
      return true;
  }
}
