export type DataQualitySection =
  | "dashboard"
  | "quality-dashboard"
  | "duplicates"
  | "outliers"
  | "gps-issues"
  | "import-cleaning"
  | "missing-data"
  | "reconciliation"
  | "validation-failures"
  | "risk-alerts"
  | "rules";

export type QualitySeverity = "Low" | "Medium" | "High" | "Critical";
export type QualityIssueStatus = "Detected" | "Assigned" | "Under Investigation" | "Escalated" | "Governance Review" | "Resolved" | "Closed";
export type QualityIssueType = "Duplicate" | "Outlier" | "GPS Issue" | "Missing Data" | "Reconciliation" | "Validation Failure" | "Risk Alert";
export type QualityScope = "Organization" | "Project" | "Form" | "Submission" | "Enumerator" | "Supervisor";
export type QualityRuleType = "Completeness" | "Consistency" | "GPS" | "Duplicate" | "Outlier" | "Timeliness" | "Custom";

export type QualityScore = {
  accuracy: number;
  completeness: number;
  consistency: number;
  consentCompliance: number;
  duplicateDetection: number;
  gpsCompliance: number;
  timeliness: number;
  validationSuccess: number;
};

export type QualitySummary = {
  criticalIssues: number;
  duplicateRecords: number;
  gpsIssues: number;
  highRiskSubmissions: number;
  missingDataRecords: number;
  openInvestigations: number;
  openQualityIssues: number;
  reconciliationIssues: number;
  overallScore: number;
  resolvedIssues: number;
  validationFailures: number;
};

export type QualityIssue = {
  id: string;
  title: string;
  type: QualityIssueType;
  severity: QualitySeverity;
  status: QualityIssueStatus;
  project: string;
  form: string;
  submissionId: string;
  enumerator: string;
  supervisor: string;
  location: string;
  detectedAt: string;
  assignedTo: string;
  scoreImpact: number;
  description: string;
  recommendedAction: string;
  evidence: string[];
  evidenceJson?: Record<string, unknown>;
};

export type DuplicateGroup = {
  id: string;
  matchingMethod: "Exact Match" | "Fuzzy Match" | "Rule-Based Match";
  fields: string[];
  records: string[];
  confidence: number;
  severity: QualitySeverity;
  status: QualityIssueStatus;
};

export type OutlierRecord = {
  id: string;
  outlierType: "Statistical Outlier" | "Business Rule Outlier" | "Location Outlier" | "Behavioral Outlier";
  field: string;
  observedValue: string;
  expectedRange: string;
  submissionId: string;
  severity: QualitySeverity;
  status: QualityIssueStatus;
};

export type GPSIssueRecord = {
  id: string;
  issueType: "GPS Missing" | "GPS Outside Boundary" | "Duplicate GPS" | "Low Accuracy GPS" | "Suspicious Location" | "Invalid Coordinates";
  coordinates: string;
  accuracyMeters: number | null;
  boundary: string;
  submissionId: string;
  severity: QualitySeverity;
  status: QualityIssueStatus;
};

export type ValidationFailureRecord = {
  id: string;
  category: "Range Violation" | "Logic Violation" | "Cross-Field Violation" | "Conditional Logic Failure" | "Reference Data Violation";
  ruleName: string;
  field: string;
  submissionId: string;
  severity: QualitySeverity;
  status: QualityIssueStatus;
};

export type RiskAlertRecord = {
  id: string;
  category: "Data Fraud" | "Enumerator Fraud" | "Submission Manipulation" | "Location Fraud" | "Mass Duplicates" | "Abnormal Activity";
  riskLevel: QualitySeverity;
  pattern: string;
  owner: string;
  status: QualityIssueStatus;
  recommendedAction: string;
};

export type QualityRuleRecord = {
  id: string;
  name: string;
  description: string;
  type: QualityRuleType;
  severity: QualitySeverity;
  scope: QualityScope;
  active: boolean;
  project: string;
  form: string;
  lastTestedAt: string;
};

export type QualityAuditEvent = {
  id: string;
  issueId: string;
  action: string;
  actor: string;
  createdAt: string;
  reason: string;
};

export const dataQualitySections: {
  id: DataQualitySection;
  label: string;
  route: string;
  description: string;
}[] = [
  { id: "dashboard", label: "Overview", route: "/data-quality", description: "Central quality monitoring dashboard, score, open issues, investigations, rankings, and trends." },
  { id: "quality-dashboard", label: "Quality Dashboard", route: "/data-quality/dashboard", description: "Executive quality scorecards, ranking tables, severity breakdowns, trend charts, and resolution progress." },
  { id: "duplicates", label: "Duplicates", route: "/data-quality/duplicates", description: "View duplicate groups, compare records, merge, mark valid, or flag for investigation." },
  { id: "outliers", label: "Outliers", route: "/data-quality/outliers", description: "Review statistical, business-rule, location, and behavioral outliers." },
  { id: "gps-issues", label: "GPS Issues", route: "/data-quality/gps-issues", description: "Monitor missing GPS, boundary violations, duplicate coordinates, low accuracy, and suspicious locations." },
  { id: "import-cleaning", label: "Import Cleaning", route: "/data-quality/import-cleaning", description: "Clean uploaded form rows, resolve missing fields, and confirm records before they power beneficiaries, indicators, dashboards, and reports." },
  { id: "missing-data", label: "Missing Data", route: "/data-quality/missing-data", description: "Track missing required fields, consent, attachments, GPS, and incomplete sections." },
  { id: "reconciliation", label: "Reconciliation", route: "/data-quality/reconciliation", description: "Resolve unlinked submissions, duplicate beneficiaries, profile conflicts, imported unmatched records, and repeated collection issues." },
  { id: "validation-failures", label: "Validation Failures", route: "/data-quality/validation-failures", description: "Review range, logic, cross-field, conditional, and reference-data rule failures." },
  { id: "risk-alerts", label: "Risk Alerts", route: "/data-quality/risk-alerts", description: "Investigate suspicious patterns, fraud signals, manipulation, mass duplicates, and abnormal activity." },
  { id: "rules", label: "Quality Rules", route: "/data-quality/rules", description: "Manage reusable completeness, consistency, GPS, duplicate, outlier, timeliness, and custom rules." },
];

const nowIso = new Date().toISOString();
const yesterdayIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
const twoDaysAgoIso = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

export const previewQualityScores: Record<QualityScope, QualityScore> = {
  Enumerator: { accuracy: 82, completeness: 88, consistency: 81, consentCompliance: 91, duplicateDetection: 76, gpsCompliance: 78, timeliness: 86, validationSuccess: 83 },
  Form: { accuracy: 90, completeness: 92, consistency: 87, consentCompliance: 96, duplicateDetection: 85, gpsCompliance: 80, timeliness: 89, validationSuccess: 91 },
  Organization: { accuracy: 88, completeness: 91, consistency: 84, consentCompliance: 93, duplicateDetection: 82, gpsCompliance: 79, timeliness: 87, validationSuccess: 88 },
  Project: { accuracy: 86, completeness: 89, consistency: 82, consentCompliance: 90, duplicateDetection: 78, gpsCompliance: 75, timeliness: 84, validationSuccess: 86 },
  Submission: { accuracy: 74, completeness: 78, consistency: 69, consentCompliance: 88, duplicateDetection: 61, gpsCompliance: 63, timeliness: 80, validationSuccess: 72 },
  Supervisor: { accuracy: 89, completeness: 90, consistency: 85, consentCompliance: 94, duplicateDetection: 83, gpsCompliance: 81, timeliness: 88, validationSuccess: 87 },
};

export const previewQualityIssues: QualityIssue[] = [
  {
    assignedTo: "Data Quality Officer",
    description: "Two household registration submissions share beneficiary ID, phone number, and GPS coordinates within 8 meters.",
    detectedAt: nowIso,
    enumerator: "Amina D.",
    evidence: ["Beneficiary ID HH-2409 appears twice", "Phone number exact match", "GPS distance 8m"],
    form: "Farmer Registration Survey",
    id: "quality-duplicate-household",
    location: "Northwest / Bamenda II",
    project: "Agricultural Resilience Program",
    recommendedAction: "Compare records, merge if same household, or mark valid with audit reason.",
    scoreImpact: 9,
    severity: "High",
    status: "Assigned",
    submissionId: "SUB-2409",
    supervisor: "Grace M.",
    title: "Possible duplicate household",
    type: "Duplicate",
  },
  {
    assignedTo: "GIS Quality Lead",
    description: "Submission GPS is outside the assigned district boundary and 19km from the selected community.",
    detectedAt: nowIso,
    enumerator: "Jean F.",
    evidence: ["GPS outside project boundary", "Selected district does not contain point", "Accuracy 38m"],
    form: "Household Verification Form",
    id: "quality-gps-boundary",
    location: "Far North / Mora",
    project: "Social Protection Response",
    recommendedAction: "Open map, confirm assigned area, and return record if village was selected incorrectly.",
    scoreImpact: 12,
    severity: "Critical",
    status: "Under Investigation",
    submissionId: "SUB-2194",
    supervisor: "Samuel K.",
    title: "GPS outside project boundary",
    type: "GPS Issue",
  },
  {
    assignedTo: "Review Lead",
    description: "School attendance value is outside expected range and conflicts with enrollment totals.",
    detectedAt: yesterdayIso,
    enumerator: "Musa K.",
    evidence: ["Attendance = 9,999", "Enrollment = 486", "Range rule max = 100%"],
    form: "School Attendance Survey",
    id: "quality-attendance-outlier",
    location: "West / Bafoussam",
    project: "School Attendance Recovery",
    recommendedAction: "Flag for correction and request source register evidence.",
    scoreImpact: 7,
    severity: "High",
    status: "Detected",
    submissionId: "SUB-1982",
    supervisor: "Nadine T.",
    title: "Attendance outlier",
    type: "Outlier",
  },
  {
    assignedTo: "Supervisor",
    description: "Consent field and household member repeat group are incomplete for a submitted record.",
    detectedAt: yesterdayIso,
    enumerator: "Carine N.",
    evidence: ["Missing consent signature", "Household size = 5 but repeat rows = 3"],
    form: "Beneficiary Registration Form",
    id: "quality-missing-consent",
    location: "Littoral / Dibombari",
    project: "Social Protection Response",
    recommendedAction: "Return submission for correction before approval.",
    scoreImpact: 10,
    severity: "Critical",
    status: "Escalated",
    submissionId: "SUB-2021",
    supervisor: "Samuel K.",
    title: "Missing consent and repeat data",
    type: "Missing Data",
  },
  {
    assignedTo: "Data Manager",
    description: "Enumerator submitted eight surveys within seven minutes from repeated coordinates.",
    detectedAt: twoDaysAgoIso,
    enumerator: "Peter O.",
    evidence: ["Average duration 52 seconds", "Repeated GPS coordinates", "Submission burst at 18:03"],
    form: "Market Access Survey",
    id: "quality-risk-fast-surveys",
    location: "Northwest / Fundong",
    project: "Agricultural Resilience Program",
    recommendedAction: "Assign fraud review and suspend records from formal reporting until resolved.",
    scoreImpact: 15,
    severity: "Critical",
    status: "Governance Review",
    submissionId: "SUB-1880",
    supervisor: "Grace M.",
    title: "Very fast repeated surveys",
    type: "Risk Alert",
  },
  {
    assignedTo: "Form Owner",
    description: "Reference data rule failed because selected district is inactive for the selected region.",
    detectedAt: twoDaysAgoIso,
    enumerator: "Amina D.",
    evidence: ["District code inactive", "Region-district cascade mismatch"],
    form: "Facility Assessment",
    id: "quality-reference-failure",
    location: "Northwest / Bamenda I",
    project: "Health Facility Readiness",
    recommendedAction: "Review reference binding and correct the selected district value.",
    scoreImpact: 5,
    severity: "Medium",
    status: "Resolved",
    submissionId: "SUB-1760",
    supervisor: "Helen P.",
    title: "Reference data validation failure",
    type: "Validation Failure",
  },
];

export const previewDuplicateGroups: DuplicateGroup[] = [
  { confidence: 96, fields: ["Phone Number", "Household ID", "Name + Village", "GPS within 50m"], id: "dup-entity-frm-2026-000001", matchingMethod: "Rule-Based Match", records: ["FRM-2026-000001", "FRM-2026-000137"], severity: "Critical", status: "Assigned" },
  { confidence: 94, fields: ["Beneficiary ID", "Phone Number", "GPS Coordinates"], id: "dup-hh-2409", matchingMethod: "Rule-Based Match", records: ["SUB-2409", "SUB-2411"], severity: "High", status: "Assigned" },
  { confidence: 88, fields: ["Household ID", "National ID"], id: "dup-hh-1981", matchingMethod: "Exact Match", records: ["SUB-1981", "SUB-1984"], severity: "Medium", status: "Detected" },
  { confidence: 76, fields: ["Custom Fields", "Phone Number"], id: "dup-beneficiary-55", matchingMethod: "Fuzzy Match", records: ["SUB-1660", "SUB-1668", "SUB-1672"], severity: "Low", status: "Under Investigation" },
];

export const previewOutliers: OutlierRecord[] = [
  { expectedRange: "0-120", field: "Age", id: "out-age-250", observedValue: "250", outlierType: "Business Rule Outlier", severity: "Critical", status: "Detected", submissionId: "SUB-1840" },
  { expectedRange: "0-2,000,000 XAF", field: "Household income", id: "out-income", observedValue: "999,999,999", outlierType: "Statistical Outlier", severity: "High", status: "Assigned", submissionId: "SUB-1977" },
  { expectedRange: "5-120 minutes", field: "Interview duration", id: "out-duration", observedValue: "30 seconds", outlierType: "Behavioral Outlier", severity: "High", status: "Governance Review", submissionId: "SUB-1880" },
];

export const previewGpsIssues: GPSIssueRecord[] = [
  { accuracyMeters: 38, boundary: "Mora District", coordinates: "11.046, 14.141", id: "gps-outside", issueType: "GPS Outside Boundary", severity: "Critical", status: "Under Investigation", submissionId: "SUB-2194" },
  { accuracyMeters: null, boundary: "Dibombari", coordinates: "Missing", id: "gps-missing", issueType: "GPS Missing", severity: "High", status: "Assigned", submissionId: "SUB-2021" },
  { accuracyMeters: 124, boundary: "Fundong", coordinates: "6.251, 10.266", id: "gps-low-accuracy", issueType: "Low Accuracy GPS", severity: "Medium", status: "Detected", submissionId: "SUB-1882" },
];

export const previewValidationFailures: ValidationFailureRecord[] = [
  { category: "Range Violation", field: "attendance_rate", id: "val-attendance", ruleName: "Attendance must be 0-100%", severity: "High", status: "Detected", submissionId: "SUB-1982" },
  { category: "Cross-Field Violation", field: "household_members", id: "val-repeat", ruleName: "Household size must match repeat count", severity: "Critical", status: "Escalated", submissionId: "SUB-2021" },
  { category: "Reference Data Violation", field: "district", id: "val-district", ruleName: "District must be active for selected region", severity: "Medium", status: "Resolved", submissionId: "SUB-1760" },
];

export const previewRiskAlerts: RiskAlertRecord[] = [
  { category: "Enumerator Fraud", id: "risk-fast-surveys", owner: "Data Manager", pattern: "8 submissions in 7 minutes from repeated coordinates", recommendedAction: "Escalate to Governance Review and suspend affected records.", riskLevel: "Critical", status: "Governance Review" },
  { category: "Location Fraud", id: "risk-location", owner: "GIS Quality Lead", pattern: "Repeated GPS point used across three villages", recommendedAction: "Open Data Quality Maps and assign field verification.", riskLevel: "High", status: "Under Investigation" },
  { category: "Mass Duplicates", id: "risk-duplicates", owner: "Data Quality Officer", pattern: "Three duplicate clusters in one supervisor team", recommendedAction: "Compare records and review training needs.", riskLevel: "High", status: "Assigned" },
];

export const previewQualityRules: QualityRuleRecord[] = [
  { active: true, description: "Block formal approval when consent is missing on forms that require consent.", form: "Beneficiary Registration Form", id: "rule-consent", lastTestedAt: nowIso, name: "Consent must be present", project: "Social Protection Response", scope: "Form", severity: "Critical", type: "Completeness" },
  { active: true, description: "Flag records outside assigned project or selected administrative boundary.", form: "Household Verification Form", id: "rule-gps-boundary", lastTestedAt: nowIso, name: "GPS inside allowed boundary", project: "All active projects", scope: "Project", severity: "High", type: "GPS" },
  { active: true, description: "Detect exact and fuzzy duplicate beneficiaries using ID, phone, national ID, and GPS.", form: "Farmer Registration Survey", id: "rule-duplicate", lastTestedAt: yesterdayIso, name: "Beneficiary duplicate detection", project: "Agricultural Resilience Program", scope: "Organization", severity: "High", type: "Duplicate" },
  { active: false, description: "Flag suspicious submission bursts below minimum interview duration.", form: "All mobile forms", id: "rule-duration", lastTestedAt: twoDaysAgoIso, name: "Minimum interview duration", project: "All active projects", scope: "Enumerator", severity: "Medium", type: "Timeliness" },
];

export const previewQualityAuditEvents: QualityAuditEvent[] = [
  { action: "Issue assigned", actor: "Data Manager", createdAt: nowIso, id: "qaudit-1", issueId: "quality-duplicate-household", reason: "Duplicate group confidence exceeded 90%." },
  { action: "Issue escalated", actor: "GIS Quality Lead", createdAt: nowIso, id: "qaudit-2", issueId: "quality-gps-boundary", reason: "Point is outside project boundary." },
  { action: "Rule edited", actor: "Form Owner", createdAt: yesterdayIso, id: "qaudit-3", issueId: "quality-reference-failure", reason: "Inactive reference value was removed from form binding." },
  { action: "Risk alert reviewed", actor: "Governance Lead", createdAt: twoDaysAgoIso, id: "qaudit-4", issueId: "quality-risk-fast-surveys", reason: "Suspicious pattern sent to governance review." },
];
