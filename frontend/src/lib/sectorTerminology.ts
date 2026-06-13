"use client";

import { useQuery } from "@tanstack/react-query";

import { listProjects, type ProjectListItemRead } from "@/lib/api";

export type SectorTerminology = {
  sectorId: string;
  sectorName: string;
  primaryEntity: string;
  primaryEntityPlural: string;
  reportOwnerRole: string;
  indicatorCategoryOptions: string[];
};

const CUSTOM_TERMINOLOGY: SectorTerminology = {
  sectorId: "custom",
  sectorName: "Custom Sector",
  primaryEntity: "Beneficiary",
  primaryEntityPlural: "Beneficiaries",
  reportOwnerRole: "Program Manager",
  indicatorCategoryOptions: ["Output", "Outcome", "Impact"],
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
