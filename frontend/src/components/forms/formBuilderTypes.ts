/** Local domain types for the form builder runtime (readiness, assignment, import runs, quality flags). */

export type FormReadinessState = {
  mobilePreviewChecked: boolean;
  pilotTestCompleted: boolean;
  enumeratorBriefingReady: boolean;
  importTemplateReviewed: boolean;
  lastReviewedAt?: string;
};

export type FormAssignmentPlan = {
  audience: string;
  team: string;
  supervisor: string;
  locationScope: string;
  targetSubmissions: number;
  dailyTarget: number;
  briefingComplete: boolean;
  pilotEnumerator: string;
  lastUpdatedAt?: string;
};

export type FormImportRun = {
  id: string;
  fileName: string;
  rows: number;
  mappedColumns: number;
  validRows: number;
  issueCount: number;
  status: "validated" | "needs_mapping" | "imported";
  createdAt: string;
};

export type FormQualityFlag = {
  id: string;
  label: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  affectedRecords: number;
  owner: string;
  status: "open" | "monitoring" | "resolved";
  recommendation: string;
};
