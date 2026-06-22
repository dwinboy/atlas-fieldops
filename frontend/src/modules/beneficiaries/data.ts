import type { BeneficiaryRead } from "@/lib/api";

export type EntityType =
  | "Farmer"
  | "Household"
  | "Entity"
  | "Facility"
  | "School"
  | "Village"
  | "Group"
  | "Training Participant"
  | "Health Worker"
  | "Custom Entity"
  | string;

export type EntityStatus =
  | "Active"
  | "Inactive"
  | "Deceased"
  | "Moved"
  | "Duplicate"
  | "Archived";

export type BeneficiaryEntity = {
  id: string;
  entityId: string;
  entityType: EntityType;
  projectId: string;
  projectName: string;
  firstName: string;
  lastName: string;
  fullName: string;
  gender: string;
  dateOfBirth?: string;
  age?: number;
  phoneNumber?: string;
  nationalId?: string;
  householdId?: string;
  village: string;
  community: string;
  district: string;
  region: string;
  country: string;
  latitude?: number;
  longitude?: number;
  registrationDate: string;
  registrationSource: "Web" | "Import" | "Mobile-ready API" | "Form Submission";
  consentStatus: "Granted" | "Missing" | "Expired" | "Not Required";
  status: EntityStatus;
  assignedOfficer: string;
  formsCompleted: number;
  lastVisit?: string;
  qualityFlags: number;
  duplicateStatus: "Clear" | "Possible Duplicate" | "Likely Duplicate" | "Confirmed Duplicate";
  profileJson: Record<string, unknown>;
};

export type EntityRegistrationDraft = {
  projectId: string;
  projectName: string;
  entityType: EntityType;
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  phoneNumber: string;
  nationalId: string;
  householdId: string;
  village: string;
  community: string;
  district: string;
  region: string;
  country: string;
  latitude: string;
  longitude: string;
  consentStatus: BeneficiaryEntity["consentStatus"];
  continuationReason: string;
  customProfile: Record<string, string>;
};

export type DuplicateCandidate = {
  entity: BeneficiaryEntity;
  score: number;
  level: "No strong duplicate" | "Possible duplicate" | "Likely duplicate";
  matchedFields: string[];
};

export type EntityControlSettings = {
  linkedToEntity: boolean;
  entityType: EntityType;
  createsNewEntity: boolean;
  updatesExistingEntity: boolean;
  requiresExistingEntity: boolean;
  allowsAnonymous: boolean;
  submissionFrequency:
    | "once_ever"
    | "once_per_project"
    | "once_per_year"
    | "once_per_season"
    | "once_per_quarter"
    | "once_per_month"
    | "once_per_event"
    | "unlimited";
  duplicateMode: "exact" | "fuzzy" | "weighted";
  duplicateThreshold: number;
  duplicateAction: "block" | "warn" | "review";
  prefillProfile: boolean;
  lockPrefilledFields: boolean;
  profileUpdateMode: "never" | "after_submission" | "with_supervisor_approval";
};

export const entityTypes: EntityType[] = [
  "Entity",
  "Farmer",
  "Household",
  "Facility",
  "School",
  "Village",
  "Group",
  "Training Participant",
  "Health Worker",
  "Custom Entity",
];

export const defaultEntityControls: EntityControlSettings = {
  linkedToEntity: true,
  entityType: "Entity",
  createsNewEntity: false,
  updatesExistingEntity: false,
  requiresExistingEntity: true,
  allowsAnonymous: false,
  submissionFrequency: "once_per_project",
  duplicateMode: "weighted",
  duplicateThreshold: 90,
  duplicateAction: "block",
  prefillProfile: true,
  lockPrefilledFields: true,
  profileUpdateMode: "with_supervisor_approval",
};

export type BeneficiariesWorkspaceView = "registry" | "import" | "duplicates";

export function beneficiariesViewFromPath(pathname: string): BeneficiariesWorkspaceView {
  const path = pathname.replace(/\/+$/, "") || "/beneficiaries";
  if (path === "/beneficiaries/import") return "import";
  if (path === "/beneficiaries/duplicates") return "duplicates";
  return "registry";
}

const now = Date.now();

export const previewEntities: BeneficiaryEntity[] = [
  {
    age: 43,
    assignedOfficer: "Amina Diallo",
    community: "Bafut",
    consentStatus: "Granted",
    country: "Cameroon",
    dateOfBirth: "1983-02-18",
    district: "Mezam",
    duplicateStatus: "Clear",
    profileJson: {
      fieldLineage: {
        phone_number: {
          approvalDate: new Date(now - 70 * 24 * 60 * 60 * 1000).toISOString(),
          sourceClientSubmissionId: "MOB-2026-0001",
          sourceFormId: "farmer-registration",
          value: "+237 600 100 001",
        },
      },
      projectEnrollments: [
        {
          enrollmentDate: new Date(now - 80 * 24 * 60 * 60 * 1000).toISOString(),
          projectId: "project-agri",
          sourceClientSubmissionId: "MOB-2026-0001",
          status: "active",
        },
      ],
    },
    entityId: "FRM-2026-000001",
    entityType: "Farmer",
    firstName: "Musa",
    formsCompleted: 4,
    fullName: "Musa Kamga",
    gender: "Male",
    householdId: "HH-2026-000001",
    id: "entity-farmer-musa",
    lastName: "Kamga",
    lastVisit: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
    latitude: 5.9631,
    longitude: 10.1591,
    nationalId: "CMR-AGRI-001",
    phoneNumber: "+237 600 100 001",
    projectId: "project-agri",
    projectName: "Agricultural Resilience Program",
    qualityFlags: 0,
    region: "Northwest",
    registrationDate: new Date(now - 80 * 24 * 60 * 60 * 1000).toISOString(),
    registrationSource: "Form Submission",
    status: "Active",
    village: "Nsem",
  },
  {
    age: 39,
    assignedOfficer: "Joseph Mbarga",
    community: "Bafut",
    consentStatus: "Granted",
    country: "Cameroon",
    dateOfBirth: "1987-08-07",
    district: "Mezam",
    duplicateStatus: "Possible Duplicate",
    profileJson: {
      profileUpdateProposals: [
        {
          changes: {
            phone_number: {
              current: "+237 600 100 001",
              proposed: "+237 600 100 001",
            },
          },
          clientSubmissionId: "MOB-2026-0004",
          createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
          status: "pending_review",
        },
      ],
    },
    entityId: "FRM-2026-000137",
    entityType: "Farmer",
    firstName: "Moussa",
    formsCompleted: 1,
    fullName: "Moussa Kamga",
    gender: "Male",
    householdId: "HH-2026-000001",
    id: "entity-farmer-moussa",
    lastName: "Kamga",
    lastVisit: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
    latitude: 5.9632,
    longitude: 10.159,
    phoneNumber: "+237 600 100 001",
    projectId: "project-agri",
    projectName: "Agricultural Resilience Program",
    qualityFlags: 1,
    region: "Northwest",
    registrationDate: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
    registrationSource: "Web",
    status: "Duplicate",
    village: "Nsem",
  },
  {
    age: 31,
    assignedOfficer: "Amina Diallo",
    community: "Bamenda II",
    consentStatus: "Granted",
    country: "Cameroon",
    dateOfBirth: "1995-11-11",
    district: "Mezam",
    duplicateStatus: "Clear",
    profileJson: {
      fieldLineage: {
        display_name: {
          approvalDate: new Date(now - 25 * 60 * 1000).toISOString(),
          sourceClientSubmissionId: "IMP-2026-0003",
          sourceFormId: "baseline-household",
          value: "Esther Fomunyam",
        },
      },
    },
    entityId: "BEN-2026-000044",
    entityType: "Entity",
    firstName: "Esther",
    formsCompleted: 3,
    fullName: "Esther Fomunyam",
    gender: "Female",
    householdId: "HH-2026-000044",
    id: "entity-esther",
    lastName: "Fomunyam",
    lastVisit: new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString(),
    latitude: 5.4744,
    longitude: 10.4171,
    phoneNumber: "+237 600 100 044",
    projectId: "project-agri",
    projectName: "Agricultural Resilience Program",
    qualityFlags: 0,
    region: "Northwest",
    registrationDate: new Date(now - 50 * 24 * 60 * 60 * 1000).toISOString(),
    registrationSource: "Import",
    status: "Active",
    village: "Mankon",
  },
  {
    assignedOfficer: "Nora Talla",
    community: "Bonaberi",
    consentStatus: "Not Required",
    country: "Cameroon",
    district: "Wouri",
    duplicateStatus: "Clear",
    profileJson: {},
    entityId: "FAC-2026-000012",
    entityType: "Facility",
    firstName: "",
    formsCompleted: 2,
    fullName: "Bonaberi Health Post",
    gender: "N/A",
    id: "entity-facility-bonaberi",
    lastName: "",
    lastVisit: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
    latitude: 4.0511,
    longitude: 9.7679,
    projectId: "project-health",
    projectName: "Community Health Access Project",
    qualityFlags: 1,
    region: "Littoral",
    registrationDate: new Date(now - 35 * 24 * 60 * 60 * 1000).toISOString(),
    registrationSource: "Web",
    status: "Active",
    village: "Bonaberi",
  },
  {
    assignedOfficer: "Nora Talla",
    community: "Akwa",
    consentStatus: "Not Required",
    country: "Cameroon",
    district: "Wouri",
    duplicateStatus: "Clear",
    profileJson: {},
    entityId: "SCH-2026-000005",
    entityType: "School",
    firstName: "",
    formsCompleted: 1,
    fullName: "Akwa Public School",
    gender: "N/A",
    id: "entity-school-akwa",
    lastName: "",
    latitude: 4.0495,
    longitude: 9.7064,
    projectId: "project-edu",
    projectName: "Education Attendance Baseline",
    qualityFlags: 0,
    region: "Littoral",
    registrationDate: new Date(now - 18 * 24 * 60 * 60 * 1000).toISOString(),
    registrationSource: "Import",
    status: "Active",
    village: "Akwa",
  },
];

const agriculturePreviewEntities: BeneficiaryEntity[] = [
  {
    age: 52,
    assignedOfficer: "Amina Diallo",
    community: "Bafut",
    consentStatus: "Granted",
    country: "Cameroon",
    dateOfBirth: "1974-04-22",
    district: "Mezam",
    duplicateStatus: "Clear",
    entityId: "FRM-2026-000201",
    entityType: "Farmer",
    firstName: "Therese",
    formsCompleted: 5,
    fullName: "Therese Njang",
    gender: "Female",
    householdId: "HH-2026-000201",
    id: "entity-farmer-therese-njang",
    lastName: "Njang",
    lastVisit: new Date(now - 4 * 24 * 60 * 60 * 1000).toISOString(),
    latitude: 5.9682,
    longitude: 10.1654,
    nationalId: "CMR-AGRI-201",
    phoneNumber: "+237 600 100 201",
    profileJson: { cropType: "Beans", farmSizeHa: 1.8, cooperative: "Bafut Women Farmers", season: "Wet season" },
    projectId: "project-agri",
    projectName: "Agricultural Resilience Program",
    qualityFlags: 0,
    region: "Northwest",
    registrationDate: new Date(now - 78 * 24 * 60 * 60 * 1000).toISOString(),
    registrationSource: "Form Submission",
    status: "Active",
    village: "Nsem",
  },
  {
    age: 36,
    assignedOfficer: "Joseph Mbarga",
    community: "Mankon",
    consentStatus: "Granted",
    country: "Cameroon",
    dateOfBirth: "1990-07-14",
    district: "Mezam",
    duplicateStatus: "Clear",
    entityId: "FRM-2026-000202",
    entityType: "Farmer",
    firstName: "Daniel",
    formsCompleted: 3,
    fullName: "Daniel Chia",
    gender: "Male",
    householdId: "HH-2026-000202",
    id: "entity-farmer-daniel-chia",
    lastName: "Chia",
    lastVisit: new Date(now - 9 * 24 * 60 * 60 * 1000).toISOString(),
    latitude: 5.9704,
    longitude: 10.1513,
    nationalId: "CMR-AGRI-202",
    phoneNumber: "+237 600 100 202",
    profileJson: { cropType: "Maize", farmSizeHa: 3.1, trainingAttended: true, lastInputReceived: "Improved seed" },
    projectId: "project-agri",
    projectName: "Agricultural Resilience Program",
    qualityFlags: 0,
    region: "Northwest",
    registrationDate: new Date(now - 73 * 24 * 60 * 60 * 1000).toISOString(),
    registrationSource: "Mobile-ready API",
    status: "Active",
    village: "Mankon",
  },
  {
    age: 47,
    assignedOfficer: "Amina Diallo",
    community: "Bamenda II",
    consentStatus: "Granted",
    country: "Cameroon",
    dateOfBirth: "1979-12-03",
    district: "Mezam",
    duplicateStatus: "Clear",
    entityId: "FRM-2026-000203",
    entityType: "Farmer",
    firstName: "Rose",
    formsCompleted: 4,
    fullName: "Rose Atem",
    gender: "Female",
    householdId: "HH-2026-000203",
    id: "entity-farmer-rose-atem",
    lastName: "Atem",
    lastVisit: new Date(now - 6 * 24 * 60 * 60 * 1000).toISOString(),
    latitude: 5.9522,
    longitude: 10.1688,
    nationalId: "CMR-AGRI-203",
    phoneNumber: "+237 600 100 203",
    profileJson: { cropType: "Cassava", farmSizeHa: 2.6, cooperative: "Mezam Root Crop Group", vulnerabilityScore: 28 },
    projectId: "project-agri",
    projectName: "Agricultural Resilience Program",
    qualityFlags: 0,
    region: "Northwest",
    registrationDate: new Date(now - 67 * 24 * 60 * 60 * 1000).toISOString(),
    registrationSource: "Form Submission",
    status: "Active",
    village: "Ntaghem",
  },
  {
    age: 29,
    assignedOfficer: "Joseph Mbarga",
    community: "Bafut",
    consentStatus: "Granted",
    country: "Cameroon",
    dateOfBirth: "1997-05-29",
    district: "Mezam",
    duplicateStatus: "Clear",
    entityId: "FRM-2026-000204",
    entityType: "Farmer",
    firstName: "Emmanuel",
    formsCompleted: 2,
    fullName: "Emmanuel Tanyi",
    gender: "Male",
    householdId: "HH-2026-000204",
    id: "entity-farmer-emmanuel-tanyi",
    lastName: "Tanyi",
    lastVisit: new Date(now - 12 * 24 * 60 * 60 * 1000).toISOString(),
    latitude: 5.9594,
    longitude: 10.1736,
    nationalId: "CMR-AGRI-204",
    phoneNumber: "+237 600 100 204",
    profileJson: { cropType: "Tomato", farmSizeHa: 1.2, irrigationAccess: "Seasonal", youthFarmer: true },
    projectId: "project-agri",
    projectName: "Agricultural Resilience Program",
    qualityFlags: 1,
    region: "Northwest",
    registrationDate: new Date(now - 58 * 24 * 60 * 60 * 1000).toISOString(),
    registrationSource: "Form Submission",
    status: "Active",
    village: "Akofunguba",
  },
  {
    age: 58,
    assignedOfficer: "Amina Diallo",
    community: "Mankon",
    consentStatus: "Granted",
    country: "Cameroon",
    dateOfBirth: "1968-09-09",
    district: "Mezam",
    duplicateStatus: "Clear",
    entityId: "FRM-2026-000205",
    entityType: "Farmer",
    firstName: "Pauline",
    formsCompleted: 6,
    fullName: "Pauline Wirmvem",
    gender: "Female",
    householdId: "HH-2026-000205",
    id: "entity-farmer-pauline-wirmvem",
    lastName: "Wirmvem",
    lastVisit: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
    latitude: 5.9821,
    longitude: 10.1419,
    nationalId: "CMR-AGRI-205",
    phoneNumber: "+237 600 100 205",
    profileJson: { cropType: "Potato", farmSizeHa: 2.9, inputVoucherStatus: "Redeemed", lastYieldKg: 1840 },
    projectId: "project-agri",
    projectName: "Agricultural Resilience Program",
    qualityFlags: 0,
    region: "Northwest",
    registrationDate: new Date(now - 83 * 24 * 60 * 60 * 1000).toISOString(),
    registrationSource: "Import",
    status: "Active",
    village: "Mile 6",
  },
  {
    age: 34,
    assignedOfficer: "Joseph Mbarga",
    community: "Bamenda III",
    consentStatus: "Granted",
    country: "Cameroon",
    dateOfBirth: "1992-01-17",
    district: "Mezam",
    duplicateStatus: "Possible Duplicate",
    entityId: "FRM-2026-000206",
    entityType: "Farmer",
    firstName: "Sarah",
    formsCompleted: 2,
    fullName: "Sarah Nfor",
    gender: "Female",
    householdId: "HH-2026-000206",
    id: "entity-farmer-sarah-nfor",
    lastName: "Nfor",
    lastVisit: new Date(now - 16 * 24 * 60 * 60 * 1000).toISOString(),
    latitude: 5.9417,
    longitude: 10.1781,
    nationalId: "CMR-AGRI-206",
    phoneNumber: "+237 600 100 206",
    profileJson: { cropType: "Vegetables", duplicateReason: "Similar phone and household name in same village", farmSizeHa: 0.9 },
    projectId: "project-agri",
    projectName: "Agricultural Resilience Program",
    qualityFlags: 1,
    region: "Northwest",
    registrationDate: new Date(now - 44 * 24 * 60 * 60 * 1000).toISOString(),
    registrationSource: "Web",
    status: "Active",
    village: "Nkwen",
  },
  {
    age: 41,
    assignedOfficer: "Amina Diallo",
    community: "Bafut",
    consentStatus: "Granted",
    country: "Cameroon",
    dateOfBirth: "1985-06-26",
    district: "Mezam",
    duplicateStatus: "Clear",
    entityId: "FRM-2026-000207",
    entityType: "Farmer",
    firstName: "Felix",
    formsCompleted: 4,
    fullName: "Felix Abang",
    gender: "Male",
    householdId: "HH-2026-000207",
    id: "entity-farmer-felix-abang",
    lastName: "Abang",
    lastVisit: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
    latitude: 5.9755,
    longitude: 10.1626,
    nationalId: "CMR-AGRI-207",
    phoneNumber: "+237 600 100 207",
    profileJson: { cropType: "Plantain", farmSizeHa: 3.4, cooperative: "Upper Bafut Farmers", marketAccess: "Weekly market" },
    projectId: "project-agri",
    projectName: "Agricultural Resilience Program",
    qualityFlags: 0,
    region: "Northwest",
    registrationDate: new Date(now - 69 * 24 * 60 * 60 * 1000).toISOString(),
    registrationSource: "Form Submission",
    status: "Active",
    village: "Nsem",
  },
];

const retailPreviewEntities: BeneficiaryEntity[] = [
  {
    assignedOfficer: "Miriam Otieno",
    community: "Nairobi Central",
    consentStatus: "Not Required",
    country: "Kenya",
    district: "Nairobi",
    duplicateStatus: "Clear",
    entityId: "STORE-2026-000009",
    entityType: "Store",
    firstName: "",
    formsCompleted: 18,
    fullName: "Nairobi Central Flagship Store",
    gender: "N/A",
    id: "entity-retail-store-central",
    lastName: "",
    lastVisit: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
    latitude: -1.2864,
    longitude: 36.8172,
    profileJson: { manager: "Grace Wanjiru", storeTier: "Flagship", stockAccuracy: 94, prioritySkus: 420 },
    projectId: "project-retail",
    projectName: "Retail Store Stock Visibility",
    qualityFlags: 0,
    region: "Nairobi",
    registrationDate: new Date(now - 45 * 24 * 60 * 60 * 1000).toISOString(),
    registrationSource: "Form Submission",
    status: "Active",
    village: "CBD",
  },
  {
    assignedOfficer: "Miriam Otieno",
    community: "Westlands",
    consentStatus: "Not Required",
    country: "Kenya",
    district: "Nairobi",
    duplicateStatus: "Clear",
    entityId: "STORE-2026-000014",
    entityType: "Store",
    firstName: "",
    formsCompleted: 15,
    fullName: "Westlands Store",
    gender: "N/A",
    id: "entity-retail-store-westlands",
    lastName: "",
    lastVisit: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
    latitude: -1.2921,
    longitude: 36.8219,
    profileJson: { manager: "Peter Mwangi", storeTier: "Urban", stockAccuracy: 88, openVarianceCases: 3 },
    projectId: "project-retail",
    projectName: "Retail Store Stock Visibility",
    qualityFlags: 1,
    region: "Nairobi",
    registrationDate: new Date(now - 38 * 24 * 60 * 60 * 1000).toISOString(),
    registrationSource: "Import",
    status: "Active",
    village: "Westlands",
  },
  {
    assignedOfficer: "Store Ops Import",
    community: "Industrial Area",
    consentStatus: "Not Required",
    country: "Kenya",
    district: "Nairobi",
    duplicateStatus: "Clear",
    entityId: "SKU-2026-000118",
    entityType: "Product",
    firstName: "",
    formsCompleted: 21,
    fullName: "Premium Cooking Oil 5L",
    gender: "N/A",
    id: "entity-retail-product-cooking-oil",
    lastName: "",
    lastVisit: new Date(now - 8 * 60 * 60 * 1000).toISOString(),
    latitude: -1.3032,
    longitude: 36.8517,
    profileJson: { brand: "Atlas Choice", category: "Household essentials", reorderPoint: 120, supplier: "Nairobi Wholesale Ltd" },
    projectId: "project-retail",
    projectName: "Retail Store Stock Visibility",
    qualityFlags: 0,
    region: "Nairobi",
    registrationDate: new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString(),
    registrationSource: "Import",
    status: "Active",
    village: "Industrial Area",
  },
  {
    assignedOfficer: "Miriam Otieno",
    community: "Nairobi Central",
    consentStatus: "Not Required",
    country: "Kenya",
    district: "Nairobi",
    duplicateStatus: "Possible Duplicate",
    entityId: "SKU-2026-000119",
    entityType: "Product",
    firstName: "",
    formsCompleted: 9,
    fullName: "Premium Cooking Oil 5L - Old Barcode",
    gender: "N/A",
    id: "entity-retail-product-cooking-oil-duplicate",
    lastName: "",
    lastVisit: new Date(now - 20 * 60 * 60 * 1000).toISOString(),
    latitude: -1.2865,
    longitude: 36.8174,
    profileJson: { duplicateReason: "Similar SKU name and supplier with different barcode", supplier: "Nairobi Wholesale Ltd" },
    projectId: "project-retail",
    projectName: "Retail Store Stock Visibility",
    qualityFlags: 1,
    region: "Nairobi",
    registrationDate: new Date(now - 22 * 24 * 60 * 60 * 1000).toISOString(),
    registrationSource: "Web",
    status: "Active",
    village: "CBD",
  },
  {
    assignedOfficer: "Retail Supervisor",
    community: "Nairobi",
    consentStatus: "Not Required",
    country: "Kenya",
    district: "Nairobi",
    duplicateStatus: "Clear",
    entityId: "SUP-2026-000017",
    entityType: "Supplier",
    firstName: "",
    formsCompleted: 7,
    fullName: "Nairobi Wholesale Ltd",
    gender: "N/A",
    id: "entity-retail-supplier-nairobi-wholesale",
    lastName: "",
    lastVisit: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
    latitude: -1.284,
    longitude: 36.82,
    profileJson: { contact: "+254 700 118 017", deliverySlaHours: 36, serviceLevel: 92 },
    projectId: "project-retail",
    projectName: "Retail Store Stock Visibility",
    qualityFlags: 0,
    region: "Nairobi",
    registrationDate: new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString(),
    registrationSource: "Form Submission",
    status: "Active",
    village: "Nairobi",
  },
  {
    assignedOfficer: "Store Ops Import",
    community: "Industrial Area",
    consentStatus: "Not Required",
    country: "Kenya",
    district: "Nairobi",
    duplicateStatus: "Clear",
    entityId: "WH-2026-000004",
    entityType: "Warehouse",
    firstName: "",
    formsCompleted: 12,
    fullName: "Industrial Area Distribution Warehouse",
    gender: "N/A",
    id: "entity-retail-warehouse-industrial",
    lastName: "",
    lastVisit: new Date(now - 11 * 60 * 60 * 1000).toISOString(),
    latitude: -1.3035,
    longitude: 36.8521,
    profileJson: { coldStorage: true, capacityUnits: 45000, dispatchAccuracy: 97 },
    projectId: "project-retail",
    projectName: "Retail Store Stock Visibility",
    qualityFlags: 0,
    region: "Nairobi",
    registrationDate: new Date(now - 54 * 24 * 60 * 60 * 1000).toISOString(),
    registrationSource: "Import",
    status: "Active",
    village: "Industrial Area",
  },
  {
    assignedOfficer: "Miriam Otieno",
    community: "Nairobi Central",
    consentStatus: "Not Required",
    country: "Kenya",
    district: "Nairobi",
    duplicateStatus: "Clear",
    entityId: "BRAND-2026-000003",
    entityType: "Brand",
    firstName: "",
    formsCompleted: 8,
    fullName: "Atlas Choice",
    gender: "N/A",
    id: "entity-retail-brand-atlas-choice",
    lastName: "",
    lastVisit: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
    latitude: -1.2862,
    longitude: 36.817,
    profileJson: { category: "Private label", activeSkus: 86, marginBand: "High" },
    projectId: "project-retail",
    projectName: "Retail Store Stock Visibility",
    qualityFlags: 0,
    region: "Nairobi",
    registrationDate: new Date(now - 40 * 24 * 60 * 60 * 1000).toISOString(),
    registrationSource: "Web",
    status: "Active",
    village: "CBD",
  },
  {
    assignedOfficer: "Miriam Otieno",
    community: "Westlands",
    consentStatus: "Not Required",
    country: "Kenya",
    district: "Nairobi",
    duplicateStatus: "Clear",
    entityId: "SHELF-2026-000221",
    entityType: "Shelf Location",
    firstName: "",
    formsCompleted: 11,
    fullName: "Westlands Aisle 4 Household Essentials",
    gender: "N/A",
    id: "entity-retail-shelf-westlands-aisle-4",
    lastName: "",
    lastVisit: new Date(now - 6 * 60 * 60 * 1000).toISOString(),
    latitude: -1.2922,
    longitude: 36.8217,
    profileJson: { aisle: "4", fixture: "Gondola", planogramCompliance: 83 },
    projectId: "project-retail",
    projectName: "Retail Store Stock Visibility",
    qualityFlags: 1,
    region: "Nairobi",
    registrationDate: new Date(now - 26 * 24 * 60 * 60 * 1000).toISOString(),
    registrationSource: "Form Submission",
    status: "Active",
    village: "Westlands",
  },
  {
    assignedOfficer: "Retail Supervisor",
    community: "Nairobi Central",
    consentStatus: "Not Required",
    country: "Kenya",
    district: "Nairobi",
    duplicateStatus: "Clear",
    entityId: "PROMO-2026-000033",
    entityType: "Promotion",
    firstName: "",
    formsCompleted: 5,
    fullName: "June Essentials Promotion",
    gender: "N/A",
    id: "entity-retail-promo-june-essentials",
    lastName: "",
    lastVisit: new Date(now - 18 * 60 * 60 * 1000).toISOString(),
    latitude: -1.2868,
    longitude: 36.8178,
    profileJson: { startDate: "2026-06-01", endDate: "2026-06-30", upliftTargetPercent: 14 },
    projectId: "project-retail",
    projectName: "Retail Store Stock Visibility",
    qualityFlags: 0,
    region: "Nairobi",
    registrationDate: new Date(now - 20 * 24 * 60 * 60 * 1000).toISOString(),
    registrationSource: "Web",
    status: "Active",
    village: "CBD",
  },
  {
    assignedOfficer: "Store Ops Import",
    community: "Nairobi",
    consentStatus: "Not Required",
    country: "Kenya",
    district: "Nairobi",
    duplicateStatus: "Clear",
    entityId: "CAT-2026-000010",
    entityType: "Product Category",
    firstName: "",
    formsCompleted: 14,
    fullName: "Household Essentials",
    gender: "N/A",
    id: "entity-retail-category-household-essentials",
    lastName: "",
    lastVisit: new Date(now - 10 * 60 * 60 * 1000).toISOString(),
    latitude: -1.285,
    longitude: 36.819,
    profileJson: { activeSkus: 312, shrinkageRisk: "Medium", marginBand: "Core" },
    projectId: "project-retail",
    projectName: "Retail Store Stock Visibility",
    qualityFlags: 0,
    region: "Nairobi",
    registrationDate: new Date(now - 63 * 24 * 60 * 60 * 1000).toISOString(),
    registrationSource: "Import",
    status: "Active",
    village: "Nairobi",
  },
];

previewEntities.push(...agriculturePreviewEntities, ...retailPreviewEntities);

export function mapBeneficiaryRead(row: BeneficiaryRead): BeneficiaryEntity {
  const imported = row as BeneficiaryRead & { profile_json?: Record<string, unknown> };
  const profile = imported.profile_json ?? {};
  const displayName = row.display_name;
  const [firstName = displayName, ...rest] = displayName.split(" ");
  return {
    age: row.birth_year ? new Date().getFullYear() - row.birth_year : undefined,
    assignedOfficer: String(profile.assignedOfficer ?? "Unassigned"),
    community: row.community ?? "Unspecified",
    consentStatus: "Granted",
    country: String(profile.country ?? "Unspecified"),
    dateOfBirth: row.birth_year ? `${row.birth_year}-01-01` : undefined,
    district: row.district ?? "Unspecified",
    duplicateStatus:
      row.duplicate_risk_score >= 90
        ? "Likely Duplicate"
        : row.duplicate_risk_score >= 60
          ? "Possible Duplicate"
          : "Clear",
    entityId: row.beneficiary_uid,
    entityType: titleEntityType(row.beneficiary_type),
    firstName,
    formsCompleted: Number(profile.formsCompleted ?? 0),
    fullName: displayName,
    gender: row.sex ?? "Not recorded",
    householdId: String(profile.householdId ?? ""),
    id: row.id,
    lastName: rest.join(" "),
    lastVisit: row.last_visit_at ?? undefined,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    nationalId: String(profile.nationalId ?? ""),
    phoneNumber: row.phone_number ?? undefined,
    profileJson: profile,
    projectId: row.project_id ?? "",
    projectName: String(profile.projectName ?? "Project enrollment"),
    qualityFlags: row.duplicate_risk_score > 15 ? 1 : 0,
    region: row.region ?? "Unspecified",
    registrationDate: String(profile.registrationDate ?? new Date().toISOString()),
    registrationSource: "Mobile-ready API",
    status: titleStatus(row.enrollment_status),
    village: row.community ?? "Unspecified",
  };
}

function titleEntityType(value: string): EntityType {
  const normalized = value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
  return entityTypes.includes(normalized as EntityType)
    ? (normalized as EntityType)
    : normalized || "Custom Entity";
}

function titleStatus(value: string): EntityStatus {
  const normalized = value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
  return ["Active", "Inactive", "Deceased", "Moved", "Duplicate", "Archived"].includes(
    normalized,
  )
    ? (normalized as EntityStatus)
    : "Active";
}
