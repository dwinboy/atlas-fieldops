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

export const beneficiaries = [
  {
    id: "ben-001",
    uid: "HH-2026-0001",
    name: "Amina Diallo household",
    type: "Household",
    program: "Climate-smart agriculture",
    region: "Northwest",
    community: "Bamenda II",
    status: "Active",
    vulnerability: 72,
    duplicateRisk: 8,
    lastVisit: "2 days ago",
    coordinates: "5.9631, 10.1591"
  },
  {
    id: "ben-002",
    uid: "FARM-2026-0142",
    name: "Musa Kamga farm",
    type: "Farmer",
    program: "Input voucher support",
    region: "Littoral",
    community: "Dibombari",
    status: "Active",
    vulnerability: 44,
    duplicateRisk: 18,
    lastVisit: "6 days ago",
    coordinates: "4.1782, 9.6567"
  },
  {
    id: "ben-003",
    uid: "COOP-2026-0031",
    name: "Women growers cooperative",
    type: "Cooperative",
    program: "Market access",
    region: "West",
    community: "Bafoussam",
    status: "Needs update",
    vulnerability: 36,
    duplicateRisk: 4,
    lastVisit: "18 days ago",
    coordinates: "5.4798, 10.4176"
  }
];

export const programs = [
  {
    id: "prog-001",
    name: "Climate-smart agriculture",
    donor: "FAO",
    region: "Northwest",
    budget: "$1.8M",
    coverage: "42 villages",
    beneficiaries: 18420,
    progress: 68,
    nextMilestone: "Quarterly yield verification"
  },
  {
    id: "prog-002",
    name: "Community health outreach",
    donor: "UNICEF",
    region: "Littoral",
    budget: "$940k",
    coverage: "18 clinics",
    beneficiaries: 31200,
    progress: 74,
    nextMilestone: "Vaccination follow-up review"
  },
  {
    id: "prog-003",
    name: "School attendance recovery",
    donor: "World Bank",
    region: "Far North",
    budget: "$2.4M",
    coverage: "96 schools",
    beneficiaries: 48600,
    progress: 52,
    nextMilestone: "District supervisor spot checks"
  }
];

export const indicators = [
  { code: "AG.YIELD", name: "Average crop yield increase", baseline: 1.8, current: 2.6, target: 3.2, unit: "tons/ha", progress: 57 },
  { code: "HEALTH.VAX", name: "Children fully vaccinated", baseline: 42, current: 71, target: 90, unit: "%", progress: 60 },
  { code: "EDU.ATTEND", name: "Monthly school attendance", baseline: 64, current: 78, target: 88, unit: "%", progress: 58 },
  { code: "WASH.ACCESS", name: "Households with clean water access", baseline: 38, current: 56, target: 75, unit: "%", progress: 49 }
];

export const cases = [
  { id: "CASE-001", title: "Missing input voucher follow-up", type: "Complaint", beneficiary: "Musa Kamga farm", priority: "High", status: "Open", due: "Today" },
  { id: "CASE-002", title: "Clinic referral confirmation", type: "Referral", beneficiary: "Amina Diallo household", priority: "Normal", status: "Waiting", due: "Tomorrow" },
  { id: "CASE-003", title: "Boundary photo correction", type: "Data correction", beneficiary: "Women growers cooperative", priority: "Normal", status: "In progress", due: "3 days" }
];

export const dataQualitySignals = [
  { signal: "Possible duplicate household", severity: "High", confidence: "91%", action: "Review identity details" },
  { signal: "Impossible travel speed", severity: "Medium", confidence: "78%", action: "Check field officer route" },
  { signal: "Photo reused across visits", severity: "High", confidence: "88%", action: "Request fresh evidence" },
  { signal: "GPS outside project area", severity: "Medium", confidence: "82%", action: "Confirm village assignment" }
];

export const mapCoverage = [
  { region: "Northwest", submissions: 18420, coverage: 72, sync: "Good" },
  { region: "Littoral", submissions: 13980, coverage: 64, sync: "Good" },
  { region: "Far North", submissions: 22110, coverage: 58, sync: "Patchy" },
  { region: "West", submissions: 16400, coverage: 69, sync: "Good" }
];

export const donorReports = [
  { name: "FAO Q2 agriculture progress", donor: "FAO", type: "Indicator report", period: "Apr-Jun 2026", status: "Ready for review", formats: "PDF, Excel" },
  { name: "UNICEF vaccination coverage", donor: "UNICEF", type: "Narrative report", period: "May 2026", status: "Draft", formats: "PDF" },
  { name: "World Bank school attendance", donor: "World Bank", type: "Logframe export", period: "Q2 2026", status: "Needs data", formats: "Excel" }
];

export const importJobs = [
  { id: "IMP-1042", file: "farmer-registry-may.xlsx", type: "Beneficiaries", rows: 18420, valid: 17984, issues: 436, status: "Needs fixes" },
  { id: "IMP-1041", file: "q2-indicators.csv", type: "Indicators", rows: 84, valid: 84, issues: 0, status: "Ready to import" },
  { id: "IMP-1040", file: "farm-boundaries.geojson", type: "Map data", rows: 1290, valid: 1282, issues: 8, status: "Importing" }
];

export const importColumns = [
  { source: "Farmer Name", target: "beneficiary.display_name", confidence: "High", required: true },
  { source: "Household ID", target: "beneficiary.beneficiary_uid", confidence: "High", required: true },
  { source: "Village", target: "beneficiary.community", confidence: "Medium", required: false },
  { source: "GPS Lat", target: "beneficiary.latitude", confidence: "High", required: false },
  { source: "GPS Long", target: "beneficiary.longitude", confidence: "High", required: false }
];

export const importValidationIssues = [
  { row: 14, field: "Phone", issue: "Phone number looks too short", fix: "Add country code or correct the number", severity: "Warning" },
  { row: 28, field: "GPS Lat", issue: "Latitude is outside valid range", fix: "Use decimal coordinates between -90 and 90", severity: "Error" },
  { row: 31, field: "Household ID", issue: "Duplicate ID in uploaded file", fix: "Merge duplicate or use a unique ID", severity: "Warning" },
  { row: 47, field: "Farmer Name", issue: "Required value is missing", fix: "Add the beneficiary name", severity: "Error" }
];

export const editableRows = [
  { id: "HH-2026-0001", name: "Amina Diallo household", village: "Bamenda II", phone: "+237 600 000 121", status: "Active", sync: "Saved locally" },
  { id: "HH-2026-0002", name: "Musa Kamga farm", village: "Dibombari", phone: "+237 600 000 122", status: "Needs review", sync: "Waiting to sync" },
  { id: "HH-2026-0003", name: "Women growers cooperative", village: "Bafoussam", phone: "+237 600 000 123", status: "Active", sync: "Synced" }
];

export const exportJobs = [
  { id: "EXP-882", name: "Beneficiary registry", format: "XLSX", filter: "Active beneficiaries", status: "Ready", schedule: "Manual" },
  { id: "EXP-881", name: "Farm boundary map", format: "GeoJSON", filter: "Northwest program", status: "Ready", schedule: "Weekly" },
  { id: "EXP-880", name: "Donor indicator report", format: "PDF", filter: "Q2 approved data", status: "Queued", schedule: "Monthly" }
];

export const migrationSources = [
  "KoboToolbox exports",
  "ODK Central CSV archives",
  "DHIS2 indicator exports",
  "Excel beneficiary lists",
  "GeoJSON farm boundaries",
  "Access database migrations"
];
