"use client";

import { useQuery } from "@tanstack/react-query";

import { listProjects, type ProjectListItemRead } from "@/lib/api";

export type SectorTerminology = {
  classificationLabel?: string;
  sectorId: string;
  sectorName: string;
  metricLabel?: string;
  metricPluralLabel?: string;
  optionalModules?: string[];
  primaryEntity: string;
  primaryEntityPlural: string;
  recordLabel?: string;
  reportOwnerRole: string;
  indicatorCategoryOptions: string[];
  workflowLabel?: string;
};

const CUSTOM_TERMINOLOGY: SectorTerminology = {
  sectorId: "custom",
  sectorName: "Custom Operations",
  primaryEntity: "Record",
  primaryEntityPlural: "Records",
  reportOwnerRole: "Operations Manager",
  indicatorCategoryOptions: ["Metric", "KPI", "Result"],
  classificationLabel: "Classification",
  metricLabel: "Metric",
  metricPluralLabel: "Metrics",
  optionalModules: ["Entity tracking", "Approvals", "Dashboards", "Imports"],
  recordLabel: "Operational record",
  workflowLabel: "Workflow",
};

export const SECTOR_TERMINOLOGY: Record<string, SectorTerminology> = {
  agriculture: {
    sectorId: "agriculture",
    sectorName: "Agriculture and Farmer Programs",
    primaryEntity: "Farmer",
    primaryEntityPlural: "Farmers",
    reportOwnerRole: "Extension Program Manager",
    indicatorCategoryOptions: ["Output", "Outcome", "Impact", "Yield", "Adoption"],
  },
  health: {
    sectorId: "health",
    sectorName: "Health and Community Systems",
    primaryEntity: "Patient",
    primaryEntityPlural: "Patients",
    reportOwnerRole: "Health Program Manager",
    indicatorCategoryOptions: ["Output", "Outcome", "Impact", "Coverage", "Service Quality"],
  },
  education: {
    sectorId: "education",
    sectorName: "Education and School Monitoring",
    primaryEntity: "Student",
    primaryEntityPlural: "Students",
    reportOwnerRole: "Education Program Manager",
    indicatorCategoryOptions: ["Output", "Outcome", "Impact", "Attendance", "Learning Outcome"],
  },
  wash: {
    sectorId: "wash",
    sectorName: "WASH and Infrastructure Monitoring",
    primaryEntity: "Household",
    primaryEntityPlural: "Households",
    reportOwnerRole: "WASH Program Manager",
    indicatorCategoryOptions: ["Output", "Outcome", "Impact", "Functionality", "Coverage"],
  },
  humanitarian: {
    sectorId: "humanitarian",
    sectorName: "Humanitarian Response and Protection",
    primaryEntity: "Beneficiary",
    primaryEntityPlural: "Beneficiaries",
    reportOwnerRole: "Response Program Manager",
    indicatorCategoryOptions: ["Output", "Outcome", "Impact", "Coverage", "Protection"],
  },
  nutrition: {
    sectorId: "nutrition",
    sectorName: "Nutrition and Food Security",
    primaryEntity: "Child",
    primaryEntityPlural: "Children",
    reportOwnerRole: "Nutrition Program Manager",
    indicatorCategoryOptions: ["Output", "Outcome", "Impact", "Coverage", "Recovery"],
  },
  livelihoods: {
    sectorId: "livelihoods",
    sectorName: "Livelihoods and Economic Empowerment",
    primaryEntity: "Participant",
    primaryEntityPlural: "Participants",
    reportOwnerRole: "Livelihoods Program Manager",
    indicatorCategoryOptions: ["Output", "Outcome", "Impact", "Income", "Resilience"],
  },
  protection: {
    sectorId: "protection",
    sectorName: "Protection and GBV Case Management",
    primaryEntity: "Case",
    primaryEntityPlural: "Cases",
    reportOwnerRole: "Protection Program Manager",
    indicatorCategoryOptions: ["Output", "Outcome", "Impact", "Response", "Referral"],
  },
  governance: {
    sectorId: "governance",
    sectorName: "Governance and Civic Participation",
    primaryEntity: "Citizen",
    primaryEntityPlural: "Citizens",
    reportOwnerRole: "Governance Program Manager",
    indicatorCategoryOptions: ["Output", "Outcome", "Impact", "Participation", "Accountability"],
  },
  environment: {
    sectorId: "environment",
    sectorName: "Environment and Climate Resilience",
    primaryEntity: "Site",
    primaryEntityPlural: "Sites",
    reportOwnerRole: "Environment Program Manager",
    indicatorCategoryOptions: ["Output", "Outcome", "Impact", "Restoration", "Adoption"],
  },
  research: {
    sectorId: "research",
    sectorName: "Research and Surveys",
    primaryEntity: "Respondent",
    primaryEntityPlural: "Respondents",
    reportOwnerRole: "Research Lead",
    indicatorCategoryOptions: ["Output", "Outcome", "Impact", "Response Rate", "Data Quality"],
  },
  retail: {
    sectorId: "retail",
    sectorName: "Retail and Store Operations",
    primaryEntity: "Product",
    primaryEntityPlural: "Products",
    reportOwnerRole: "Retail Operations Manager",
    indicatorCategoryOptions: ["KPI", "Stock", "Sales", "Availability", "Margin"],
    classificationLabel: "Product / store classification",
    metricLabel: "Retail KPI",
    metricPluralLabel: "Retail KPIs",
    optionalModules: ["Products", "Stores", "Brands", "Suppliers", "Stock levels", "Sales"],
    recordLabel: "Inventory record",
    workflowLabel: "Store operations workflow",
  },
  sales: {
    sectorId: "sales",
    sectorName: "Sales and Customer Operations",
    primaryEntity: "Customer",
    primaryEntityPlural: "Customers",
    reportOwnerRole: "Sales Manager",
    indicatorCategoryOptions: ["KPI", "Pipeline", "Revenue", "Conversion", "Retention"],
    classificationLabel: "Customer / opportunity classification",
    metricLabel: "Sales KPI",
    metricPluralLabel: "Sales KPIs",
    optionalModules: ["Customers", "Leads", "Products", "Sales visits", "Pipeline", "Revenue"],
    recordLabel: "Sales record",
    workflowLabel: "Sales workflow",
  },
  inventory: {
    sectorId: "inventory",
    sectorName: "Inventory and Asset Stock Management",
    primaryEntity: "Stock Item",
    primaryEntityPlural: "Stock Items",
    reportOwnerRole: "Inventory Manager",
    indicatorCategoryOptions: ["KPI", "Stock", "Variance", "Reorder", "Loss"],
    classificationLabel: "Stock classification",
    metricLabel: "Inventory KPI",
    metricPluralLabel: "Inventory KPIs",
    optionalModules: ["Items", "Warehouses", "Stores", "Suppliers", "Stock counts", "Reorder points"],
    recordLabel: "Stock record",
    workflowLabel: "Inventory workflow",
  },
  logistics: {
    sectorId: "logistics",
    sectorName: "Logistics and Delivery Operations",
    primaryEntity: "Shipment",
    primaryEntityPlural: "Shipments",
    reportOwnerRole: "Logistics Manager",
    indicatorCategoryOptions: ["KPI", "Delivery", "Route", "Delay", "Cost"],
    classificationLabel: "Shipment / route classification",
    metricLabel: "Logistics KPI",
    metricPluralLabel: "Logistics KPIs",
    optionalModules: ["Shipments", "Vehicles", "Routes", "Warehouses", "Incidents", "Delivery proof"],
    recordLabel: "Delivery record",
    workflowLabel: "Logistics workflow",
  },
  manufacturing: {
    sectorId: "manufacturing",
    sectorName: "Manufacturing and Production",
    primaryEntity: "Production Batch",
    primaryEntityPlural: "Production Batches",
    reportOwnerRole: "Production Manager",
    indicatorCategoryOptions: ["KPI", "Output", "Quality", "Downtime", "Waste"],
    classificationLabel: "Production classification",
    metricLabel: "Production KPI",
    metricPluralLabel: "Production KPIs",
    optionalModules: ["Batches", "Machines", "Lines", "Quality checks", "Downtime", "Output"],
    recordLabel: "Production record",
    workflowLabel: "Production workflow",
  },
  hr: {
    sectorId: "hr",
    sectorName: "Human Resources and Workforce",
    primaryEntity: "Employee",
    primaryEntityPlural: "Employees",
    reportOwnerRole: "HR Manager",
    indicatorCategoryOptions: ["KPI", "Attendance", "Performance", "Training", "Compliance"],
    classificationLabel: "Workforce classification",
    metricLabel: "HR KPI",
    metricPluralLabel: "HR KPIs",
    optionalModules: ["Employees", "Departments", "Attendance", "Training", "Performance", "Assets"],
    recordLabel: "HR record",
    workflowLabel: "Workforce workflow",
  },
  audits: {
    sectorId: "audits",
    sectorName: "Audits and Compliance",
    primaryEntity: "Audit Item",
    primaryEntityPlural: "Audit Items",
    reportOwnerRole: "Compliance Manager",
    indicatorCategoryOptions: ["KPI", "Compliance", "Finding", "Risk", "Corrective Action"],
    classificationLabel: "Audit classification",
    metricLabel: "Audit KPI",
    metricPluralLabel: "Audit KPIs",
    optionalModules: ["Audit items", "Findings", "Risks", "Evidence", "Corrective actions", "Approvals"],
    recordLabel: "Audit record",
    workflowLabel: "Audit workflow",
  },
  inspections: {
    sectorId: "inspections",
    sectorName: "Inspections and Field Checks",
    primaryEntity: "Inspection Site",
    primaryEntityPlural: "Inspection Sites",
    reportOwnerRole: "Inspection Manager",
    indicatorCategoryOptions: ["KPI", "Pass Rate", "Defect", "Risk", "Compliance"],
    classificationLabel: "Inspection classification",
    metricLabel: "Inspection KPI",
    metricPluralLabel: "Inspection KPIs",
    optionalModules: ["Sites", "Assets", "Checklists", "Photos", "Findings", "Corrective actions"],
    recordLabel: "Inspection record",
    workflowLabel: "Inspection workflow",
  },
  assets: {
    sectorId: "assets",
    sectorName: "Asset Management",
    primaryEntity: "Asset",
    primaryEntityPlural: "Assets",
    reportOwnerRole: "Asset Manager",
    indicatorCategoryOptions: ["KPI", "Condition", "Utilization", "Maintenance", "Loss"],
    classificationLabel: "Asset classification",
    metricLabel: "Asset KPI",
    metricPluralLabel: "Asset KPIs",
    optionalModules: ["Assets", "Locations", "Custodians", "Condition checks", "Maintenance", "Transfers"],
    recordLabel: "Asset record",
    workflowLabel: "Asset workflow",
  },
  custom: CUSTOM_TERMINOLOGY,
};

export function getSectorTerminology(sectorId: string | null | undefined): SectorTerminology {
  if (!sectorId) return CUSTOM_TERMINOLOGY;
  return SECTOR_TERMINOLOGY[sectorId.trim().toLowerCase()] ?? CUSTOM_TERMINOLOGY;
}

function dominantSectorId(projects: ProjectListItemRead[]): string | null {
  const counts = new Map<string, number>();
  for (const project of projects) {
    if (!project.sector_id) continue;
    const key = project.sector_id.trim().toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [sectorId, count] of counts) {
    if (count > bestCount) {
      best = sectorId;
      bestCount = count;
    }
  }
  return best;
}

export function useSectorTerminology(token: string | null, projectId?: string | null): SectorTerminology {
  const enabled = Boolean(token && token !== "preview-token");
  const projectsQuery = useQuery({
    queryKey: ["sector-terminology-projects", token],
    queryFn: () => listProjects(token ?? ""),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const projects = projectsQuery.data ?? [];
  if (projectId) {
    const project = projects.find((item) => item.id === projectId);
    if (project?.sector_id) return getSectorTerminology(project.sector_id);
  }
  return getSectorTerminology(dominantSectorId(projects));
}
