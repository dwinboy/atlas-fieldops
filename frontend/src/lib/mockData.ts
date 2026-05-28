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

export type FormTemplateCard = {
  id: string;
  name: string;
  category: string;
  description: string;
  fields: number;
  minutes: number;
  popularity: number;
  recommendedFor: string[];
  tags: string[];
  hasGps: boolean;
  hasMedia: boolean;
  repeatGroups: number;
  featured?: boolean;
};

export const formTemplateCategories = [
  "Recommended",
  "Agriculture",
  "Health",
  "Education",
  "NGO Operations",
  "Humanitarian & NGO",
  "Monitoring & Evaluation",
  "Government & Community",
  "Business & Operations",
  "Surveys",
  "Registration Workflows",
  "Case Management"
];

export const formTemplates: FormTemplateCard[] = [
  {
    id: "farmer-registration-form",
    name: "Farmer Registration Form",
    category: "Agriculture",
    description: "Register farmers, farm profile, crops, GPS, and consent in one field-ready workflow.",
    fields: 14,
    minutes: 18,
    popularity: 98,
    recommendedFor: ["Agriculture programs", "NGOs"],
    tags: ["farmer", "registration", "GPS"],
    hasGps: true,
    hasMedia: true,
    repeatGroups: 1,
    featured: true
  },
  {
    id: "crop-monitoring-form",
    name: "Crop Monitoring Form",
    category: "Agriculture",
    description: "Monitor crop condition, pest risk, photos, extension advice, and follow-up actions.",
    fields: 16,
    minutes: 21,
    popularity: 95,
    recommendedFor: ["Agriculture programs"],
    tags: ["crop", "pest", "field visit"],
    hasGps: true,
    hasMedia: true,
    repeatGroups: 1,
    featured: true
  },
  {
    id: "vaccination-tracking-form",
    name: "Vaccination Tracking Form",
    category: "Health",
    description: "Track doses, missed children, referrals, follow-up dates, and outreach location.",
    fields: 15,
    minutes: 17,
    popularity: 92,
    recommendedFor: ["Health programs", "Government"],
    tags: ["vaccination", "outreach", "follow-up"],
    hasGps: true,
    hasMedia: false,
    repeatGroups: 0,
    featured: true
  },
  {
    id: "nutrition-assessment-form",
    name: "Nutrition Assessment Form",
    category: "Health",
    description: "Capture screening results, risk level, referrals, counselling, and next visit.",
    fields: 13,
    minutes: 16,
    popularity: 86,
    recommendedFor: ["Health programs", "Humanitarian teams"],
    tags: ["nutrition", "screening", "referral"],
    hasGps: true,
    hasMedia: false,
    repeatGroups: 0
  },
  {
    id: "school-inspection-form",
    name: "School Inspection Form",
    category: "Education",
    description: "Inspect attendance, infrastructure, teacher presence, safety, and urgent repairs.",
    fields: 17,
    minutes: 23,
    popularity: 84,
    recommendedFor: ["Education programs", "Government"],
    tags: ["school", "inspection", "attendance"],
    hasGps: true,
    hasMedia: true,
    repeatGroups: 0
  },
  {
    id: "household-vulnerability-assessment",
    name: "Household Vulnerability Assessment",
    category: "Humanitarian & NGO",
    description: "Assess household needs, vulnerability score, assistance eligibility, and verification.",
    fields: 18,
    minutes: 25,
    popularity: 96,
    recommendedFor: ["Humanitarian teams", "NGOs"],
    tags: ["household", "vulnerability", "assistance"],
    hasGps: true,
    hasMedia: true,
    repeatGroups: 1,
    featured: true
  },
  {
    id: "food-distribution-tracking",
    name: "Food Distribution Tracking",
    category: "Humanitarian & NGO",
    description: "Track ration receipt, household verification, exceptions, signatures, and distribution GPS.",
    fields: 12,
    minutes: 14,
    popularity: 88,
    recommendedFor: ["Humanitarian teams"],
    tags: ["food", "distribution", "signature"],
    hasGps: true,
    hasMedia: true,
    repeatGroups: 0
  },
  {
    id: "baseline-survey",
    name: "Baseline Survey",
    category: "Monitoring & Evaluation",
    description: "Collect initial respondent profile, indicator values, evidence, and quality notes.",
    fields: 20,
    minutes: 32,
    popularity: 91,
    recommendedFor: ["M&E teams", "NGOs"],
    tags: ["baseline", "indicators", "survey"],
    hasGps: true,
    hasMedia: false,
    repeatGroups: 1,
    featured: true
  },
  {
    id: "kpi-tracking-form",
    name: "KPI Tracking Form",
    category: "Monitoring & Evaluation",
    description: "Capture KPI values, targets, sources, calculated progress, and reviewer notes.",
    fields: 11,
    minutes: 12,
    popularity: 89,
    recommendedFor: ["M&E teams", "Program managers"],
    tags: ["KPI", "indicator", "reporting"],
    hasGps: true,
    hasMedia: false,
    repeatGroups: 0
  },
  {
    id: "community-needs-assessment",
    name: "Community Needs Assessment",
    category: "Government & Community",
    description: "Collect priority needs, service gaps, community requests, evidence, and next actions.",
    fields: 14,
    minutes: 20,
    popularity: 82,
    recommendedFor: ["Government", "NGOs"],
    tags: ["community", "needs", "planning"],
    hasGps: true,
    hasMedia: true,
    repeatGroups: 0
  },
  {
    id: "field-activity-report",
    name: "Field Activity Report",
    category: "NGO Operations",
    description: "Report daily field work, blockers, location, proof, and supervisor follow-up.",
    fields: 10,
    minutes: 9,
    popularity: 80,
    recommendedFor: ["Field teams", "Operations"],
    tags: ["activity", "field team", "report"],
    hasGps: true,
    hasMedia: true,
    repeatGroups: 0
  },
  {
    id: "household-baseline-survey",
    name: "Household Baseline Survey",
    category: "Surveys",
    description: "Capture household profile, baseline indicator values, GPS, and consent before program start.",
    fields: 19,
    minutes: 28,
    popularity: 87,
    recommendedFor: ["M&E teams", "NGOs"],
    tags: ["survey", "baseline", "household"],
    hasGps: true,
    hasMedia: false,
    repeatGroups: 1
  },
  {
    id: "beneficiary-intake-registration",
    name: "Beneficiary Intake Registration",
    category: "Registration Workflows",
    description: "Register people, households, consent, program eligibility, identity notes, and enrollment status.",
    fields: 16,
    minutes: 20,
    popularity: 90,
    recommendedFor: ["NGOs", "Government"],
    tags: ["registration", "beneficiary", "intake"],
    hasGps: true,
    hasMedia: true,
    repeatGroups: 1,
    featured: true
  },
  {
    id: "case-follow-up-form",
    name: "Case Follow-up Form",
    category: "Case Management",
    description: "Track complaints, referrals, intervention updates, evidence, escalation risk, and next actions.",
    fields: 12,
    minutes: 14,
    popularity: 83,
    recommendedFor: ["Case teams", "Supervisors"],
    tags: ["case", "follow-up", "referral"],
    hasGps: true,
    hasMedia: true,
    repeatGroups: 0
  },
  {
    id: "vehicle-inspection-form",
    name: "Vehicle Inspection Form",
    category: "Business & Operations",
    description: "Inspect mileage, safety status, defects, photos, and service recommendations.",
    fields: 13,
    minutes: 15,
    popularity: 78,
    recommendedFor: ["Operations", "Fleet teams"],
    tags: ["vehicle", "inspection", "fleet"],
    hasGps: true,
    hasMedia: true,
    repeatGroups: 0
  }
];

export const operationalFlow = [
  { id: "organization", label: "Organization", detail: "Tenant, roles, governance", count: "1", status: "Healthy" },
  { id: "projects", label: "Programs & Projects", detail: "Donors, geography, workflows", count: "3", status: "Active" },
  { id: "indicators", label: "Indicators & Targets", detail: "Baseline, target, progress", count: "4", status: "Active" },
  { id: "field-team", label: "Field Team", detail: "Officers, supervisors, regions", count: "1,204", status: "Active" },
  { id: "beneficiaries", label: "Beneficiaries", detail: "Living operational profiles", count: "98.2k", status: "Core" },
  { id: "forms", label: "Forms & Surveys", detail: "Offline operational transactions", count: "42", status: "Ready" },
  { id: "submissions", label: "Submissions", detail: "GPS, media, evidence", count: "128.4k", status: "Live" },
  { id: "quality", label: "Validation & Approval", detail: "Fraud, quality, review queues", count: "214", status: "Needs review" },
  { id: "reports", label: "Analytics & Reports", detail: "Dashboards, donors, decisions", count: "18", status: "Synced" },
  { id: "followups", label: "Interventions", detail: "Cases, corrections, action", count: "37", status: "Open" }
];

export const operationalEvents = [
  {
    event: "Submission approved",
    source: "Review",
    effects: ["Indicators recalculated", "Officer score updated", "Donor report refreshed"],
    priority: "Normal",
    age: "2 min ago"
  },
  {
    event: "Duplicate beneficiary risk",
    source: "Data quality",
    effects: ["Supervisor queue opened", "Registry merge review created", "Dashboard flag updated"],
    priority: "High",
    age: "8 min ago"
  },
  {
    event: "Farmer registration synced",
    source: "Mobile sync",
    effects: ["Beneficiary profile updated", "Farm map layer refreshed", "Project coverage updated"],
    priority: "Normal",
    age: "14 min ago"
  },
  {
    event: "Correction requested",
    source: "Approval workflow",
    effects: ["Field officer notified", "SLA timer started", "Submission reopened"],
    priority: "High",
    age: "22 min ago"
  }
];

export const beneficiaryProfileConnections = [
  { label: "Projects", value: "2 active", note: "Climate-smart agriculture, input vouchers" },
  { label: "Submissions", value: "18 records", note: "Registration, visits, yield checks" },
  { label: "Cases", value: "1 open", note: "Missing input voucher follow-up" },
  { label: "Indicators", value: "4 linked", note: "Yield, adoption, income, vulnerability" },
  { label: "Map history", value: "7 visits", note: "GPS trail and farm boundary evidence" },
  { label: "Reports", value: "3 outputs", note: "FAO Q2, supervisor summary, donor export" }
];

export const enterpriseOperations = {
  units: [
    { name: "National office", type: "Governance", region: "Cameroon", owner: "Country director", status: "Active" },
    { name: "Northwest regional team", type: "Regional office", region: "Northwest", owner: "Regional coordinator", status: "Active" },
    { name: "Bamenda district field team", type: "District team", region: "Bamenda II", owner: "District supervisor", status: "Active" }
  ],
  workflows: [
    { name: "Submission approval chain", steps: "Supervisor -> Regional -> National", sla: "72h", status: "Live" },
    { name: "Duplicate beneficiary review", steps: "Data quality -> Registry manager", sla: "48h", status: "Live" },
    { name: "Correction cycle", steps: "Supervisor -> Field officer -> Re-review", sla: "24h", status: "Live" }
  ],
  resources: [
    { name: "Android tablet fleet", type: "Device", assigned: "Field officers", status: "184 active" },
    { name: "Motorbike support pool", type: "Vehicle", assigned: "District teams", status: "37 assigned" },
    { name: "Input voucher inventory", type: "Supply", assigned: "Agriculture project", status: "72% distributed" }
  ],
  finance: [
    { category: "Field logistics", allocated: "$420k", spent: "$288k", utilization: 69 },
    { category: "Beneficiary inputs", allocated: "$760k", spent: "$501k", utilization: 66 },
    { category: "Training and supervision", allocated: "$180k", spent: "$92k", utilization: 51 }
  ],
  documents: [
    { title: "Enumerator SOP", type: "Training guide", link: "Field team onboarding", status: "Current" },
    { title: "FAO grant agreement", type: "Contract", link: "Climate-smart agriculture", status: "Approved" },
    { title: "Beneficiary consent template", type: "Compliance", link: "All registration forms", status: "Required" }
  ]
};
