import type { DynamicForm } from "@/lib/forms";

export const dashboardMetrics = [
  { label: "Submissions today", value: "128.4k", delta: "+12.6%", tone: "good" },
  { label: "Validation queue", value: "2,418", delta: "-8.1%", tone: "warn" },
  { label: "Active collectors", value: "1,204", delta: "+4.3%", tone: "good" },
  { label: "Sync failures", value: "37", delta: "-2.7%", tone: "neutral" }
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
    updatedAt: "2026-05-27T08:00:00.000Z",
    fields: [
      { id: "plate", label: "Plate number", type: "text", required: true },
      { id: "mileage", label: "Mileage", type: "number", required: true },
      { id: "photo", label: "Vehicle photo", type: "photo", required: false }
    ]
  },
  {
    id: "site-survey",
    name: "Site survey",
    status: "draft",
    updatedAt: "2026-05-27T09:30:00.000Z",
    fields: [
      { id: "gps", label: "GPS location", type: "gps", required: true },
      { id: "notes", label: "Field notes", type: "text", required: false }
    ]
  }
];

