"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  DatabaseZap,
  Download,
  Eye,
  FileCheck2,
  Flag,
  FolderKanban,
  LockKeyhole,
  MapPinned,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  Target,
  UploadCloud,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpHint } from "@/components/ui/help-hint";
import { Input, Select, Textarea } from "@/components/ui/input";
import {
  createSurvey,
  exportFormXlsForm,
  listForms,
  listPrograms,
  listSurveys,
  updateSurveyGovernance,
  uploadImportFile,
  type DataFormRead,
  type ImportUploadResponse,
  type ProgramRead,
  type SurveyGovernanceSettings,
  type SurveyRead,
  type SurveyStatus,
  type XlsFormWorkbook,
} from "@/lib/api";
import { statusTone as canonicalStatusTone } from "@/lib/statusTones";
import { useWorkspaceStore } from "@/stores/workspace";

type SurveyManagementProps = {
  token: string | null;
};

type SurveyTab = "overview" | "forms" | "governance" | "uploads" | "team" | "quality" | "coverage" | "reports";

type GovernanceRoleKey =
  | "data_visibility_roles"
  | "review_roles"
  | "approval_roles"
  | "edit_roles"
  | "correction_roles"
  | "upload_roles"
  | "export_roles";

const surveyTypes = [
  "baseline",
  "midline",
  "endline",
  "registration",
  "monitoring",
  "verification",
  "assessment",
  "evaluation",
  "follow_up",
  "research",
  "census",
  "beneficiary_survey",
  "farmer_survey",
  "household_survey",
  "market_survey",
  "health_survey",
  "custom",
];

const surveyRoleOptions: { role: string; label: string; description: string }[] = [
  { role: "survey_owner", label: "Survey Owner", description: "Owns survey settings, data rules, and final decisions." },
  { role: "survey_manager", label: "Survey Manager", description: "Manages forms, teams, imports, review queues, and progress." },
  { role: "survey_supervisor", label: "Survey Supervisor", description: "Supervises enumerators and reviews field issues." },
  { role: "data_quality_officer", label: "Data Quality Officer", description: "Validates data, edits allowed records, and handles corrections." },
  { role: "enumerator", label: "Enumerator", description: "Collects or resubmits assigned records." },
  { role: "analyst", label: "Analyst", description: "Reads approved data, analyzes results, and prepares reports." },
];

const governanceRoleGroups: {
  key: GovernanceRoleKey;
  title: string;
  description: string;
  icon: typeof Eye;
}[] = [
  {
    key: "data_visibility_roles",
    title: "Can see synchronized form data",
    description: "Controls who can view records after mobile sync or file upload.",
    icon: Eye,
  },
  {
    key: "review_roles",
    title: "Can start review",
    description: "Controls who can open submitted records and move them into review.",
    icon: FileCheck2,
  },
  {
    key: "approval_roles",
    title: "Can approve final data",
    description: "Controls who can mark records as approved for analysis and reporting.",
    icon: ShieldCheck,
  },
  {
    key: "edit_roles",
    title: "Can edit records",
    description: "Controls who can correct uploaded or synced values before approval.",
    icon: DatabaseZap,
  },
  {
    key: "correction_roles",
    title: "Can send back for correction",
    description: "Controls who can return unclear records to field teams with notes.",
    icon: RotateCcw,
  },
  {
    key: "upload_roles",
    title: "Can upload Excel data",
    description: "Controls who can import historical or partner data into survey forms.",
    icon: UploadCloud,
  },
  {
    key: "export_roles",
    title: "Can export survey data",
    description: "Controls who can export reviewed survey data for analysis.",
    icon: Download,
  },
];

const defaultSurveyGovernance: SurveyGovernanceSettings = {
  data_visibility_roles: ["survey_owner", "survey_manager", "survey_supervisor", "data_quality_officer", "analyst"],
  review_roles: ["survey_owner", "survey_manager", "survey_supervisor", "data_quality_officer"],
  approval_roles: ["survey_owner", "survey_manager", "data_quality_officer"],
  edit_roles: ["survey_owner", "survey_manager", "data_quality_officer"],
  correction_roles: ["survey_owner", "survey_manager", "survey_supervisor", "data_quality_officer"],
  upload_roles: ["survey_owner", "survey_manager", "data_quality_officer"],
  export_roles: ["survey_owner", "survey_manager", "analyst"],
  synced_submission_default_status: "submitted",
  uploaded_submission_default_status: "under_review",
  review_required: true,
  allow_reviewer_edit: true,
  require_correction_note: true,
  lock_after_approval: true,
};

const previewProjects: ProgramRead[] = [
  { id: "preview-agriculture", name: "Agricultural Resilience Program", slug: "agricultural-resilience", region: "North West", is_active: true },
  { id: "preview-health", name: "Community Health Outreach", slug: "community-health", region: "Central", is_active: true },
];

const previewSurveys: SurveyRead[] = [
  {
    id: "preview-baseline",
    organization_id: "preview-org",
    project_id: "preview-agriculture",
    created_by_user_id: "preview-user",
    owner_user_id: "preview-user",
    manager_user_id: null,
    title: "Baseline Survey",
    code: "AGR-BASE-2026",
    description: "Collect household, farm, income, GPS, and beneficiary readiness data before program delivery.",
    survey_type: "baseline",
    status: "active",
    start_date: "2026-06-01",
    end_date: "2026-06-30",
    geographic_scope: "North West districts",
    target_population: "Smallholder farmers and households",
    indicator_ids_json: ["crop_yield", "household_income"],
    governance_json: defaultSurveyGovernance,
    custom_type_label: null,
    is_active: true,
  },
  {
    id: "preview-registration",
    organization_id: "preview-org",
    project_id: "preview-agriculture",
    created_by_user_id: "preview-user",
    owner_user_id: "preview-user",
    manager_user_id: null,
    title: "Farmer Registration Survey",
    code: "AGR-REG-2026",
    description: "Register farmers, farms, consent status, GPS, and eligibility records for service delivery.",
    survey_type: "farmer_survey",
    status: "draft",
    start_date: null,
    end_date: null,
    geographic_scope: "Program communities",
    target_population: "Farmers applying for support",
    indicator_ids_json: [],
    governance_json: defaultSurveyGovernance,
    custom_type_label: null,
    is_active: true,
  },
];

const previewForms: DataFormRead[] = [
  {
    id: "preview-household-form",
    project_id: "preview-agriculture",
    survey_id: "preview-baseline",
    name: "Household Baseline Form",
    slug: "household-baseline",
    description: "Household, income, food security, and GPS questions.",
    status: "published",
    current_version: 2,
    is_active: true,
  },
  {
    id: "preview-farm-form",
    project_id: "preview-agriculture",
    survey_id: "preview-baseline",
    name: "Farm Plot Form",
    slug: "farm-plot",
    description: "Farm plot, crop, yield, media, and location evidence.",
    status: "draft",
    current_version: 1,
    is_active: true,
  },
];

function titleCase(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusTone(status: SurveyStatus): "neutral" | "success" | "warning" | "danger" | "accent" {
  const tone = canonicalStatusTone(status);
  return tone === "success" || tone === "warning" || tone === "danger"
    ? tone
    : "neutral";
}

function surveyProgress(status: SurveyStatus, formCount: number): number {
  if (status === "completed") return 100;
  if (status === "active") return Math.min(85, 35 + formCount * 15);
  if (status === "paused") return 45;
  if (status === "archived") return 100;
  return formCount > 0 ? 25 : 10;
}

function normalizeGovernance(
  governance?: Partial<SurveyGovernanceSettings>,
): SurveyGovernanceSettings {
  return {
    ...defaultSurveyGovernance,
    ...governance,
    data_visibility_roles: governance?.data_visibility_roles ?? defaultSurveyGovernance.data_visibility_roles,
    review_roles: governance?.review_roles ?? defaultSurveyGovernance.review_roles,
    approval_roles: governance?.approval_roles ?? defaultSurveyGovernance.approval_roles,
    edit_roles: governance?.edit_roles ?? defaultSurveyGovernance.edit_roles,
    correction_roles: governance?.correction_roles ?? defaultSurveyGovernance.correction_roles,
    upload_roles: governance?.upload_roles ?? defaultSurveyGovernance.upload_roles,
    export_roles: governance?.export_roles ?? defaultSurveyGovernance.export_roles,
  };
}

function slugForDownload(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "survey-form";
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function downloadBlob(content: string, fileName: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function collectUploadColumns(workbook?: XlsFormWorkbook | null): {
  name: string;
  label: string;
  type: string;
  required: string;
  hint: string;
}[] {
  const blockedPrefixes = ["begin_", "end_"];
  const ignoredTypes = new Set(["calculate", "hidden", "note"]);
  const rows = (workbook?.survey ?? [])
    .filter((row) => !blockedPrefixes.some((prefix) => row.type.startsWith(prefix)))
    .filter((row) => !ignoredTypes.has(row.type))
    .map((row) => ({
      name: row.name,
      label: row.label,
      type: row.type,
      required: row.required === "yes" ? "Yes" : "No",
      hint: row.hint ?? "",
    }));

  if (rows.length) return rows;

  return [
    { name: "respondent_id", label: "Respondent ID", type: "text", required: "Yes", hint: "Unique record ID" },
    { name: "respondent_name", label: "Respondent Name", type: "text", required: "Yes", hint: "Person, household, farm, or facility name" },
    { name: "enumerator_email", label: "Enumerator Email", type: "text", required: "No", hint: "Collector responsible for the row" },
    { name: "latitude", label: "Latitude", type: "decimal", required: "No", hint: "Decimal GPS latitude" },
    { name: "longitude", label: "Longitude", type: "decimal", required: "No", hint: "Decimal GPS longitude" },
  ];
}

function buildExcelTemplateHtml(params: {
  projectName: string;
  survey: SurveyRead;
  form: DataFormRead;
  workbook?: XlsFormWorkbook | null;
}): string {
  const dataColumns = collectUploadColumns(params.workbook);
  const systemColumns = [
    { name: "client_submission_id", label: "Client Submission ID", type: "text", required: "Yes", hint: "Unique ID for this imported row" },
    { name: "captured_at", label: "Captured At", type: "datetime", required: "No", hint: "YYYY-MM-DD HH:MM" },
    { name: "submitted_at", label: "Submitted At", type: "datetime", required: "No", hint: "YYYY-MM-DD HH:MM" },
    { name: "latitude", label: "Latitude", type: "decimal", required: "No", hint: "Decimal GPS latitude" },
    { name: "longitude", label: "Longitude", type: "decimal", required: "No", hint: "Decimal GPS longitude" },
    { name: "accuracy", label: "Accuracy", type: "number", required: "No", hint: "GPS accuracy in meters" },
  ];
  const mergedColumns = [
    ...systemColumns,
    ...dataColumns.filter((column) => !systemColumns.some((systemColumn) => systemColumn.name === column.name)),
  ];
  const exampleRow = mergedColumns.map((column) => {
    if (column.name === "client_submission_id") return "IMPORT-001";
    if (column.name === "captured_at" || column.name === "submitted_at") return "2026-06-05 09:00";
    if (column.name === "latitude") return "5.9631";
    if (column.name === "longitude") return "10.1591";
    if (column.name === "accuracy") return "8";
    if (column.type.includes("integer") || column.type.includes("decimal")) return "0";
    return "Replace with your data";
  });

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Arial, sans-serif; }
    table { border-collapse: collapse; margin-bottom: 24px; }
    th, td { border: 1px solid #b7c7bd; padding: 8px; vertical-align: top; }
    th { background: #e6f3ec; font-weight: 700; }
    .meta th { background: #d9eee4; }
  </style>
</head>
<body>
  <table class="meta">
    <tr><th>Project</th><td>${escapeHtml(params.projectName)}</td></tr>
    <tr><th>Survey</th><td>${escapeHtml(params.survey.title)}</td></tr>
    <tr><th>Survey code</th><td>${escapeHtml(params.survey.code)}</td></tr>
    <tr><th>Form</th><td>${escapeHtml(params.form.name)}</td></tr>
    <tr><th>Instruction</th><td>Fill one record per row. Keep column names unchanged before upload.</td></tr>
  </table>
  <table>
    <caption>Survey Data Upload</caption>
    <tr>${mergedColumns.map((column) => `<th>${escapeHtml(column.name)}</th>`).join("")}</tr>
    <tr>${exampleRow.map((value) => `<td>${escapeHtml(value)}</td>`).join("")}</tr>
  </table>
  <table>
    <caption>Data Dictionary</caption>
    <tr><th>Column</th><th>Question label</th><th>Type</th><th>Required</th><th>Help text</th></tr>
    ${mergedColumns
      .map(
        (column) =>
          `<tr><td>${escapeHtml(column.name)}</td><td>${escapeHtml(column.label)}</td><td>${escapeHtml(column.type)}</td><td>${escapeHtml(column.required)}</td><td>${escapeHtml(column.hint)}</td></tr>`,
      )
      .join("")}
  </table>
</body>
</html>`;
}

export function SurveyManagement({ token }: SurveyManagementProps) {
  const isPreview = !token || token === "preview-token";
  const setActiveView = useWorkspaceStore((state) => state.setActiveView);
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const [selectedProjectId, setSelectedProjectId] = useState(previewProjects[0]?.id ?? "");
  const [selectedSurveyId, setSelectedSurveyId] = useState(previewSurveys[0]?.id ?? "");
  const [creatingSurvey, setCreatingSurvey] = useState(false);
  const [activeTab, setActiveTab] = useState<SurveyTab>("overview");
  const [createResult, setCreateResult] = useState("");
  const [governanceResult, setGovernanceResult] = useState("");
  const [importResult, setImportResult] = useState("");
  const [selectedImportFormId, setSelectedImportFormId] = useState("");
  const [lastUpload, setLastUpload] = useState<ImportUploadResponse | null>(null);
  const [governanceDraft, setGovernanceDraft] = useState<SurveyGovernanceSettings>(defaultSurveyGovernance);
  const [draft, setDraft] = useState({
    title: "",
    code: "",
    description: "",
    survey_type: "baseline",
    status: "draft" as SurveyStatus,
    start_date: "",
    end_date: "",
    geographic_scope: "",
    target_population: "",
  });

  const projectsQuery = useQuery({
    queryKey: ["programs", token],
    queryFn: () => listPrograms(token ?? ""),
    enabled: Boolean(token && !isPreview),
  });
  const surveysQuery = useQuery({
    queryKey: ["surveys", token],
    queryFn: () => listSurveys(token ?? ""),
    enabled: Boolean(token && !isPreview),
  });
  const formsQuery = useQuery({
    queryKey: ["forms", token],
    queryFn: () => listForms(token ?? ""),
    enabled: Boolean(token && !isPreview),
  });

  const projects = useMemo(
    () => (isPreview ? previewProjects : projectsQuery.data ?? []),
    [isPreview, projectsQuery.data],
  );
  const surveys = useMemo(
    () => (isPreview ? previewSurveys : surveysQuery.data ?? []),
    [isPreview, surveysQuery.data],
  );
  const forms = useMemo(
    () => (isPreview ? previewForms : formsQuery.data ?? []),
    [formsQuery.data, isPreview],
  );

  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? projects[0];
  const projectSurveys = surveys.filter((survey) => survey.project_id === selectedProject?.id);
  const selectedSurvey = projectSurveys.find((survey) => survey.id === selectedSurveyId) ?? projectSurveys[0] ?? surveys[0];
  const selectedSurveyForms = forms.filter((form) => form.survey_id === selectedSurvey?.id);
  const selectedImportForm =
    selectedSurveyForms.find((form) => form.id === selectedImportFormId) ??
    selectedSurveyForms[0];
  const activeSurveyCount = projectSurveys.filter((survey) => survey.status === "active").length;
  const completedSurveyCount = projectSurveys.filter((survey) => survey.status === "completed").length;
  const totalSurveyForms = forms.filter((form) => form.project_id === selectedProject?.id).length;
  const selectedProgress = selectedSurvey ? surveyProgress(selectedSurvey.status, selectedSurveyForms.length) : 0;
  const surveyTabs: { id: SurveyTab; label: string; value: string }[] = [
    { id: "overview", label: "Overview", value: selectedSurvey ? `${selectedProgress}%` : "Start" },
    { id: "forms", label: "Forms", value: String(selectedSurveyForms.length) },
    { id: "governance", label: "Governance", value: governanceDraft.review_required ? "Review" : "Open" },
    { id: "uploads", label: "Data upload", value: selectedSurveyForms.length ? "Excel" : "Need form" },
    { id: "team", label: "Team", value: selectedSurvey ? "Roles" : "None" },
    { id: "quality", label: "Data Quality", value: selectedSurvey?.status === "active" ? "Live" : "Setup" },
    { id: "coverage", label: "Coverage", value: selectedSurvey?.geographic_scope ? "Set" : "Missing" },
    { id: "reports", label: "Reports", value: selectedSurvey?.status === "completed" ? "Ready" : "Draft" },
  ];

  const projectOptions = useMemo(
    () => projects.map((project) => ({ id: project.id, label: project.name })),
    [projects],
  );
  const selectedSurveyFormsKey = selectedSurveyForms.map((form) => form.id).join("|");
  const firstSelectedSurveyFormId = selectedSurveyForms[0]?.id ?? "";

  useEffect(() => {
    const selectedSurveyFormIds = selectedSurveyFormsKey
      ? selectedSurveyFormsKey.split("|")
      : [];
    setGovernanceDraft(normalizeGovernance(selectedSurvey?.governance_json));
    setSelectedImportFormId((current) =>
      selectedSurveyFormIds.includes(current)
        ? current
        : firstSelectedSurveyFormId,
    );
    setLastUpload(null);
    setImportResult("");
  }, [firstSelectedSurveyFormId, selectedSurvey?.governance_json, selectedSurvey?.id, selectedSurveyFormsKey]);

  const createMutation = useMutation({
    mutationFn: () =>
      createSurvey(token ?? "", {
        project_id: selectedProject?.id ?? "",
        title: draft.title.trim(),
        code: draft.code.trim(),
        description: draft.description.trim() || null,
        survey_type: draft.survey_type,
        status: draft.status,
        start_date: draft.start_date || null,
        end_date: draft.end_date || null,
        geographic_scope: draft.geographic_scope.trim() || null,
        target_population: draft.target_population.trim() || null,
        indicator_ids: [],
      }),
    onSuccess: async (survey) => {
      setCreateResult(`${survey.title} was created under ${selectedProject?.name ?? "the selected project"}. You can now create forms, assign enumerators, and link indicators inside this survey.`);
      setSelectedSurveyId(survey.id);
      setDraft({
        title: "",
        code: "",
        description: "",
        survey_type: "baseline",
        status: "draft",
        start_date: "",
        end_date: "",
        geographic_scope: "",
        target_population: "",
      });
      pushToast({ title: "Survey created", description: `${survey.title} is ready for setup.`, tone: "success" });
      setCreatingSurvey(false);
      await surveysQuery.refetch();
    },
    onError: () => {
      setCreateResult("Survey was not created. Confirm the project exists, the code is unique, and your role can create surveys.");
      pushToast({ title: "Survey not created", description: "Check the selected project, survey code, and permissions.", tone: "danger" });
    },
  });

  const governanceMutation = useMutation({
    mutationFn: () =>
      updateSurveyGovernance(token ?? "", selectedSurvey?.id ?? "", governanceDraft),
    onSuccess: async (survey) => {
      setGovernanceResult(`${survey.title} governance was saved. Synced and uploaded records will now follow the survey-level visibility and review policy.`);
      pushToast({
        title: "Survey governance saved",
        description: "Visibility, review, approval, edit, correction, upload, and export roles were updated.",
        tone: "success",
      });
      await surveysQuery.refetch();
    },
    onError: () => {
      setGovernanceResult("Survey governance was not saved. Confirm your role can manage surveys and try again.");
      pushToast({
        title: "Governance not saved",
        description: "Only users with survey management permission can change this policy.",
        tone: "danger",
      });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadImportFile(token ?? "", "submissions", file),
    onSuccess: (response) => {
      setLastUpload(response);
      setImportResult(`${response.job.source_name} was uploaded for ${selectedSurvey?.title ?? "this survey"} / ${selectedImportForm?.name ?? "selected form"}. ${response.job.valid_rows} rows are valid, ${response.job.error_rows} need correction, and ${response.job.duplicate_rows} possible duplicates were found.`);
      pushToast({
        title: "Survey form data uploaded",
        description: "Atlas created an editable import job. Review issues before applying or reporting.",
        tone: response.job.error_rows ? "warning" : "success",
      });
    },
    onError: () => {
      setImportResult("Upload failed. Use the downloaded template, keep the header row unchanged, and upload CSV, XLS, or XLSX.");
      pushToast({
        title: "Upload failed",
        description: "Check the file format, required columns, and your data import permission.",
        tone: "danger",
      });
    },
  });

  function updateGovernanceRoles(key: GovernanceRoleKey, role: string): void {
    setGovernanceDraft((current) => {
      const existing = new Set(current[key]);
      if (existing.has(role)) {
        existing.delete(role);
      } else {
        existing.add(role);
      }
      return { ...current, [key]: Array.from(existing) };
    });
  }

  function saveGovernance(): void {
    if (!selectedSurvey) {
      setGovernanceResult("Select a survey before saving governance rules.");
      return;
    }
    if (isPreview) {
      setGovernanceResult(`${selectedSurvey.title} governance is updated in preview. In production, these rules save to the survey and control visibility, review, approval, edit, correction, upload, and export access.`);
      pushToast({
        title: "Preview governance updated",
        description: "Production saves this policy to the selected survey.",
        tone: "success",
      });
      return;
    }
    governanceMutation.mutate();
  }

  async function downloadSurveyTemplate(): Promise<void> {
    if (!selectedProject || !selectedSurvey || !selectedImportForm) {
      setImportResult("Select a project, survey, and form before downloading the Excel template.");
      pushToast({
        title: "Template context required",
        description: "Choose the survey form that will receive the uploaded data.",
        tone: "warning",
      });
      return;
    }

    let workbook: XlsFormWorkbook | null = null;
    if (!isPreview && token) {
      try {
        workbook = await exportFormXlsForm(token, selectedImportForm.id);
      } catch {
        workbook = null;
      }
    }

    const content = buildExcelTemplateHtml({
      projectName: selectedProject.name,
      survey: selectedSurvey,
      form: selectedImportForm,
      workbook,
    });
    const fileName = `${slugForDownload(selectedSurvey.code)}-${slugForDownload(selectedImportForm.slug)}-upload-template.xls`;
    downloadBlob(content, fileName, "application/vnd.ms-excel;charset=utf-8");
    setImportResult(`${fileName} was downloaded. Fill one record per row, keep column names unchanged, then upload it back to this same survey form.`);
    pushToast({
      title: "Excel template downloaded",
      description: "Use this file to align existing data with the selected survey form.",
      tone: "success",
    });
  }

  function handleSurveyUpload(file: File | undefined): void {
    if (!file) return;
    if (!selectedSurvey || !selectedImportForm) {
      setImportResult("Select the survey form that should receive this uploaded file.");
      return;
    }
    if (isPreview) {
      setLastUpload(null);
      setImportResult(`${file.name} is ready for preview upload. In production, Atlas parses the file, creates an import job, validates rows against the survey form, and sends uploaded records through review.`);
      pushToast({
        title: "Preview upload prepared",
        description: "Production upload validates the file before records enter the review queue.",
        tone: "success",
      });
      return;
    }
    uploadMutation.mutate(file);
  }

  function createPreviewSurvey(): void {
    const title = draft.title.trim() || "New Monitoring Survey";
    setCreateResult(`${title} is planned under ${selectedProject?.name ?? "the selected project"} in preview. In production, Atlas will save it as a first-class survey before forms can be created.`);
    setCreatingSurvey(false);
    pushToast({ title: "Preview survey planned", description: "The real backend will require this project and survey before form publishing.", tone: "success" });
  }

  function submitSurvey(): void {
    if (!selectedProject) {
      setCreateResult("Create or select a project before adding a survey. Surveys must belong to projects.");
      pushToast({ title: "Project required", description: "Every survey must be created inside a project.", tone: "warning" });
      return;
    }
    if (!draft.title.trim() || !draft.code.trim()) {
      setCreateResult("Survey title and survey code are required so managers, enumerators, forms, submissions, and reports can reference the same activity.");
      pushToast({ title: "Survey details required", description: "Add a title and code before creating the survey.", tone: "warning" });
      return;
    }
    if (isPreview) {
      createPreviewSurvey();
      return;
    }
    createMutation.mutate();
  }

  return (
    <section aria-labelledby="surveys-title" className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Survey management</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 id="surveys-title" className="text-2xl font-semibold tracking-tight">Survey-centered M&E workspace</h1>
            <HelpHint label="About survey-centered workspace" title="Survey-centered M&E workspace">
              Organize monitoring and evaluation work as Project, Survey, Form, Submission, Indicators, and Reports. Forms are collection tools inside surveys.
            </HelpHint>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setCreatingSurvey((current) => !current)} type="button">
            <Plus aria-hidden="true" />
            {creatingSurvey ? "Close setup" : "New survey"}
          </Button>
          <Button onClick={() => setActiveView("forms")} type="button" variant="primary">
            <ClipboardList aria-hidden="true" />
            Open form builder
          </Button>
        </div>
      </div>

      <section className="surface-premium rounded-2xl p-4">
        <div className="grid gap-3 text-sm md:grid-cols-6">
          {["Organization", "Project", "Survey", "Form", "Submission", "Reports"].map((step, index) => (
            <div key={step} className="rounded-lg border bg-panel p-3 shadow-line">
              <span className="text-xs font-medium text-muted-foreground">Step {index + 1}</span>
              <p className="mt-1 font-semibold">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <div className={creatingSurvey ? "grid gap-4 lg:grid-cols-[1.15fr_0.85fr]" : "grid gap-4"}>
        <section className="rounded-2xl border bg-panel p-4 shadow-line">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">Project survey dashboard</h2>
                <HelpHint label="About project survey dashboard" title="Project survey dashboard">
                  Select a project to see its surveys, forms, progress, and reporting readiness.
                </HelpHint>
              </div>
            </div>
            <label className="min-w-[260px] text-sm">
              <span className="mb-1 block font-medium">Project</span>
              <Select
                value={selectedProject?.id ?? ""}
                onChange={(event) => {
                  setSelectedProjectId(event.target.value);
                  const firstSurvey = surveys.find((survey) => survey.project_id === event.target.value);
                  setSelectedSurveyId(firstSurvey?.id ?? "");
                }}
              >
                {projectOptions.map((project) => (
                  <option key={project.id} value={project.id}>{project.label}</option>
                ))}
              </Select>
            </label>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            {[
              { label: "Total surveys", value: projectSurveys.length, icon: Flag },
              { label: "Active surveys", value: activeSurveyCount, icon: CalendarDays },
              { label: "Completed surveys", value: completedSurveyCount, icon: FileCheck2 },
              { label: "Survey forms", value: totalSurveyForms, icon: ClipboardList },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border bg-background p-3">
                <item.icon aria-hidden="true" className="text-primary" size={18} />
                <p className="mt-3 text-2xl font-semibold">{item.value}</p>
                <p className="text-sm text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-3">
            {projectSurveys.length ? projectSurveys.map((survey) => {
              const formCount = forms.filter((form) => form.survey_id === survey.id).length;
              const progress = surveyProgress(survey.status, formCount);
              return (
                <button
                  className="rounded-lg border bg-background p-4 text-left transition hover:border-primary/35 hover:bg-primary/5"
                  key={survey.id}
                  onClick={() => setSelectedSurveyId(survey.id)}
                  type="button"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{survey.title}</h3>
                        <Badge tone={statusTone(survey.status)}>{titleCase(survey.status)}</Badge>
                        <Badge tone="neutral">{titleCase(survey.survey_type)}</Badge>
                      </div>
                      <div className="mt-1">
                        <HelpHint label={`About ${survey.title}`} title={survey.title}>
                          {survey.description || "No description yet."}
                        </HelpHint>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {survey.code} | {survey.geographic_scope || "Geography not set"} | {survey.target_population || "Target population not set"}
                      </p>
                    </div>
                    <div className="min-w-[180px]">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Progress</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">{formCount} form{formCount === 1 ? "" : "s"} linked</p>
                    </div>
                  </div>
                </button>
              );
            }) : (
              <div className="rounded-lg border border-dashed bg-background p-6 text-center">
                <FolderKanban aria-hidden="true" className="mx-auto text-muted-foreground" size={24} />
                <h3 className="mt-3 font-semibold">No surveys in this project yet</h3>
                <div className="mt-2">
                  <HelpHint label="About creating the first survey" title="No surveys yet">
                    Create the first baseline, registration, monitoring, or evaluation survey before building forms.
                  </HelpHint>
                </div>
              </div>
            )}
          </div>
        </section>

        {creatingSurvey ? <section className="rounded-2xl border bg-panel p-4 shadow-line">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">Create survey</h2>
            <HelpHint label="About creating surveys" title="Create survey">
              A survey is the managed M&E activity. Every form, submission, indicator, and report should flow through it.
            </HelpHint>
          </div>
          <div className="mt-4 grid gap-3">
            <label className="text-sm">
              <span className="mb-1 block font-medium">Survey title</span>
              <Input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Baseline Survey" />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Survey code</span>
              <Input value={draft.code} onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value.toUpperCase().replace(/\s+/g, "-") }))} placeholder="AGR-BASE-2026" />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block font-medium">Survey type</span>
                <Select value={draft.survey_type} onChange={(event) => setDraft((current) => ({ ...current, survey_type: event.target.value }))}>
                  {surveyTypes.map((type) => <option key={type} value={type}>{titleCase(type)}</option>)}
                </Select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium">Status</span>
                <Select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as SurveyStatus }))}>
                  {["draft", "active", "paused", "completed", "archived"].map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}
                </Select>
              </label>
            </div>
            <Textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Explain what this survey measures, who will collect it, and how results will be used." />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input type="date" value={draft.start_date} onChange={(event) => setDraft((current) => ({ ...current, start_date: event.target.value }))} />
              <Input type="date" value={draft.end_date} onChange={(event) => setDraft((current) => ({ ...current, end_date: event.target.value }))} />
            </div>
            <Input value={draft.geographic_scope} onChange={(event) => setDraft((current) => ({ ...current, geographic_scope: event.target.value }))} placeholder="Geographic scope" />
            <Input value={draft.target_population} onChange={(event) => setDraft((current) => ({ ...current, target_population: event.target.value }))} placeholder="Target population" />
            <Button disabled={createMutation.isPending} onClick={submitSurvey} type="button" variant="primary">
              <Plus aria-hidden="true" />
              Create survey
            </Button>
          </div>
        </section> : null}
      </div>

      {createResult ? (
        <section className="rounded-2xl border border-success/30 bg-success/10 p-4" aria-live="polite">
          <div className="flex items-start gap-3">
            <ShieldCheck aria-hidden="true" className="mt-0.5 text-success" size={18} />
            <p className="text-sm leading-6 text-muted-foreground">{createResult}</p>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border bg-panel p-4 shadow-line">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Survey workspace</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{selectedSurvey ? `${selectedSurvey.title} contains its own forms, enumerators, data quality checks, coverage, analytics, and reports.` : "Select a survey to open its operational workspace."}</p>
          </div>
          {selectedSurvey ? <Badge tone={statusTone(selectedSurvey.status)}>{titleCase(selectedSurvey.status)}</Badge> : null}
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {surveyTabs.map((tab) => (
            <button
              className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition ${
                activeTab === tab.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "bg-background text-muted-foreground hover:text-foreground"
              }`}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.label}
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">{tab.value}</span>
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-xl border bg-background p-4">
          {activeTab === "overview" ? (
            <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
              <div>
                <h3 className="font-semibold">Current focus</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {selectedSurvey
                    ? `${selectedSurvey.title} is the active survey workspace. Use the tabs above to move between forms, team setup, quality, coverage, and reporting without leaving the survey context.`
                    : "Select or create a survey before adding forms, teams, data quality checks, coverage, or reports."}
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {[
                    { label: "Progress", value: `${selectedProgress}%`, icon: Target },
                    { label: "Forms", value: selectedSurveyForms.length, icon: ClipboardList },
                    { label: "Coverage", value: selectedSurvey?.geographic_scope ? "Defined" : "Missing", icon: MapPinned },
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg border bg-panel p-3">
                      <item.icon aria-hidden="true" className="text-primary" size={18} />
                      <p className="mt-3 text-lg font-semibold">{item.value}</p>
                      <p className="text-sm text-muted-foreground">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border bg-panel p-4">
                <h4 className="font-semibold">Next best action</h4>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {selectedSurveyForms.length ? "Review data quality before reporting." : "Create the first survey form before assigning enumerators."}
                </p>
                <Button
                  className="mt-4 w-full"
                  onClick={() => setActiveView(selectedSurveyForms.length ? "submissions" : "forms")}
                  type="button"
                  variant="primary"
                >
                  {selectedSurveyForms.length ? <FileCheck2 aria-hidden="true" /> : <ClipboardList aria-hidden="true" />}
                  {selectedSurveyForms.length ? "Review data" : "Create form"}
                </Button>
              </div>
            </div>
          ) : null}

          {activeTab === "forms" ? (
            <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
              <div>
                <h3 className="font-semibold">Survey forms</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Only forms attached to this survey appear here. This prevents collection tools from floating outside project and survey context.</p>
                <div className="mt-4 grid gap-2">
                  {selectedSurveyForms.length ? selectedSurveyForms.map((form) => (
                    <div className="flex items-center justify-between gap-3 rounded-lg border bg-panel px-3 py-2" key={form.id}>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{form.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{form.status} | version {form.current_version}</p>
                      </div>
                      <Badge tone={form.status === "published" ? "success" : "neutral"}>{form.status}</Badge>
                    </div>
                  )) : (
                    <p className="rounded-lg border border-dashed bg-panel p-4 text-sm text-muted-foreground">No forms yet. Create a form when the survey structure is agreed.</p>
                  )}
                </div>
              </div>
              <Button onClick={() => setActiveView("forms")} type="button" variant="primary">
                <ClipboardList aria-hidden="true" />
                Open form builder
              </Button>
            </div>
          ) : null}

          {activeTab === "governance" ? (
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div>
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-primary/10 text-primary">
                      <LockKeyhole aria-hidden="true" size={18} />
                    </span>
                    <div>
                      <h3 className="font-semibold">Survey-level data governance</h3>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                        These rules belong to the selected survey. They define who can see synchronized form data, who can review, who can approve, who can edit, who can request correction, who can upload Excel data, and who can export data for analysis.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {governanceRoleGroups.map((group) => {
                      const Icon = group.icon;
                      return (
                        <section className="rounded-xl border bg-panel p-3" key={group.key}>
                          <div className="flex items-start gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-background text-primary">
                              <Icon aria-hidden="true" size={15} />
                            </span>
                            <div>
                              <h4 className="text-sm font-semibold">{group.title}</h4>
                              <p className="mt-1 text-xs leading-5 text-muted-foreground">{group.description}</p>
                            </div>
                          </div>
                          <div className="mt-3 grid gap-2">
                            {surveyRoleOptions.map((role) => {
                              const checked = governanceDraft[group.key].includes(role.role);
                              return (
                                <label
                                  className="flex cursor-pointer items-start gap-2 rounded-lg border bg-background/70 p-2 text-xs transition hover:border-primary/30 hover:bg-primary/5"
                                  key={role.role}
                                >
                                  <input
                                    checked={checked}
                                    className="mt-0.5 h-4 w-4 accent-primary"
                                    onChange={() => updateGovernanceRoles(group.key, role.role)}
                                    type="checkbox"
                                  />
                                  <span>
                                    <span className="block font-semibold">{role.label}</span>
                                    <span className="mt-0.5 block leading-4 text-muted-foreground">{role.description}</span>
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </section>
                      );
                    })}
                  </div>
                </div>

                <aside className="rounded-xl border bg-panel p-4">
                  <h4 className="font-semibold">Review behavior</h4>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Choose how synced mobile records and uploaded Excel rows enter the workflow.
                  </p>
                  <div className="mt-4 grid gap-3">
                    <label className="text-sm">
                      <span className="mb-1 block font-medium">Mobile sync default status</span>
                      <Select
                        value={governanceDraft.synced_submission_default_status}
                        onChange={(event) =>
                          setGovernanceDraft((current) => ({
                            ...current,
                            synced_submission_default_status: event.target.value as SurveyGovernanceSettings["synced_submission_default_status"],
                          }))
                        }
                      >
                        <option value="submitted">Submitted</option>
                        <option value="under_review">Under review</option>
                      </Select>
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block font-medium">Excel upload default status</span>
                      <Select
                        value={governanceDraft.uploaded_submission_default_status}
                        onChange={(event) =>
                          setGovernanceDraft((current) => ({
                            ...current,
                            uploaded_submission_default_status: event.target.value as SurveyGovernanceSettings["uploaded_submission_default_status"],
                          }))
                        }
                      >
                        <option value="submitted">Submitted</option>
                        <option value="under_review">Under review</option>
                      </Select>
                    </label>
                    {[
                      ["review_required", "Require review before reporting"],
                      ["allow_reviewer_edit", "Allow reviewers to edit records"],
                      ["require_correction_note", "Require note when sending back"],
                      ["lock_after_approval", "Lock records after approval"],
                    ].map(([key, label]) => (
                      <label className="flex items-start gap-2 rounded-lg border bg-background p-3 text-sm" key={key}>
                        <input
                          checked={Boolean(governanceDraft[key as keyof SurveyGovernanceSettings])}
                          className="mt-1 h-4 w-4 accent-primary"
                          onChange={(event) =>
                            setGovernanceDraft((current) => ({
                              ...current,
                              [key]: event.target.checked,
                            }))
                          }
                          type="checkbox"
                        />
                        <span>
                          <span className="block font-medium">{label}</span>
                          <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                            Applies to records under {selectedSurvey?.title ?? "this survey"}.
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      disabled={governanceMutation.isPending}
                      onClick={saveGovernance}
                      type="button"
                      variant="primary"
                    >
                      <Save aria-hidden="true" />
                      Save governance
                    </Button>
                    <Button
                      onClick={() => setGovernanceDraft(defaultSurveyGovernance)}
                      type="button"
                      variant="secondary"
                    >
                      Reset defaults
                    </Button>
                  </div>
                </aside>
              </div>

              {governanceResult ? (
                <div className="rounded-xl border border-success/30 bg-success/10 p-3 text-sm leading-6 text-muted-foreground" aria-live="polite">
                  {governanceResult}
                </div>
              ) : null}
            </div>
          ) : null}

          {activeTab === "uploads" ? (
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div>
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-primary/10 text-primary">
                      <UploadCloud aria-hidden="true" size={18} />
                    </span>
                    <div>
                      <h3 className="font-semibold">Upload data into a survey form</h3>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                        Use this when an organization already has data in Excel. Download the template for the selected form, fill one record per row, upload the file, then review validation issues before the data is approved for analysis.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    {[
                      ["1", "Choose form", selectedImportForm?.name ?? "No form yet"],
                      ["2", "Download template", "Excel-compatible .xls"],
                      ["3", "Upload data", "CSV, XLS, or XLSX"],
                      ["4", "Review and approve", governanceDraft.uploaded_submission_default_status],
                    ].map(([step, title, value]) => (
                      <div className="rounded-xl border bg-panel p-3" key={step}>
                        <Badge tone="accent">Step {step}</Badge>
                        <p className="mt-3 text-sm font-semibold">{title}</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">{value}</p>
                      </div>
                    ))}
                  </div>

                  {lastUpload ? (
                    <div className="mt-4 rounded-xl border bg-panel p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <h4 className="font-semibold">Latest upload preview</h4>
                          <p className="mt-1 text-sm text-muted-foreground">{lastUpload.job.source_name}</p>
                        </div>
                        <Badge tone={lastUpload.job.error_rows ? "warning" : "success"}>
                          {lastUpload.job.error_rows ? "Needs cleanup" : "Ready for review"}
                        </Badge>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-4">
                        {[
                          ["Rows", lastUpload.job.total_rows],
                          ["Valid", lastUpload.job.valid_rows],
                          ["Errors", lastUpload.job.error_rows],
                          ["Duplicates", lastUpload.job.duplicate_rows],
                        ].map(([label, value]) => (
                          <div className="rounded-lg border bg-background p-3" key={label}>
                            <p className="text-xs text-muted-foreground">{label}</p>
                            <p className="mt-1 text-lg font-semibold">{value}</p>
                          </div>
                        ))}
                      </div>
                      {lastUpload.issues.length ? (
                        <div className="mt-4 rounded-lg border border-warning/30 bg-warning/10 p-3">
                          <p className="text-sm font-semibold">First issues to fix</p>
                          <ul className="mt-2 space-y-1 text-xs leading-5 text-muted-foreground">
                            {lastUpload.issues.slice(0, 4).map((issue) => (
                              <li key={`${issue.row_number}-${issue.field_name}-${issue.message}`}>
                                Row {issue.row_number}: {issue.message}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <aside className="rounded-xl border bg-panel p-4">
                  <h4 className="font-semibold">Import setup</h4>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    The template and upload are tied to this survey and form context.
                  </p>
                  <div className="mt-4 grid gap-3">
                    <label className="text-sm">
                      <span className="mb-1 block font-medium">Survey form</span>
                      <Select
                        disabled={!selectedSurveyForms.length}
                        value={selectedImportForm?.id ?? ""}
                        onChange={(event) => setSelectedImportFormId(event.target.value)}
                      >
                        {selectedSurveyForms.length ? (
                          selectedSurveyForms.map((form) => (
                            <option key={form.id} value={form.id}>{form.name}</option>
                          ))
                        ) : (
                          <option value="">No forms in this survey</option>
                        )}
                      </Select>
                    </label>
                    <Button
                      disabled={!selectedImportForm}
                      onClick={() => void downloadSurveyTemplate()}
                      type="button"
                      variant="secondary"
                    >
                      <Download aria-hidden="true" />
                      Download Excel template
                    </Button>
                    <label className="block rounded-xl border border-dashed bg-background p-4 text-sm">
                      <span className="block font-semibold">Upload completed file</span>
                      <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                        Accepted: CSV, XLS, XLSX. Uploaded rows enter the survey review workflow.
                      </span>
                      <Input
                        accept=".csv,.xls,.xlsx"
                        className="mt-3"
                        disabled={!selectedImportForm || uploadMutation.isPending}
                        onChange={(event) => {
                          handleSurveyUpload(event.target.files?.[0]);
                          event.target.value = "";
                        }}
                        type="file"
                      />
                    </label>
                    <Button
                      onClick={() => setActiveView("submissions")}
                      type="button"
                      variant="primary"
                    >
                      <FileCheck2 aria-hidden="true" />
                      Open review queue
                    </Button>
                  </div>
                </aside>
              </div>

              {importResult ? (
                <div className="rounded-xl border border-success/30 bg-success/10 p-3 text-sm leading-6 text-muted-foreground" aria-live="polite">
                  {importResult}
                </div>
              ) : null}
            </div>
          ) : null}

          {activeTab === "team" ? (
            <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
              <div>
                <h3 className="font-semibold">Survey team roles</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Assign only the people needed for this survey: owner, manager, supervisor, data quality officer, enumerator, and analyst.</p>
              </div>
              <Button onClick={() => setActiveView("officers")} type="button">
                <UsersRound aria-hidden="true" />
                Manage team
              </Button>
            </div>
          ) : null}

          {activeTab === "quality" ? (
            <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
              <div>
                <h3 className="font-semibold">Data quality path</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Review GPS, duplicates, missing required fields, media evidence, and correction requests before survey results enter analytics.</p>
              </div>
              <Button onClick={() => setActiveView("submissions")} type="button">
                <FileCheck2 aria-hidden="true" />
                Review data
              </Button>
            </div>
          ) : null}

          {activeTab === "coverage" ? (
            <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
              <div>
                <h3 className="font-semibold">Coverage</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{selectedSurvey?.geographic_scope || "Set geographic scope before field rollout so maps and coverage reports stay meaningful."}</p>
              </div>
              <Button onClick={() => setActiveView("map")} type="button">
                <MapPinned aria-hidden="true" />
                Open map
              </Button>
            </div>
          ) : null}

          {activeTab === "reports" ? (
            <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
              <div>
                <h3 className="font-semibold">Survey reports</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Prepare baseline, midline, endline, trend, comparison, and project impact reports only after survey data passes review.</p>
              </div>
              <Button onClick={() => setActiveView("analytics")} type="button">
                <BarChart3 aria-hidden="true" />
                Open reports
              </Button>
            </div>
          ) : null}
        </div>
      </section>
    </section>
  );
}
