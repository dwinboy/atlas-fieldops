import type { DynamicForm } from "@/lib/forms";

export const dashboardMetrics = [
  { label: "Submissions received", value: "128.4k", delta: "+12.6%", tone: "good" },
  { label: "Need review", value: "2,418", delta: "-8.1%", tone: "warn" },
  { label: "Active field officers", value: "1,204", delta: "+4.3%", tone: "good" },
  { label: "Sync problems", value: "37", delta: "-2.7%", tone: "neutral" }
];

export const analyticsSeries = [
  { label: "08:00", submissions: 4200, validated: 3900 },
  { label: "10:00", submissions: 6100, validated: 5650 },
  { label: "12:00", submissions: 7800, validated: 7010 },
  { label: "14:00", submissions: 9200, validated: 8540 },
  { label: "16:00", submissions: 11100, validated: 10320 },
  { label: "18:00", submissions: 12600, validated: 11980 }
];

export const starterForms: DynamicForm[] = [
  {
    id: "vehicle-inspection",
    name: "Vehicle inspection",
    status: "published",
    version: 3,
    activeVersion: 3,
    updatedAt: "2026-05-27T08:00:00.000Z",
    sections: [
      { id: "vehicle", title: "Vehicle details", description: "Core inspection metadata" },
      { id: "media", title: "Media and location", description: "Automatic GPS and inspection evidence" }
    ],
    fields: [
      { id: "plate", label: "Plate number", type: "text", required: true, sectionId: "vehicle", validation: { pattern: "^[A-Z0-9-]+$" } },
      { id: "mileage", label: "Mileage", type: "number", required: true, sectionId: "vehicle", validation: { min: 0 } },
      {
        id: "condition",
        label: "Roadworthy?",
        type: "radio",
        required: true,
        sectionId: "vehicle",
        options: ["Yes", "No"]
      },
      {
        id: "vehicle-photo",
        label: "Vehicle photo",
        type: "photo",
        required: false,
        sectionId: "media",
        logic: [{ id: "photo-required", kind: "required", expression: "${condition} = 'No'", message: "Photo required when not roadworthy" }]
      },
      { id: "inspection-gps", label: "Inspection GPS", type: "gps", required: true, sectionId: "media", validation: { accuracyMax: 20 } }
    ]
  },
  {
    id: "site-survey",
    name: "Site survey",
    status: "draft",
    version: 2,
    activeVersion: 1,
    updatedAt: "2026-05-27T09:30:00.000Z",
    sections: [{ id: "site", title: "Site profile", description: "Field location and observations" }],
    fields: [
      { id: "gps", label: "GPS location", type: "gps", required: true, sectionId: "site", validation: { accuracyMax: 30 } },
      { id: "notes", label: "Field notes", type: "textarea", required: false, sectionId: "site" },
      {
        id: "household-members",
        label: "Household members",
        type: "repeat_group",
        required: false,
        sectionId: "site",
        children: [
          { id: "member-name", label: "Member name", type: "text", required: true, sectionId: "site" },
          { id: "member-age", label: "Age", type: "number", required: true, sectionId: "site", validation: { min: 0, max: 120 } }
        ]
      }
    ]
  }
];
