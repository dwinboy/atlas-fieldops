import { type FieldType } from "@/lib/forms";
import { type FormAssignmentPlan, type FormReadinessState } from "@/components/forms/formBuilderTypes";

export const frequentFieldTypes: { type: FieldType; label: string }[] = [
  { type: "text", label: "Short text" },
  { type: "number", label: "Number" },
  { type: "date", label: "Date" },
  { type: "radio", label: "Radio" },
  { type: "dropdown", label: "Dropdown" },
  { type: "checkbox", label: "Checkboxes" },
  { type: "gps", label: "GPS" },
  { type: "photo", label: "Photo" },
];

export const defaultReadinessState: FormReadinessState = {
  mobilePreviewChecked: false,
  pilotTestCompleted: false,
  enumeratorBriefingReady: false,
  importTemplateReviewed: false,
};

export const defaultAssignmentPlan: FormAssignmentPlan = {
  audience: "All assigned field officers",
  team: "Baseline enumerators",
  supervisor: "Survey supervisor",
  locationScope: "Survey geography",
  targetSubmissions: 250,
  dailyTarget: 25,
  briefingComplete: false,
  pilotEnumerator: "Lead enumerator",
};
