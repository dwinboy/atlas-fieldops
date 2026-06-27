import { type FieldType, type FormField } from "@/lib/forms";

/** Builder palette presets and the section/template catalog (pure data and their types). */

export type FieldPreset = {
  id: string;
  label: string;
  type: FieldType;
  hint: string;
  required?: boolean;
  options?: string[];
  validation?: FormField["validation"];
  repeat?: FormField["repeat"];
};
export type QuestionSuggestion = FieldPreset & {
  confidence: "Best match" | "Good option" | "Alternative";
  reason: string;
  settings: string[];
};
export type SectionTemplate = {
  id: string;
  title: string;
  description: string;
  fields: FieldPreset[];
};

export const quickFieldPresets: FieldPreset[] = [
  {
    id: "person-name",
    label: "Person name",
    type: "text",
    hint: "Full name of respondent or entity.",
    required: true,
  },
  {
    id: "phone-number",
    label: "Phone number",
    type: "phone",
    hint: "Primary contact number.",
    required: true,
  },
  {
    id: "age",
    label: "Age",
    type: "number",
    hint: "Age in completed years.",
    validation: { min: 0, max: 120 },
  },
  {
    id: "gender",
    label: "Gender",
    type: "radio",
    hint: "Gender identity for demographic reporting.",
    options: ["Female", "Male", "Prefer not to say"],
  },
  {
    id: "yes-no",
    label: "Yes / No question",
    type: "radio",
    hint: "Simple eligibility or confirmation question.",
    options: ["Yes", "No"],
  },
  {
    id: "gps-location",
    label: "GPS location",
    type: "gps",
    hint: "Capture accurate field location.",
    required: true,
    validation: { accuracyMax: 25 },
  },
  {
    id: "photo-evidence",
    label: "Photo evidence",
    type: "image",
    hint: "Capture or upload proof from the field.",
  },
  {
    id: "consent-signature",
    label: "Consent signature",
    type: "signature",
    hint: "Respondent consent or acknowledgement.",
  },
  {
    id: "consent-yes-no",
    label: "Consent yes/no",
    type: "radio",
    hint: "Confirm consent before continuing data collection.",
    options: ["Yes", "No"],
    required: true,
  },
  {
    id: "household-id",
    label: "Household ID",
    type: "text",
    hint: "Unique household identifier.",
    required: true,
    validation: { pattern: "^[A-Z0-9-]{3,30}$" },
  },
  {
    id: "beneficiary-id",
    label: "Entity ID",
    type: "barcode",
    hint: "Scan or enter the entity registration code.",
    required: true,
  },
  {
    id: "national-id",
    label: "National ID",
    type: "text",
    hint: "Government-issued identification number.",
    validation: { minLength: 6, maxLength: 30 },
  },
  {
    id: "district-list",
    label: "District",
    type: "dropdown",
    hint: "Select the official district from controlled reference data.",
    options: ["District A", "District B", "District C"],
    required: true,
  },
  {
    id: "community-list",
    label: "Community",
    type: "dropdown",
    hint: "Select the official community under the selected district.",
    options: ["Community 1", "Community 2", "Community 3"],
    required: true,
  },
  {
    id: "facility-list",
    label: "Facility",
    type: "dropdown",
    hint: "Select the school, clinic, water point, or service facility.",
    options: ["Facility 1", "Facility 2", "Facility 3"],
  },
  {
    id: "household-size",
    label: "Household size",
    type: "number",
    hint: "Total number of people living in the household.",
    required: true,
    validation: { min: 1, max: 50 },
  },
  {
    id: "currency-amount",
    label: "Amount spent",
    type: "currency",
    hint: "Validated currency amount.",
    validation: { min: 0 },
  },
  {
    id: "crop-quantity",
    label: "Crop quantity",
    type: "decimal",
    hint: "Quantity produced, sold, or received.",
    validation: { min: 0 },
  },
  {
    id: "visit-date",
    label: "Visit date",
    type: "date",
    hint: "Date when the field visit happened.",
    required: true,
  },
  {
    id: "interview-start",
    label: "Interview start time",
    type: "time",
    hint: "Start time used for duration quality checks.",
  },
  {
    id: "interview-duration",
    label: "Interview duration",
    type: "calculated",
    hint: "Calculated or entered duration for quality review.",
    validation: { min: 3, max: 240 },
  },
  {
    id: "gps-boundary-check",
    label: "GPS boundary check",
    type: "geofence",
    hint: "Capture GPS and validate it against the assigned collection area.",
    required: true,
    validation: { accuracyMax: 20 },
  },
  {
    id: "household-members",
    label: "Household members repeat group",
    type: "repeat_group",
    hint: "Repeat for each household member.",
    repeat: { min: 1, max: 20 },
  },
  {
    id: "likert-satisfaction",
    label: "Satisfaction scale",
    type: "likert",
    hint: "Measure agreement or satisfaction consistently.",
    options: [
      "Strongly disagree",
      "Disagree",
      "Neutral",
      "Agree",
      "Strongly agree",
    ],
  },
  {
    id: "risk-rating",
    label: "Risk rating",
    type: "rating",
    hint: "Score risk, quality, or performance.",
    validation: { min: 1, max: 5 },
  },
  {
    id: "qr-registration",
    label: "QR registration code",
    type: "qr",
    hint: "Scan a QR code for registration, attendance, or asset tracking.",
  },
];

export const sectionTemplates: SectionTemplate[] = [
  {
    id: "respondent-details",
    title: "Respondent details",
    description: "Identity, contact, and demographic questions.",
    fields: [
      quickFieldPresets[0],
      quickFieldPresets[1],
      quickFieldPresets[2],
      quickFieldPresets[3],
    ].filter(Boolean) as FieldPreset[],
  },
  {
    id: "gps-evidence",
    title: "GPS and evidence",
    description: "Location and proof fields for field verification.",
    fields: [
      quickFieldPresets[5],
      quickFieldPresets[6],
      {
        id: "field-notes",
        label: "Field notes",
        type: "textarea",
        hint: "Important context from the enumerator.",
      },
    ].filter(Boolean) as FieldPreset[],
  },
  {
    id: "household-roster",
    title: "Household roster",
    description: "Repeatable household member collection.",
    fields: [
      {
        id: "household-size",
        label: "Household size",
        type: "number",
        hint: "Total people living in the household.",
        validation: { min: 1, max: 50 },
      },
      {
        id: "household-members",
        label: "Household members",
        type: "repeat_group",
        hint: "Add each member as a repeat record.",
      },
    ],
  },
  {
    id: "review-quality",
    title: "Supervisor review",
    description: "Quality checks before data approval.",
    fields: [
      {
        id: "quality-score",
        label: "Data quality score",
        type: "rating",
        hint: "Supervisor quality rating.",
        validation: { min: 1, max: 5 },
      },
      {
        id: "review-status",
        label: "Review status",
        type: "dropdown",
        hint: "Supervisor decision.",
        options: ["Approved", "Needs correction", "Rejected"],
      },
      {
        id: "review-notes",
        label: "Review notes",
        type: "textarea",
        hint: "Explain the review decision.",
      },
    ],
  },
];

export const templateCategoryDescriptions: Record<string, string> = {
  Recommended:
    "Best starting points for common survey and field operation workflows.",
  Agriculture:
    "Farmer registration, crop monitoring, yield checks, market access, and extension visits.",
  Health:
    "Facility, outreach, vaccination, household health, and community follow-up forms.",
  Education:
    "School monitoring, learner attendance, classroom checks, and education program reviews.",
  "NGO Operations":
    "Program delivery, staff operations, field visits, and partner implementation tracking.",
  "Humanitarian & NGO":
    "Rapid assessment, response monitoring, distribution, referrals, and protection workflows.",
  "Monitoring & Evaluation":
    "Baseline, midline, endline, indicator tracking, verification, and evaluation tools.",
  "Government & Community":
    "Community records, public services, civic outreach, and local administration surveys.",
  "Business & Operations":
    "Operational inspections, asset checks, customer visits, and service delivery reviews.",
  Surveys:
    "General-purpose questionnaires for research, feedback, assessments, and interviews.",
  "Registration Workflows":
    "Entity, household, farmer, group, facility, and participant onboarding.",
  "Case Management":
    "Complaints, referrals, incident follow-up, corrections, and resolution tracking.",
};
