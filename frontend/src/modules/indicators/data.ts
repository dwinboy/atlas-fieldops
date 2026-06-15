export type IndicatorSection =
  | "dashboard"
  | "library"
  | "results-framework"
  | "logframes"
  | "targets"
  | "baselines"
  | "reports";

export type IndicatorStatus = "On Track" | "Behind Target" | "Needs Baseline" | "No Data Source" | "Archived";
export type CalculationType = "Count" | "Sum" | "Average" | "Percentage" | "Ratio" | "Custom formula";
export type Frequency = "Monthly" | "Quarterly" | "Semiannual" | "Annual" | "Project lifetime";

export type IndicatorCategoryCount = {
  label: string;
  count: number;
};

export type IndicatorSummary = {
  totalIndicators: number;
  topCategories: IndicatorCategoryCount[];
  onTrack: number;
  behindTarget: number;
  withoutBaseline: number;
  withoutDataSource: number;
  reportingPeriodsDue: number;
};

export type IndicatorRecord = {
  id: string;
  name: string;
  code: string;
  type: string;
  definition: string;
  unit: string;
  calculationType: CalculationType;
  calculationMethod: string;
  numerator?: string;
  denominator?: string;
  dataSource: string | null;
  frequency: Frequency;
  disaggregation: string[];
  responsiblePerson: string;
  project: string;
  resultArea: string;
  baseline: number | null;
  target: number;
  current: number;
  status: IndicatorStatus;
  owner: string;
  linkedForm: string | null;
  linkedQuestion: string | null;
  lastCalculatedAt: string;
};

export type IndicatorTarget = {
  id: string;
  indicatorId: string;
  indicatorCode: string;
  project: string;
  location: string;
  period: string;
  targetValue: number;
  actualValue: number;
  responsibleTeam: string;
  status: IndicatorStatus;
  type: "Annual" | "Quarterly" | "Monthly" | "Project lifetime" | "Location-specific" | "Disaggregated";
};

export type IndicatorBaseline = {
  id: string;
  indicatorId: string;
  indicatorCode: string;
  project: string;
  location: string;
  value: number;
  date: string;
  source: string;
  methodology: string;
  confidenceLevel: "Low" | "Medium" | "High";
  notes: string;
  locked: boolean;
  version: string;
};

export type ResultsFrameworkNode = {
  id: string;
  level: "Goal" | "Impact" | "Outcome" | "Output" | "Activity";
  title: string;
  project: string;
  parentId: string | null;
  indicators: string[];
  progress: number;
  status: IndicatorStatus;
};

export type LogframeRow = {
  id: string;
  project: string;
  narrativeSummary: string;
  indicators: string[];
  meansOfVerification: string;
  assumptions: string;
  baseline: string;
  target: string;
  currentValue: string;
  version: string;
};

export type IndicatorReport = {
  id: string;
  name: string;
  type:
    | "Metric Progress Report"
    | "Target Achievement Report"
    | "Baseline vs Current Report"
    | "Disaggregation Report"
    | "Location Performance Report"
    | "Periodic Metric Report";
  project: string;
  period: string;
  status: "Ready" | "Draft" | "Needs Data";
  formats: string[];
};

export type IndicatorDataSource = {
  id: string;
  indicatorId: string;
  formName: string;
  formVersion: string;
  numeratorQuestion: string;
  denominatorQuestion?: string;
  aggregationLevel: "Organization" | "Project" | "Location" | "Team" | "Enumerator";
  approvedSubmissionsOnly: boolean;
  reportingFrequency: Frequency;
};

export type IndicatorAuditEvent = {
  id: string;
  indicatorId: string;
  action: string;
  actor: string;
  createdAt: string;
  reason: string;
};

export const indicatorSections: {
  id: IndicatorSection;
  label: string;
  route: string;
  description: string;
}[] = [
  { id: "dashboard", label: "Overview", route: "/indicators", description: "Performance overview, category breakdown, target achievement, deadlines, and metrics requiring attention." },
  { id: "library", label: "Metric Library", route: "/indicators/library", description: "Create, edit, archive, import, export, and link reusable metrics or KPIs to projects and form questions." },
  { id: "targets", label: "Targets", route: "/indicators/targets", description: "Set annual, quarterly, monthly, lifetime, location-specific, and disaggregated metric targets." },
  { id: "baselines", label: "Baselines", route: "/indicators/baselines", description: "Add, import, version, compare, and lock approved baseline values." },
  { id: "reports", label: "Metric Reports", route: "/indicators/reports", description: "Prepare metric-specific reporting and link formal outputs to the Reports module." },
  { id: "results-framework", label: "Results Framework", route: "/indicators/results-framework", description: "View the live results structure derived from project metrics, result areas, and progress by level." },
  { id: "logframes", label: "Logframes", route: "/indicators/logframes", description: "Review logframe-style rows generated from metrics, baselines, targets, verification sources, and assumptions." },
];

const nowIso = new Date().toISOString();
const yesterdayIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

export const previewIndicators: IndicatorRecord[] = [
  {
    baseline: 1.8,
    calculationMethod: "Average approved yield response by hectare across farmer registration and seasonal yield forms.",
    calculationType: "Average",
    code: "AG.YIELD",
    current: 2.6,
    dataSource: "Seasonal Yield Survey / yield_tons_ha",
    definition: "Average crop yield increase among supported smallholder farmers.",
    denominator: "Approved farm plots with measured hectares",
    disaggregation: ["Gender", "Location", "Crop type"],
    frequency: "Quarterly",
    id: "indicator-ag-yield",
    lastCalculatedAt: nowIso,
    linkedForm: "Seasonal Yield Survey",
    linkedQuestion: "yield_tons_ha",
    name: "Average crop yield increase",
    numerator: "Total yield in tons",
    owner: "Operations Manager",
    project: "Agricultural Resilience Program",
    responsiblePerson: "Grace M.",
    resultArea: "Increased agricultural productivity",
    status: "Behind Target",
    target: 3.2,
    type: "Outcome",
    unit: "tons/ha",
  },
  {
    baseline: 38,
    calculationMethod: "Households answering Yes to clean water divided by all approved household survey submissions.",
    calculationType: "Percentage",
    code: "WASH.ACCESS",
    current: 56,
    dataSource: "Household Verification Form / clean_water_access",
    definition: "Percentage of households with access to clean water.",
    denominator: "Total approved households surveyed",
    disaggregation: ["Location", "Beneficiary type", "Gender"],
    frequency: "Monthly",
    id: "indicator-wash-access",
    lastCalculatedAt: nowIso,
    linkedForm: "Household Verification Form",
    linkedQuestion: "clean_water_access",
    name: "Households with clean water access",
    numerator: "Households answering Yes",
    owner: "Data Manager",
    project: "Social Protection Response",
    responsiblePerson: "Samuel K.",
    resultArea: "Improved household service access",
    status: "Behind Target",
    target: 75,
    type: "Output",
    unit: "%",
  },
  {
    baseline: 64,
    calculationMethod: "Average monthly attendance percentage from approved school facility assessment submissions.",
    calculationType: "Average",
    code: "EDU.ATTEND",
    current: 78,
    dataSource: "School Facility Assessment / attendance_rate",
    definition: "Monthly school attendance among targeted schools.",
    disaggregation: ["Location", "Age group", "Gender"],
    frequency: "Monthly",
    id: "indicator-edu-attend",
    lastCalculatedAt: yesterdayIso,
    linkedForm: "School Facility Assessment",
    linkedQuestion: "attendance_rate",
    name: "Monthly school attendance",
    owner: "Education Program Lead",
    project: "Education Access Program",
    responsiblePerson: "Nora Talla",
    resultArea: "Improved education participation",
    status: "On Track",
    target: 88,
    type: "Outcome",
    unit: "%",
  },
  {
    baseline: null,
    calculationMethod: "Count distinct beneficiaries with completed referral forms.",
    calculationType: "Count",
    code: "HEALTH.REF",
    current: 312,
    dataSource: null,
    definition: "Number of beneficiaries completing referral services.",
    disaggregation: ["Gender", "Age group", "Disability status", "Location"],
    frequency: "Quarterly",
    id: "indicator-health-referrals",
    lastCalculatedAt: yesterdayIso,
    linkedForm: null,
    linkedQuestion: null,
    name: "Completed health referrals",
    owner: "Health Data Officer",
    project: "Community Health Outreach",
    responsiblePerson: "Data Manager",
    resultArea: "Improved service completion",
    status: "No Data Source",
    target: 600,
    type: "Impact",
    unit: "people",
  },
];

export const previewTargets: IndicatorTarget[] = [
  { actualValue: 2.6, id: "target-yield-q2", indicatorCode: "AG.YIELD", indicatorId: "indicator-ag-yield", location: "Northwest / Mezam", period: "Q2 2026", project: "Agricultural Resilience Program", responsibleTeam: "Survey Team A", status: "Behind Target", targetValue: 3.2, type: "Quarterly" },
  { actualValue: 56, id: "target-water-june", indicatorCode: "WASH.ACCESS", indicatorId: "indicator-wash-access", location: "West / Mifi", period: "June 2026", project: "Social Protection Response", responsibleTeam: "Enumerator Team B", status: "Behind Target", targetValue: 75, type: "Monthly" },
  { actualValue: 78, id: "target-attendance-june", indicatorCode: "EDU.ATTEND", indicatorId: "indicator-edu-attend", location: "Littoral / Wouri", period: "June 2026", project: "Education Access Program", responsibleTeam: "School monitoring team", status: "On Track", targetValue: 88, type: "Monthly" },
];

export const previewBaselines: IndicatorBaseline[] = [
  { confidenceLevel: "High", date: "2026-01-15", id: "baseline-yield", indicatorCode: "AG.YIELD", indicatorId: "indicator-ag-yield", location: "Northwest", locked: true, methodology: "Baseline survey with farm plot measurement.", notes: "Approved by funder data focal point.", project: "Agricultural Resilience Program", source: "Baseline Survey v1", value: 1.8, version: "v1" },
  { confidenceLevel: "Medium", date: "2026-02-01", id: "baseline-water", indicatorCode: "WASH.ACCESS", indicatorId: "indicator-wash-access", location: "West", locked: true, methodology: "Household registration and spot checks.", notes: "District-level estimate.", project: "Social Protection Response", source: "Household Verification Form v2", value: 38, version: "v2" },
  { confidenceLevel: "High", date: "2026-01-30", id: "baseline-attendance", indicatorCode: "EDU.ATTEND", indicatorId: "indicator-edu-attend", location: "Littoral", locked: false, methodology: "School records and facility assessment.", notes: "Pending final district validation.", project: "Education Access Program", source: "Facility Assessment", value: 64, version: "draft" },
];

export const previewResultsFramework: ResultsFrameworkNode[] = [
  { id: "goal-resilience", indicators: ["AG.YIELD", "WASH.ACCESS"], level: "Goal", parentId: null, progress: 67, project: "Agricultural Resilience Program", status: "Behind Target", title: "Improve resilience and wellbeing of vulnerable households" },
  { id: "impact-income", indicators: ["AG.YIELD"], level: "Impact", parentId: "goal-resilience", progress: 57, project: "Agricultural Resilience Program", status: "Behind Target", title: "Household livelihood outcomes improve" },
  { id: "outcome-productivity", indicators: ["AG.YIELD"], level: "Outcome", parentId: "impact-income", progress: 57, project: "Agricultural Resilience Program", status: "Behind Target", title: "Smallholder productivity increases" },
  { id: "output-training", indicators: ["WASH.ACCESS"], level: "Output", parentId: "outcome-productivity", progress: 75, project: "Social Protection Response", status: "On Track", title: "Households receive service support" },
  { id: "activity-registration", indicators: ["EDU.ATTEND"], level: "Activity", parentId: "output-training", progress: 82, project: "Education Access Program", status: "On Track", title: "Monthly school monitoring conducted" },
];

export const previewLogframeRows: LogframeRow[] = [
  { assumptions: "Markets remain accessible and extension officers complete planned visits.", baseline: "1.8 tons/ha", currentValue: "2.6 tons/ha", id: "logframe-yield", indicators: ["AG.YIELD"], meansOfVerification: "Approved seasonal yield submissions and supervisor verification.", narrativeSummary: "Outcome: Smallholder productivity increases.", project: "Agricultural Resilience Program", target: "3.2 tons/ha", version: "v2" },
  { assumptions: "Household water points remain operational during monitoring period.", baseline: "38%", currentValue: "56%", id: "logframe-water", indicators: ["WASH.ACCESS"], meansOfVerification: "Approved household verification submissions.", narrativeSummary: "Output: Vulnerable households access improved services.", project: "Social Protection Response", target: "75%", version: "v1" },
  { assumptions: "School calendars remain stable and records are available.", baseline: "64%", currentValue: "78%", id: "logframe-attendance", indicators: ["EDU.ATTEND"], meansOfVerification: "School facility assessment and attendance registers.", narrativeSummary: "Outcome: Education participation improves.", project: "Education Access Program", target: "88%", version: "draft" },
];

export const previewReports: IndicatorReport[] = [
  { formats: ["PDF", "Excel"], id: "report-progress", name: "Metric Progress Report", period: "Q2 2026", project: "Agricultural Resilience Program", status: "Ready", type: "Metric Progress Report" },
  { formats: ["Excel"], id: "report-target", name: "Target Achievement Report", period: "June 2026", project: "All active projects", status: "Draft", type: "Target Achievement Report" },
  { formats: ["PDF"], id: "report-disaggregation", name: "Gender and Location Disaggregation", period: "Q2 2026", project: "Social Protection Response", status: "Needs Data", type: "Disaggregation Report" },
];

export const previewDataSources: IndicatorDataSource[] = [
  { aggregationLevel: "Location", approvedSubmissionsOnly: true, denominatorQuestion: "farm_area_ha", formName: "Seasonal Yield Survey", formVersion: "v3", id: "source-yield", indicatorId: "indicator-ag-yield", numeratorQuestion: "yield_tons", reportingFrequency: "Quarterly" },
  { aggregationLevel: "Project", approvedSubmissionsOnly: true, denominatorQuestion: "household_id", formName: "Household Verification Form", formVersion: "v2", id: "source-water", indicatorId: "indicator-wash-access", numeratorQuestion: "clean_water_access", reportingFrequency: "Monthly" },
  { aggregationLevel: "Location", approvedSubmissionsOnly: true, formName: "School Facility Assessment", formVersion: "v1", id: "source-attendance", indicatorId: "indicator-edu-attend", numeratorQuestion: "attendance_rate", reportingFrequency: "Monthly" },
];

export const previewAuditEvents: IndicatorAuditEvent[] = [
  { action: "Metric linked to form", actor: "Operations Manager", createdAt: nowIso, id: "audit-link-yield", indicatorId: "indicator-ag-yield", reason: "Seasonal yield survey approved as primary source." },
  { action: "Target changed", actor: "Data Manager", createdAt: yesterdayIso, id: "audit-target-water", indicatorId: "indicator-wash-access", reason: "Funder revised June target after project expansion." },
  { action: "Baseline locked", actor: "Governance Steward", createdAt: "2026-02-03T12:00:00.000Z", id: "audit-baseline-water", indicatorId: "indicator-wash-access", reason: "Baseline approved for Q2 reporting." },
];
