export type MappingSection =
  | "dashboard"
  | "project-maps"
  | "submission-maps"
  | "beneficiary-maps"
  | "facility-maps"
  | "coverage-maps"
  | "indicator-maps"
  | "data-quality-maps"
  | "layers"
  | "boundaries";

export type SpatialStatus = "Healthy" | "Warning" | "Critical" | "Inactive";
export type SpatialSeverity = "Low" | "Medium" | "High" | "Critical";
export type GeometryType = "Point" | "Polygon" | "LineString" | "MultiPolygon";
export type LayerVisibility = "Public" | "Internal" | "Restricted" | "Aggregated";
export type MapBasemap = "Streets" | "Satellite" | "Terrain" | "Light";
export type SpatialValidationState = "Passed" | "Warning" | "Failed" | "Needs review";

export type MappingSummary = {
  activeMapLayers: number;
  projectLocations: number;
  submissionPoints: number;
  beneficiaryPoints: number;
  facilityPoints: number;
  uploadedBoundaries: number;
  gpsIssues: number;
  coverageGaps: number;
};

export type MapLayerRecord = {
  id: string;
  name: string;
  type: string;
  description: string;
  source: string;
  owner: string;
  visibility: LayerVisibility;
  geometryType: GeometryType;
  status: SpatialStatus;
  version: string;
  featureCount: number;
  createdAt: string;
};

export type BoundaryRecord = {
  id: string;
  name: string;
  code: string;
  type: "Country" | "Region" | "District" | "Community" | "Village" | "Project Area";
  parent: string;
  status: SpatialStatus;
  geometryStatus: SpatialValidationState;
  coveragePercent: number;
  validationIssues: string[];
  version: string;
  updatedAt: string;
};

export type MapFeatureRecord = {
  id: string;
  label: string;
  category:
    | "Project"
    | "Submission"
    | "Beneficiary"
    | "Facility"
    | "Coverage"
    | "Indicator"
    | "Quality";
  project: string;
  location: string;
  region: string;
  district: string;
  latitude: number;
  longitude: number;
  status: SpatialStatus;
  qualityScore: number;
  gpsAccuracy: number;
  count: number;
  popup: Record<string, string | number>;
  sensitive?: boolean;
};

export type CoverageRecord = {
  id: string;
  location: string;
  project: string;
  target: number;
  actual: number;
  coveragePercent: number;
  status: SpatialStatus;
  gapType: "Covered" | "Under-covered" | "No-data" | "Over-sampled";
};

export type ProjectDataCoverage = {
  project: string;
  recordCount: number;
  submissions: number;
  beneficiaries: number;
  hasData: boolean;
  status: SpatialStatus;
};

export type SpatialQualityIssue = {
  id: string;
  issueType: string;
  sourceFeatureId?: string;
  submissionId: string;
  enumerator: string;
  project: string;
  location: string;
  severity: SpatialSeverity;
  recommendedAction: string;
  validationState: SpatialValidationState;
};

export type IndicatorGeography = {
  id: string;
  indicator: string;
  project: string;
  location: string;
  baseline: number;
  current: number;
  target: number;
  achievementPercent: number;
  period: string;
};

export type ProjectExtent = {
  project: string;
  pointCount: number;
  centroidLat: number;
  centroidLng: number;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

export const mappingSections: {
  id: MappingSection;
  label: string;
  route: string;
  description: string;
}[] = [
  { id: "dashboard", label: "Overview", route: "/mapping", description: "Spatial activity, GPS evidence, layers, boundaries, coverage gaps, and high-priority geographic alerts." },
  { id: "project-maps", label: "Project Maps", route: "/mapping/project-maps", description: "Project extent computed from GPS-tagged submissions and records, with point counts and coverage centroid." },
  { id: "submission-maps", label: "Submission Maps", route: "/mapping/submission-maps", description: "Submission GPS points, density, review status, approval state, and quality scores." },
  { id: "beneficiary-maps", label: "Beneficiary Maps", route: "/mapping/beneficiary-maps", description: "Beneficiary and household geography with privacy masking and aggregated role-based views." },
  { id: "data-quality-maps", label: "Data Quality Maps", route: "/mapping/data-quality-maps", description: "GPS accuracy issues and duplicate-risk records flagged from your real submission and beneficiary data." },
  { id: "facility-maps", label: "Facility Maps", route: "/mapping/facility-maps", description: "Schools, clinics, water points, offices, warehouses, catchments, and service availability." },
  { id: "coverage-maps", label: "Coverage Maps", route: "/mapping/coverage-maps", description: "Covered, under-covered, no-data, and over-sampled areas by assignment, form, target, and location." },
  { id: "indicator-maps", label: "Indicator Maps", route: "/mapping/indicator-maps", description: "Indicator values, baselines, targets, achievement, and hotspots by location." },
  { id: "layers", label: "Map Layers", route: "/mapping/layers", description: "Review live point layers derived from submissions and entity records, plus uploaded GIS layers when connected." },
  { id: "boundaries", label: "Boundaries", route: "/mapping/boundaries", description: "Review project extents derived from GPS evidence and manage official boundaries when geometry uploads are connected." },
];

export const previewMapLayers: MapLayerRecord[] = [
  {
    createdAt: "2026-06-01T09:00:00.000Z",
    description: "Official regional boundaries used for project assignment and coverage reporting.",
    featureCount: 10,
    geometryType: "MultiPolygon",
    id: "layer-admin-boundaries",
    name: "Administrative boundaries",
    owner: "GIS Administrator",
    source: "National GIS office",
    status: "Healthy",
    type: "Administrative boundaries",
    version: "v4",
    visibility: "Internal",
  },
  {
    createdAt: "2026-06-03T11:30:00.000Z",
    description: "Farm polygons uploaded from the agriculture baseline mapping exercise.",
    featureCount: 1290,
    geometryType: "Polygon",
    id: "layer-farm-boundaries",
    name: "Farm boundaries",
    owner: "M&E Manager",
    source: "GeoJSON import",
    status: "Warning",
    type: "Project boundaries",
    version: "v2",
    visibility: "Restricted",
  },
  {
    createdAt: "2026-06-04T15:20:00.000Z",
    description: "Clinic, school, warehouse, and water point reference layer.",
    featureCount: 186,
    geometryType: "Point",
    id: "layer-facilities",
    name: "Service facilities",
    owner: "Data Manager",
    source: "Reference data",
    status: "Healthy",
    type: "Facilities",
    version: "v7",
    visibility: "Internal",
  },
  {
    createdAt: "2026-06-05T08:10:00.000Z",
    description: "District-level aggregation used for donor-safe public map views.",
    featureCount: 42,
    geometryType: "MultiPolygon",
    id: "layer-donor-aggregation",
    name: "Donor aggregated coverage",
    owner: "Governance Steward",
    source: "Atlas aggregation",
    status: "Healthy",
    type: "Coverage",
    version: "v1",
    visibility: "Aggregated",
  },
];

export const previewBoundaries: BoundaryRecord[] = [
  { code: "CM-NW", coveragePercent: 72, geometryStatus: "Passed", id: "boundary-northwest", name: "Northwest", parent: "Cameroon", status: "Healthy", type: "Region", updatedAt: "2026-06-04T10:00:00.000Z", validationIssues: [], version: "v4" },
  { code: "CM-LT", coveragePercent: 64, geometryStatus: "Passed", id: "boundary-littoral", name: "Littoral", parent: "Cameroon", status: "Healthy", type: "Region", updatedAt: "2026-06-03T10:00:00.000Z", validationIssues: [], version: "v4" },
  { code: "CM-FN", coveragePercent: 58, geometryStatus: "Warning", id: "boundary-far-north", name: "Far North", parent: "Cameroon", status: "Warning", type: "Region", updatedAt: "2026-06-02T10:00:00.000Z", validationIssues: ["Small overlap with Mayo-Sava district"], version: "v3" },
  { code: "ARP-MEZAM", coveragePercent: 81, geometryStatus: "Warning", id: "boundary-mezam-project", name: "Mezam farmer registration area", parent: "Northwest", status: "Warning", type: "Project Area", updatedAt: "2026-06-05T07:30:00.000Z", validationIssues: ["Two community polygons missing"], version: "v2" },
];

export const previewMapFeatures: MapFeatureRecord[] = [
  {
    category: "Project",
    count: 42,
    district: "Mezam",
    gpsAccuracy: 8,
    id: "feature-project-northwest",
    label: "Agricultural Resilience Program",
    latitude: 5.9631,
    location: "Northwest / Mezam",
    longitude: 10.1591,
    popup: { "Coverage %": 72, Donor: "FAO", Status: "Active" },
    project: "Agricultural Resilience Program",
    qualityScore: 88,
    region: "Northwest",
    status: "Healthy",
  },
  {
    category: "Submission",
    count: 18420,
    district: "Mezam",
    gpsAccuracy: 6,
    id: "feature-submission-mezam",
    label: "Farmer registration submissions",
    latitude: 5.981,
    location: "Bamenda II",
    longitude: 10.173,
    popup: { "Approval status": "Pending review", "Quality score": 94, "Submission ID": "MOB-2026-0001" },
    project: "Agricultural Resilience Program",
    qualityScore: 94,
    region: "Northwest",
    status: "Healthy",
  },
  {
    category: "Beneficiary",
    count: 8200,
    district: "Wouri",
    gpsAccuracy: 11,
    id: "feature-beneficiary-wouri",
    label: "Household cluster",
    latitude: 4.0511,
    location: "Littoral / Wouri",
    longitude: 9.7679,
    popup: { "Display mode": "Masked district centroid", Households: 8200, Privacy: "Aggregated" },
    project: "Education Access Program",
    qualityScore: 82,
    region: "Littoral",
    sensitive: true,
    status: "Warning",
  },
  {
    category: "Facility",
    count: 28,
    district: "Mifi",
    gpsAccuracy: 5,
    id: "feature-facility-mifi",
    label: "School facilities",
    latitude: 5.4778,
    location: "West / Mifi",
    longitude: 10.4176,
    popup: { "Facility type": "Schools", Services: "Education", Status: "Active" },
    project: "Education Access Program",
    qualityScore: 91,
    region: "West",
    status: "Healthy",
  },
  {
    category: "Quality",
    count: 2,
    district: "Mayo-Sava",
    gpsAccuracy: 43,
    id: "feature-quality-far-north",
    label: "GPS outside boundary",
    latitude: 10.595,
    location: "Far North / Mayo-Sava",
    longitude: 14.324,
    popup: { "Issue type": "Outside assigned boundary", Severity: "High", "Recommended action": "Confirm village assignment" },
    project: "Social Protection Response",
    qualityScore: 61,
    region: "Far North",
    status: "Critical",
  },
  {
    category: "Indicator",
    count: 74,
    district: "Mifi",
    gpsAccuracy: 9,
    id: "feature-indicator-west",
    label: "Food consumption achievement",
    latitude: 5.491,
    location: "West / Mifi",
    longitude: 10.411,
    popup: { Achievement: "74%", Baseline: 41, Target: 80 },
    project: "Agricultural Resilience Program",
    qualityScore: 85,
    region: "West",
    status: "Warning",
  },
];

export const previewCoverage: CoverageRecord[] = [
  { actual: 86, coveragePercent: 72, gapType: "Under-covered", id: "coverage-mezam", location: "Mezam", project: "Agricultural Resilience Program", status: "Warning", target: 120 },
  { actual: 42, coveragePercent: 56, gapType: "Under-covered", id: "coverage-wouri", location: "Wouri", project: "Education Access Program", status: "Warning", target: 75 },
  { actual: 60, coveragePercent: 100, gapType: "Covered", id: "coverage-mifi", location: "Mifi", project: "Social Protection Response", status: "Healthy", target: 60 },
  { actual: 0, coveragePercent: 0, gapType: "No-data", id: "coverage-mayo-sava", location: "Mayo-Sava", project: "Social Protection Response", status: "Critical", target: 45 },
];

export const previewSpatialIssues: SpatialQualityIssue[] = [
  { enumerator: "Joseph N.", id: "spatial-issue-boundary", issueType: "Submission outside boundary", location: "Far North / Mayo-Sava", project: "Social Protection Response", recommendedAction: "Confirm selected village and supervisor assignment.", severity: "High", submissionId: "MOB-2026-0002", validationState: "Failed" },
  { enumerator: "Amina Diallo", id: "spatial-issue-accuracy", issueType: "GPS accuracy above threshold", location: "Northwest / Mezam", project: "Agricultural Resilience Program", recommendedAction: "Request GPS recapture if the record is returned.", severity: "Medium", submissionId: "MOB-2026-0001", validationState: "Warning" },
  { enumerator: "Field Team B", id: "spatial-issue-duplicate", issueType: "Duplicate coordinate cluster", location: "Littoral / Wouri", project: "Education Access Program", recommendedAction: "Review duplicate beneficiary and facility records.", severity: "Critical", submissionId: "MOB-2026-0048", validationState: "Failed" },
];

export const previewIndicatorGeography: IndicatorGeography[] = [
  { achievementPercent: 74, baseline: 41, current: 59, id: "indicator-food-west", indicator: "Food Consumption Score", location: "West / Mifi", period: "Q2 2026", project: "Agricultural Resilience Program", target: 80 },
  { achievementPercent: 68, baseline: 35, current: 51, id: "indicator-income-northwest", indicator: "Household income", location: "Northwest / Mezam", period: "Q2 2026", project: "Agricultural Resilience Program", target: 75 },
  { achievementPercent: 81, baseline: 52, current: 73, id: "indicator-attendance-littoral", indicator: "School attendance", location: "Littoral / Wouri", period: "May 2026", project: "Education Access Program", target: 90 },
];
