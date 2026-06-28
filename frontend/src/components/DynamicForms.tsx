"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  Calendar,
  Camera,
  Check,
  ClipboardList,
  Command,
  Copy,
  Database,
  Eye,
  FileDown,
  FileText,
  FileUp,
  Fingerprint,
  GitBranch,
  Hash,
  History,
  Layers3,
  ListFilter,
  MonitorSmartphone,
  MousePointer2,
  Palette,
  PanelsTopLeft,
  Plus,
  Repeat2,
  RotateCcw,
  RotateCw,
  Search,
  Settings2,
  ShieldCheck,
  Sigma,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Star,
  Trash2,
  Type,
  UploadCloud,
  Users,
  Variable,
  Workflow,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChoiceOptionsEditor,
  cleanChoiceOptions,
  insertChoiceOptionDraft,
  normalizeChoiceDraftOptions,
  pasteChoiceOptionLines,
  removeChoiceOptionDraft,
} from "@/components/forms/ChoiceOptionsEditor";
import { CrossFieldRuleBuilder } from "@/components/forms/CrossFieldRuleBuilder";
import { FieldInputPreview } from "@/components/forms/FieldInputPreview";
import {
  createDefaultFormControls,
  normalizeFormControls,
  workflowPresets,
} from "@/components/forms/formControls";
import {
  fieldAppearanceWithMetadata,
  fieldAppearanceWithTag,
  fieldMetadataValue,
  hasFieldTag,
} from "@/components/forms/fieldMetadata";
import type {
  FormAssignmentPlan,
  FormImportRun,
  FormQualityFlag,
  FormReadinessState,
} from "@/components/forms/formBuilderTypes";
import {
  createPreviewImportRuns,
  createPreviewQualityFlags,
  createPreviewSubmissionRows,
  previewFormProjects,
  previewFormSurveys,
} from "@/components/forms/formPreviewData";
import { templateToForm } from "@/components/forms/formTemplates";
import { describeEntityCollectionWorkflow } from "@/components/forms/describeEntityCollectionWorkflow";
import { EvidenceSettingsPanel } from "@/components/forms/EvidenceSettingsPanel";
import { MobileSettingsPanel } from "@/components/forms/MobileSettingsPanel";
import { AppearanceSettingsPanel } from "@/components/forms/AppearanceSettingsPanel";
import { BeneficiarySettingsPanel } from "@/components/forms/BeneficiarySettingsPanel";
import { CommonSettingsPanel } from "@/components/forms/CommonSettingsPanel";
import { DataSettingsPanel } from "@/components/forms/DataSettingsPanel";
import { GovernanceSettingsPanel } from "@/components/forms/GovernanceSettingsPanel";
import { LogicSettingsPanel } from "@/components/forms/LogicSettingsPanel";
import { IndicatorSettingsPanel } from "@/components/forms/IndicatorSettingsPanel";
import { PrivacySettingsPanel } from "@/components/forms/PrivacySettingsPanel";
import { ReferenceSettingsPanel } from "@/components/forms/ReferenceSettingsPanel";
import { ResponseSettingsPanel } from "@/components/forms/ResponseSettingsPanel";
import { focusTabApplies, type FocusSettingsTab } from "@/components/forms/focusSettingsTabs";
import {
  defaultAssignmentPlan,
  defaultReadinessState,
  frequentFieldTypes,
} from "@/components/forms/formBuilderConstants";
import { persistedFormToLocal } from "@/components/forms/persistedFormToLocal";
import { inferQuestionSuggestions } from "@/components/forms/inferQuestionSuggestions";
import { getSectionTone } from "@/components/forms/sectionTone";
import {
  formatReviewStatus,
  getImportStatusTone,
  getQualitySeverityTone,
  getReviewStatusTone,
} from "@/components/forms/statusTone";
import { FieldPropertiesPanel, type RightPanelTab } from "@/components/forms/FieldPropertiesPanel";
import { FieldTranslationsEditor } from "@/components/forms/FieldTranslationsEditor";
import {
  quickFieldPresets,
  sectionTemplates,
  templateCategoryDescriptions,
  type FieldPreset,
  type QuestionSuggestion,
  type SectionTemplate,
} from "@/components/forms/formBuilderPresets";
import { FocusQuestionRow } from "@/components/forms/FocusQuestionRow";
import { fieldTypeIcons } from "@/components/forms/fieldTypeIcons";
import { RepeatChildrenEditor } from "@/components/forms/RepeatChildrenEditor";
import { ResponseTypeField } from "@/components/forms/ResponseTypeField";
import { SelectionConfigurator } from "@/components/forms/SelectionConfigurator";
import { SortableField } from "@/components/forms/SortableField";
import { SubformConfigurator } from "@/components/forms/SubformConfigurator";
import {
  labelPatchWithAutoVariable,
  normalizeVariableNameInput,
  variableNameFromQuestion,
} from "@/components/forms/variableNaming";
import { HelpHint } from "@/components/ui/help-hint";

// Re-exported so existing importers (and tests) that reference these from "@/components/DynamicForms"
// keep working after the editor and its helpers were extracted into their own module.
export {
  ChoiceOptionsEditor,
  cleanChoiceOptions,
  insertChoiceOptionDraft,
  normalizeChoiceDraftOptions,
  pasteChoiceOptionLines,
  removeChoiceOptionDraft,
};
// `typeChangePatchForField` moved to "@/lib/forms"; re-export keeps its public test import working.
export { typeChangePatchForField };
// Variable-naming helpers moved to "@/components/forms/variableNaming"; re-export keeps test imports working.
export { labelPatchWithAutoVariable, normalizeVariableNameInput };
import { Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  addPage,
  addField,
  addSection,
  buildFormReadinessChecklist,
  createDraftVersion,
  createField,
  createPage,
  createSection,
  defaultPages,
  deployFormToMobileApp,
  duplicatePage,
  duplicateField,
  duplicateSection,
  fieldCatalog,
  fieldTypeHelp,
  fieldCollectsAnswer,
  fieldSupportsEntityMapping,
  fieldSupportsEvidence,
  fieldSupportsIndicator,
  fieldSupportsSelection,
  fieldValidationCapabilities,
  getCollectionCompatibility,
  isFormReadyForPublish,
  moveFieldToPage,
  moveFieldToSection,
  normalizeForm,
  publishForm,
  removeField,
  reorderPages,
  reorderFields,
  reorderSections,
  toMobileSchema,
  toXlsFormWorkbook,
  typeChangePatchForField,
  updateField,
  type DynamicForm,
  type FieldType,
  type FormField,
  type FormSection,
  type LogicRule,
  type SelectionAutofill,
  type SelectionFilter,
  type MobileDeployment,
  type FormReadinessItem,
} from "@/lib/forms";
import {
  createForm,
  createPublicCollectionLink,
  exportFormXlsForm,
  FORM_TYPES,
  getFormCollectionCompatibility,
  listSubmissions,
  listFormDatasets,
  listForms,
  listMasterDataEntries,
  listPrograms,
  listSurveys,
  reviewSubmission,
  updateFormControls,
  uploadFormDataset,
  type DataFormRead,
  type FormDatasetSummary,
  type FormControlsSettings,
  type FormType,
  type FormWorkflowStage,
  type ProgramRead,
  type SubmissionRead,
  type SurveyRead,
} from "@/lib/api";
import {
  formTemplateCategories,
  formTemplates,
  type FormTemplateCard,
} from "@/lib/mockData";
import { cn, slugify } from "@/lib/utils";
import { useWorkspaceStore } from "@/stores/workspace";


type DynamicFormsProps = {
  compactBuilder?: boolean;
  contextProjectName?: string;
  initialDraft?: DynamicForm;
  onFormChange?: (form: DynamicForm) => void;
  token: string | null;
};

type PreviewMode =
  | "desktop"
  | "tablet"
  | "mobile"
  | "enumerator"
  | "respondent";
type LeftPanelTab = "structure" | "bank" | "templates" | "logic" | "variables";
type BuilderAssistantMode =
  | "question"
  | "section"
  | "preview"
  | "readiness"
  | "logic";
type BuilderFocusPanel = "build" | "structure" | "preview";
type DistributionChannel =
  | "survey_app"
  | "web_link"
  | "public_link"
  | "xlsform";
type FormControlsTab =
  | "overview"
  | "entity"
  | "reference"
  | "permissions"
  | "workflow"
  | "quality"
  | "governance"
  | "audit"
  | "versions";

type ReviewAction =
  | "approve"
  | "reject"
  | "request_correction"
  | "start_review";

const formControlsTabs = [
  ["overview", ShieldCheck, "Overview"],
  ["entity", Fingerprint, "Entity Controls"],
  ["reference", Database, "Reference Data"],
  ["permissions", ShieldCheck, "Permissions"],
  ["workflow", Workflow, "Workflow"],
  ["quality", Check, "Data Quality"],
  ["governance", Settings2, "Governance"],
  ["audit", History, "Audit Trail"],
  ["versions", GitBranch, "Versions"],
] satisfies [FormControlsTab, typeof Type, string][];



export function DynamicForms({
  compactBuilder = false,
  contextProjectName,
  initialDraft,
  onFormChange,
  token,
}: DynamicFormsProps) {
  const contextProjectId = contextProjectName
    ? `context-${slugify(contextProjectName)}`
    : "";
  const initialDraftIdRef = useRef(initialDraft?.id ?? "");
  const [forms, setForms] = useState<DynamicForm[]>(() =>
    initialDraft ? [initialDraft] : [],
  );
  const [selectedFormId, setSelectedFormId] = useState("");
  const [selectedFieldId, setSelectedFieldId] = useState("");
  const [builderMode, setBuilderMode] = useState<"builder" | "templates">(
    "builder",
  );
  const [previewMode, setPreviewMode] = useState<PreviewMode>("mobile");
  const [leftPanelTab, setLeftPanelTab] = useState<LeftPanelTab>("bank");
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>("field");
  const [builderFocusPanel, setBuilderFocusPanel] =
    useState<BuilderFocusPanel>("build");
  const [builderFocusMode, setBuilderFocusMode] = useState(true);
  const [collapsedLibraryGroups, setCollapsedLibraryGroups] = useState<
    Record<string, boolean>
  >({
    "Survey questions": true,
    Advanced: true,
    Media: true,
    Location: true,
  });
  const [libraryQuery, setLibraryQuery] = useState("");
  const [collapsedSectionIds, setCollapsedSectionIds] = useState<
    Record<string, boolean>
  >({});
  const [selectedPageId, setSelectedPageId] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [historyPast, setHistoryPast] = useState<DynamicForm[]>([]);
  const [historyFuture, setHistoryFuture] = useState<DynamicForm[]>([]);
  const [builderAssistantOpen, setBuilderAssistantOpen] = useState(false);
  const [builderActionDialogOpen, setBuilderActionDialogOpen] = useState(false);
  const [fieldSettingsDialogOpen, setFieldSettingsDialogOpen] = useState(false);
  const [mobileDeployDialogOpen, setMobileDeployDialogOpen] = useState(false);
  const [formControlsDialogOpen, setFormControlsDialogOpen] = useState(false);
  const [readinessDialogOpen, setReadinessDialogOpen] = useState(false);
  const [reviewWorkspaceDialogOpen, setReviewWorkspaceDialogOpen] =
    useState(false);
  const [assignmentWorkspaceDialogOpen, setAssignmentWorkspaceDialogOpen] =
    useState(false);
  const [importWorkspaceDialogOpen, setImportWorkspaceDialogOpen] =
    useState(false);
  const [qualityWorkspaceDialogOpen, setQualityWorkspaceDialogOpen] =
    useState(false);
  const [formControlsTab, setFormControlsTab] =
    useState<FormControlsTab>("overview");
  const [builderAssistantMode, setBuilderAssistantMode] =
    useState<BuilderAssistantMode>("question");
  const [smartFieldQuery, setSmartFieldQuery] = useState("");
  const [questionComposerText, setQuestionComposerText] = useState("");
  const [logicConditionFieldId, setLogicConditionFieldId] = useState("");
  const [logicConditionValue, setLogicConditionValue] = useState("");
  const [logicActionKind, setLogicActionKind] =
    useState<LogicRule["kind"]>("show");
  const [advancedLogicKind, setAdvancedLogicKind] =
    useState<LogicRule["kind"]>("validation");
  const [advancedLogicExpression, setAdvancedLogicExpression] = useState("");
  const [advancedLogicMessage, setAdvancedLogicMessage] = useState("");
  const [focusSettingsTab, setFocusSettingsTab] =
    useState<FocusSettingsTab>("common");
  const [newFormDialogOpen, setNewFormDialogOpen] = useState(false);
  const [newFormName, setNewFormName] = useState("New survey form");
  const [newFormDescription, setNewFormDescription] = useState("");
  const [newFormType, setNewFormType] = useState<FormType | "">("");
  const [newFormChannel, setNewFormChannel] =
    useState<DistributionChannel>("survey_app");
  const [newFormBlocks, setNewFormBlocks] = useState<string[]>([
    "respondent-details",
    "gps-evidence",
  ]);
  const [templateCategory, setTemplateCategory] = useState("Recommended");
  const [templateQuery, setTemplateQuery] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState(
    contextProjectId || previewFormProjects[0]?.id || "",
  );
  const [selectedSurveyId, setSelectedSurveyId] = useState(
    contextProjectId
      ? `${contextProjectId}-survey`
      : (previewFormSurveys[0]?.id ?? ""),
  );
  const [showWorkflowDetails, setShowWorkflowDetails] = useState(false);
  const [mobileDeploymentAudience, setMobileDeploymentAudience] = useState(
    "All assigned field officers",
  );
  const [mobileDeploymentSyncMode, setMobileDeploymentSyncMode] = useState<
    "offline_first" | "online_required"
  >("offline_first");
  const [mobileDeployments, setMobileDeployments] = useState<
    Record<string, MobileDeployment>
  >({});
  const [formControlsByFormId, setFormControlsByFormId] = useState<
    Record<string, FormControlsSettings>
  >({});
  const [formReadinessByFormId, setFormReadinessByFormId] = useState<
    Record<string, FormReadinessState>
  >({});
  const [formReviewRowsByFormId, setFormReviewRowsByFormId] = useState<
    Record<string, SubmissionRead[]>
  >({});
  const [formAssignmentByFormId, setFormAssignmentByFormId] = useState<
    Record<string, FormAssignmentPlan>
  >({});
  const [formImportRunsByFormId, setFormImportRunsByFormId] = useState<
    Record<string, FormImportRun[]>
  >({});
  const [formQualityFlagsByFormId, setFormQualityFlagsByFormId] = useState<
    Record<string, FormQualityFlag[]>
  >({});
  const [selectedReviewSubmissionId, setSelectedReviewSubmissionId] =
    useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    formTemplates[0]?.id ?? "",
  );
  const [builderResult, setBuilderResult] = useState(
    initialDraft
      ? `${initialDraft.name} draft shell was created. Add sections, questions, validation, logic, controls, then review readiness before publishing.`
      : "",
  );
  const pendingTemplateId = useWorkspaceStore(
    (state) => state.pendingTemplateId,
  );
  const setActiveView = useWorkspaceStore((state) => state.setActiveView);
  const setSidebarCollapsed = useWorkspaceStore(
    (state) => state.setSidebarCollapsed,
  );
  const setPendingTemplateId = useWorkspaceStore(
    (state) => state.setPendingTemplateId,
  );
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const isPreview = !token || token === "preview-token";
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
  const backendFormsQuery = useQuery({
    queryKey: ["forms", token],
    queryFn: () => listForms(token ?? ""),
    enabled: Boolean(token && !isPreview),
  });
  const masterDataQuery = useQuery({
    queryKey: ["master-data-categories", token],
    queryFn: () => listMasterDataEntries(token ?? ""),
    enabled: Boolean(token && !isPreview),
  });
  const choiceListCategories = useMemo(
    () =>
      Array.from(new Set((masterDataQuery.data ?? []).map((entry) => entry.category))).sort(),
    [masterDataQuery.data],
  );
  const formSubmissionsQuery = useQuery({
    queryKey: ["form-submissions", token, selectedFormId],
    queryFn: () => listSubmissions(token ?? ""),
    enabled: Boolean(
      token && !isPreview && selectedFormId && reviewWorkspaceDialogOpen,
    ),
  });
  const projects = useMemo(() => {
    if (!isPreview) return projectsQuery.data ?? [];
    if (!contextProjectName || !contextProjectId) return previewFormProjects;
    const contextProject: ProgramRead = {
      id: contextProjectId,
      is_active: true,
      name: contextProjectName,
      region: "Selected project",
      slug: slugify(contextProjectName),
    };
    return [
      contextProject,
      ...previewFormProjects.filter(
        (project) => project.name !== contextProjectName,
      ),
    ];
  }, [contextProjectId, contextProjectName, isPreview, projectsQuery.data]);
  const surveys = useMemo(() => {
    if (!isPreview) return surveysQuery.data ?? [];
    if (!contextProjectId) return previewFormSurveys;
    const contextSurvey: SurveyRead = {
      code: "SERVICE-FORM",
      created_by_user_id: "preview-user",
      custom_type_label: null,
      description: "Survey workspace created from the guided form setup.",
      end_date: null,
      geographic_scope: contextProjectName ?? "Selected project",
      id: `${contextProjectId}-survey`,
      indicator_ids_json: [],
      is_active: true,
      manager_user_id: null,
      organization_id: "preview-org",
      owner_user_id: "preview-user",
      project_id: contextProjectId,
      start_date: null,
      status: "active",
      survey_type: "service",
      target_population: "Assigned service participants",
      title: "Service Intake Survey",
    };
    return [contextSurvey, ...previewFormSurveys];
  }, [contextProjectId, contextProjectName, isPreview, surveysQuery.data]);
  const selectedProject =
    projects.find((project) => project.id === selectedProjectId) ?? projects[0];
  const projectSurveys = surveys.filter(
    (survey) => survey.project_id === selectedProject?.id,
  );
  const selectedSurvey =
    projectSurveys.find((survey) => survey.id === selectedSurveyId) ??
    projectSurveys[0];
  const persistedForms = useMemo(
    () => (backendFormsQuery.data ?? []).map(persistedFormToLocal),
    [backendFormsQuery.data],
  );
  const allForms = useMemo(() => {
    const seen = new Set<string>();
    return [...forms, ...persistedForms].filter((form) => {
      if (seen.has(form.id)) {
        return false;
      }
      seen.add(form.id);
      return true;
    });
  }, [forms, persistedForms]);
  const selectedForm = useMemo(() => {
    const form =
      allForms.find((candidate) => candidate.id === selectedFormId) ??
      allForms[0];
    return form ? normalizeForm(form) : undefined;
  }, [allForms, selectedFormId]);
  const selectedBackendForm = useMemo(
    () =>
      (backendFormsQuery.data ?? []).find(
        (form) => form.id === selectedForm?.id,
      ),
    [backendFormsQuery.data, selectedForm?.id],
  );
  const datasetsQuery = useQuery({
    queryKey: ["form-datasets", token, selectedForm?.id],
    queryFn: () => listFormDatasets(token ?? "", selectedForm?.id ?? ""),
    enabled: Boolean(token && !isPreview && selectedForm?.id),
  });
  const selectedFieldType = selectedForm?.fields.find((item) => item.id === selectedFieldId)?.type;
  // If a settings tab no longer applies to the question's response type (e.g. Reference on a
  // currency answer), drop back to Basics so builders never sit on an irrelevant tab.
  useEffect(() => {
    if (!selectedFieldType) return;
    if (!focusTabApplies(focusSettingsTab, selectedFieldType)) {
      setFocusSettingsTab("common");
    }
  }, [selectedFieldType, focusSettingsTab]);
  const selectedFormControls = useMemo(
    () =>
      selectedForm
        ? (formControlsByFormId[selectedForm.id] ??
          normalizeFormControls(
            selectedBackendForm?.controls_json,
            selectedForm,
          ))
        : createDefaultFormControls(),
    [formControlsByFormId, selectedBackendForm?.controls_json, selectedForm],
  );
  const selectedEntityWorkflow = useMemo(
    () => describeEntityCollectionWorkflow(selectedFormControls),
    [selectedFormControls],
  );
  const selectedMobileDeployment =
    selectedForm?.mobileDeployment ??
    (selectedForm ? mobileDeployments[selectedForm.id] : undefined);
  const selectedPages = selectedForm ? defaultPages(selectedForm) : [];
  const activePage =
    selectedPages.find((page) => page.id === selectedPageId) ??
    selectedPages[0];
  const activeSections =
    selectedForm?.sections.filter(
      (section) => section.pageId === activePage?.id,
    ) ?? [];
  const activeSection =
    activeSections.find((section) => section.id === selectedSectionId) ??
    activeSections[0] ??
    selectedForm?.sections[0];
  const activePageFields =
    selectedForm?.fields.filter((field) => field.pageId === activePage?.id) ??
    [];
  const selectedField =
    selectedForm?.fields.find((field) => field.id === selectedFieldId) ??
    selectedForm?.fields[0];
  useEffect(() => {
    setLogicConditionFieldId("");
    setLogicConditionValue("");
    setLogicActionKind("show");
    setAdvancedLogicKind("validation");
    setAdvancedLogicExpression("");
    setAdvancedLogicMessage("");
  }, [selectedField?.id]);
  const isPersistedSelectedForm = Boolean(
    selectedFormId && persistedForms.some((form) => form.id === selectedFormId),
  );
  const formControlsReady = Boolean(
    selectedFormControls.permission_rules.length &&
    selectedFormControls.workflow_stages.length &&
    selectedFormControls.data_quality_rules.some((rule) => rule.enabled),
  );
  const selectedFormReadiness = selectedForm
    ? (formReadinessByFormId[selectedForm.id] ?? defaultReadinessState)
    : defaultReadinessState;
  const selectedPreviewReviewRows = useMemo(
    () =>
      selectedForm
        ? (formReviewRowsByFormId[selectedForm.id] ??
          createPreviewSubmissionRows(selectedForm))
        : [],
    [formReviewRowsByFormId, selectedForm],
  );
  const selectedFormReviewRows = useMemo(
    () =>
      isPreview
        ? selectedPreviewReviewRows
        : (formSubmissionsQuery.data ?? []).filter(
            (submission) => submission.form_id === selectedForm?.id,
          ),
    [
      formSubmissionsQuery.data,
      isPreview,
      selectedForm?.id,
      selectedPreviewReviewRows,
    ],
  );
  const selectedAssignmentPlan = selectedForm
    ? (formAssignmentByFormId[selectedForm.id] ?? {
        ...defaultAssignmentPlan,
        audience: mobileDeploymentAudience,
        locationScope:
          selectedSurvey?.geographic_scope ??
          selectedProject?.region ??
          defaultAssignmentPlan.locationScope,
      })
    : defaultAssignmentPlan;
  const selectedImportRuns = useMemo(
    () =>
      selectedForm
        ? (formImportRunsByFormId[selectedForm.id] ??
          createPreviewImportRuns(selectedForm))
        : [],
    [formImportRunsByFormId, selectedForm],
  );
  const selectedQualityFlags = useMemo(
    () =>
      selectedForm
        ? (formQualityFlagsByFormId[selectedForm.id] ??
          createPreviewQualityFlags(selectedForm, selectedFormReviewRows))
        : [],
    [formQualityFlagsByFormId, selectedForm, selectedFormReviewRows],
  );
  const selectedReviewSubmission =
    selectedFormReviewRows.find(
      (submission) => submission.id === selectedReviewSubmissionId,
    ) ?? selectedFormReviewRows[0];
  const readinessItems: FormReadinessItem[] = useMemo(
    () =>
      buildFormReadinessChecklist(selectedForm, {
        hasProject: Boolean(selectedProject),
        hasSurvey: Boolean(selectedSurvey),
        controlsConfigured: formControlsReady,
        workflowConfigured: selectedFormControls.workflow_stages.length > 0,
        qualityChecksConfigured: selectedFormControls.data_quality_rules.some(
          (rule) => rule.enabled,
        ),
        mobilePreviewChecked: selectedFormReadiness.mobilePreviewChecked,
        pilotTestCompleted: selectedFormReadiness.pilotTestCompleted,
        deploymentAudienceSelected: Boolean(mobileDeploymentAudience.trim()),
      }),
    [
      selectedForm,
      selectedProject,
      selectedSurvey,
      formControlsReady,
      selectedFormControls.workflow_stages.length,
      selectedFormControls.data_quality_rules,
      selectedFormReadiness.mobilePreviewChecked,
      selectedFormReadiness.pilotTestCompleted,
      mobileDeploymentAudience,
    ],
  );
  const readinessReadyForPublish = isFormReadyForPublish(readinessItems);
  const readinessCompletedCount = readinessItems.filter(
    (item) => item.complete,
  ).length;
  const readinessRequiredMissingCount = readinessItems.filter(
    (item) => item.required && !item.complete,
  ).length;
  const builderValidationItems = useMemo(() => {
    const fields = selectedForm?.fields ?? [];
    const variableNames = fields
      .map((field) => field.variableName?.trim() ?? "")
      .filter(Boolean);
    const duplicates = variableNames.filter(
      (name, index) => variableNames.indexOf(name) !== index,
    );
    const brokenLogic = fields.filter((field) =>
      (field.logic ?? []).some(
        (rule) =>
          rule.targetId &&
          !fields.some((candidate) => candidate.id === rule.targetId),
      ),
    );
    const missingLabels = fields.filter((field) => !field.label.trim());
    const repeatGroupsWithoutLimits = fields.filter(
      (field) => field.type === "repeat_group" && !field.repeat?.max,
    );
    return [
      {
        id: "labels",
        label: "Missing question labels",
        count: missingLabels.length,
        severity: "critical",
      },
      {
        id: "variables",
        label: "Duplicate variable names",
        count: new Set(duplicates).size,
        severity: "critical",
      },
      {
        id: "logic",
        label: "Broken logic references",
        count: brokenLogic.length,
        severity: "critical",
      },
      {
        id: "sections",
        label: "Sections without questions",
        count: (selectedForm?.sections ?? []).filter(
          (section) => !fields.some((field) => field.sectionId === section.id),
        ).length,
        severity: "warning",
      },
      {
        id: "repeats",
        label: "Repeat groups without limits",
        count: repeatGroupsWithoutLimits.length,
        severity: "warning",
      },
    ];
  }, [selectedForm]);
  const criticalValidationCount = builderValidationItems
    .filter((item) => item.severity === "critical")
    .reduce((total, item) => total + item.count, 0);
  const warningValidationCount = builderValidationItems
    .filter((item) => item.severity === "warning")
    .reduce((total, item) => total + item.count, 0);

  function createMobileDeployment(): MobileDeployment {
    return {
      assignedAudience: mobileDeploymentAudience,
      channel: "survey_app",
      deployedAt: new Date().toISOString(),
      instructions:
        "Field officers should sync the Survey App, open Assigned forms, and start collection from the latest published version.",
      status: "deployed",
      syncMode: mobileDeploymentSyncMode,
    };
  }

  const publishMutation = useMutation({
    mutationFn: (payload: {
      form: DynamicForm;
      publish: boolean;
      deployToMobile?: boolean;
    }) =>
      createForm(token ?? "", {
        project_id: selectedProject?.id ?? "",
        survey_id: selectedSurvey?.id ?? "",
        name: payload.form.name,
        slug: `${slugify(payload.form.name)}-${Date.now().toString(36)}`,
        description: payload.form.sections[0]?.description ?? null,
        form_type: newFormType || null,
        schema: toMobileSchema(payload.form) as Record<string, unknown>,
        publish: payload.publish,
      }),
    onSuccess: async (savedForm, variables) => {
      if (variables.deployToMobile) {
        const deployment = createMobileDeployment();
        setMobileDeployments((current) => ({
          ...current,
          [savedForm.id]: deployment,
        }));
        setMobileDeployDialogOpen(false);
        setBuilderResult(
          `${savedForm.name} is published and deployed to the Survey App for ${deployment.assignedAudience}. Field officers will see it after they sync their mobile app.`,
        );
      } else {
        setBuilderResult(
          `${savedForm.name} is ${savedForm.status} as backend version ${savedForm.current_version}. Field teams can use the latest published version after sync.`,
        );
      }
      pushToast({
        title: variables.deployToMobile
          ? "Deployed to Survey App"
          : savedForm.status === "published"
            ? "Form published"
            : "Form saved",
        description: variables.deployToMobile
          ? `${savedForm.name} will appear for assigned field officers after mobile sync.`
          : `${savedForm.name} is stored in the backend as version ${savedForm.current_version}.`,
        tone: "success",
      });
      setForms((current) =>
        current.filter((form) => form.id !== variables.form.id),
      );
      setFormControlsByFormId((current) => {
        const nextControls = {
          ...current,
          [savedForm.id]: normalizeFormControls(
            savedForm.controls_json ??
              current[variables.form.id] ??
              createDefaultFormControls(variables.form),
            persistedFormToLocal(savedForm),
          ),
        };
        delete nextControls[variables.form.id];
        return nextControls;
      });
      setSelectedFormId(savedForm.id);
      setSelectedFieldId(`${savedForm.id}-respondent`);
      await backendFormsQuery.refetch();
    },
    onError: () => {
      setBuilderResult(
        "The form was not saved. Check your form management permission and confirm the form has at least one question before publishing.",
      );
      pushToast({
        title: "Form was not saved",
        description:
          "Check permissions and required form fields before trying again.",
        tone: "danger",
      });
    },
  });
  const serverCompatibilityQuery = useQuery({
    queryKey: ["form-compatibility", token, selectedFormId],
    queryFn: () => getFormCollectionCompatibility(token ?? "", selectedFormId),
    enabled: Boolean(token && !isPreview && isPersistedSelectedForm),
  });
  const xlsFormQuery = useQuery({
    queryKey: ["form-xlsform", token, selectedFormId],
    queryFn: () => exportFormXlsForm(token ?? "", selectedFormId),
    enabled: false,
  });
  const publicLinkMutation = useMutation({
    mutationFn: () =>
      createPublicCollectionLink(token ?? "", {
        form_id: selectedFormId,
        slug: `${slugify(selectedForm?.name ?? "form")}-${Date.now().toString(36)}`,
        title: selectedForm?.name ?? "Public collection form",
        description:
          "Controlled public collection link generated from the form builder.",
        access_mode: "restricted",
        require_authentication: false,
        allow_offline_web: true,
        permission_json: {
          submit: true,
          view: false,
          edit: false,
          export: false,
        },
      }),
    onSuccess: (link) => {
      setBuilderResult(
        `${link.title} has a controlled public collection link: ${link.public_url}. Share it only with the intended collection audience.`,
      );
      pushToast({
        title: "Public link created",
        description: `${link.public_url} is ready for controlled collection`,
        tone: "success",
      });
    },
    onError: () => {
      setBuilderResult(
        "Public link was not created. Save this form to the backend first, then create a link from the saved form.",
      );
      pushToast({
        title: "Public link not created",
        description:
          "Select a saved backend form and sign in with form management access.",
        tone: "danger",
      });
    },
  });
  const updateControlsMutation = useMutation({
    mutationFn: (payload: { formId: string; controls: FormControlsSettings }) =>
      updateFormControls(token ?? "", payload.formId, payload.controls),
    onSuccess: async (savedForm, variables) => {
      setFormControlsByFormId((current) => ({
        ...current,
        [variables.formId]: normalizeFormControls(
          savedForm.controls_json ?? variables.controls,
          selectedForm,
        ),
      }));
      setFormControlsDialogOpen(false);
      setBuilderResult(
        `${savedForm.name} controls were saved. Reference data, permissions, workflow, quality, audit, and version rules are now attached to this form.`,
      );
      pushToast({
        title: "Form controls saved",
        description: `${savedForm.name} now has form-level governance settings.`,
        tone: "success",
      });
      await backendFormsQuery.refetch();
    },
    onError: () => {
      setBuilderResult(
        "Form controls were not saved. Confirm you have permission to manage forms and that the form is saved to the backend.",
      );
      pushToast({
        title: "Controls were not saved",
        description: "Check form management permission and try again.",
        tone: "danger",
      });
    },
  });
  const formReviewMutation = useMutation({
    mutationFn: (payload: {
      submissionId: string;
      action: ReviewAction;
      comment: string;
    }) =>
      reviewSubmission(token ?? "", payload.submissionId, {
        action: payload.action,
        comment: payload.comment,
      }),
    onSuccess: async (submission, variables) => {
      setReviewComment("");
      setBuilderResult(
        `${submission.client_submission_id} is now ${formatReviewStatus(submission.status)}. Reviewer note: ${variables.comment}`,
      );
      pushToast({
        title: `Submission ${variables.action.replace("_", " ")}`,
        description: `${submission.client_submission_id} was updated.`,
        tone: "success",
      });
      await formSubmissionsQuery.refetch();
    },
    onError: () => {
      setBuilderResult(
        "The review decision was not saved. Confirm the submission is open, add a reviewer note, and check your review permission.",
      );
      pushToast({
        title: "Review decision failed",
        description: "Check the submission status and your review permission.",
        tone: "danger",
      });
    },
  });
  const visibleTemplates = useMemo(() => {
    const needle = templateQuery.trim().toLowerCase();
    return formTemplates.filter((template) => {
      const categoryMatch =
        templateCategory === "Recommended"
          ? template.featured
          : template.category === templateCategory;
      const queryMatch =
        !needle ||
        template.name.toLowerCase().includes(needle) ||
        template.description.toLowerCase().includes(needle) ||
        template.tags.some((tag) => tag.toLowerCase().includes(needle));
      return categoryMatch && queryMatch;
    });
  }, [templateCategory, templateQuery]);
  const selectedTemplate =
    formTemplates.find((template) => template.id === selectedTemplateId) ??
    visibleTemplates[0] ??
    formTemplates[0];
  const smartFieldSuggestions = useMemo(() => {
    const catalogPresets: FieldPreset[] = fieldCatalog.flatMap((group) =>
      group.fields.map((field) => ({
        id: `catalog-${field.type}`,
        label: field.label,
        type: field.type,
        hint: field.description,
        options: [
          "select",
          "dropdown",
          "multiselect",
          "radio",
          "checkbox",
        ].includes(field.type)
          ? ["Yes", "No"]
          : undefined,
        required: true,
      })),
    );
    const deduped = [...quickFieldPresets, ...catalogPresets].filter(
      (preset, index, presets) =>
        presets.findIndex((candidate) => candidate.label === preset.label) ===
        index,
    );
    const needle = smartFieldQuery.trim().toLowerCase();
    if (!needle) {
      return deduped;
    }
    return deduped
      .filter((preset) =>
        [preset.label, preset.type, preset.hint, ...(preset.options ?? [])]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
      .slice(0, 24);
  }, [smartFieldQuery]);
  const questionTypeSuggestions = useMemo(
    () => inferQuestionSuggestions(questionComposerText),
    [questionComposerText],
  );
  const recommendedQuestionSuggestion = questionTypeSuggestions[0];
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const updateSelectedForm = useCallback(
    (nextForm: DynamicForm, options: { trackHistory?: boolean } = {}) => {
      if (selectedForm && options.trackHistory !== false) {
        setHistoryPast((current) => [...current.slice(-19), selectedForm]);
        setHistoryFuture([]);
      }
      setForms((current) => {
        const exists = current.some((form) => form.id === nextForm.id);
        return exists
          ? current.map((form) => (form.id === nextForm.id ? nextForm : form))
          : [nextForm, ...current];
      });
      onFormChange?.(nextForm);
    },
    [onFormChange, selectedForm],
  );

  function updateSelectedFormControls(
    updater: (controls: FormControlsSettings) => FormControlsSettings,
  ) {
    if (!selectedForm) {
      return;
    }
    setFormControlsByFormId((current) => ({
      ...current,
      [selectedForm.id]: updater(
        current[selectedForm.id] ?? selectedFormControls,
      ),
    }));
  }

  function addReferenceBinding(field = selectedField) {
    if (!field) {
      pushToast({
        title: "Select a question first",
        description:
          "Choose the form question that should use controlled reference data.",
        tone: "warning",
      });
      return;
    }
    const existing = selectedFormControls.reference_bindings.some(
      (binding) => binding.question_id === field.id,
    );
    if (existing) {
      setFormControlsTab("reference");
      setFormControlsDialogOpen(true);
      pushToast({
        title: "Reference already attached",
        description: `${field.label} already has a controlled list binding.`,
        tone: "neutral",
      });
      return;
    }
    const suggestedList = /district/i.test(field.label)
      ? "Official District reference list"
      : /region|province|state/i.test(field.label)
        ? "Official Region reference list"
        : /community|village|ward/i.test(field.label)
          ? "Official Community reference list"
          : /school/i.test(field.label)
            ? "Official School reference list"
            : /facility|clinic|hospital/i.test(field.label)
              ? "Official Facility reference list"
              : `${field.label} reference list`;
    updateSelectedFormControls((controls) => ({
      ...controls,
      reference_bindings: [
        ...controls.reference_bindings,
        {
          id: `reference-${field.id}-${Date.now()}`,
          question_id: field.id,
          question_label: field.label,
          reference_list_name: suggestedList,
          reference_type:
            suggestedList
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "_")
              .replace(/^_|_$/g, "") || "reference",
          source: "existing",
          enforce_controlled_values: true,
          allow_inactive_values: false,
          parent_reference: /district|community|village|ward/i.test(field.label)
            ? "Region"
            : null,
          effective_from: null,
          effective_to: null,
          version: 1,
          updated_by: "M&E Manager",
          changed_since_publish: false,
        },
      ],
    }));
    setFormControlsTab("reference");
    setFormControlsDialogOpen(true);
    setBuilderResult(
      `${field.label} is now mapped to a controlled reference list.`,
    );
  }

  function applyWorkflowPreset(preset: "simple" | "standard" | "correction") {
    updateSelectedFormControls((controls) => ({
      ...controls,
      workflow_stages: workflowPresets[preset].map((stage) => ({
        ...stage,
        reviewer_roles: [...stage.reviewer_roles],
      })),
      governance: {
        ...controls.governance,
        approval_workflow: preset,
        required_review_levels: preset === "simple" ? 1 : 2,
        require_supervisor_review: preset !== "simple",
      },
    }));
  }

  function saveSelectedFormControls() {
    if (!selectedForm) {
      return;
    }
    if (token && !isPreview && isPersistedSelectedForm) {
      updateControlsMutation.mutate({
        formId: selectedForm.id,
        controls: selectedFormControls,
      });
      return;
    }
    setFormControlsByFormId((current) => ({
      ...current,
      [selectedForm.id]: selectedFormControls,
    }));
    setFormControlsDialogOpen(false);
    setBuilderResult(
      `${selectedForm.name} controls were saved in the local preview. Save the form to the backend to persist them for production users.`,
    );
    pushToast({
      title: "Preview controls saved",
      description:
        "Controls are ready locally and will be persisted after the form is saved to the backend.",
      tone: "success",
    });
  }

  function updateSelectedReadiness(patch: Partial<FormReadinessState>) {
    if (!selectedForm) {
      return;
    }
    setFormReadinessByFormId((current) => ({
      ...current,
      [selectedForm.id]: {
        ...(current[selectedForm.id] ?? defaultReadinessState),
        ...patch,
        lastReviewedAt: new Date().toISOString(),
      },
    }));
  }

  function openReadinessChecklist() {
    setMobileDeployDialogOpen(false);
    setFormControlsDialogOpen(false);
    setReviewWorkspaceDialogOpen(false);
    setAssignmentWorkspaceDialogOpen(false);
    setImportWorkspaceDialogOpen(false);
    setQualityWorkspaceDialogOpen(false);
    setReadinessDialogOpen(true);
    setBuilderResult(
      "Review readiness before publishing or deploying this form to field teams.",
    );
  }

  function openDeploymentCenter() {
    setReadinessDialogOpen(false);
    setFormControlsDialogOpen(false);
    setReviewWorkspaceDialogOpen(false);
    setAssignmentWorkspaceDialogOpen(false);
    setImportWorkspaceDialogOpen(false);
    setQualityWorkspaceDialogOpen(false);
    setMobileDeployDialogOpen(true);
    setBuilderResult(
      "Use the deployment center to publish, assign, deploy, and monitor mobile sync readiness.",
    );
  }

  function openSubmissionReviewWorkspace() {
    setReadinessDialogOpen(false);
    setMobileDeployDialogOpen(false);
    setFormControlsDialogOpen(false);
    setAssignmentWorkspaceDialogOpen(false);
    setImportWorkspaceDialogOpen(false);
    setQualityWorkspaceDialogOpen(false);
    setReviewWorkspaceDialogOpen(true);
    if (selectedFormReviewRows[0] && !selectedReviewSubmissionId) {
      setSelectedReviewSubmissionId(selectedFormReviewRows[0].id);
    }
    setBuilderResult(
      "Review incoming records for this form without leaving the form workspace.",
    );
  }

  function openAssignmentWorkspace() {
    setReadinessDialogOpen(false);
    setMobileDeployDialogOpen(false);
    setFormControlsDialogOpen(false);
    setReviewWorkspaceDialogOpen(false);
    setImportWorkspaceDialogOpen(false);
    setQualityWorkspaceDialogOpen(false);
    setAssignmentWorkspaceDialogOpen(true);
    setBuilderResult(
      "Assign the form to teams, supervisors, locations, and collection targets.",
    );
  }

  function openImportWorkspace() {
    setReadinessDialogOpen(false);
    setMobileDeployDialogOpen(false);
    setFormControlsDialogOpen(false);
    setReviewWorkspaceDialogOpen(false);
    setAssignmentWorkspaceDialogOpen(false);
    setQualityWorkspaceDialogOpen(false);
    setImportWorkspaceDialogOpen(true);
    setBuilderResult(
      "Use the form import workspace to download a matching template, map columns, validate records, and import clean data.",
    );
  }

  function openQualityWorkspace() {
    setReadinessDialogOpen(false);
    setMobileDeployDialogOpen(false);
    setFormControlsDialogOpen(false);
    setReviewWorkspaceDialogOpen(false);
    setAssignmentWorkspaceDialogOpen(false);
    setImportWorkspaceDialogOpen(false);
    setQualityWorkspaceDialogOpen(true);
    setBuilderResult(
      "Review data quality flags, affected records, owners, and next actions for this form.",
    );
  }

  function updateAssignmentPlan(patch: Partial<FormAssignmentPlan>) {
    if (!selectedForm) {
      return;
    }
    setFormAssignmentByFormId((current) => ({
      ...current,
      [selectedForm.id]: {
        ...selectedAssignmentPlan,
        ...patch,
        lastUpdatedAt: new Date().toISOString(),
      },
    }));
  }

  function saveAssignmentPlan() {
    if (!selectedForm) {
      return;
    }
    updateAssignmentPlan({});
    setMobileDeploymentAudience(selectedAssignmentPlan.audience);
    setAssignmentWorkspaceDialogOpen(false);
    setBuilderResult(
      `${selectedForm.name} is assigned to ${selectedAssignmentPlan.team} under ${selectedAssignmentPlan.supervisor} for ${selectedAssignmentPlan.locationScope}.`,
    );
    pushToast({
      title: "Assignment plan saved",
      description: `${selectedAssignmentPlan.team} can collect up to ${selectedAssignmentPlan.targetSubmissions} target submissions.`,
      tone: "success",
    });
  }

  function validateImportTemplate() {
    if (!selectedForm) {
      return;
    }
    const nextRun: FormImportRun = {
      id: `${selectedForm.id}-import-${Date.now()}`,
      fileName: `${slugify(selectedForm.name)}-template.xlsx`,
      rows: 75,
      mappedColumns: selectedForm.fields.length,
      validRows: Math.max(70, selectedForm.fields.length ? 72 : 0),
      issueCount: selectedForm.fields.some((field) => field.required) ? 3 : 8,
      status: "validated",
      createdAt: new Date().toISOString(),
    };
    setFormImportRunsByFormId((current) => ({
      ...current,
      [selectedForm.id]: [nextRun, ...(current[selectedForm.id] ?? [])],
    }));
    updateSelectedReadiness({ importTemplateReviewed: true });
    setBuilderResult(
      `${nextRun.fileName} was validated against ${selectedForm.fields.length} form fields. Fix ${nextRun.issueCount} issue(s) before final import.`,
    );
    pushToast({
      title: "Import template validated",
      description: `${nextRun.validRows} rows are ready after column mapping checks.`,
      tone: "success",
    });
  }

  function markImportAsImported(runId: string) {
    if (!selectedForm) {
      return;
    }
    setFormImportRunsByFormId((current) => ({
      ...current,
      [selectedForm.id]: (current[selectedForm.id] ?? selectedImportRuns).map(
        (run) =>
          run.id === runId
            ? { ...run, status: "imported", issueCount: 0, validRows: run.rows }
            : run,
      ),
    }));
    setBuilderResult(
      "Validated records were imported into this form workspace and are ready for review and reporting.",
    );
    pushToast({
      title: "Preview import completed",
      description:
        "Imported records are now treated as form data in this workspace.",
      tone: "success",
    });
  }

  function resolveQualityFlag(flagId: string) {
    if (!selectedForm) {
      return;
    }
    setFormQualityFlagsByFormId((current) => ({
      ...current,
      [selectedForm.id]: (current[selectedForm.id] ?? selectedQualityFlags).map(
        (flag) =>
          flag.id === flagId
            ? { ...flag, status: "resolved", affectedRecords: 0 }
            : flag,
      ),
    }));
    setBuilderResult(
      "Quality flag resolved for this form. Keep monitoring the form before using data in reports.",
    );
    pushToast({
      title: "Quality flag resolved",
      description: "The form quality workspace was updated.",
      tone: "success",
    });
  }

  function runFormReviewAction(action: ReviewAction) {
    if (!selectedForm || !selectedReviewSubmission) {
      pushToast({
        title: "Select a submission first",
        description:
          "Choose a submission from the review queue before applying a decision.",
        tone: "warning",
      });
      return;
    }
    const trimmedComment = reviewComment.trim();
    if (
      (action === "request_correction" || action === "reject") &&
      !trimmedComment
    ) {
      pushToast({
        title: "Reviewer note required",
        description:
          "Explain what field teams need to correct or why the record is rejected.",
        tone: "warning",
      });
      return;
    }
    const nextStatus =
      action === "approve"
        ? "approved"
        : action === "reject"
          ? "rejected"
          : action === "request_correction"
            ? "correction_requested"
            : "under_review";
    const comment =
      trimmedComment ||
      `Marked as ${formatReviewStatus(nextStatus)} from the form review workspace.`;

    if (token && !isPreview) {
      formReviewMutation.mutate({
        submissionId: selectedReviewSubmission.id,
        action,
        comment,
      });
      return;
    }

    setFormReviewRowsByFormId((current) => {
      const rows =
        current[selectedForm.id] ?? createPreviewSubmissionRows(selectedForm);
      return {
        ...current,
        [selectedForm.id]: rows.map((submission) =>
          submission.id === selectedReviewSubmission.id
            ? {
                ...submission,
                status: nextStatus,
                payload_json: {
                  ...submission.payload_json,
                  reviewer_note: comment,
                  reviewed_at: new Date().toISOString(),
                },
              }
            : submission,
        ),
      };
    });
    setReviewComment("");
    setBuilderResult(
      `${selectedReviewSubmission.client_submission_id} is now ${formatReviewStatus(nextStatus)}. Reviewer note: ${comment}`,
    );
    pushToast({
      title: `Preview ${action.replace("_", " ")}`,
      description: selectedReviewSubmission.client_submission_id,
      tone:
        action === "approve"
          ? "success"
          : action === "reject"
            ? "danger"
            : "warning",
    });
  }

  const undoLastChange = useCallback(() => {
    const previous = historyPast.at(-1);
    if (!previous || !selectedForm) {
      return;
    }
    setHistoryPast((current) => current.slice(0, -1));
    setHistoryFuture((current) => [selectedForm, ...current.slice(0, 19)]);
    updateSelectedForm(previous, { trackHistory: false });
    setSelectedFieldId(previous.fields[0]?.id ?? "");
  }, [historyPast, selectedForm, updateSelectedForm]);

  const redoLastChange = useCallback(() => {
    const next = historyFuture[0];
    if (!next || !selectedForm) {
      return;
    }
    setHistoryFuture((current) => current.slice(1));
    setHistoryPast((current) => [...current.slice(-19), selectedForm]);
    updateSelectedForm(next, { trackHistory: false });
    setSelectedFieldId(next.fields[0]?.id ?? "");
  }, [historyFuture, selectedForm, updateSelectedForm]);

  function openNewFormDialog() {
    setNewFormDialogOpen(true);
    setNewFormName(
      selectedSurvey ? `${selectedSurvey.title} form` : "New survey form",
    );
    setNewFormDescription(selectedSurvey?.description ?? "");
    setNewFormChannel("survey_app");
    setNewFormBlocks(["respondent-details", "gps-evidence"]);
  }

  function createGuidedForm() {
    if (!selectedProject || !selectedSurvey) {
      setBuilderResult("Select a project and survey before creating a form.");
      pushToast({
        title: "Project and survey required",
        description: "Choose where this form belongs before continuing.",
        tone: "warning",
      });
      return;
    }
    const formId = `guided-form-${Date.now()}`;
    const pageId = `${formId}-page-1`;
    const selectedBlocks = sectionTemplates.filter((template) =>
      newFormBlocks.includes(template.id),
    );
    const blocks = selectedBlocks.length
      ? selectedBlocks
      : sectionTemplates.filter(
          (template) => template.id === "respondent-details",
        );
    const formDescription = newFormDescription.trim();
    const sections: FormSection[] = [];
    const fields: FormField[] = [];
    for (const [index, block] of blocks.entries()) {
      const section = createSection(pageId, block.title);
      const sectionWithDescription = {
        ...section,
        description:
          index === 0 && formDescription ? formDescription : block.description,
      };
      sections.push(sectionWithDescription);
      fields.push(
        ...block.fields.map((preset) =>
          fieldFromPreset(preset, sectionWithDescription),
        ),
      );
    }
    const nextForm: DynamicForm = {
      id: formId,
      name: newFormName.trim() || `${selectedSurvey.title} form`,
      status: "draft",
      version: 1,
      activeVersion: 0,
      updatedAt: new Date().toISOString(),
      pages: [
        {
          id: pageId,
          title: "Page 1",
          description:
            formDescription ||
            `Created for ${selectedSurvey.title} via ${
              newFormChannel === "survey_app"
                ? "Survey App"
                : newFormChannel === "web_link"
                  ? "Web Link"
                  : newFormChannel === "public_link"
                    ? "Public Link"
                    : "XLSForm/ODK"
            }.`,
        },
      ],
      sections,
      fields,
      history: [
        {
          version: 1,
          status: "draft",
          createdAt: new Date().toISOString(),
          summary: "Created from guided form setup",
        },
      ],
    };
    setForms((current) => [nextForm, ...current]);
    onFormChange?.(nextForm);
    setFormControlsByFormId((current) => ({
      ...current,
      [nextForm.id]: createDefaultFormControls(nextForm),
    }));
    setSelectedFormId(nextForm.id);
    setSelectedFieldId(nextForm.fields[0]?.id ?? "");
    setSelectedPageId(pageId);
    setSelectedSectionId(nextForm.sections[0]?.id ?? "");
    setBuilderMode("builder");
    setBuilderFocusPanel("build");
    setBuilderAssistantOpen(true);
    setBuilderAssistantMode("question");
    setNewFormDialogOpen(false);
    setBuilderResult(
      `${nextForm.name} was created for ${selectedProject.name} / ${selectedSurvey.title}. Distribution channel: ${newFormChannel.replace("_", " ")}. Next, add one question or preview the form.`,
    );
    pushToast({
      title: "Guided form created",
      description:
        "Atlas added the selected blocks and opened the next recommended action.",
      tone: "success",
    });
  }

  function moveField(fieldId: string, direction: -1 | 1) {
    if (!selectedForm) {
      return;
    }
    const currentIndex = selectedForm.fields.findIndex(
      (field) => field.id === fieldId,
    );
    const nextIndex = currentIndex + direction;
    if (
      currentIndex < 0 ||
      nextIndex < 0 ||
      nextIndex >= selectedForm.fields.length
    ) {
      return;
    }
    const nextFields = [...selectedForm.fields];
    const [field] = nextFields.splice(currentIndex, 1);
    if (!field) {
      return;
    }
    nextFields.splice(nextIndex, 0, field);
    updateSelectedForm({
      ...selectedForm,
      fields: nextFields,
      updatedAt: new Date().toISOString(),
    });
  }

  function deleteQuestion(fieldId: string) {
    if (!selectedForm) {
      return;
    }
    const fieldIndex = selectedForm.fields.findIndex(
      (field) => field.id === fieldId,
    );
    const field = selectedForm.fields[fieldIndex];
    if (!field) {
      return;
    }
    const remainingFields = selectedForm.fields.filter(
      (candidate) => candidate.id !== fieldId,
    );
    const nextSelectedField =
      remainingFields[fieldIndex] ??
      remainingFields[fieldIndex - 1] ??
      remainingFields[0];
    updateSelectedForm(removeField(selectedForm, fieldId));
    setSelectedFieldId(nextSelectedField?.id ?? "");
    setBuilderResult(`${field.label} was removed from this draft form.`);
    pushToast({
      title: "Question deleted",
      description: `${field.label} was removed from the form canvas.`,
      tone: "success",
    });
  }

  function saveSelectedForm(publish: boolean) {
    if (!selectedForm) {
      return;
    }
    if (!selectedProject || !selectedSurvey) {
      setBuilderResult(
        "Select a project and survey before saving or publishing. Atlas forms must belong to a survey so submissions, indicators, and reports stay traceable.",
      );
      pushToast({
        title: "Survey context required",
        description: "Choose Project, then Survey, then save the form.",
        tone: "warning",
      });
      return;
    }
    if (publish && !readinessReadyForPublish) {
      openReadinessChecklist();
      pushToast({
        title: "Readiness review needed",
        description:
          "Complete required readiness items before publishing this form.",
        tone: "warning",
      });
      return;
    }
    if (token && !isPreview) {
      publishMutation.mutate({ form: selectedForm, publish });
      return;
    }
    const nextForm = publish
      ? publishForm(selectedForm)
      : createDraftVersion(selectedForm);
    updateSelectedForm(nextForm);
    setBuilderResult(
      publish
        ? `${nextForm.name} is published in preview as version ${nextForm.activeVersion}. Review the phone preview before assigning it to field teams.`
        : `${nextForm.name} was saved as a draft preview version ${nextForm.version}. Continue editing before publishing.`,
    );
    pushToast({
      title: publish ? "Preview form published" : "Preview draft saved",
      description: `${selectedForm.name} was updated in preview mode.`,
      tone: "success",
    });
  }

  function deploySelectedFormToMobileApp() {
    if (!selectedForm) {
      return;
    }
    if (!selectedProject || !selectedSurvey) {
      setBuilderResult(
        "Select a project and survey before deploying. Mobile forms must stay connected to a survey so field submissions sync into the right workspace.",
      );
      pushToast({
        title: "Survey context required",
        description:
          "Choose Project and Survey before deploying to the mobile app.",
        tone: "warning",
      });
      return;
    }
    if (!selectedForm.fields.length) {
      setBuilderResult(
        "Add at least one question before deploying this form to field officers.",
      );
      pushToast({
        title: "Add questions first",
        description:
          "Field officers need at least one question before the form can be deployed.",
        tone: "warning",
      });
      return;
    }
    if (!readinessReadyForPublish) {
      openReadinessChecklist();
      pushToast({
        title: "Finish readiness first",
        description:
          "Complete required readiness items before deploying this form to field officers.",
        tone: "warning",
      });
      return;
    }

    if (token && !isPreview) {
      if (isPersistedSelectedForm && selectedForm.status === "published") {
        const deployment = createMobileDeployment();
        setMobileDeployments((current) => ({
          ...current,
          [selectedForm.id]: deployment,
        }));
        setMobileDeployDialogOpen(false);
        setBuilderResult(
          `${selectedForm.name} is deployed to the Survey App for ${deployment.assignedAudience}. Field officers will see it after syncing their app.`,
        );
        pushToast({
          title: "Deployed to Survey App",
          description: `${selectedForm.name} is ready for assigned field officers after sync.`,
          tone: "success",
        });
        return;
      }

      publishMutation.mutate({
        form: selectedForm,
        publish: true,
        deployToMobile: true,
      });
      return;
    }

    try {
      const deployedForm = deployFormToMobileApp(selectedForm, {
        assignedAudience: mobileDeploymentAudience,
        syncMode: mobileDeploymentSyncMode,
      });
      updateSelectedForm(deployedForm);
      setMobileDeployDialogOpen(false);
      setBuilderResult(
        `${deployedForm.name} is deployed in preview to the Survey App for ${deployedForm.mobileDeployment?.assignedAudience}. Field officers can sync their app and start collection.`,
      );
      pushToast({
        title: "Preview mobile deployment ready",
        description: `${deployedForm.name} is published and deployed to the Survey App in preview mode.`,
        tone: "success",
      });
    } catch {
      setBuilderResult(
        "The form could not be deployed. Add at least one question and try again.",
      );
      pushToast({
        title: "Deployment failed",
        description: "Add questions before deploying this form to mobile.",
        tone: "danger",
      });
    }
  }

  function applyTemplate(template: FormTemplateCard) {
    const nextForm = templateToForm(template);
    setForms((current) => [nextForm, ...current]);
    setFormControlsByFormId((current) => ({
      ...current,
      [nextForm.id]: createDefaultFormControls(nextForm),
    }));
    setSelectedFormId(nextForm.id);
    setSelectedFieldId(nextForm.fields[0]?.id ?? "");
    setBuilderMode("builder");
    setBuilderResult(
      `${template.name} was added to the builder with ${nextForm.fields.length} starter questions. Customize labels, rules, and required fields before publishing.`,
    );
    pushToast({
      title: "Template added to builder",
      description: `${template.name} is ready to customize and publish.`,
      tone: "success",
    });
  }

  useEffect(() => {
    if (!pendingTemplateId) {
      return;
    }
    const template = formTemplates.find(
      (candidate) => candidate.id === pendingTemplateId,
    );
    if (template) {
      applyTemplate(template);
    }
    setPendingTemplateId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingTemplateId, setPendingTemplateId]);

  useEffect(() => {
    if (!initialDraft || initialDraftIdRef.current === initialDraft.id) {
      return;
    }
    initialDraftIdRef.current = initialDraft.id;
    setForms((current) => [
      initialDraft,
      ...current.filter((form) => form.id !== initialDraft.id),
    ]);
    setSelectedFormId(initialDraft.id);
    setSelectedFieldId(initialDraft.fields[0]?.id ?? "");
    setSelectedPageId(defaultPages(initialDraft)[0]?.id ?? "");
    setSelectedSectionId(initialDraft.sections[0]?.id ?? "");
    setBuilderMode("builder");
    setBuilderFocusPanel("build");
    setBuilderResult(
      `${initialDraft.name} draft shell was created. Add sections, questions, validation, logic, controls, then review readiness before publishing.`,
    );
  }, [initialDraft]);

  useEffect(() => {
    if (!allForms.length) {
      if (selectedFormId) {
        setSelectedFormId("");
      }
      if (selectedFieldId) {
        setSelectedFieldId("");
      }
      return;
    }
    const currentForm = allForms.find((form) => form.id === selectedFormId);
    if (!currentForm) {
      const firstForm = allForms[0];
      setSelectedFormId(firstForm.id);
      setSelectedFieldId(firstForm.fields[0]?.id ?? "");
    }
  }, [allForms, selectedFieldId, selectedFormId]);

  useEffect(() => {
    if (!selectedForm) {
      return;
    }
    const pages = defaultPages(selectedForm);
    const pageStillValid = pages.some((page) => page.id === selectedPageId);
    const nextPage = pageStillValid
      ? pages.find((page) => page.id === selectedPageId)
      : pages[0];
    if (nextPage && nextPage.id !== selectedPageId) {
      setSelectedPageId(nextPage.id);
    }
    const sections = selectedForm.sections.filter(
      (section) => section.pageId === nextPage?.id,
    );
    const sectionStillValid = sections.some(
      (section) => section.id === selectedSectionId,
    );
    const nextSection = sectionStillValid
      ? sections.find((section) => section.id === selectedSectionId)
      : (sections[0] ?? selectedForm.sections[0]);
    if (nextSection && nextSection.id !== selectedSectionId) {
      setSelectedSectionId(nextSection.id);
    }
  }, [selectedForm, selectedPageId, selectedSectionId]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isUndo =
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "z" &&
        !event.shiftKey;
      const isRedo =
        (event.metaKey || event.ctrlKey) &&
        (event.key.toLowerCase() === "y" ||
          (event.shiftKey && event.key.toLowerCase() === "z"));
      if (isUndo) {
        event.preventDefault();
        undoLastChange();
      }
      if (isRedo) {
        event.preventDefault();
        redoLastChange();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [redoLastChange, undoLastChange]);

  useEffect(() => {
    if (!projects.length || selectedProjectId) {
      return;
    }
    setSelectedProjectId(projects[0]?.id ?? "");
  }, [projects, selectedProjectId]);

  useEffect(() => {
    if (!selectedProject) {
      return;
    }
    const surveyStillValid = projectSurveys.some(
      (survey) => survey.id === selectedSurveyId,
    );
    if (!surveyStillValid) {
      setSelectedSurveyId(projectSurveys[0]?.id ?? "");
    }
  }, [projectSurveys, selectedProject, selectedSurveyId]);

  useEffect(() => {
    if (!reviewWorkspaceDialogOpen) {
      return;
    }
    if (!selectedFormReviewRows.length) {
      if (selectedReviewSubmissionId) {
        setSelectedReviewSubmissionId("");
      }
      return;
    }
    const stillSelected = selectedFormReviewRows.some(
      (submission) => submission.id === selectedReviewSubmissionId,
    );
    if (!stillSelected) {
      setSelectedReviewSubmissionId(selectedFormReviewRows[0]?.id ?? "");
    }
  }, [
    reviewWorkspaceDialogOpen,
    selectedFormReviewRows,
    selectedReviewSubmissionId,
  ]);

  function addCatalogField(type: FieldType) {
    if (!selectedForm) {
      return;
    }
    const section = activeSection ?? selectedForm.sections[0];
    const sectionId = section?.id ?? "default";
    const field = createField(
      type,
      sectionId,
      section?.pageId ?? activePage?.id,
    );
    updateSelectedForm(addField(selectedForm, field));
    setSelectedFieldId(field.id);
    setRightPanelTab("field");
    setBuilderResult(
      `${field.label} was added. Edit the label, required setting, validation, logic, and data rules in the properties panel.`,
    );
    setBuilderAssistantOpen(true);
    setBuilderActionDialogOpen(false);
  }

  function openBuilderAssistant(mode: BuilderAssistantMode, query = "") {
    setBuilderAssistantMode(mode);
    setBuilderAssistantOpen(true);
    setBuilderActionDialogOpen(true);
    if (mode === "question") {
      setSmartFieldQuery(query);
    }
  }

  function openFieldSettings(fieldId: string, tab: RightPanelTab = "field") {
    setSelectedFieldId(fieldId);
    setRightPanelTab(tab);
    if (
      builderFocusMode ||
      (typeof window !== "undefined" && window.innerWidth < 1280)
    ) {
      setFieldSettingsDialogOpen(true);
    }
  }

  function updateSelectedFieldValidation(
    patch: Partial<NonNullable<FormField["validation"]>>,
  ) {
    if (!selectedForm || !selectedField) {
      return;
    }
    updateSelectedForm(
      updateField(selectedForm, selectedField.id, {
        validation: {
          ...selectedField.validation,
          ...patch,
        },
      }),
    );
  }

  function fieldFromPreset(
    preset: FieldPreset,
    section: FormSection,
  ): FormField {
    const field = createField(preset.type, section.id, section.pageId);
    return {
      ...field,
      label: preset.label,
      hint: preset.hint,
      required: preset.required ?? field.required,
      options: preset.options ?? field.options,
      validation: { ...field.validation, ...preset.validation },
      variableName: preset.id.replaceAll("-", "_"),
    };
  }

  function addPresetField(preset: FieldPreset, targetSection?: FormSection) {
    if (!selectedForm) {
      return;
    }
    const section = targetSection ?? activeSection ?? selectedForm.sections[0];
    if (!section) {
      return;
    }
    const field = fieldFromPreset(preset, section);
    updateSelectedForm(addField(selectedForm, field));
    setSelectedFieldId(field.id);
    setRightPanelTab("field");
    if (!builderFocusMode) {
      openFieldSettings(field.id);
    }
    setBuilderResult(
      `${preset.label} was added with beginner-friendly defaults.`,
    );
    setBuilderAssistantOpen(true);
    setBuilderActionDialogOpen(false);
  }

  function addTypedQuestionFromPreset(preset: FieldPreset) {
    if (!selectedForm) {
      return;
    }
    const question = questionComposerText.trim();
    if (!question) {
      addPresetField(preset);
      return;
    }
    const section = activeSection ?? selectedForm.sections[0];
    if (!section) {
      return;
    }
    const field = fieldFromPreset(preset, section);
    const existingNames = selectedForm.fields
      .map((candidate) => candidate.variableName)
      .filter((name): name is string => Boolean(name));
    const nextField: FormField = {
      ...field,
      label: question,
      variableName: variableNameFromQuestion(question, existingNames),
    };
    updateSelectedForm(addField(selectedForm, nextField));
    setQuestionComposerText("");
    setSelectedFieldId(nextField.id);
    setRightPanelTab("field");
    setFocusSettingsTab("common");
    setBuilderActionDialogOpen(false);
    setBuilderAssistantOpen(true);
    setBuilderResult(
      `${question} was added as ${preset.label}. Default settings are ready and can be edited on the right.`,
    );
    pushToast({
      title: "Question added",
      description: `${preset.label} defaults were applied.`,
      tone: "success",
    });
  }

  function addQuestionFromComposer(suggestion: QuestionSuggestion) {
    if (!selectedForm) {
      return;
    }
    const question = questionComposerText.trim();
    if (!question) {
      pushToast({
        title: "Write the question first",
        description:
          "Type the question you want field officers to ask, then choose the response type.",
        tone: "warning",
      });
      return;
    }
    const section = activeSection ?? selectedForm.sections[0];
    if (!section) {
      return;
    }
    const field = createField(suggestion.type, section.id, section.pageId);
    const existingNames = selectedForm.fields
      .map((candidate) => candidate.variableName)
      .filter((name): name is string => Boolean(name));
    const nextField: FormField = {
      ...field,
      label: question,
      hint: suggestion.hint,
      options: suggestion.options ?? field.options,
      required: suggestion.required ?? field.required,
      validation: { ...field.validation, ...suggestion.validation },
      variableName: variableNameFromQuestion(question, existingNames),
      repeat: suggestion.repeat ?? field.repeat,
    };
    updateSelectedForm(addField(selectedForm, nextField));
    setQuestionComposerText("");
    setSelectedFieldId(nextField.id);
    setRightPanelTab("field");
    if (!builderFocusMode) {
      openFieldSettings(nextField.id);
    }
    setBuilderResult(
      `${question} was added as ${suggestion.type.replace("_", " ")}. Atlas suggested ${suggestion.settings.join(", ").toLowerCase()}.`,
    );
    pushToast({
      title: "Question added",
      description: `${suggestion.confidence}: ${suggestion.reason}`,
      tone: "success",
    });
  }

  function addSectionTemplate(template: SectionTemplate) {
    if (!selectedForm || !activePage) {
      return;
    }
    const section = createSection(activePage.id, template.title);
    const nextFields = template.fields.map((preset) =>
      fieldFromPreset(preset, section),
    );
    updateSelectedForm({
      ...selectedForm,
      sections: [
        ...selectedForm.sections,
        { ...section, description: template.description },
      ],
      fields: [...selectedForm.fields, ...nextFields],
      updatedAt: new Date().toISOString(),
    });
    setSelectedSectionId(section.id);
    if (nextFields[0]) {
      openFieldSettings(nextFields[0].id);
    }
    setBuilderResult(
      `${template.title} was inserted with ${nextFields.length} ready-to-edit questions.`,
    );
    setBuilderAssistantOpen(true);
    setBuilderActionDialogOpen(false);
  }

  function applySmartFieldSetup(
    kind: "required" | "email" | "phone" | "gps" | "yes_no" | "skip_rule",
  ) {
    if (!selectedForm || !selectedField) {
      return;
    }
    const patch: Partial<FormField> =
      kind === "required"
        ? { required: true }
        : kind === "email"
          ? {
              type: "email",
              validation: {
                ...selectedField.validation,
                pattern: "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$",
              },
              hint: selectedField.hint || "Enter a valid email address.",
            }
          : kind === "phone"
            ? {
                type: "phone",
                validation: {
                  ...selectedField.validation,
                  pattern: "^[0-9+\\-\\s()]{7,}$",
                },
                hint: selectedField.hint || "Enter a valid phone number.",
              }
            : kind === "gps"
              ? {
                  type: "gps",
                  required: true,
                  validation: { ...selectedField.validation, accuracyMax: 25 },
                  hint:
                    selectedField.hint ||
                    "Capture GPS with acceptable accuracy before submitting.",
                }
              : kind === "yes_no"
                ? {
                    type: "radio",
                    options: ["Yes", "No"],
                    hint: selectedField.hint || "Choose one response.",
                  }
                : {
                    logic: [
                      ...(selectedField.logic ?? []),
                      {
                        id: `${selectedField.id}-show-${Date.now()}`,
                        kind: "show",
                        expression: "${previous_answer} = 'Yes'",
                        message:
                          "Show this question only when the previous answer is Yes.",
                      },
                    ],
                  };
    updateSelectedForm(updateField(selectedForm, selectedField.id, patch));
    setRightPanelTab(kind === "skip_rule" ? "logic" : "field");
    setBuilderResult("Smart setup was applied to the selected field.");
    setBuilderAssistantOpen(true);
    setBuilderActionDialogOpen(false);
  }

  function addVisualLogicRule() {
    if (!selectedForm || !selectedField) {
      return;
    }
    const sourceField =
      selectedForm.fields.find((field) => field.id === logicConditionFieldId) ??
      selectedForm.fields.find((field) => field.id !== selectedField.id);
    if (!sourceField) {
      pushToast({
        title: "Add another question first",
        description:
          "Logic needs at least one previous question to use as the condition.",
        tone: "warning",
      });
      return;
    }
    const variable = sourceField.variableName ?? sourceField.id;
    const value = logicConditionValue.trim() || "Yes";
    const expression = `\${${variable}} = '${value.replaceAll("'", "\\'")}'`;
    updateSelectedForm(
      updateField(selectedForm, selectedField.id, {
        logic: [
          ...(selectedField.logic ?? []),
          {
            id: `${selectedField.id}-${logicActionKind}-${Date.now()}`,
            kind: logicActionKind,
            expression,
            message: `${logicActionKind.replace("_", " ")} this question when ${sourceField.label} is ${value}.`,
            targetId: selectedField.id,
          },
        ],
      }),
    );
    setRightPanelTab("logic");
    setBuilderResult(
      `Logic added: ${logicActionKind.replace("_", " ")} "${selectedField.label}" when "${sourceField.label}" is "${value}".`,
    );
    pushToast({
      title: "Logic rule added",
      description:
        "Atlas converted the sentence rule into a form logic expression.",
      tone: "success",
    });
  }

  function addAdvancedLogicRule() {
    if (!selectedForm || !selectedField) {
      return;
    }
    const expression = advancedLogicExpression.trim();
    if (!expression) {
      pushToast({
        title: "Logic expression required",
        description:
          "Enter the condition or formula that should control this question.",
        tone: "warning",
      });
      return;
    }
    updateSelectedForm(
      updateField(selectedForm, selectedField.id, {
        logic: [
          ...(selectedField.logic ?? []),
          {
            id: `${selectedField.id}-${advancedLogicKind}-${Date.now()}`,
            kind: advancedLogicKind,
            expression,
            message:
              advancedLogicMessage.trim() ||
              `${advancedLogicKind.replace("_", " ")} rule for exact data collection.`,
            targetId: selectedField.id,
          },
        ],
      }),
    );
    setAdvancedLogicExpression("");
    setAdvancedLogicMessage("");
    setBuilderResult(
      `Advanced ${advancedLogicKind.replace("_", " ")} logic was added to "${selectedField.label}".`,
    );
    pushToast({
      title: "Advanced logic added",
      description: "The expression is now attached to the selected question.",
      tone: "success",
    });
  }

  function addBuilderPage() {
    if (!selectedForm) {
      return;
    }
    const page = createPage(`Page ${selectedPages.length + 1}`);
    const nextForm = addPage(selectedForm, page);
    updateSelectedForm(nextForm);
    setSelectedPageId(page.id);
    setSelectedSectionId(
      nextForm.sections.find((section) => section.pageId === page.id)?.id ?? "",
    );
    setBuilderResult(
      `${page.title} was added. Add sections and questions for this survey step.`,
    );
  }

  function addBuilderSection() {
    if (!selectedForm || !activePage) {
      return;
    }
    const section = createSection(
      activePage.id,
      `Section ${activeSections.length + 1}`,
    );
    updateSelectedForm(addSection(selectedForm, section));
    setSelectedSectionId(section.id);
    setBuilderResult(`${section.title} was added to ${activePage.title}.`);
  }

  function duplicateBuilderPage(pageId: string) {
    if (!selectedForm) {
      return;
    }
    const nextForm = duplicatePage(selectedForm, pageId);
    updateSelectedForm(nextForm);
    const duplicatedPage = defaultPages(nextForm).at(-1);
    setSelectedPageId(duplicatedPage?.id ?? pageId);
    setBuilderResult(
      "The page, its sections, and its questions were duplicated into a new draft page.",
    );
  }

  function duplicateBuilderSection(sectionId: string) {
    if (!selectedForm) {
      return;
    }
    const nextForm = duplicateSection(selectedForm, sectionId);
    updateSelectedForm(nextForm);
    const duplicatedSection = nextForm.sections.at(-1);
    setSelectedSectionId(duplicatedSection?.id ?? sectionId);
    setBuilderResult("The section and its questions were duplicated.");
  }

  function movePage(pageId: string, direction: -1 | 1) {
    if (!selectedForm) {
      return;
    }
    const index = selectedPages.findIndex((page) => page.id === pageId);
    const target = selectedPages[index + direction];
    if (!target) {
      return;
    }
    updateSelectedForm(reorderPages(selectedForm, pageId, target.id));
  }

  function moveSection(sectionId: string, direction: -1 | 1) {
    if (!selectedForm) {
      return;
    }
    const index = activeSections.findIndex(
      (section) => section.id === sectionId,
    );
    const target = activeSections[index + direction];
    if (!target) {
      return;
    }
    updateSelectedForm(reorderSections(selectedForm, sectionId, target.id));
  }

  function archiveSelectedForm(): void {
    if (!selectedForm) {
      return;
    }
    const nextForm = {
      ...selectedForm,
      status: "archived" as const,
      updatedAt: new Date().toISOString(),
    };
    updateSelectedForm(nextForm);
    setBuilderResult(
      `${nextForm.name} is archived in preview. It remains visible for reference but should not be assigned to new field work.`,
    );
    pushToast({
      title: "Preview form archived",
      description: `${nextForm.name} was archived in the local preview workspace.`,
      tone: "warning",
    });
  }

  function onDragEnd(event: DragEndEvent) {
    if (!selectedForm || !event.over || event.active.id === event.over.id) {
      return;
    }
    updateSelectedForm(
      reorderFields(
        selectedForm,
        String(event.active.id),
        String(event.over.id),
      ),
    );
  }

  const selectedFormWorkbook = selectedForm
    ? toXlsFormWorkbook(selectedForm)
    : null;
  const selectedFormCompatibility = selectedForm
    ? getCollectionCompatibility(selectedForm)
    : null;
  const activeCompatibility =
    serverCompatibilityQuery.data ??
    (selectedFormCompatibility
      ? {
          xlsform_ready: selectedFormCompatibility.xlsFormReady,
          mobile_app_ready: selectedFormCompatibility.mobileAppReady,
          web_form_ready: selectedFormCompatibility.webFormReady,
          media_field_count: selectedFormCompatibility.mediaCount,
          warnings: selectedFormCompatibility.warnings,
        }
      : null);
  const assistantTitle =
    builderAssistantMode === "question"
      ? "Add smart questions"
      : builderAssistantMode === "section"
        ? "Add a ready section"
        : builderAssistantMode === "preview"
          ? "Preview the form"
          : builderAssistantMode === "logic"
            ? "Apply smart logic"
            : "Check readiness";
  const assistantDescription =
    builderAssistantMode === "question"
      ? "Choose what you want to collect. Atlas will add the right field type with beginner-friendly defaults."
      : builderAssistantMode === "section"
        ? "Insert a complete section for common M&E workflows, then edit only what needs to change."
        : builderAssistantMode === "preview"
          ? "Check how the form feels for enumerators or respondents before publishing."
          : builderAssistantMode === "logic"
            ? "Apply a common rule to the selected field without writing code."
            : "Confirm mobile readiness, XLSForm compatibility, media fields, and publish/export actions.";
  const smartCanvasAction = useMemo(() => {
    const fields = selectedForm?.fields ?? [];
    const hasIdentity = fields.some((field) =>
      /name|respondent|beneficiary/i.test(field.label),
    );
    const hasGpsOrEvidence = fields.some((field) =>
      [
        "gps",
        "geolocation",
        "map",
        "geofence",
        "polygon",
        "photo",
        "image",
        "video",
        "audio",
        "file",
        "signature",
      ].includes(field.type),
    );
    const hasLogic = fields.some((field) => field.logic?.length);
    if (!selectedForm || !activeSections.length) {
      return {
        description: "Start with a clear section so questions stay organized.",
        label: "Add first section",
        mode: "section" as BuilderAssistantMode,
        query: "",
      };
    }
    if (!fields.length || !hasIdentity) {
      return {
        description:
          "Collect the person, entity, or respondent identity first.",
        label: "Add respondent details",
        mode: "question" as BuilderAssistantMode,
        query: "name",
      };
    }
    if (!hasGpsOrEvidence) {
      return {
        description:
          "Add location or evidence fields before sending teams to the field.",
        label: "Add GPS and evidence",
        mode: "section" as BuilderAssistantMode,
        query: "",
      };
    }
    if (fields.length >= 5 && !hasLogic) {
      return {
        description:
          "Use smart logic to hide questions, require answers, or simplify branches.",
        label: "Add smart logic",
        mode: "logic" as BuilderAssistantMode,
        query: "",
      };
    }
    return {
      description: "The structure looks ready. Preview it before publishing.",
      label: "Preview form",
      mode: "preview" as BuilderAssistantMode,
      query: "",
    };
  }, [activeSections.length, selectedForm]);
  const formBuilderFocused = builderMode === "builder" && Boolean(selectedForm);
  const createFlowBuilder =
    compactBuilder || Boolean(initialDraft && onFormChange);
  const questionFirstMode = createFlowBuilder && builderMode === "builder";

  useEffect(() => {
    if (formBuilderFocused) {
      setSidebarCollapsed(true);
    }
  }, [formBuilderFocused, setSidebarCollapsed]);

  useEffect(() => {
    if (questionFirstMode) {
      setBuilderFocusMode(true);
      setBuilderFocusPanel("build");
    }
  }, [questionFirstMode]);

  return (
    <section
      aria-labelledby="forms-title"
      className={cn(
        "space-y-5",
        formBuilderFocused && "space-y-3",
        questionFirstMode && "space-y-0",
      )}
    >
      {!questionFirstMode ? (
        <div
          className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"
          data-builder-global-header
        >
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Forms
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <h1
                id="forms-title"
                className={cn(
                  "font-semibold tracking-tight",
                  formBuilderFocused ? "text-xl" : "text-2xl",
                )}
              >
                Survey form builder
              </h1>
              <HelpHint
                label="About survey form builder"
                title="Survey form builder"
              >
                Select the project and survey first, then build clear,
                offline-ready forms your field team can use confidently on
                mobile devices.
              </HelpHint>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                if (token && !isPreview && !isPersistedSelectedForm) {
                  setBuilderResult(
                    "Save this form to the backend before requesting a backend XLSForm export. Draft-only forms can still be reviewed in the on-screen preview.",
                  );
                  pushToast({
                    title: "Save form first",
                    description:
                      "Backend export is available after the form is saved.",
                    tone: "warning",
                  });
                  return;
                }
                const surveyRows = selectedFormWorkbook?.survey.length ?? 0;
                setBuilderResult(
                  `${selectedForm?.name ?? "Form"} is ready to export with ${surveyRows} survey rows, ${selectedFormWorkbook?.choices.length ?? 0} choices, and XLSForm-compatible settings.`,
                );
                pushToast({
                  title: "Export prepared",
                  description: `${selectedForm?.name ?? "Form"} is ready as JSON and XLSForm with ${surveyRows} survey rows.`,
                  tone: "success",
                });
                if (isPersistedSelectedForm && token && !isPreview) {
                  void xlsFormQuery.refetch();
                }
              }}
              type="button"
            >
              <FileDown aria-hidden="true" />
              Export
            </Button>
            <Button
              onClick={() => {
                setBuilderResult(
                  "Opening the form import workspace for template download, column mapping, validation, and governed import.",
                );
                pushToast({
                  title: "Opening import workspace",
                  description:
                    "Download the form template, map spreadsheet columns, validate rows, and import clean data.",
                  tone: "neutral",
                });
                openImportWorkspace();
              }}
              type="button"
            >
              <FileUp aria-hidden="true" />
              Import
            </Button>
            <Button onClick={() => setBuilderMode("templates")} type="button">
              <Star aria-hidden="true" />
              Template
            </Button>
            <Button onClick={openNewFormDialog} type="button" variant="primary">
              <Plus aria-hidden="true" />
              New form
            </Button>
          </div>
        </div>
      ) : (
        <h1 id="forms-title" className="sr-only">
          Survey form builder
        </h1>
      )}

      {formBuilderFocused && !questionFirstMode ? (
        <section
          className="sticky top-0 z-30 rounded-lg border bg-panel/98 px-3 py-2 shadow-line backdrop-blur"
          data-builder-sticky-header
        >
          <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_180px_180px_auto] xl:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-semibold">
                  {selectedForm?.name}
                </p>
                <Badge
                  tone={
                    selectedForm?.status === "published" ? "success" : "accent"
                  }
                >
                  {selectedForm?.status ?? "draft"}
                </Badge>
                <Badge
                  tone={
                    criticalValidationCount
                      ? "danger"
                      : warningValidationCount
                        ? "warning"
                        : "success"
                  }
                >
                  {criticalValidationCount
                    ? `${criticalValidationCount} errors`
                    : warningValidationCount
                      ? `${warningValidationCount} warnings`
                      : "Valid"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Autosave: Saved
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {selectedProject?.name ?? "Project"} /{" "}
                {selectedSurvey?.title ?? "Survey"} /{" "}
                {selectedForm?.sections.length ?? 0} sections /{" "}
                {selectedForm?.fields.length ?? 0} questions
              </p>
            </div>
            <label className="text-xs">
              <span className="sr-only">Project</span>
              <Select
                value={selectedProject?.id ?? ""}
                onChange={(event) => {
                  setSelectedProjectId(event.target.value);
                  const firstSurvey = surveys.find(
                    (survey) => survey.project_id === event.target.value,
                  );
                  setSelectedSurveyId(firstSurvey?.id ?? "");
                }}
              >
                {projects.length ? (
                  projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))
                ) : (
                  <option value="">No projects yet</option>
                )}
              </Select>
            </label>
            <label className="text-xs">
              <span className="sr-only">Survey</span>
              <Select
                value={selectedSurvey?.id ?? ""}
                onChange={(event) => setSelectedSurveyId(event.target.value)}
              >
                {projectSurveys.length ? (
                  projectSurveys.map((survey) => (
                    <option key={survey.id} value={survey.id}>
                      {survey.title}
                    </option>
                  ))
                ) : (
                  <option value="">No surveys in project</option>
                )}
              </Select>
            </label>
            <div className="flex flex-wrap justify-end gap-1.5">
              <Button
                onClick={() => openBuilderAssistant("preview")}
                size="sm"
                type="button"
                variant="secondary"
              >
                <Eye aria-hidden="true" />
                Preview
              </Button>
              <Button
                onClick={() => {
                  setBuilderResult(
                    criticalValidationCount
                      ? `Validation found ${criticalValidationCount} critical issue(s). Fix them before publishing.`
                      : warningValidationCount
                        ? `Validation passed with ${warningValidationCount} warning(s). Review warnings before rollout.`
                        : "Validation passed. The form is ready for publish review.",
                  );
                  openBuilderAssistant("readiness");
                }}
                size="sm"
                type="button"
                variant={criticalValidationCount ? "primary" : "secondary"}
              >
                <Check aria-hidden="true" />
                Validate
              </Button>
              <Button
                onClick={openReadinessChecklist}
                size="sm"
                type="button"
                variant="secondary"
              >
                <ClipboardList aria-hidden="true" />
                Review
              </Button>
              <Button
                disabled={
                  publishMutation.isPending || criticalValidationCount > 0
                }
                onClick={() => saveSelectedForm(true)}
                size="sm"
                type="button"
                variant="primary"
              >
                <UploadCloud aria-hidden="true" />
                Publish
              </Button>
            </div>
          </div>
        </section>
      ) : !formBuilderFocused ? (
        <section className="surface-premium rounded-2xl p-4" data-builder-flow>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Required creation flow
              </p>
              <h2 className="mt-2 text-lg font-semibold">
                Project, Survey, Form, Publish, Deploy
              </h2>
              <div className="mt-1">
                <HelpHint
                  label="About required creation flow"
                  title="Required creation flow"
                >
                  Forms are now collection tools inside surveys. This keeps
                  every submission connected to the correct project, M&E
                  activity, indicator set, team, and report.
                </HelpHint>
              </div>
            </div>
            <div className="grid min-w-0 flex-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
              <label className="text-sm">
                <span className="mb-1 block font-medium">Step 1: Project</span>
                <Select
                  value={selectedProject?.id ?? ""}
                  onChange={(event) => {
                    setSelectedProjectId(event.target.value);
                    const firstSurvey = surveys.find(
                      (survey) => survey.project_id === event.target.value,
                    );
                    setSelectedSurveyId(firstSurvey?.id ?? "");
                  }}
                >
                  {projects.length ? (
                    projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))
                  ) : (
                    <option value="">No projects yet</option>
                  )}
                </Select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium">Step 2: Survey</span>
                <Select
                  value={selectedSurvey?.id ?? ""}
                  onChange={(event) => setSelectedSurveyId(event.target.value)}
                >
                  {projectSurveys.length ? (
                    projectSurveys.map((survey) => (
                      <option key={survey.id} value={survey.id}>
                        {survey.title}
                      </option>
                    ))
                  ) : (
                    <option value="">No surveys in project</option>
                  )}
                </Select>
              </label>
              <Button
                className="md:self-end"
                onClick={() => setShowWorkflowDetails((current) => !current)}
                type="button"
                variant="secondary"
              >
                <ClipboardList aria-hidden="true" />
                {showWorkflowDetails ? "Hide steps" : "Show steps"}
              </Button>
            </div>
          </div>
          {showWorkflowDetails ? (
            <div className="mt-4 grid gap-2 text-xs text-muted-foreground md:grid-cols-5">
              {[
                "Select project",
                "Select survey",
                "Create form",
                "Publish form",
                "Deploy to app",
              ].map((step, index) => (
                <div
                  key={step}
                  className="rounded-lg border bg-panel px-3 py-2"
                >
                  <span className="font-semibold text-foreground">
                    Step {index + 1}
                  </span>
                  <span className="mt-1 block">{step}</span>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {builderResult && !questionFirstMode ? (
        <section
          className={cn(
            "border border-success/30 bg-success/10",
            formBuilderFocused ? "rounded-lg px-3 py-2" : "rounded-2xl p-4",
          )}
          aria-live="polite"
          data-builder-result
        >
          <div className="flex items-start gap-2">
            <Check
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-success"
              size={formBuilderFocused ? 15 : 18}
            />
            <div>
              <h2
                className={cn(
                  "font-semibold",
                  formBuilderFocused ? "sr-only" : "text-sm",
                )}
              >
                Builder result
              </h2>
              <p
                className={cn(
                  "text-muted-foreground",
                  formBuilderFocused
                    ? "line-clamp-1 text-xs"
                    : "mt-1 text-sm leading-6",
                )}
              >
                {builderResult}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <Modal
        description="Choose the survey context and how the form will be used. Atlas will create a smart starter form and suggest the next action."
        onOpenChange={setNewFormDialogOpen}
        open={newFormDialogOpen}
        title="Create a new survey form"
      >
        <div className="flex-1 overflow-y-auto p-5 product-scrollbar">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block font-medium">1. Project</span>
              <Select
                value={selectedProject?.id ?? ""}
                onChange={(event) => {
                  setSelectedProjectId(event.target.value);
                  const firstSurvey = surveys.find(
                    (survey) => survey.project_id === event.target.value,
                  );
                  setSelectedSurveyId(firstSurvey?.id ?? "");
                }}
              >
                {projects.length ? (
                  projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))
                ) : (
                  <option value="">No projects available</option>
                )}
              </Select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">2. Survey</span>
              <Select
                value={selectedSurvey?.id ?? ""}
                onChange={(event) => setSelectedSurveyId(event.target.value)}
              >
                {projectSurveys.length ? (
                  projectSurveys.map((survey) => (
                    <option key={survey.id} value={survey.id}>
                      {survey.title}
                    </option>
                  ))
                ) : (
                  <option value="">No surveys in this project</option>
                )}
              </Select>
            </label>
          </div>

          <label className="mt-4 block text-sm">
            <span className="mb-1 block font-medium">Form name</span>
            <Input
              onChange={(event) => setNewFormName(event.target.value)}
              placeholder="Example: Baseline household survey"
              value={newFormName}
            />
          </label>

          <label className="mt-4 block text-sm">
            <span className="mb-1 block font-medium">Form description</span>
            <Textarea
              className="min-h-24"
              onChange={(event) => setNewFormDescription(event.target.value)}
              placeholder="Explain what this form collects, who will use it, and what the data will support."
              value={newFormDescription}
            />
          </label>

          <label className="mt-4 block text-sm">
            <span className="mb-1 block font-medium">Form type</span>
            <Select
              onChange={(event) => setNewFormType(event.target.value as FormType | "")}
              value={newFormType}
            >
              <option value="">Unspecified</option>
              {FORM_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.replace("_", " ")}
                </option>
              ))}
            </Select>
          </label>

          <div className="mt-4">
            <p className="text-sm font-medium">3. Distribution channel</p>
            <div className="mt-1">
              <HelpHint
                label="About distribution channel"
                title="Distribution channel"
              >
                Choose the main way this form will be shared with enumerators or
                respondents.
              </HelpHint>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {(
                [
                  [
                    "survey_app",
                    Smartphone,
                    "Survey App",
                    "Best for trained field teams collecting data on mobile.",
                  ],
                  [
                    "web_link",
                    MonitorSmartphone,
                    "Web link",
                    "Best for browser-based staff collection.",
                  ],
                  [
                    "public_link",
                    FileUp,
                    "Public form",
                    "Best for controlled external respondent access.",
                  ],
                  [
                    "xlsform",
                    FileDown,
                    "XLSForm / ODK",
                    "Best for Kobo or ODK-style migration and review.",
                  ],
                ] satisfies [DistributionChannel, typeof Type, string, string][]
              ).map(([channel, Icon, label, helper]) => (
                <button
                  className={cn(
                    "rounded-lg border bg-background p-3 text-left transition hover:border-primary/40 hover:bg-primary/5",
                    newFormChannel === channel &&
                      "border-primary/50 bg-primary/10",
                  )}
                  key={channel}
                  onClick={() => setNewFormChannel(channel)}
                  type="button"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <Icon
                      aria-hidden="true"
                      className="text-primary"
                      size={16}
                    />
                    {label}
                  </span>
                  <span className="mt-2 inline-flex">
                    <HelpHint label={`About ${label}`} title={label}>
                      {helper}
                    </HelpHint>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <p className="text-sm font-medium">
              4. Recommended starting blocks
            </p>
            <div className="mt-1">
              <HelpHint
                label="About recommended starting blocks"
                title="Recommended starting blocks"
              >
                Atlas will add these sections first. You can remove, edit, or
                add more later.
              </HelpHint>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {sectionTemplates.map((template) => {
                const checked = newFormBlocks.includes(template.id);
                return (
                  <button
                    className={cn(
                      "rounded-lg border bg-background p-3 text-left transition hover:border-primary/40 hover:bg-primary/5",
                      checked && "border-primary/50 bg-primary/10",
                    )}
                    key={template.id}
                    onClick={() =>
                      setNewFormBlocks((current) =>
                        current.includes(template.id)
                          ? current.filter((id) => id !== template.id)
                          : [...current, template.id],
                      )
                    }
                    type="button"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">
                        {template.title}
                      </span>
                      {checked ? (
                        <Check
                          aria-hidden="true"
                          className="text-primary"
                          size={16}
                        />
                      ) : null}
                    </span>
                    <span className="mt-2 inline-flex">
                      <HelpHint
                        label={`About ${template.title}`}
                        title={template.title}
                      >
                        {template.description} · {template.fields.length} fields
                      </HelpHint>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5 rounded-lg border bg-background p-3">
            <p className="text-sm font-semibold">What happens next</p>
            <div className="mt-1">
              <HelpHint label="What happens next" title="What happens next">
                Atlas creates the starter form, opens the simplified canvas, and
                shows one next action: add a question, add a section, preview,
                or check readiness.
              </HelpHint>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t px-5 py-4 sm:flex-row sm:justify-end">
          <Button
            onClick={() => setNewFormDialogOpen(false)}
            type="button"
            variant="ghost"
          >
            Cancel
          </Button>
          <Button
            disabled={
              !selectedProject || !selectedSurvey || !newFormName.trim()
            }
            onClick={createGuidedForm}
            type="button"
            variant="primary"
          >
            Continue to builder
          </Button>
        </div>
      </Modal>

      <Modal
        contentClassName="max-w-3xl"
        description="Check the required project, survey, controls, workflow, quality, and deployment items before the form is published."
        onOpenChange={setReadinessDialogOpen}
        open={readinessDialogOpen}
        title="Form readiness checklist"
      >
        <div className="flex-1 overflow-y-auto p-5 product-scrollbar">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border bg-primary/5 p-4">
              <p className="text-xs font-medium text-muted-foreground">
                Readiness progress
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {readinessCompletedCount}/{readinessItems.length}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Checks complete
              </p>
            </div>
            <div className="rounded-lg border bg-background p-4">
              <p className="text-xs font-medium text-muted-foreground">
                Required blockers
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {readinessRequiredMissingCount}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {readinessRequiredMissingCount
                  ? "Resolve before publishing"
                  : "Ready to publish"}
              </p>
            </div>
            <div className="rounded-lg border bg-background p-4">
              <p className="text-xs font-medium text-muted-foreground">
                Form context
              </p>
              <p className="mt-2 truncate text-sm font-semibold">
                {selectedForm?.name ?? "No form selected"}
              </p>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {selectedProject?.name ?? "No project"} /{" "}
                {selectedSurvey?.title ?? "No survey"}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            {readinessItems.map((item) => (
              <div
                className={cn(
                  "flex flex-col gap-3 rounded-lg border bg-background p-3 sm:flex-row sm:items-center sm:justify-between",
                  item.complete
                    ? "border-success/20"
                    : item.required
                      ? "border-warning/35 bg-warning/5"
                      : "border-border",
                )}
                key={item.id}
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                      item.complete
                        ? "border-success/25 bg-success/10 text-success"
                        : "border-warning/25 bg-warning/10 text-warning",
                    )}
                  >
                    {item.complete ? (
                      <Check aria-hidden="true" size={16} />
                    ) : (
                      <ClipboardList aria-hidden="true" size={16} />
                    )}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{item.label}</p>
                      <HelpHint
                        label={`About ${item.label}`}
                        title={item.label}
                      >
                        {item.description}
                      </HelpHint>
                      <Badge tone={item.required ? "warning" : "neutral"}>
                        {item.required ? "Required" : "Recommended"}
                      </Badge>
                      {item.complete ? (
                        <Badge tone="success">Complete</Badge>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {item.id === "controls" ||
                  item.id === "workflow" ||
                  item.id === "quality" ? (
                    <Button
                      onClick={() => {
                        setReadinessDialogOpen(false);
                        setFormControlsTab(
                          item.id === "workflow"
                            ? "workflow"
                            : item.id === "quality"
                              ? "quality"
                              : "overview",
                        );
                        setFormControlsDialogOpen(true);
                      }}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      Open controls
                    </Button>
                  ) : null}
                  {item.id === "mobile-preview" && !item.complete ? (
                    <Button
                      onClick={() => {
                        setPreviewMode("mobile");
                        updateSelectedReadiness({ mobilePreviewChecked: true });
                      }}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      Mark checked
                    </Button>
                  ) : null}
                  {item.id === "pilot-test" && !item.complete ? (
                    <Button
                      onClick={() =>
                        updateSelectedReadiness({ pilotTestCompleted: true })
                      }
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      Mark pilot done
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-lg border bg-panel p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck
                aria-hidden="true"
                className="text-primary"
                size={17}
              />
              <h3 className="text-sm font-semibold">Manager preparation</h3>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {[
                ["enumeratorBriefingReady", "Enumerator briefing is ready"],
                ["importTemplateReviewed", "Excel import template reviewed"],
              ].map(([key, label]) => {
                const stateKey = key as keyof Pick<
                  FormReadinessState,
                  "enumeratorBriefingReady" | "importTemplateReviewed"
                >;
                return (
                  <button
                    className={cn(
                      "flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-left text-sm transition hover:border-primary/40 hover:bg-primary/5",
                      selectedFormReadiness[stateKey] &&
                        "border-success/25 bg-success/10",
                    )}
                    key={key}
                    onClick={() =>
                      updateSelectedReadiness(
                        stateKey === "enumeratorBriefingReady"
                          ? {
                              enumeratorBriefingReady:
                                !selectedFormReadiness.enumeratorBriefingReady,
                            }
                          : {
                              importTemplateReviewed:
                                !selectedFormReadiness.importTemplateReviewed,
                            },
                      )
                    }
                    type="button"
                  >
                    <Check
                      aria-hidden="true"
                      className={
                        selectedFormReadiness[stateKey]
                          ? "text-success"
                          : "text-muted-foreground"
                      }
                      size={16}
                    />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t px-5 py-4 sm:flex-row sm:justify-between">
          <Button
            onClick={() => {
              setReadinessDialogOpen(false);
              setFormControlsTab("overview");
              setFormControlsDialogOpen(true);
            }}
            type="button"
            variant="secondary"
          >
            <ShieldCheck aria-hidden="true" />
            Open controls
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={() => setReadinessDialogOpen(false)}
              type="button"
              variant="ghost"
            >
              Close
            </Button>
            <Button
              onClick={openDeploymentCenter}
              type="button"
              variant="secondary"
            >
              <Smartphone aria-hidden="true" />
              Deployment center
            </Button>
            <Button
              disabled={!readinessReadyForPublish || publishMutation.isPending}
              onClick={() => {
                setReadinessDialogOpen(false);
                saveSelectedForm(true);
              }}
              type="button"
              variant="primary"
            >
              <UploadCloud aria-hidden="true" />
              {publishMutation.isPending ? "Publishing" : "Publish form"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        contentClassName="max-w-4xl"
        description="Publish the current form version, choose who receives it, and make it available in the Survey App after sync."
        onOpenChange={setMobileDeployDialogOpen}
        open={mobileDeployDialogOpen}
        title="Publish and deployment center"
      >
        <div className="flex-1 overflow-y-auto p-5 product-scrollbar">
          <div className="grid gap-3 md:grid-cols-4">
            {[
              [
                "Readiness",
                `${readinessCompletedCount}/${readinessItems.length}`,
                readinessRequiredMissingCount
                  ? `${readinessRequiredMissingCount} required left`
                  : "Ready",
              ],
              [
                "Version",
                `v${selectedForm?.version ?? 0}`,
                selectedForm?.status ?? "Draft",
              ],
              [
                "Audience",
                mobileDeploymentAudience,
                mobileDeploymentSyncMode.replace("_", " "),
              ],
              [
                "Mobile status",
                selectedMobileDeployment ? "Deployed" : "Not sent",
                selectedMobileDeployment?.deployedAt
                  ? new Date(
                      selectedMobileDeployment.deployedAt,
                    ).toLocaleString()
                  : "Pending",
              ],
            ].map(([label, value, helper]) => (
              <div className="rounded-lg border bg-background p-3" key={label}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-2 truncate text-sm font-semibold">{value}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {helper}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-lg border bg-background p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-primary/10 text-primary">
                <Smartphone aria-hidden="true" size={18} />
              </span>
              <div>
                <p className="text-sm font-semibold">
                  {selectedForm?.name ?? "Selected form"}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {selectedProject?.name ?? "Project"} /{" "}
                  {selectedSurvey?.title ?? "Survey"} /{" "}
                  {selectedForm?.fields.length ?? 0} questions
                </p>
              </div>
            </div>
          </div>

          <label className="mt-4 block text-sm">
            <span className="mb-1 block font-medium">
              Who should receive it?
            </span>
            <Select
              value={mobileDeploymentAudience}
              onChange={(event) =>
                setMobileDeploymentAudience(event.target.value)
              }
            >
              <option value="All assigned field officers">
                All assigned field officers
              </option>
              <option value="Survey team only">Survey team only</option>
              <option value="Supervisors for testing">
                Supervisors for testing
              </option>
            </Select>
          </label>

          <div className="mt-4">
            <p className="text-sm font-medium">Mobile sync mode</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {(
                [
                  [
                    "offline_first",
                    "Offline first",
                    "Best for field teams with unreliable internet.",
                  ],
                  [
                    "online_required",
                    "Online required",
                    "Use when submissions must be sent immediately.",
                  ],
                ] satisfies [
                  "offline_first" | "online_required",
                  string,
                  string,
                ][]
              ).map(([mode, label, helper]) => (
                <button
                  className={cn(
                    "rounded-lg border bg-background p-3 text-left transition hover:border-primary/40 hover:bg-primary/5",
                    mobileDeploymentSyncMode === mode &&
                      "border-primary/50 bg-primary/10",
                  )}
                  key={mode}
                  onClick={() => setMobileDeploymentSyncMode(mode)}
                  type="button"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    {label}
                    <HelpHint label={`About ${label}`} title={label}>
                      {helper}
                    </HelpHint>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div
            className={cn(
              "mt-4 rounded-lg border p-3",
              readinessReadyForPublish
                ? "border-success/25 bg-success/10"
                : "border-warning/25 bg-warning/10",
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">
                  {readinessReadyForPublish
                    ? "Ready for field rollout"
                    : "Readiness items need attention"}
                </p>
                <div className="mt-1">
                  <HelpHint
                    label="About rollout readiness"
                    title={
                      readinessReadyForPublish
                        ? "Ready for field rollout"
                        : "Readiness items need attention"
                    }
                  >
                    {readinessReadyForPublish
                      ? "Publish and deploy this version, then ask field officers to sync the Survey App and open Assigned forms."
                      : "Complete required checks before this form is sent to field teams."}
                  </HelpHint>
                </div>
              </div>
              <Button
                onClick={openReadinessChecklist}
                size="sm"
                type="button"
                variant="secondary"
              >
                View checklist
              </Button>
            </div>
            {!readinessReadyForPublish ? (
              <ul className="mt-3 space-y-1 text-xs leading-5 text-muted-foreground">
                {readinessItems
                  .filter((item) => item.required && !item.complete)
                  .map((item) => (
                    <li key={item.id}>- {item.label}</li>
                  ))}
              </ul>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t px-5 py-4 sm:flex-row sm:justify-between">
          <Button
            onClick={openAssignmentWorkspace}
            type="button"
            variant="secondary"
          >
            Assignment workspace
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={() => setMobileDeployDialogOpen(false)}
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              disabled={
                !selectedForm ||
                publishMutation.isPending ||
                !readinessReadyForPublish
              }
              onClick={deploySelectedFormToMobileApp}
              type="button"
              variant="primary"
            >
              <Smartphone aria-hidden="true" />
              {publishMutation.isPending ? "Deploying" : "Deploy to Survey App"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        contentClassName="max-w-4xl"
        description="Assign this form to the right team, supervisor, location scope, and collection targets before field rollout."
        onOpenChange={setAssignmentWorkspaceDialogOpen}
        open={assignmentWorkspaceDialogOpen}
        title={`Assignment workspace${selectedForm ? `: ${selectedForm.name}` : ""}`}
      >
        <div className="flex-1 overflow-y-auto p-5 product-scrollbar">
          <div className="grid gap-3 md:grid-cols-4">
            {[
              [
                "Audience",
                selectedAssignmentPlan.audience,
                "Who receives the form",
              ],
              ["Team", selectedAssignmentPlan.team, "Collection group"],
              [
                "Target",
                String(selectedAssignmentPlan.targetSubmissions),
                "Expected submissions",
              ],
              [
                "Briefing",
                selectedAssignmentPlan.briefingComplete
                  ? "Complete"
                  : "Pending",
                "Enumerator readiness",
              ],
            ].map(([label, value, helper]) => (
              <div className="rounded-lg border bg-background p-3" key={label}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-2 truncate text-sm font-semibold">{value}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {helper}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium">
              Collection team
              <Input
                className="mt-2"
                onChange={(event) =>
                  updateAssignmentPlan({ team: event.target.value })
                }
                value={selectedAssignmentPlan.team}
              />
            </label>
            <label className="block text-sm font-medium">
              Supervisor
              <Input
                className="mt-2"
                onChange={(event) =>
                  updateAssignmentPlan({ supervisor: event.target.value })
                }
                value={selectedAssignmentPlan.supervisor}
              />
            </label>
            <label className="block text-sm font-medium">
              Location scope
              <Input
                className="mt-2"
                onChange={(event) =>
                  updateAssignmentPlan({ locationScope: event.target.value })
                }
                value={selectedAssignmentPlan.locationScope}
              />
            </label>
            <label className="block text-sm font-medium">
              Mobile audience
              <Select
                value={selectedAssignmentPlan.audience}
                onChange={(event) =>
                  updateAssignmentPlan({ audience: event.target.value })
                }
              >
                <option value="All assigned field officers">
                  All assigned field officers
                </option>
                <option value="Survey team only">Survey team only</option>
                <option value="Supervisors for testing">
                  Supervisors for testing
                </option>
              </Select>
            </label>
            <label className="block text-sm font-medium">
              Target submissions
              <Input
                className="mt-2"
                min={0}
                onChange={(event) =>
                  updateAssignmentPlan({
                    targetSubmissions: Number(event.target.value) || 0,
                  })
                }
                type="number"
                value={selectedAssignmentPlan.targetSubmissions}
              />
            </label>
            <label className="block text-sm font-medium">
              Daily target
              <Input
                className="mt-2"
                min={0}
                onChange={(event) =>
                  updateAssignmentPlan({
                    dailyTarget: Number(event.target.value) || 0,
                  })
                }
                type="number"
                value={selectedAssignmentPlan.dailyTarget}
              />
            </label>
            <label className="block text-sm font-medium md:col-span-2">
              Pilot enumerator
              <Input
                className="mt-2"
                onChange={(event) =>
                  updateAssignmentPlan({ pilotEnumerator: event.target.value })
                }
                value={selectedAssignmentPlan.pilotEnumerator}
              />
            </label>
          </div>

          <button
            className={cn(
              "mt-5 flex w-full items-center gap-3 rounded-lg border bg-background p-3 text-left transition hover:border-primary/40 hover:bg-primary/5",
              selectedAssignmentPlan.briefingComplete &&
                "border-success/25 bg-success/10",
            )}
            onClick={() =>
              updateAssignmentPlan({
                briefingComplete: !selectedAssignmentPlan.briefingComplete,
              })
            }
            type="button"
          >
            <Check
              aria-hidden="true"
              className={
                selectedAssignmentPlan.briefingComplete
                  ? "text-success"
                  : "text-muted-foreground"
              }
              size={18}
            />
            <span>
              <span className="block text-sm font-semibold">
                Enumerator briefing completed
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                Confirm the team understands the form, sync process, correction
                workflow, and collection targets.
              </span>
            </span>
          </button>
        </div>
        <div className="flex flex-col gap-2 border-t px-5 py-4 sm:flex-row sm:justify-between">
          <Button
            onClick={openDeploymentCenter}
            type="button"
            variant="secondary"
          >
            <Smartphone aria-hidden="true" />
            Deployment center
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={() => setAssignmentWorkspaceDialogOpen(false)}
              type="button"
              variant="ghost"
            >
              Close
            </Button>
            <Button
              onClick={saveAssignmentPlan}
              type="button"
              variant="primary"
            >
              Save assignment
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        contentClassName="max-w-5xl"
        description="Download a matching spreadsheet template, map columns to form questions, validate records, and import clean data into this form."
        onOpenChange={setImportWorkspaceDialogOpen}
        open={importWorkspaceDialogOpen}
        title={`Import workspace${selectedForm ? `: ${selectedForm.name}` : ""}`}
      >
        <div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="min-h-0 border-b bg-background/70 p-5 lg:border-b-0 lg:border-r">
            <div className="rounded-lg border bg-panel p-4">
              <FileUp aria-hidden="true" className="text-primary" />
              <h3 className="mt-3 text-sm font-semibold">
                Template and mapping
              </h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Use the template generated from this form so uploaded Excel or
                CSV files match question names, required fields, and validation
                rules.
              </p>
              <div className="mt-4 grid gap-2">
                <Button
                  onClick={() => {
                    updateSelectedReadiness({ importTemplateReviewed: true });
                    setBuilderResult(
                      `${selectedForm?.name ?? "Form"} import template is ready with ${selectedFormWorkbook?.survey.length ?? 0} XLSForm survey rows.`,
                    );
                    pushToast({
                      title: "Template ready",
                      description:
                        "Use Export for the XLSForm workbook, or validate a spreadsheet from this workspace.",
                      tone: "success",
                    });
                  }}
                  type="button"
                  variant="secondary"
                >
                  <FileDown aria-hidden="true" />
                  Prepare template
                </Button>
                <Button
                  onClick={validateImportTemplate}
                  type="button"
                  variant="primary"
                >
                  <Check aria-hidden="true" />
                  Validate sample file
                </Button>
              </div>
            </div>

            <div className="mt-4 rounded-lg border bg-panel p-4">
              <h3 className="text-sm font-semibold">Import readiness</h3>
              <div className="mt-3 space-y-2 text-sm">
                {[
                  ["Questions", String(selectedForm?.fields.length ?? 0)],
                  [
                    "Required columns",
                    String(
                      selectedForm?.fields.filter((field) => field.required)
                        .length ?? 0,
                    ),
                  ],
                  [
                    "XLSForm rows",
                    String(selectedFormWorkbook?.survey.length ?? 0),
                  ],
                  [
                    "Template checked",
                    selectedFormReadiness.importTemplateReviewed ? "Yes" : "No",
                  ],
                ].map(([label, value]) => (
                  <div
                    className="flex items-center justify-between rounded-md border bg-background px-3 py-2"
                    key={label}
                  >
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-semibold">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <section className="min-h-0 overflow-y-auto p-5 product-scrollbar">
            <div className="rounded-lg border bg-panel">
              <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                <div>
                  <h3 className="text-sm font-semibold">
                    Column mapping preview
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Each spreadsheet column should map to one form question.
                  </p>
                </div>
                <Badge tone="accent">
                  {selectedForm?.fields.length ?? 0} fields
                </Badge>
              </div>
              <div className="max-h-64 overflow-y-auto product-scrollbar">
                {(selectedForm?.fields ?? []).map((field) => (
                  <div
                    className="grid gap-2 border-b px-4 py-3 text-sm md:grid-cols-[minmax(0,1fr)_140px_100px]"
                    key={field.id}
                  >
                    <span className="truncate font-medium">{field.label}</span>
                    <span className="text-muted-foreground">
                      {field.type.replace("_", " ")}
                    </span>
                    <Badge tone={field.required ? "warning" : "neutral"}>
                      {field.required ? "Required" : "Optional"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-lg border bg-panel">
              <div className="border-b px-4 py-3">
                <h3 className="text-sm font-semibold">Recent import runs</h3>
              </div>
              <div className="divide-y">
                {selectedImportRuns.map((run) => (
                  <div
                    className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto]"
                    key={run.id}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold">
                          {run.fileName}
                        </p>
                        <Badge tone={getImportStatusTone(run.status)}>
                          {run.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {run.rows} rows · {run.mappedColumns} mapped columns ·{" "}
                        {run.validRows} valid · {run.issueCount} issues ·{" "}
                        {new Date(run.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      disabled={run.status === "imported"}
                      onClick={() => markImportAsImported(run.id)}
                      size="sm"
                      type="button"
                      variant={
                        run.status === "imported" ? "secondary" : "primary"
                      }
                    >
                      {run.status === "imported"
                        ? "Imported"
                        : "Import clean rows"}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
        <div className="flex flex-col gap-2 border-t px-5 py-4 sm:flex-row sm:justify-between">
          <Button
            onClick={openQualityWorkspace}
            type="button"
            variant="secondary"
          >
            <Check aria-hidden="true" />
            Open quality workspace
          </Button>
          <Button
            onClick={() => setImportWorkspaceDialogOpen(false)}
            type="button"
            variant="ghost"
          >
            Close
          </Button>
        </div>
      </Modal>

      <Modal
        contentClassName="max-w-5xl"
        description="Monitor form-level quality flags, assign owners, resolve issues, and move clean records toward reporting."
        onOpenChange={setQualityWorkspaceDialogOpen}
        open={qualityWorkspaceDialogOpen}
        title={`Data quality workspace${selectedForm ? `: ${selectedForm.name}` : ""}`}
      >
        <div className="flex-1 overflow-y-auto p-5 product-scrollbar">
          <div className="grid gap-3 md:grid-cols-4">
            {[
              [
                "Open flags",
                selectedQualityFlags.filter(
                  (flag) => flag.status !== "resolved",
                ).length,
              ],
              [
                "Critical / high",
                selectedQualityFlags.filter((flag) =>
                  ["Critical", "High"].includes(flag.severity),
                ).length,
              ],
              [
                "Needs review",
                selectedFormReviewRows.filter((submission) =>
                  [
                    "submitted",
                    "under_review",
                    "correction_requested",
                  ].includes(submission.status),
                ).length,
              ],
              [
                "Approved",
                selectedFormReviewRows.filter(
                  (submission) => submission.status === "approved",
                ).length,
              ],
            ].map(([label, value]) => (
              <div className="rounded-lg border bg-background p-3" key={label}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-2 text-2xl font-semibold">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
            <section className="rounded-lg border bg-panel">
              <div className="border-b px-4 py-3">
                <h3 className="text-sm font-semibold">Quality flags</h3>
              </div>
              <div className="divide-y">
                {selectedQualityFlags.map((flag) => (
                  <div
                    className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto]"
                    key={flag.id}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">{flag.label}</p>
                        <Badge tone={getQualitySeverityTone(flag.severity)}>
                          {flag.severity}
                        </Badge>
                        <Badge
                          tone={
                            flag.status === "resolved" ? "success" : "warning"
                          }
                        >
                          {flag.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {flag.affectedRecords} affected records · Owner:{" "}
                        {flag.owner}. {flag.recommendation}
                      </p>
                    </div>
                    <Button
                      disabled={flag.status === "resolved"}
                      onClick={() => resolveQualityFlag(flag.id)}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      {flag.status === "resolved" ? "Resolved" : "Resolve"}
                    </Button>
                  </div>
                ))}
              </div>
            </section>

            <aside className="rounded-lg border bg-background p-4">
              <h3 className="text-sm font-semibold">Active checks</h3>
              <div className="mt-3 space-y-2">
                {selectedFormControls.data_quality_rules
                  .filter((rule) => rule.enabled)
                  .map((rule) => (
                    <div
                      className="rounded-md border bg-panel px-3 py-2 text-sm"
                      key={rule.id}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{rule.label}</span>
                        <Badge
                          tone={
                            rule.severity === "critical"
                              ? "danger"
                              : rule.severity === "high"
                                ? "warning"
                                : "neutral"
                          }
                        >
                          {rule.severity}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {rule.rule_type.replaceAll("_", " ")}
                        {rule.expression ? ` · ${rule.expression}` : ""}
                      </p>
                    </div>
                  ))}
              </div>
              <Button
                className="mt-4 w-full"
                onClick={openSubmissionReviewWorkspace}
                type="button"
                variant="primary"
              >
                <Eye aria-hidden="true" />
                Review records
              </Button>
            </aside>
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t px-5 py-4 sm:flex-row sm:justify-between">
          <Button
            onClick={openImportWorkspace}
            type="button"
            variant="secondary"
          >
            <FileUp aria-hidden="true" />
            Import workspace
          </Button>
          <Button
            onClick={() => setQualityWorkspaceDialogOpen(false)}
            type="button"
            variant="ghost"
          >
            Close
          </Button>
        </div>
      </Modal>

      <Modal
        contentClassName="max-w-6xl"
        description="Review synced records for this form, approve clean data, or return records that need correction."
        onOpenChange={setReviewWorkspaceDialogOpen}
        open={reviewWorkspaceDialogOpen}
        title={`Submission review workspace${selectedForm ? `: ${selectedForm.name}` : ""}`}
      >
        <div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="min-h-0 border-b bg-background/70 lg:border-b-0 lg:border-r">
            <div className="grid grid-cols-2 gap-2 border-b p-4">
              {[
                [
                  "Waiting",
                  selectedFormReviewRows.filter((submission) =>
                    ["submitted", "under_review", "resubmitted"].includes(
                      submission.status,
                    ),
                  ).length,
                ],
                [
                  "Approved",
                  selectedFormReviewRows.filter(
                    (submission) => submission.status === "approved",
                  ).length,
                ],
                [
                  "Correction",
                  selectedFormReviewRows.filter(
                    (submission) =>
                      submission.status === "correction_requested",
                  ).length,
                ],
                [
                  "Offline",
                  selectedFormReviewRows.filter(
                    (submission) => submission.offline_created,
                  ).length,
                ],
              ].map(([label, value]) => (
                <div className="rounded-lg border bg-panel p-3" key={label}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 text-xl font-semibold">{value}</p>
                </div>
              ))}
            </div>
            <div className="max-h-[56vh] space-y-2 overflow-y-auto p-4 product-scrollbar">
              {formSubmissionsQuery.isLoading && !isPreview ? (
                <div className="rounded-lg border bg-panel p-4 text-sm text-muted-foreground">
                  Loading submissions...
                </div>
              ) : null}
              {!selectedFormReviewRows.length &&
              !formSubmissionsQuery.isLoading ? (
                <div className="rounded-lg border bg-panel p-4 text-sm leading-5 text-muted-foreground">
                  No submissions are available for this form yet. Once field
                  officers sync records, they will appear here for review.
                </div>
              ) : null}
              {selectedFormReviewRows.map((submission) => (
                <button
                  className={cn(
                    "w-full rounded-lg border bg-panel p-3 text-left transition hover:border-primary/40 hover:bg-primary/5",
                    selectedReviewSubmission?.id === submission.id &&
                      "border-primary/50 bg-primary/10",
                  )}
                  key={submission.id}
                  onClick={() => setSelectedReviewSubmissionId(submission.id)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {submission.client_submission_id}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(submission.submitted_at).toLocaleString()}
                      </p>
                    </div>
                    <Badge tone={getReviewStatusTone(submission.status)}>
                      {formatReviewStatus(submission.status)}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    GPS {submission.latitude.toFixed(4)},{" "}
                    {submission.longitude.toFixed(4)}
                    {submission.offline_created ? " · offline draft" : ""}
                  </p>
                </button>
              ))}
            </div>
          </aside>

          <section className="min-h-0 overflow-y-auto p-5 product-scrollbar">
            {selectedReviewSubmission ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 rounded-lg border bg-panel p-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold">
                        {selectedReviewSubmission.client_submission_id}
                      </h3>
                      <Badge
                        tone={getReviewStatusTone(
                          selectedReviewSubmission.status,
                        )}
                      >
                        {formatReviewStatus(selectedReviewSubmission.status)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Captured{" "}
                      {new Date(
                        selectedReviewSubmission.captured_at,
                      ).toLocaleString()}{" "}
                      · Synced{" "}
                      {new Date(
                        selectedReviewSubmission.sync_received_at,
                      ).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    disabled={formReviewMutation.isPending}
                    onClick={() => runFormReviewAction("start_review")}
                    type="button"
                    variant="secondary"
                  >
                    Start review
                  </Button>
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                  {[
                    ["Enumerator", selectedReviewSubmission.field_officer_id],
                    [
                      "Server sequence",
                      String(selectedReviewSubmission.server_sequence),
                    ],
                    [
                      "GPS accuracy",
                      selectedReviewSubmission.accuracy
                        ? `${selectedReviewSubmission.accuracy}m`
                        : "Not reported",
                    ],
                    [
                      "Offline",
                      selectedReviewSubmission.offline_created ? "Yes" : "No",
                    ],
                  ].map(([label, value]) => (
                    <div
                      className="rounded-lg border bg-background p-3"
                      key={label}
                    >
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="mt-2 truncate text-sm font-semibold">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border bg-panel">
                  <div className="border-b px-4 py-3">
                    <p className="text-sm font-semibold">Response values</p>
                  </div>
                  <div className="divide-y">
                    {Object.entries(selectedReviewSubmission.payload_json).map(
                      ([key, value]) => (
                        <div
                          className="grid gap-2 px-4 py-3 text-sm md:grid-cols-[220px_minmax(0,1fr)]"
                          key={key}
                        >
                          <span className="font-medium text-muted-foreground">
                            {key}
                          </span>
                          <span className="break-words">
                            {typeof value === "object" && value !== null
                              ? JSON.stringify(value)
                              : String(value)}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </div>

                <label className="block text-sm font-medium">
                  Reviewer note
                  <Textarea
                    className="mt-2 min-h-24"
                    onChange={(event) => setReviewComment(event.target.value)}
                    placeholder="Add a short decision note, especially when returning or rejecting a record."
                    value={reviewComment}
                  />
                </label>

                <div className="flex flex-col gap-2 rounded-lg border bg-background p-3 sm:flex-row sm:justify-end">
                  <Button
                    disabled={formReviewMutation.isPending}
                    onClick={() => runFormReviewAction("request_correction")}
                    type="button"
                    variant="secondary"
                  >
                    Return for correction
                  </Button>
                  <Button
                    disabled={formReviewMutation.isPending}
                    onClick={() => runFormReviewAction("reject")}
                    type="button"
                    variant="danger"
                  >
                    Reject
                  </Button>
                  <Button
                    disabled={formReviewMutation.isPending}
                    onClick={() => runFormReviewAction("approve")}
                    type="button"
                    variant="primary"
                  >
                    Approve record
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-72 items-center justify-center rounded-lg border bg-panel p-6 text-center">
                <div>
                  <Eye
                    aria-hidden="true"
                    className="mx-auto text-muted-foreground"
                    size={28}
                  />
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <p className="text-sm font-semibold">No record selected</p>
                    <HelpHint
                      label="About selecting a record"
                      title="No record selected"
                    >
                      Select a synced submission from the queue to inspect
                      values, add a reviewer note, approve clean data, or return
                      records that need correction.
                    </HelpHint>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </Modal>

      <Modal
        contentClassName="max-w-6xl"
        description="Set the reference data, access, review workflow, data quality, audit, and version rules for this specific survey form."
        onOpenChange={setFormControlsDialogOpen}
        open={formControlsDialogOpen}
        title={`Form Controls${selectedForm ? `: ${selectedForm.name}` : ""}`}
      >
        <div className="border-b px-4 py-3">
          <div className="flex gap-1 overflow-x-auto rounded-md border bg-background p-1 product-scrollbar">
            {formControlsTabs.map(([tab, Icon, label]) => (
              <button
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-2 rounded px-3 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground",
                  formControlsTab === tab &&
                    "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                )}
                key={tab}
                onClick={() => setFormControlsTab(tab)}
                type="button"
              >
                <Icon aria-hidden="true" size={14} />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 product-scrollbar">
          {formControlsTab === "overview" ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-4">
                {[
                  [
                    "Reference lists",
                    selectedFormControls.reference_bindings.length,
                    "Controlled values attached",
                  ],
                  [
                    "Access rules",
                    selectedFormControls.permission_rules.length,
                    "Roles, users, or teams",
                  ],
                  [
                    "Workflow stages",
                    selectedFormControls.workflow_stages.length,
                    selectedFormControls.governance.approval_workflow,
                  ],
                  [
                    "Quality checks",
                    selectedFormControls.data_quality_rules.filter(
                      (rule) => rule.enabled,
                    ).length,
                    "Active controls",
                  ],
                ].map(([label, value, helper]) => (
                  <div
                    className="rounded-lg border bg-background p-3"
                    key={label}
                  >
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="mt-2 text-2xl font-semibold">{value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {helper}
                    </p>
                  </div>
                ))}
              </div>
              <div className="grid gap-3 lg:grid-cols-3">
                <button
                  className="rounded-lg border bg-emerald-500/5 p-4 text-left transition hover:border-primary/40 hover:bg-primary/5"
                  onClick={() => setFormControlsTab("reference")}
                  type="button"
                >
                  <Database
                    aria-hidden="true"
                    className="text-emerald-700 dark:text-emerald-300"
                  />
                  <p className="mt-3 text-sm font-semibold">
                    Bind official lists
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Attach districts, schools, facilities, communities,
                    entities, donor codes, or custom master data to form
                    questions.
                  </p>
                </button>
                <button
                  className="rounded-lg border bg-sky-500/5 p-4 text-left transition hover:border-primary/40 hover:bg-primary/5"
                  onClick={() => setFormControlsTab("workflow")}
                  type="button"
                >
                  <Workflow
                    aria-hidden="true"
                    className="text-sky-700 dark:text-sky-300"
                  />
                  <p className="mt-3 text-sm font-semibold">
                    Choose the review path
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Use simple approval, supervisor review, data manager review,
                    or correction workflows before records become approved data.
                  </p>
                </button>
                <button
                  className="rounded-lg border bg-amber-500/5 p-4 text-left transition hover:border-primary/40 hover:bg-primary/5"
                  onClick={() => setFormControlsTab("quality")}
                  type="button"
                >
                  <Check
                    aria-hidden="true"
                    className="text-amber-700 dark:text-amber-300"
                  />
                  <p className="mt-3 text-sm font-semibold">
                    Protect data quality
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Set blocking rules for required fields, GPS, duplicate
                    records, consent, duration, and logical consistency.
                  </p>
                </button>
              </div>
            </div>
          ) : null}

          {formControlsTab === "entity" ? (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <section className="rounded-lg border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">
                      Entity & duplicate controls
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Set the exact collection rule for this form so field teams know whether they should register a new record, select an existing one, or work without entity linkage.
                    </p>
                  </div>
                  <Badge tone={selectedEntityWorkflow.tone}>
                    {selectedEntityWorkflow.badge}
                  </Badge>
                </div>
                <div className="mt-3 rounded-lg border bg-panel p-3 text-sm text-muted-foreground">
                  {selectedEntityWorkflow.description}
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <Select
                    value={
                      selectedFormControls.entity_controls?.entity_type ??
                      "Farmer"
                    }
                    onChange={(event) =>
                      updateSelectedFormControls((controls) => ({
                        ...controls,
                        entity_controls: {
                          ...controls.entity_controls!,
                          entity_type: event.target.value,
                        },
                      }))
                    }
                  >
                    {[
                      "Farmer",
                      "Household",
                      "Entity",
                      "Facility",
                      "School",
                      "Village",
                      "Group",
                      "Training Participant",
                      "Health Worker",
                      "Custom Entity",
                    ].map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </Select>
                  <Select
                    value={
                      selectedFormControls.entity_controls
                        ?.submission_frequency ?? "once_per_project"
                    }
                    onChange={(event) =>
                      updateSelectedFormControls((controls) => ({
                        ...controls,
                        entity_controls: {
                          ...controls.entity_controls!,
                          submission_frequency: event.target.value,
                        },
                      }))
                    }
                  >
                    <option value="once_ever">Once ever per entity</option>
                    <option value="once_per_project">
                      Once per project per entity
                    </option>
                    <option value="once_per_year">Once per year</option>
                    <option value="once_per_season">Once per season</option>
                    <option value="once_per_quarter">Once per quarter</option>
                    <option value="once_per_month">Once per month</option>
                    <option value="once_per_event">Once per event</option>
                    <option value="unlimited">Unlimited repeat submissions</option>
                  </Select>
                  <Select
                    value={
                      selectedFormControls.entity_controls?.duplicate_action ??
                      "block"
                    }
                    onChange={(event) =>
                      updateSelectedFormControls((controls) => ({
                        ...controls,
                        entity_controls: {
                          ...controls.entity_controls!,
                          duplicate_action: event.target
                            .value as NonNullable<
                            FormControlsSettings["entity_controls"]
                          >["duplicate_action"],
                        },
                      }))
                    }
                  >
                    <option value="block">Block likely duplicates</option>
                    <option value="warn">Warn only</option>
                    <option value="review">Send to supervisor review</option>
                  </Select>
                  <Input
                    max={100}
                    min={0}
                    type="number"
                    value={
                      selectedFormControls.entity_controls
                        ?.duplicate_threshold ?? 90
                    }
                    onChange={(event) =>
                      updateSelectedFormControls((controls) => ({
                        ...controls,
                        entity_controls: {
                          ...controls.entity_controls!,
                          duplicate_threshold: Number(event.target.value) || 0,
                        },
                      }))
                    }
                  />
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {[
                    [
                      "linked_to_entity",
                      "Track this form against an entity record",
                      "Turn this on when submissions should link to a person, household, facility, customer, asset, case, product, or other tracked record.",
                    ],
                    [
                      "creates_new_entity",
                      `Allow this form to register new ${selectedEntityWorkflow.entityLabel.toLowerCase()} records`,
                      "Use this for registration, intake, onboarding, or any workflow that creates a first official record.",
                    ],
                    [
                      "requires_existing_entity",
                      `Require field teams to select an existing ${selectedEntityWorkflow.entityLabel.toLowerCase()}`,
                      "Use this for follow-up, monitoring, attendance, inspection, service, delivery, or update workflows.",
                    ],
                    [
                      "updates_existing_entity",
                      `Allow approved submissions to update the official ${selectedEntityWorkflow.entityLabel.toLowerCase()} profile`,
                      "Use this when the form should push reviewed changes back to the tracked record after approval.",
                    ],
                    [
                      "allows_anonymous",
                      "Allow anonymous submissions",
                      "Only use where no entity history is needed.",
                    ],
                    [
                      "prefill_profile",
                      "Pre-fill from profile",
                      "Load known name, phone, village, household ID, and GPS.",
                    ],
                    [
                      "lock_prefilled_fields",
                      "Lock pre-filled fields",
                      "Prevent field officers from changing trusted profile values.",
                    ],
                    [
                      "editable_with_reason",
                      "Edits require reason",
                      "Require a note when profile values are corrected.",
                    ],
                  ].map(([key, label, helper]) => (
                    <label
                      className="flex items-start gap-3 rounded-lg border bg-panel p-3 text-sm"
                      key={key}
                    >
                      <input
                        checked={Boolean(
                          selectedFormControls.entity_controls?.[
                            key as keyof NonNullable<
                              FormControlsSettings["entity_controls"]
                            >
                          ],
                        )}
                        className="mt-1"
                        onChange={(event) =>
                          updateSelectedFormControls((controls) => ({
                            ...controls,
                            entity_controls: {
                              ...controls.entity_controls!,
                              [key]: event.target.checked,
                            },
                          }))
                        }
                        type="checkbox"
                      />
                      <span>
                        <span className="block font-medium">{label}</span>
                        <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                          {helper}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </section>
              <aside className="space-y-3">
                <div className="rounded-lg border bg-background p-4">
                  <h3 className="text-sm font-semibold">Duplicate scoring</h3>
                  <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                    {[
                      "National ID match: 100",
                      "Phone match: 80",
                      "Household ID match: 90",
                      "Name + DOB match: 75",
                      "Name + village match: 60",
                      "GPS within 50m: 40",
                    ].map((line) => (
                      <p className="rounded-md border bg-panel px-3 py-2" key={line}>
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border bg-background p-4">
                  <h3 className="text-sm font-semibold">Mobile-ready sync</h3>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    Future mobile sync will receive assigned entities,
                    published form versions, duplicate rules, frequency rules,
                    prefill mappings, returned submissions, and sync conflict
                    placeholders.
                  </p>
                </div>
              </aside>
            </div>
          ) : null}

          {formControlsTab === "reference" ? (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
              <section className="rounded-lg border bg-background p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">
                      Reference data bindings
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Bind form questions to official lists and prevent
                      uncontrolled free text.
                    </p>
                  </div>
                  <Button
                    onClick={() => addReferenceBinding()}
                    size="sm"
                    type="button"
                    variant="primary"
                  >
                    <Database aria-hidden="true" />
                    Bind selected question
                  </Button>
                </div>
                <div className="mt-4 space-y-3">
                  {selectedFormControls.reference_bindings.length ? (
                    selectedFormControls.reference_bindings.map((binding) => (
                      <div
                        className="rounded-lg border bg-panel p-3"
                        key={binding.id}
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">
                              {binding.question_label}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {binding.source} · v{binding.version} ·{" "}
                              {binding.enforce_controlled_values
                                ? "controlled values enforced"
                                : "free text allowed"}
                            </p>
                          </div>
                          <Button
                            aria-label={`Remove reference binding for ${binding.question_label}`}
                            onClick={() =>
                              updateSelectedFormControls((controls) => ({
                                ...controls,
                                reference_bindings:
                                  controls.reference_bindings.filter(
                                    (candidate) => candidate.id !== binding.id,
                                  ),
                              }))
                            }
                            size="icon"
                            type="button"
                            variant="ghost"
                          >
                            <Trash2 aria-hidden="true" />
                          </Button>
                        </div>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <label className="text-sm font-medium">
                            Reference list
                            <Input
                              className="mt-2"
                              list={`choice-list-categories-${binding.id}`}
                              onChange={(event) =>
                                updateSelectedFormControls((controls) => ({
                                  ...controls,
                                  reference_bindings:
                                    controls.reference_bindings.map(
                                      (candidate) =>
                                        candidate.id === binding.id
                                          ? {
                                              ...candidate,
                                              reference_list_name:
                                                event.target.value,
                                              changed_since_publish: true,
                                            }
                                          : candidate,
                                    ),
                                }))
                              }
                              value={binding.reference_list_name}
                            />
                            <datalist id={`choice-list-categories-${binding.id}`}>
                              {choiceListCategories.map((category) => (
                                <option key={category} value={category} />
                              ))}
                            </datalist>
                          </label>
                          <label className="text-sm font-medium">
                            Parent list
                            <Input
                              className="mt-2"
                              onChange={(event) =>
                                updateSelectedFormControls((controls) => ({
                                  ...controls,
                                  reference_bindings:
                                    controls.reference_bindings.map(
                                      (candidate) =>
                                        candidate.id === binding.id
                                          ? {
                                              ...candidate,
                                              parent_reference:
                                                event.target.value || null,
                                              changed_since_publish: true,
                                            }
                                          : candidate,
                                    ),
                                }))
                              }
                              placeholder="Example: Region"
                              value={binding.parent_reference ?? ""}
                            />
                          </label>
                        </div>
                        {binding.source === "existing" ? (
                          <div className="mt-3 grid gap-3 md:grid-cols-3">
                            <label className="flex items-center gap-2 text-sm font-medium">
                              <input
                                checked={binding.allow_inactive_values}
                                className="h-4 w-4 rounded border-input"
                                onChange={(event) =>
                                  updateSelectedFormControls((controls) => ({
                                    ...controls,
                                    reference_bindings:
                                      controls.reference_bindings.map(
                                        (candidate) =>
                                          candidate.id === binding.id
                                            ? {
                                                ...candidate,
                                                allow_inactive_values:
                                                  event.target.checked,
                                                changed_since_publish: true,
                                              }
                                            : candidate,
                                      ),
                                  }))
                                }
                                type="checkbox"
                              />
                              Allow inactive values
                            </label>
                            <label className="text-sm font-medium">
                              Effective from
                              <Input
                                className="mt-2"
                                onChange={(event) =>
                                  updateSelectedFormControls((controls) => ({
                                    ...controls,
                                    reference_bindings:
                                      controls.reference_bindings.map(
                                        (candidate) =>
                                          candidate.id === binding.id
                                            ? {
                                                ...candidate,
                                                effective_from:
                                                  event.target.value || null,
                                                changed_since_publish: true,
                                              }
                                            : candidate,
                                      ),
                                  }))
                                }
                                type="date"
                                value={binding.effective_from ?? ""}
                              />
                            </label>
                            <label className="text-sm font-medium">
                              Effective to
                              <Input
                                className="mt-2"
                                onChange={(event) =>
                                  updateSelectedFormControls((controls) => ({
                                    ...controls,
                                    reference_bindings:
                                      controls.reference_bindings.map(
                                        (candidate) =>
                                          candidate.id === binding.id
                                            ? {
                                                ...candidate,
                                                effective_to:
                                                  event.target.value || null,
                                                changed_since_publish: true,
                                              }
                                            : candidate,
                                      ),
                                  }))
                                }
                                type="date"
                                value={binding.effective_to ?? ""}
                              />
                            </label>
                          </div>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg border border-dashed bg-panel p-5 text-center">
                      <Database
                        aria-hidden="true"
                        className="mx-auto text-primary"
                      />
                      <div className="mt-3 flex items-center justify-center gap-2">
                        <p className="text-sm font-semibold">
                          No reference lists attached yet
                        </p>
                        <HelpHint
                          label="About reference lists"
                          title="No reference lists attached yet"
                        >
                          Select a district, community, school, facility,
                          entity, or donor-code question, then bind it to
                          an official list.
                        </HelpHint>
                      </div>
                    </div>
                  )}
                </div>
              </section>
              <aside className="rounded-lg border bg-panel p-4">
                <h3 className="text-sm font-semibold">Available questions</h3>
                <div className="mt-3 space-y-2">
                  {(selectedForm?.fields ?? []).slice(0, 12).map((field) => (
                    <button
                      className={cn(
                        "w-full rounded-md border bg-background p-2 text-left text-xs transition hover:border-primary/40 hover:bg-primary/5",
                        selectedField?.id === field.id &&
                          "border-primary/40 bg-primary/10",
                      )}
                      key={field.id}
                      onClick={() => {
                        setSelectedFieldId(field.id);
                        addReferenceBinding(field);
                      }}
                      type="button"
                    >
                      <span className="block font-semibold">{field.label}</span>
                      <span className="mt-1 block text-muted-foreground">
                        {field.type.replace("_", " ")}
                      </span>
                    </button>
                  ))}
                </div>
              </aside>
            </div>
          ) : null}

          {formControlsTab === "permissions" ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold">
                    Per-form access control
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Permissions inherit from the project, then M&E Managers can
                    narrow access for this form.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() =>
                      updateSelectedFormControls((controls) => ({
                        ...controls,
                        permission_rules:
                          createDefaultFormControls(selectedForm)
                            .permission_rules,
                      }))
                    }
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    Standard roles
                  </Button>
                  <Button
                    onClick={() =>
                      updateSelectedFormControls((controls) => ({
                        ...controls,
                        permission_rules: [
                          ...controls.permission_rules,
                          {
                            subject_type: "role",
                            subject_name: "External Reviewer",
                            permissions: ["view_form", "view_submissions"],
                            location_scope: "project",
                            can_approve_own_submission: false,
                            read_only: true,
                          },
                        ],
                      }))
                    }
                    size="sm"
                    type="button"
                    variant="primary"
                  >
                    Add reviewer
                  </Button>
                </div>
              </div>
              <div className="grid gap-3 lg:grid-cols-3">
                {selectedFormControls.permission_rules.map((rule) => (
                  <div
                    className="rounded-lg border bg-background p-4"
                    key={`${rule.subject_type}-${rule.subject_name}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">
                          {rule.subject_name}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {rule.subject_type} · {rule.location_scope}
                        </p>
                      </div>
                      <Badge tone={rule.read_only ? "neutral" : "accent"}>
                        {rule.read_only ? "Read only" : "Active"}
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {rule.permissions.map((permission) => (
                        <span
                          className="rounded-md border bg-panel px-2 py-1 text-[11px] text-muted-foreground"
                          key={permission}
                        >
                          {permission.replaceAll("_", " ")}
                        </span>
                      ))}
                    </div>
                    <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        checked={rule.can_approve_own_submission}
                        onChange={(event) =>
                          updateSelectedFormControls((controls) => ({
                            ...controls,
                            permission_rules: controls.permission_rules.map(
                              (candidate) =>
                                candidate.subject_name === rule.subject_name
                                  ? {
                                      ...candidate,
                                      can_approve_own_submission:
                                        event.target.checked,
                                    }
                                  : candidate,
                            ),
                          }))
                        }
                        type="checkbox"
                      />
                      Allow own submission approval
                    </label>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {formControlsTab === "workflow" ? (
            <div className="space-y-4">
              <div className="grid gap-2 md:grid-cols-3">
                {(
                  [
                    ["simple", "Simple", "Submitted to approved or rejected"],
                    [
                      "standard",
                      "Standard",
                      "Supervisor and data manager review",
                    ],
                    [
                      "correction",
                      "Correction",
                      "Return, resubmit, review, approve",
                    ],
                  ] satisfies [
                    "simple" | "standard" | "correction",
                    string,
                    string,
                  ][]
                ).map(([preset, label, helper]) => (
                  <button
                    className={cn(
                      "rounded-lg border bg-background p-3 text-left transition hover:border-primary/40 hover:bg-primary/5",
                      selectedFormControls.governance.approval_workflow ===
                        preset && "border-primary/50 bg-primary/10",
                    )}
                    key={preset}
                    onClick={() => applyWorkflowPreset(preset)}
                    type="button"
                  >
                    <span className="text-sm font-semibold">{label}</span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                      {helper}
                    </span>
                  </button>
                ))}
              </div>
              <div className="rounded-lg border bg-background p-4">
                <h3 className="text-sm font-semibold">Workflow stages</h3>
                <div className="mt-4 space-y-3">
                  {selectedFormControls.workflow_stages.map((stage, index) => (
                    <div
                      className="grid gap-3 rounded-lg border bg-panel p-3 md:grid-cols-[40px_minmax(0,1fr)_160px]"
                      key={stage.id}
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold">{stage.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {stage.reviewer_roles.join(", ")} ·{" "}
                          {stage.reviewer_location_scope}
                        </p>
                      </div>
                      <label className="text-xs font-medium">
                        SLA hours
                        <Input
                          className="mt-1"
                          min={1}
                          onChange={(event) =>
                            updateSelectedFormControls((controls) => ({
                              ...controls,
                              workflow_stages: controls.workflow_stages.map(
                                (candidate) =>
                                  candidate.id === stage.id
                                    ? {
                                        ...candidate,
                                        sla_hours:
                                          Number(event.target.value) || 1,
                                      }
                                    : candidate,
                              ),
                            }))
                          }
                          type="number"
                          value={stage.sla_hours}
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {formControlsTab === "quality" ? (
            <div className="space-y-3">
              {selectedFormControls.data_quality_rules.map((rule) => (
                <div
                  className="grid gap-3 rounded-lg border bg-background p-4 md:grid-cols-[minmax(0,1fr)_160px_120px]"
                  key={rule.id}
                >
                  <label className="flex items-start gap-3">
                    <input
                      checked={rule.enabled}
                      className="mt-1"
                      onChange={(event) =>
                        updateSelectedFormControls((controls) => ({
                          ...controls,
                          data_quality_rules: controls.data_quality_rules.map(
                            (candidate) =>
                              candidate.id === rule.id
                                ? {
                                    ...candidate,
                                    enabled: event.target.checked,
                                  }
                                : candidate,
                          ),
                        }))
                      }
                      type="checkbox"
                    />
                    <span>
                      <span className="block text-sm font-semibold">
                        {rule.label}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {rule.rule_type.replaceAll("_", " ")} ·{" "}
                        {rule.fields.length
                          ? rule.fields.join(", ")
                          : "all relevant fields"}
                      </span>
                    </span>
                  </label>
                  <label className="text-xs font-medium">
                    Severity
                    <Select
                      className="mt-1"
                      onChange={(event) =>
                        updateSelectedFormControls((controls) => ({
                          ...controls,
                          data_quality_rules: controls.data_quality_rules.map(
                            (candidate) =>
                              candidate.id === rule.id
                                ? {
                                    ...candidate,
                                    severity: event.target
                                      .value as FormControlsSettings["data_quality_rules"][number]["severity"],
                                  }
                                : candidate,
                          ),
                        }))
                      }
                      value={rule.severity}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </Select>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium">
                    <input
                      checked={rule.blocking}
                      onChange={(event) =>
                        updateSelectedFormControls((controls) => ({
                          ...controls,
                          data_quality_rules: controls.data_quality_rules.map(
                            (candidate) =>
                              candidate.id === rule.id
                                ? {
                                    ...candidate,
                                    blocking: event.target.checked,
                                  }
                                : candidate,
                          ),
                        }))
                      }
                      type="checkbox"
                    />
                    Block submit
                  </label>
                </div>
              ))}
            </div>
          ) : null}

          {formControlsTab === "governance" ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="text-sm font-medium">
                Form status
                <Select
                  className="mt-2"
                  onChange={(event) =>
                    updateSelectedFormControls((controls) => ({
                      ...controls,
                      governance: {
                        ...controls.governance,
                        form_status: event.target
                          .value as FormControlsSettings["governance"]["form_status"],
                      },
                    }))
                  }
                  value={selectedFormControls.governance.form_status}
                >
                  <option value="draft">Draft</option>
                  <option value="testing">Testing</option>
                  <option value="published">Published</option>
                  <option value="suspended">Suspended</option>
                  <option value="archived">Archived</option>
                </Select>
              </label>
              <label className="text-sm font-medium">
                Minimum quality score
                <Input
                  className="mt-2"
                  max={100}
                  min={0}
                  onChange={(event) =>
                    updateSelectedFormControls((controls) => ({
                      ...controls,
                      governance: {
                        ...controls.governance,
                        minimum_quality_score: Number(event.target.value) || 0,
                      },
                    }))
                  }
                  type="number"
                  value={selectedFormControls.governance.minimum_quality_score}
                />
              </label>
              <label className="text-sm font-medium">
                Review SLA hours
                <Input
                  className="mt-2"
                  min={1}
                  onChange={(event) =>
                    updateSelectedFormControls((controls) => ({
                      ...controls,
                      governance: {
                        ...controls.governance,
                        review_sla_hours: Number(event.target.value) || 1,
                      },
                    }))
                  }
                  type="number"
                  value={selectedFormControls.governance.review_sla_hours}
                />
              </label>
              <label className="text-sm font-medium">
                Data retention days
                <Input
                  className="mt-2"
                  min={1}
                  onChange={(event) =>
                    updateSelectedFormControls((controls) => ({
                      ...controls,
                      governance: {
                        ...controls.governance,
                        data_retention_days: Number(event.target.value) || 1,
                      },
                    }))
                  }
                  type="number"
                  value={selectedFormControls.governance.data_retention_days}
                />
              </label>
              <div className="rounded-lg border bg-background p-4 lg:col-span-2">
                <h3 className="text-sm font-semibold">Governance switches</h3>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {(
                    [
                      ["require_gps_capture", "Require GPS capture"],
                      [
                        "require_timestamp_capture",
                        "Require timestamp capture",
                      ],
                      [
                        "require_enumerator_assignment",
                        "Require enumerator assignment",
                      ],
                      [
                        "require_supervisor_review",
                        "Require supervisor review",
                      ],
                      ["export_restricted", "Restrict exports"],
                      ["sensitive_field_masking", "Mask sensitive fields"],
                      ["pii_tagging_required", "Require PII tagging"],
                      ["consent_required", "Require consent"],
                      ["auto_lock_after_approval", "Auto-lock after approval"],
                      [
                        "auto_archive_after_project_closure",
                        "Auto-archive after project closure",
                      ],
                    ] satisfies [
                      keyof FormControlsSettings["governance"],
                      string,
                    ][]
                  ).map(([key, label]) => (
                    <label
                      className="flex items-center gap-2 rounded-md border bg-panel px-3 py-2 text-sm"
                      key={String(key)}
                    >
                      <input
                        checked={Boolean(selectedFormControls.governance[key])}
                        onChange={(event) =>
                          updateSelectedFormControls((controls) => ({
                            ...controls,
                            governance: {
                              ...controls.governance,
                              [key]: event.target.checked,
                            },
                          }))
                        }
                        type="checkbox"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {formControlsTab === "audit" ? (
            <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
              <section className="rounded-lg border bg-background p-4">
                <ShieldCheck aria-hidden="true" className="text-primary" />
                <h3 className="mt-3 text-sm font-semibold">
                  Immutable audit trail
                </h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Audit records cannot be deleted. High-risk events require a
                  reason and exports are restricted to approved roles.
                </p>
                <Badge
                  className="mt-3"
                  tone={
                    selectedFormControls.audit.immutable ? "success" : "danger"
                  }
                >
                  {selectedFormControls.audit.immutable
                    ? "Immutable"
                    : "Not immutable"}
                </Badge>
              </section>
              <section className="rounded-lg border bg-background p-4">
                <h3 className="text-sm font-semibold">Tracked events</h3>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {selectedFormControls.audit.tracked_events.map((event) => (
                    <span
                      className="rounded-md border bg-panel px-2 py-1 text-[11px] text-muted-foreground"
                      key={event}
                    >
                      {event.replaceAll("_", " ")}
                    </span>
                  ))}
                </div>
                <h3 className="mt-5 text-sm font-semibold">Reason required</h3>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {selectedFormControls.audit.reason_required_events.map(
                    (event) => (
                      <span
                        className="rounded-md border border-warning/30 bg-warning/10 px-2 py-1 text-[11px]"
                        key={event}
                      >
                        {event.replaceAll("_", " ")}
                      </span>
                    ),
                  )}
                </div>
              </section>
            </div>
          ) : null}

          {formControlsTab === "versions" ? (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <section className="rounded-lg border bg-background p-4">
                <h3 className="text-sm font-semibold">Version rules</h3>
                <div className="mt-3 grid gap-2">
                  {(
                    [
                      [
                        "editing_published_creates_draft",
                        "Editing a published form creates a new draft",
                      ],
                      [
                        "preserve_submission_version_link",
                        "Submissions stay linked to the collected version",
                      ],
                      [
                        "compare_versions_enabled",
                        "Version comparison is enabled",
                      ],
                      [
                        "reference_lists_version_aware",
                        "Reference lists are version-aware",
                      ],
                      [
                        "archived_versions_viewable",
                        "Archived versions stay viewable for audit",
                      ],
                    ] satisfies [
                      keyof FormControlsSettings["versioning"],
                      string,
                    ][]
                  ).map(([key, label]) => (
                    <label
                      className="flex items-center gap-2 rounded-md border bg-panel px-3 py-2 text-sm"
                      key={String(key)}
                    >
                      <input
                        checked={selectedFormControls.versioning[key]}
                        onChange={(event) =>
                          updateSelectedFormControls((controls) => ({
                            ...controls,
                            versioning: {
                              ...controls.versioning,
                              [key]: event.target.checked,
                            },
                          }))
                        }
                        type="checkbox"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </section>
              <aside className="rounded-lg border bg-panel p-4">
                <h3 className="text-sm font-semibold">Current form history</h3>
                <div className="mt-3 space-y-2">
                  {(
                    selectedForm?.history ?? [
                      {
                        version: selectedForm?.version ?? 1,
                        status: selectedForm?.status ?? "draft",
                        createdAt:
                          selectedForm?.updatedAt ?? new Date().toISOString(),
                        summary: "Current draft",
                      },
                    ]
                  ).map((entry) => (
                    <div
                      className="rounded-md border bg-background px-3 py-2 text-xs"
                      key={`${entry.version}-${entry.createdAt}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold">
                          Version {entry.version}
                        </span>
                        <Badge
                          tone={
                            entry.status === "published" ? "success" : "neutral"
                          }
                        >
                          {entry.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-muted-foreground">
                        {entry.summary}
                      </p>
                    </div>
                  ))}
                </div>
              </aside>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 border-t px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Controls are saved per form and apply to publishing, field
            assignment, review, export, and audit behavior.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={() => setFormControlsDialogOpen(false)}
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              disabled={!selectedForm || updateControlsMutation.isPending}
              onClick={saveSelectedFormControls}
              type="button"
              variant="primary"
            >
              <ShieldCheck aria-hidden="true" />
              {updateControlsMutation.isPending ? "Saving" : "Save controls"}
            </Button>
          </div>
        </div>
      </Modal>

      {builderMode === "templates" ? (
        <section
          className="surface-premium rounded-2xl p-4"
          aria-labelledby="template-picker-title"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Create Form → Choose Template → Customize → Publish
              </p>
              <h2
                id="template-picker-title"
                className="mt-2 text-xl font-semibold tracking-tight"
              >
                Choose a ready-made form template
              </h2>
              <div className="mt-1">
                <HelpHint
                  label="About form templates"
                  title="Choose a ready-made form template"
                >
                  Templates open directly inside the builder, so teams can
                  preview, copy, edit, and publish without leaving the form
                  workflow.
                </HelpHint>
              </div>
            </div>
            <Button
              onClick={() => setBuilderMode("builder")}
              type="button"
              variant="ghost"
            >
              Back to builder
            </Button>
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <label className="relative flex-1">
                  <span className="sr-only">Search form templates</span>
                  <Search
                    aria-hidden="true"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    size={16}
                  />
                  <Input
                    className="pl-9"
                    onChange={(event) => setTemplateQuery(event.target.value)}
                    placeholder="Search farmer, survey, case, school, vaccination..."
                    value={templateQuery}
                  />
                </label>
              </div>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1 product-scrollbar">
                {formTemplateCategories.map((category) => (
                  <button
                    className={cn(
                      "inline-flex h-9 shrink-0 items-center rounded-lg border px-3 text-sm font-medium transition",
                      templateCategory === category
                        ? "border-primary bg-primary/10 text-primary"
                        : "bg-background/80 text-muted-foreground hover:text-foreground",
                    )}
                    key={category}
                    onClick={() => setTemplateCategory(category)}
                    type="button"
                  >
                    {category}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2 rounded-lg border bg-panel px-3 py-2 text-xs font-medium">
                {templateCategory}
                <HelpHint
                  label={`About ${templateCategory}`}
                  title={templateCategory}
                >
                  {templateCategoryDescriptions[templateCategory] ??
                    "Choose templates by the operational workflow your survey needs to support."}
                </HelpHint>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {visibleTemplates.map((template) => (
                  <button
                    className={cn(
                      "rounded-2xl border bg-background/80 p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-elevated",
                      selectedTemplate?.id === template.id &&
                        "border-primary/45 bg-primary/5",
                    )}
                    key={template.id}
                    onClick={() => setSelectedTemplateId(template.id)}
                    type="button"
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl border bg-panel text-primary">
                        <MonitorSmartphone aria-hidden="true" size={18} />
                      </span>
                      {template.featured ? (
                        <Badge tone="accent">Recommended</Badge>
                      ) : (
                        <Badge tone="neutral">{template.category}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold">{template.name}</h3>
                      <HelpHint
                        label={`About ${template.name}`}
                        title={template.name}
                      >
                        {template.description}
                      </HelpHint>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>{template.fields} fields</span>
                      <span>{template.minutes} min setup</span>
                      <span>{template.hasGps ? "GPS" : "No GPS"}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            {selectedTemplate ? (
              <aside className="rounded-2xl border bg-background/80 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Live preview
                </p>
                <h3 className="mt-2 text-lg font-semibold">
                  {selectedTemplate.name}
                </h3>
                <div className="mt-2">
                  <HelpHint
                    label={`About ${selectedTemplate.name}`}
                    title={selectedTemplate.name}
                  >
                    {selectedTemplate.description}
                  </HelpHint>
                </div>
                <div className="mt-4 rounded-[28px] border bg-panel p-3 shadow-line">
                  <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-muted" />
                  {templateToForm(selectedTemplate)
                    .fields.slice(0, 5)
                    .map((field, index) => (
                      <div
                        className="mb-3 rounded-xl border bg-background p-3"
                        key={field.id}
                      >
                        <p className="text-[11px] text-muted-foreground">
                          Question {index + 1}
                        </p>
                        <p className="mt-1 text-sm font-medium">
                          {field.label}
                        </p>
                        <div className="mt-2 h-7 rounded-lg bg-muted/70" />
                      </div>
                    ))}
                </div>
                <Button
                  className="mt-4 w-full"
                  onClick={() => applyTemplate(selectedTemplate)}
                  type="button"
                  variant="primary"
                >
                  <Copy aria-hidden="true" />
                  Use Template
                </Button>
              </aside>
            ) : null}
          </div>
        </section>
      ) : null}

      {!allForms.length && builderMode !== "templates" ? (
        <section className="rounded-lg border bg-panel p-6 text-center">
          <ClipboardList
            aria-hidden="true"
            className="mx-auto text-primary"
            size={32}
          />
          <h2 className="mt-4 text-lg font-semibold">
            Create your first operational form
          </h2>
          <div className="mt-2 flex justify-center">
            <HelpHint
              label="About creating the first form"
              title="Create your first operational form"
            >
              This organization has no saved forms yet. Start from a proven
              template, create a blank form, or import an existing XLSForm/CSV
              workflow through Data tools.
            </HelpHint>
          </div>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button
              onClick={() => setBuilderMode("templates")}
              type="button"
              variant="secondary"
            >
              <Star aria-hidden="true" />
              Choose template
            </Button>
            <Button onClick={openNewFormDialog} type="button" variant="primary">
              <Plus aria-hidden="true" />
              New form
            </Button>
            <Button
              onClick={() => {
                setBuilderResult(
                  "Opening the form import workspace for governed file import, validation, column mapping, and rollback.",
                );
                openImportWorkspace();
              }}
              type="button"
              variant="secondary"
            >
              <FileUp aria-hidden="true" />
              Import file
            </Button>
          </div>
        </section>
      ) : (
        <div
          className={cn(
            "grid gap-4 xl:overflow-hidden",
            questionFirstMode
              ? "xl:h-[calc(100vh-132px)] xl:min-h-[610px]"
              : "xl:h-[calc(100vh-190px)] xl:min-h-[680px]",
            questionFirstMode
              ? "xl:grid-cols-[minmax(0,1fr)]"
              : builderFocusMode
                ? "xl:grid-cols-[minmax(0,1fr)]"
                : "xl:grid-cols-[300px_minmax(0,1fr)_360px]",
            builderMode === "templates" && "hidden",
          )}
          data-builder-grid
        >
          <section
            className={cn(
              "rounded-lg border bg-panel p-2 xl:hidden",
              questionFirstMode && "hidden",
            )}
            data-builder-mobile-tabs
          >
            <p className="px-1 pb-2 text-xs font-medium text-muted-foreground">
              Builder view
            </p>
            <div className="grid grid-cols-3 gap-1 rounded-md border bg-background p-1">
              {(
                [
                  ["build", ClipboardList, "Build", "Questions"],
                  ["structure", PanelsTopLeft, "Structure", "Pages"],
                  ["preview", Eye, "Preview", "Test"],
                ] satisfies [BuilderFocusPanel, typeof Type, string, string][]
              ).map(([panel, Icon, label, hint]) => (
                <button
                  className={cn(
                    "flex min-h-12 flex-col items-center justify-center rounded px-2 text-center text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground",
                    builderFocusPanel === panel &&
                      "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                  )}
                  key={panel}
                  onClick={() => setBuilderFocusPanel(panel)}
                  type="button"
                >
                  <Icon aria-hidden="true" size={15} />
                  <span className="mt-1">{label}</span>
                  <span
                    className={cn(
                      "text-[11px] font-normal",
                      builderFocusPanel === panel
                        ? "text-primary-foreground/80"
                        : "text-muted-foreground",
                    )}
                  >
                    {hint}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <aside
            className={cn(
              "min-h-0 space-y-4 xl:block xl:overflow-y-auto xl:pr-1 product-scrollbar",
              questionFirstMode && "hidden",
              builderFocusMode && "xl:hidden",
              builderFocusPanel !== "structure" && "hidden xl:block",
            )}
            data-builder-workspace
          >
            <section className="rounded-lg border bg-panel p-3">
              <div className="flex items-center gap-2">
                <PanelsTopLeft aria-hidden="true" size={18} />
                <h2 className="text-sm font-semibold">Builder workspace</h2>
              </div>
              <div className="mt-3 grid gap-1 rounded-md border bg-background p-1">
                {(
                  [
                    ["structure", ClipboardList, "Structure"],
                    ["bank", Plus, "Question bank"],
                    ["templates", Star, "Templates"],
                    ["logic", Workflow, "Logic flows"],
                    ["variables", Variable, "Variables"],
                  ] satisfies [LeftPanelTab, typeof Type, string][]
                ).map(([tab, Icon, label]) => (
                  <button
                    key={String(tab)}
                    className={cn(
                      "flex h-8 items-center gap-2 rounded px-2 text-left text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground",
                      leftPanelTab === tab &&
                        "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                    )}
                    onClick={() => setLeftPanelTab(tab as LeftPanelTab)}
                    aria-label={String(label)}
                    title={String(label)}
                    type="button"
                  >
                    <Icon aria-hidden="true" size={15} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </section>

            {leftPanelTab === "structure" ? (
              <section className="rounded-lg border bg-panel p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold">Survey structure</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Workspace, program, project, survey, version, responses.
                    </p>
                  </div>
                  <Button
                    aria-label="Add survey page"
                    onClick={addBuilderPage}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <Plus aria-hidden="true" />
                  </Button>
                </div>
                <div className="mt-3 space-y-2 rounded-md border bg-background p-2 text-xs">
                  {[
                    "Workspace",
                    selectedProject?.name ?? "Program",
                    selectedProject?.name ?? "Project",
                    selectedSurvey?.title ?? "Survey",
                    `Version ${selectedForm?.version ?? 1}`,
                    `${selectedForm?.fields.length ?? 0} Responses-ready fields`,
                  ].map((item, index) => (
                    <div
                      className="flex items-center gap-2"
                      key={`${item}-${index}`}
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-[11px] font-semibold text-primary">
                        {index + 1}
                      </span>
                      <span className="truncate text-muted-foreground">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      Pages
                    </p>
                    <Button
                      onClick={addBuilderPage}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      <Plus aria-hidden="true" />
                      Page
                    </Button>
                  </div>
                  {selectedPages.map((page, index) => (
                    <div
                      className={cn(
                        "rounded-md border bg-background p-2",
                        activePage?.id === page.id &&
                          "border-primary/40 bg-primary/5",
                      )}
                      key={page.id}
                    >
                      <button
                        className="w-full text-left"
                        onClick={() => setSelectedPageId(page.id)}
                        type="button"
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">
                            {page.title}
                          </span>
                          <Badge tone="neutral">
                            {selectedForm?.sections.filter(
                              (section) => section.pageId === page.id,
                            ).length ?? 0}{" "}
                            sections
                          </Badge>
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {page.description}
                        </span>
                      </button>
                      <div className="mt-2 flex gap-1">
                        <Button
                          aria-label={`Move ${page.title} up`}
                          disabled={index === 0}
                          onClick={() => movePage(page.id, -1)}
                          size="icon"
                          type="button"
                          variant="ghost"
                        >
                          <ArrowUp aria-hidden="true" />
                        </Button>
                        <Button
                          aria-label={`Move ${page.title} down`}
                          disabled={index === selectedPages.length - 1}
                          onClick={() => movePage(page.id, 1)}
                          size="icon"
                          type="button"
                          variant="ghost"
                        >
                          <ArrowDown aria-hidden="true" />
                        </Button>
                        <Button
                          aria-label={`Duplicate ${page.title}`}
                          onClick={() => duplicateBuilderPage(page.id)}
                          size="icon"
                          type="button"
                          variant="ghost"
                        >
                          <Copy aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      Sections on {activePage?.title ?? "page"}
                    </p>
                    <Button
                      onClick={addBuilderSection}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      <Plus aria-hidden="true" />
                      Section
                    </Button>
                  </div>
                  {activeSections.map((section, index) => (
                    <div
                      className={cn(
                        "rounded-md border bg-background p-2",
                        activeSection?.id === section.id &&
                          "border-primary/40 bg-primary/5",
                      )}
                      key={section.id}
                    >
                      <button
                        className="w-full text-left"
                        onClick={() => setSelectedSectionId(section.id)}
                        type="button"
                      >
                        <span className="text-sm font-medium">
                          {section.title}
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {selectedForm?.fields.filter(
                            (field) => field.sectionId === section.id,
                          ).length ?? 0}{" "}
                          questions
                        </span>
                      </button>
                      <div className="mt-2 flex gap-1">
                        <Button
                          aria-label={`Move ${section.title} up`}
                          disabled={index === 0}
                          onClick={() => moveSection(section.id, -1)}
                          size="icon"
                          type="button"
                          variant="ghost"
                        >
                          <ArrowUp aria-hidden="true" />
                        </Button>
                        <Button
                          aria-label={`Move ${section.title} down`}
                          disabled={index === activeSections.length - 1}
                          onClick={() => moveSection(section.id, 1)}
                          size="icon"
                          type="button"
                          variant="ghost"
                        >
                          <ArrowDown aria-hidden="true" />
                        </Button>
                        <Button
                          aria-label={`Duplicate ${section.title}`}
                          onClick={() => duplicateBuilderSection(section.id)}
                          size="icon"
                          type="button"
                          variant="ghost"
                        >
                          <Copy aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {leftPanelTab === "bank" ? (
              <section className="rounded-lg border bg-panel p-3">
                <div className="mb-3 flex items-center gap-2">
                  <Plus aria-hidden="true" size={18} />
                  <h2 className="text-sm font-semibold">Question Library</h2>
                </div>
                <div className="mb-4 rounded-md border bg-background p-2">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      Form outline
                    </p>
                    <Badge tone="neutral">
                      {selectedForm?.sections.length ?? 0} sections
                    </Badge>
                  </div>
                  <div className="max-h-56 space-y-2 overflow-y-auto pr-1 product-scrollbar">
                    {selectedForm?.sections.map((section) => {
                      const sectionFields = selectedForm.fields.filter(
                        (field) => field.sectionId === section.id,
                      );
                      return (
                        <div
                          className="rounded-md border bg-panel/70 p-2"
                          key={section.id}
                        >
                          <button
                            className="flex w-full items-center justify-between gap-2 text-left"
                            onClick={() => {
                              setSelectedSectionId(section.id);
                              if (section.pageId)
                                setSelectedPageId(section.pageId);
                            }}
                            type="button"
                          >
                            <span className="truncate text-xs font-semibold">
                              {section.title}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {sectionFields.length}
                            </span>
                          </button>
                          <div className="mt-1 space-y-1">
                            {sectionFields.slice(0, 8).map((field) => (
                              <button
                                className={cn(
                                  "block w-full truncate rounded px-2 py-1 text-left text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground",
                                  selectedField?.id === field.id &&
                                    "bg-primary/10 text-primary",
                                )}
                                key={field.id}
                                onClick={() => openFieldSettings(field.id)}
                                type="button"
                              >
                                {field.label}
                              </button>
                            ))}
                            {sectionFields.length > 8 ? (
                              <p className="px-2 text-[11px] text-muted-foreground">
                                +{sectionFields.length - 8} more
                              </p>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="mb-4 rounded-md border bg-background p-2">
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    Groups
                  </p>
                  <div className="grid gap-1.5">
                    <Button
                      onClick={addBuilderSection}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      <Layers3 aria-hidden="true" />
                      Section
                    </Button>
                    <Button
                      onClick={() => addCatalogField("repeat_group")}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      <Repeat2 aria-hidden="true" />
                      Repeat Group
                    </Button>
                  </div>
                </div>
                <div className="mb-4 rounded-md border bg-background p-2">
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    Frequently used
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {frequentFieldTypes.map(({ type, label }) => {
                      const Icon = fieldTypeIcons[type];
                      return (
                        <button
                          className="flex items-center gap-1.5 rounded-md border bg-panel px-2 py-1.5 text-xs font-medium transition hover:border-primary/35 hover:bg-primary/5"
                          key={type}
                          onClick={() => addCatalogField(type)}
                          type="button"
                        >
                          <Icon
                            aria-hidden="true"
                            className="text-muted-foreground"
                            size={13}
                          />
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <label className="relative mb-3 block">
                  <span className="sr-only">Search question types</span>
                  <Search
                    aria-hidden="true"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    size={14}
                  />
                  <Input
                    className="h-8 pl-9 text-xs"
                    onChange={(event) => setLibraryQuery(event.target.value)}
                    placeholder="Search question types"
                    value={libraryQuery}
                  />
                </label>
                <div className="space-y-2">
                  {fieldCatalog.map((group) => {
                    const normalizedQuery = libraryQuery.trim().toLowerCase();
                    const fields = normalizedQuery
                      ? group.fields.filter((field) =>
                          `${field.label} ${field.description} ${field.type}`
                            .toLowerCase()
                            .includes(normalizedQuery),
                        )
                      : group.fields;
                    if (normalizedQuery && !fields.length) return null;
                    const expanded =
                      Boolean(normalizedQuery) ||
                      !collapsedLibraryGroups[group.group];
                    return (
                    <div
                      className="rounded-md border bg-background"
                      key={group.group}
                    >
                      <button
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
                        onClick={() =>
                          setCollapsedLibraryGroups((current) => ({
                            ...current,
                            [group.group]: !current[group.group],
                          }))
                        }
                        type="button"
                      >
                        <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                          {group.group}
                        </span>
                        <Badge tone="neutral">{fields.length}</Badge>
                      </button>
                      {expanded ? (
                        <div className="space-y-1.5 border-t p-2">
                          {fields.map((field) => {
                            const Icon = fieldTypeIcons[field.type];
                            return (
                              <div
                                key={field.type}
                                className="flex w-full items-center gap-1 rounded-md pr-1.5 transition hover:bg-muted"
                              >
                                <button
                                  className="flex flex-1 items-center gap-3 rounded-md px-2.5 py-2 text-left text-sm"
                                  onClick={() => addCatalogField(field.type)}
                                  type="button"
                                >
                                  <Icon
                                    aria-hidden="true"
                                    className="text-muted-foreground"
                                    size={16}
                                  />
                                  <span>
                                    <span className="block font-medium">
                                      {field.label}
                                    </span>
                                    <span className="block text-xs text-muted-foreground">
                                      {field.description}
                                    </span>
                                  </span>
                                </button>
                                <HelpHint label={`How the ${field.label} control works`} title={field.label}>
                                  {fieldTypeHelp[field.type]}
                                </HelpHint>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {leftPanelTab === "templates" ? (
              <section className="rounded-lg border border-emerald-200/70 bg-emerald-50/45 p-3 dark:border-emerald-900/55 dark:bg-emerald-950/15">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold">Templates</h2>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Add a section block or replace the form with a full survey
                      template.
                    </p>
                  </div>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Star aria-hidden="true" size={15} />
                  </span>
                </div>
                <label className="relative mt-3 block">
                  <span className="sr-only">Search builder templates</span>
                  <Search
                    aria-hidden="true"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    size={14}
                  />
                  <Input
                    className="h-9 bg-background pl-8 text-xs"
                    onChange={(event) => setTemplateQuery(event.target.value)}
                    placeholder="Search registration, baseline, health..."
                    value={templateQuery}
                  />
                </label>
                <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 product-scrollbar">
                  {formTemplateCategories.map((category) => (
                    <button
                      className={cn(
                        "inline-flex h-8 shrink-0 items-center rounded-md border px-2.5 text-xs font-medium transition",
                        templateCategory === category
                          ? "border-primary bg-primary text-primary-foreground"
                          : "bg-background text-muted-foreground hover:border-primary/35 hover:text-foreground",
                      )}
                      key={category}
                      onClick={() => setTemplateCategory(category)}
                      type="button"
                    >
                      {category}
                    </button>
                  ))}
                </div>
                <p className="mt-2 rounded-md border bg-background/80 px-3 py-2 text-xs leading-5 text-muted-foreground">
                  {templateCategoryDescriptions[templateCategory] ??
                    "Choose the template category that best matches the survey activity."}
                </p>
                <div className="mt-4 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
                    Section blocks
                  </p>
                  {sectionTemplates.map((template) => (
                    <button
                      className="w-full rounded-md border bg-background p-3 text-left transition hover:border-primary/35 hover:bg-primary/5"
                      key={template.id}
                      onClick={() => addSectionTemplate(template)}
                      type="button"
                    >
                      <span className="text-sm font-medium">
                        {template.title}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                        {template.description} · {template.fields.length} fields
                      </span>
                    </button>
                  ))}
                </div>
                <div className="mt-4 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700 dark:text-sky-300">
                    Full form templates
                  </p>
                  {visibleTemplates.slice(0, 6).map((template) => (
                    <button
                      className={cn(
                        "w-full rounded-md border bg-background p-3 text-left transition hover:border-primary/35 hover:bg-primary/5",
                        selectedTemplate?.id === template.id &&
                          "border-primary/50 bg-primary/10",
                      )}
                      key={template.id}
                      onClick={() => {
                        setSelectedTemplateId(template.id);
                        applyTemplate(template);
                      }}
                      type="button"
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">
                          {template.name}
                        </span>
                        {template.featured ? (
                          <Badge tone="accent">Top</Badge>
                        ) : null}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                        {template.category} · {template.fields} fields ·{" "}
                        {template.minutes} min
                      </span>
                    </button>
                  ))}
                  {!visibleTemplates.length ? (
                    <div className="rounded-md border border-dashed bg-background/80 p-3 text-xs leading-5 text-muted-foreground">
                      No templates match this search. Clear the search or choose
                      another category.
                    </div>
                  ) : null}
                </div>
                <Button
                  className="mt-3 w-full"
                  onClick={() => setBuilderMode("templates")}
                  type="button"
                  variant="secondary"
                >
                  <Star aria-hidden="true" />
                  Open full template library
                </Button>
              </section>
            ) : null}

            {leftPanelTab === "logic" ? (
              <section className="rounded-lg border bg-panel p-3">
                <h2 className="text-sm font-semibold">Logic flows</h2>
                <div className="mt-3 space-y-2">
                  {(
                    selectedForm?.fields.filter(
                      (field) => field.logic?.length,
                    ) ?? []
                  ).length ? (
                    selectedForm?.fields
                      .filter((field) => field.logic?.length)
                      .map((field) => (
                        <button
                          className="w-full rounded-md border bg-background p-3 text-left transition hover:bg-muted"
                          key={field.id}
                          onClick={() => {
                            openFieldSettings(field.id, "logic");
                          }}
                          type="button"
                        >
                          <span className="text-sm font-medium">
                            {field.label}
                          </span>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {field.logic?.length ?? 0} rule(s)
                          </span>
                        </button>
                      ))
                  ) : (
                    <div className="rounded-md border bg-background p-3 text-xs leading-5 text-muted-foreground">
                      Select a field, open Logic Rules, then add show, require,
                      skip, or dynamic choice rules.
                    </div>
                  )}
                </div>
              </section>
            ) : null}

            {leftPanelTab === "variables" ? (
              <section className="rounded-lg border bg-panel p-3">
                <h2 className="text-sm font-semibold">Variables</h2>
                <div className="mt-3 space-y-2">
                  {selectedForm?.fields.map((field) => (
                    <button
                      className="w-full rounded-md border bg-background p-3 text-left transition hover:bg-muted"
                      key={field.id}
                      onClick={() => {
                        openFieldSettings(field.id, "advanced");
                      }}
                      type="button"
                    >
                      <span className="block truncate font-mono text-xs text-primary">
                        ${"{"}
                        {field.variableName ?? field.id}
                        {"}"}
                      </span>
                      <span className="mt-1 block truncate text-xs text-muted-foreground">
                        {field.label}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="rounded-lg border bg-panel p-3">
              <div className="mb-3 flex items-center gap-2">
                <ClipboardList aria-hidden="true" size={18} />
                <h2 className="text-sm font-semibold">Forms</h2>
              </div>
              <div className="space-y-2">
                {allForms.map((form) => (
                  <button
                    key={form.id}
                    className={cn(
                      "w-full rounded-md border px-3 py-3 text-left text-sm transition",
                      selectedForm?.id === form.id
                        ? "border-primary/35 bg-primary/10 text-primary"
                        : "bg-background hover:bg-muted/60",
                    )}
                    onClick={() => {
                      setSelectedFormId(form.id);
                      setSelectedFieldId(form.fields[0]?.id ?? "");
                    }}
                    type="button"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="block font-medium">{form.name}</span>
                      <Badge
                        tone={
                          form.status === "published" ? "success" : "neutral"
                        }
                      >
                        v{form.version}
                      </Badge>
                    </span>
                    <span className="mt-2 block text-xs text-muted-foreground">
                      {form.fields.length
                        ? `${form.fields.length} questions`
                        : "Saved backend form"}{" "}
                      · {form.status}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </aside>

          {selectedForm ? (
            <div
              className={cn(
                "min-h-0 space-y-2 xl:block xl:overflow-y-auto xl:pr-1 product-scrollbar",
                builderFocusPanel !== "build" && "hidden xl:block",
              )}
            >
              <section className="hidden rounded-lg border bg-panel px-3 py-2">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <Badge tone="accent">v{selectedForm.version}</Badge>
                    <span className="truncate text-xs text-muted-foreground">
                      Saved {new Date(selectedForm.updatedAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      disabled={!historyPast.length}
                      onClick={undoLastChange}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      <RotateCcw aria-hidden="true" />
                      Undo
                    </Button>
                    <Button
                      disabled={!historyFuture.length}
                      onClick={redoLastChange}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      <RotateCw aria-hidden="true" />
                      Redo
                    </Button>
                    <Button
                      onClick={() => {
                        saveSelectedForm(false);
                      }}
                      disabled={publishMutation.isPending}
                      size="sm"
                    >
                      <GitBranch aria-hidden="true" />
                      Draft
                    </Button>
                    <Button
                      onClick={archiveSelectedForm}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      <Archive aria-hidden="true" />
                      Archive
                    </Button>
                    <Button
                      onClick={() => {
                        setFormControlsTab("overview");
                        setFormControlsDialogOpen(true);
                      }}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      <ShieldCheck aria-hidden="true" />
                      Controls
                    </Button>
                    <Button
                      onClick={openReadinessChecklist}
                      size="sm"
                      type="button"
                      variant={
                        readinessReadyForPublish ? "secondary" : "primary"
                      }
                    >
                      <ClipboardList aria-hidden="true" />
                      Readiness
                    </Button>
                    <Button
                      onClick={() => {
                        saveSelectedForm(true);
                      }}
                      disabled={publishMutation.isPending}
                      size="sm"
                      variant="primary"
                    >
                      <UploadCloud aria-hidden="true" />
                      Publish
                    </Button>
                    <Button
                      onClick={openDeploymentCenter}
                      disabled={publishMutation.isPending}
                      size="sm"
                      type="button"
                      variant="primary"
                    >
                      <Smartphone aria-hidden="true" />
                      Deploy to app
                    </Button>
                    <Button
                      onClick={openSubmissionReviewWorkspace}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      <Eye aria-hidden="true" />
                      Review data
                    </Button>
                  </div>
                </div>
              </section>

              <section className="hidden rounded-lg border bg-panel px-3 py-2">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-start gap-2">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-primary/10 text-primary">
                      <Smartphone aria-hidden="true" size={17} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">
                          Mobile deployment
                        </p>
                        <Badge
                          tone={
                            selectedMobileDeployment ? "success" : "warning"
                          }
                        >
                          {selectedMobileDeployment
                            ? "Deployed"
                            : "Not deployed"}
                        </Badge>
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {selectedMobileDeployment
                          ? `Survey App · ${selectedMobileDeployment.assignedAudience} · ${selectedMobileDeployment.syncMode.replace("_", " ")}`
                          : "Publish and deploy so field officers see this form after app sync."}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedMobileDeployment ? (
                      <Button
                        onClick={openAssignmentWorkspace}
                        size="sm"
                        type="button"
                        variant="secondary"
                      >
                        Assign officers
                      </Button>
                    ) : null}
                    <Button
                      onClick={openDeploymentCenter}
                      size="sm"
                      type="button"
                      variant={
                        selectedMobileDeployment ? "secondary" : "primary"
                      }
                    >
                      <Smartphone aria-hidden="true" />
                      Deployment center
                    </Button>
                  </div>
                </div>
              </section>

              <section className="hidden rounded-lg border bg-panel px-3 py-2">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-start gap-2">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                      <ShieldCheck aria-hidden="true" size={17} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">Form controls</p>
                        <Badge tone={formControlsReady ? "success" : "warning"}>
                          {formControlsReady ? "Configured" : "Needs review"}
                        </Badge>
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {selectedFormControls.reference_bindings.length}{" "}
                        reference lists ·{" "}
                        {selectedFormControls.permission_rules.length} access
                        rules · {selectedFormControls.workflow_stages.length}{" "}
                        workflow stages ·{" "}
                        {
                          selectedFormControls.data_quality_rules.filter(
                            (rule) => rule.enabled,
                          ).length
                        }{" "}
                        quality checks
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      setFormControlsTab("overview");
                      setFormControlsDialogOpen(true);
                    }}
                    size="sm"
                    type="button"
                    variant={formControlsReady ? "secondary" : "primary"}
                  >
                    <ShieldCheck aria-hidden="true" />
                    Configure controls
                  </Button>
                </div>
              </section>

              <section className="hidden rounded-lg border bg-panel px-3 py-2">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-start gap-2">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-sky-500/10 text-sky-700 dark:text-sky-300">
                      <Layers3 aria-hidden="true" size={17} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">
                          Operational workspaces
                        </p>
                        <Badge tone="accent">Form-level</Badge>
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        Assign teams, import records, monitor quality, and
                        review synced submissions without leaving this form.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={openAssignmentWorkspace}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      <ShieldCheck aria-hidden="true" />
                      Assign
                    </Button>
                    <Button
                      onClick={openImportWorkspace}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      <FileUp aria-hidden="true" />
                      Import
                    </Button>
                    <Button
                      onClick={openQualityWorkspace}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      <Check aria-hidden="true" />
                      Quality
                    </Button>
                    <Button
                      onClick={openSubmissionReviewWorkspace}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      <Eye aria-hidden="true" />
                      Review
                    </Button>
                  </div>
                </div>
              </section>

              <section className="hidden rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-2">
                    <Sparkles
                      aria-hidden="true"
                      className="mt-0.5 shrink-0 text-primary"
                      size={16}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {smartCanvasAction.label}
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {smartCanvasAction.description}
                      </p>
                    </div>
                  </div>
                  <Button
                    className="shrink-0"
                    onClick={() =>
                      openBuilderAssistant(
                        smartCanvasAction.mode,
                        smartCanvasAction.query,
                      )
                    }
                    size="sm"
                    type="button"
                    variant="primary"
                  >
                    Continue
                  </Button>
                </div>
              </section>

              <Modal
                description={assistantDescription}
                onOpenChange={setBuilderActionDialogOpen}
                open={builderActionDialogOpen}
                title={assistantTitle}
              >
                <div className="flex-1 overflow-y-auto p-5 product-scrollbar">
                  {builderAssistantMode === "question" ? (
                    <div>
                      <label className="relative block">
                        <span className="sr-only">Search smart fields</span>
                        <Search
                          aria-hidden="true"
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                          size={15}
                        />
                        <Input
                          className="pl-9"
                          onChange={(event) =>
                            setSmartFieldQuery(event.target.value)
                          }
                          placeholder="Try age, phone, consent, GPS, photo, score..."
                          value={smartFieldQuery}
                        />
                      </label>
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        {smartFieldSuggestions.map((preset) => {
                          const Icon = fieldTypeIcons[preset.type];
                          return (
                            <button
                              className="rounded-lg border bg-background p-3 text-left transition hover:border-primary/40 hover:bg-primary/10"
                              key={`${preset.id}-${preset.type}`}
                              onClick={() =>
                                questionFirstMode
                                  ? addTypedQuestionFromPreset(preset)
                                  : addPresetField(preset)
                              }
                              type="button"
                            >
                              <span className="flex items-center gap-2 text-sm font-semibold">
                                <Icon
                                  aria-hidden="true"
                                  className="text-primary"
                                  size={15}
                                />
                                {preset.label}
                              </span>
                              <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                                {preset.hint}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {builderAssistantMode === "section" ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {sectionTemplates.map((template) => (
                        <button
                          className="rounded-lg border bg-background p-3 text-left transition hover:border-primary/40 hover:bg-primary/10"
                          key={template.id}
                          onClick={() => addSectionTemplate(template)}
                          type="button"
                        >
                          <span className="block text-sm font-semibold">
                            {template.title}
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                            {template.description} · {template.fields.length}{" "}
                            smart fields
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {builderAssistantMode === "logic" ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {[
                        [
                          "required",
                          "Require answer",
                          "Make this field mandatory before submission.",
                        ],
                        [
                          "email",
                          "Email validation",
                          "Convert this to an email field with validation.",
                        ],
                        [
                          "phone",
                          "Phone validation",
                          "Convert this to a phone field with validation.",
                        ],
                        [
                          "gps",
                          "GPS evidence",
                          "Require GPS with accuracy control.",
                        ],
                        [
                          "yes_no",
                          "Yes / No choice",
                          "Use a simple binary response.",
                        ],
                        [
                          "skip_rule",
                          "Show / hide rule",
                          "Add a starter no-code visibility rule.",
                        ],
                      ].map(([kind, label, helper]) => (
                        <button
                          className="rounded-lg border bg-background p-3 text-left transition hover:border-primary/40 hover:bg-primary/10"
                          key={kind}
                          onClick={() =>
                            applySmartFieldSetup(
                              kind as
                                | "required"
                                | "email"
                                | "phone"
                                | "gps"
                                | "yes_no"
                                | "skip_rule",
                            )
                          }
                          type="button"
                        >
                          <span className="block text-sm font-semibold">
                            {label}
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                            {helper}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {builderAssistantMode === "readiness" &&
                  selectedFormCompatibility &&
                  selectedFormWorkbook ? (
                    <div className="space-y-4">
                      <div className="grid gap-2 sm:grid-cols-2">
                        {[
                          [
                            "XLSForm",
                            activeCompatibility?.xlsform_ready
                              ? "Ready"
                              : "Needs questions",
                          ],
                          [
                            "Mobile",
                            activeCompatibility?.mobile_app_ready
                              ? "Offline-ready"
                              : "Check fields",
                          ],
                          [
                            "Web",
                            activeCompatibility?.web_form_ready
                              ? "Ready"
                              : "Check scanner fields",
                          ],
                          [
                            "Media fields",
                            String(activeCompatibility?.media_field_count ?? 0),
                          ],
                          [
                            "XLSForm rows",
                            String(
                              xlsFormQuery.data?.survey.length ??
                                selectedFormWorkbook.survey.length,
                            ),
                          ],
                        ].map(([label, value]) => (
                          <div
                            className="rounded-lg border bg-background px-3 py-3"
                            key={label}
                          >
                            <p className="text-xs text-muted-foreground">
                              {label}
                            </p>
                            <p className="mt-1 text-sm font-semibold">
                              {value}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          disabled={
                            !isPersistedSelectedForm ||
                            !token ||
                            token === "preview-token" ||
                            xlsFormQuery.isFetching
                          }
                          onClick={() => xlsFormQuery.refetch()}
                          size="sm"
                          type="button"
                          variant="secondary"
                        >
                          <FileDown aria-hidden="true" />
                          {xlsFormQuery.isFetching ? "Checking" : "XLSForm"}
                        </Button>
                        <Button
                          disabled={
                            !isPersistedSelectedForm ||
                            !token ||
                            token === "preview-token" ||
                            publicLinkMutation.isPending
                          }
                          onClick={() => publicLinkMutation.mutate()}
                          size="sm"
                          type="button"
                          variant="secondary"
                        >
                          <FileUp aria-hidden="true" />
                          {publicLinkMutation.isPending
                            ? "Creating"
                            : "Public link"}
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {builderAssistantMode === "preview" ? (
                    <div>
                      <div className="flex flex-wrap gap-1 rounded-md border bg-background p-1">
                        {(
                          [
                            "desktop",
                            "tablet",
                            "mobile",
                            "enumerator",
                            "respondent",
                          ] as const
                        ).map((mode) => (
                          <button
                            key={mode}
                            className={cn(
                              "rounded px-2.5 py-1 text-xs font-medium",
                              previewMode === mode
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground",
                            )}
                            onClick={() => setPreviewMode(mode)}
                            type="button"
                          >
                            {mode}
                          </button>
                        ))}
                      </div>
                      <div
                        className={cn(
                          "mt-3 rounded-xl border bg-background p-4",
                          ["mobile", "enumerator", "respondent"].includes(
                            previewMode,
                          ) && "mx-auto max-w-sm",
                          previewMode === "tablet" && "mx-auto max-w-2xl",
                        )}
                      >
                        <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
                          <Smartphone aria-hidden="true" size={14} />
                          {previewMode === "respondent"
                            ? "Respondent preview"
                            : previewMode === "enumerator"
                              ? "Enumerator preview"
                              : "Device preview"}{" "}
                          · {selectedPages.length} page(s) ·{" "}
                          {selectedForm.fields.length} fields
                        </div>
                        <div className="max-h-[55vh] space-y-4 overflow-y-auto pr-1 product-scrollbar">
                          {selectedPages.map((page, pageIndex) => {
                            const pageSections = selectedForm.sections.filter(
                              (section) => section.pageId === page.id,
                            );
                            return (
                              <section
                                className="rounded-lg border bg-panel/70 p-3"
                                key={page.id}
                              >
                                <div className="mb-3 flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                      Page {pageIndex + 1}
                                    </p>
                                    <h3 className="mt-1 text-sm font-semibold">
                                      {page.title}
                                    </h3>
                                    {page.description ? (
                                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                        {page.description}
                                      </p>
                                    ) : null}
                                  </div>
                                  <Badge tone="neutral">
                                    {
                                      selectedForm.fields.filter(
                                        (field) => field.pageId === page.id,
                                      ).length
                                    }{" "}
                                    fields
                                  </Badge>
                                </div>
                                <div className="space-y-3">
                                  {pageSections.map((section, sectionIndex) => {
                                    const sectionFields =
                                      selectedForm.fields.filter(
                                        (field) =>
                                          field.sectionId === section.id,
                                      );
                                    const tone = getSectionTone(sectionIndex);
                                    return (
                                      <div
                                        className={cn(
                                          "overflow-hidden rounded-lg border bg-background",
                                          tone.border,
                                        )}
                                        key={section.id}
                                      >
                                        <div
                                          className={cn(
                                            "mb-3 border-b px-3 py-2",
                                            tone.header,
                                          )}
                                        >
                                          <div className="flex items-center gap-2">
                                            <span
                                              className={cn(
                                                "h-7 w-1.5 rounded-full",
                                                tone.rail,
                                              )}
                                            />
                                            <h4 className="text-sm font-semibold">
                                              {section.title}
                                            </h4>
                                          </div>
                                          {section.description ? (
                                            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                              {section.description}
                                            </p>
                                          ) : null}
                                        </div>
                                        <div className="space-y-3 px-3 pb-3">
                                          {sectionFields.map(
                                            (field, fieldIndex) => (
                                              <label
                                                className="block rounded-lg border bg-panel p-3 text-sm"
                                                key={field.id}
                                              >
                                                <span className="flex flex-wrap items-center gap-1.5">
                                                  <span className="font-mono text-[11px] text-muted-foreground">
                                                    {fieldIndex + 1}
                                                  </span>
                                                  <span className="font-semibold">
                                                    {field.label}
                                                  </span>
                                                  {field.required ? (
                                                    <span className="text-danger">
                                                      *
                                                    </span>
                                                  ) : null}
                                                  <Badge tone="neutral">
                                                    {field.type.replace(
                                                      "_",
                                                      " ",
                                                    )}
                                                  </Badge>
                                                  {field.logic?.length ? (
                                                    <Badge tone="accent">
                                                      logic
                                                    </Badge>
                                                  ) : null}
                                                  {Object.keys(
                                                    field.validation ?? {},
                                                  ).length ? (
                                                    <Badge tone="warning">
                                                      validation
                                                    </Badge>
                                                  ) : null}
                                                </span>
                                                {field.hint ? (
                                                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                                                    {field.hint}
                                                  </span>
                                                ) : null}
                                                <FieldInputPreview
                                                  field={field}
                                                />
                                              </label>
                                            ),
                                          )}
                                          {!sectionFields.length ? (
                                            <div className="rounded-md border border-dashed bg-panel px-3 py-2 text-xs text-muted-foreground">
                                              No fields in this section yet.
                                            </div>
                                          ) : null}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </section>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </Modal>

              <section
                className="overflow-hidden rounded-lg border bg-panel"
                aria-labelledby="canvas-title"
              >
                {!builderFocusMode ? (
                  <div className="border-b px-3 py-2">
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2
                            id="canvas-title"
                            className="text-sm font-semibold"
                          >
                            Advanced builder tools
                          </h2>
                          <Badge tone="neutral">Full tools</Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Question library, outline, canvas, and properties are
                          all visible.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Button
                          onClick={() =>
                            setBuilderFocusMode((current) => !current)
                          }
                          size="sm"
                          type="button"
                          variant="primary"
                        >
                          <PanelsTopLeft aria-hidden="true" />
                          Focus builder
                        </Button>
                        <Button
                          onClick={() => openBuilderAssistant("question")}
                          size="sm"
                          type="button"
                          variant="primary"
                        >
                          <MousePointer2 aria-hidden="true" />
                          Types
                        </Button>
                        <Button
                          onClick={() => openBuilderAssistant("section")}
                          size="sm"
                          type="button"
                          variant="secondary"
                        >
                          <Plus aria-hidden="true" />
                          Add section
                        </Button>
                        <Button
                          onClick={() => openBuilderAssistant("preview")}
                          size="sm"
                          type="button"
                          variant="secondary"
                        >
                          <Smartphone aria-hidden="true" />
                          Preview
                        </Button>
                        <Button
                          onClick={() => openBuilderAssistant("readiness")}
                          size="sm"
                          type="button"
                          variant="ghost"
                        >
                          <Check aria-hidden="true" />
                          Check
                        </Button>
                        <Badge tone="accent">
                          {activePageFields.length} on page
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 product-scrollbar">
                      {selectedPages.map((page) => (
                        <button
                          className={cn(
                            "inline-flex shrink-0 items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-medium transition",
                            activePage?.id === page.id
                              ? "border-primary bg-primary text-primary-foreground"
                              : "bg-background text-muted-foreground hover:text-foreground",
                          )}
                          key={page.id}
                          onClick={() => setSelectedPageId(page.id)}
                          type="button"
                        >
                          {page.title}
                          <span
                            className={cn(
                              "rounded bg-muted px-1.5 py-0.5 text-[11px]",
                              activePage?.id === page.id &&
                                "bg-primary-foreground/20",
                            )}
                          >
                            {
                              selectedForm.fields.filter(
                                (field) => field.pageId === page.id,
                              ).length
                            }
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                {builderFocusMode ? (
                  <div
                    className={cn(
                      "grid min-h-[560px] bg-background lg:grid-cols-[minmax(260px,37%)_minmax(0,1fr)]",
                      !questionFirstMode && "border-t",
                    )}
                    data-question-first-canvas
                  >
                    <div
                      className={cn(
                        "grid grid-cols-[48px_minmax(0,1fr)] border-r bg-panel/60",
                        questionFirstMode && "grid-rows-[auto_minmax(0,1fr)]",
                      )}
                    >
                      <div className="row-span-2 border-r bg-muted/50 py-3">
                        <button
                          aria-label="Add question"
                          title="Add question"
                          className="mx-auto flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition hover:bg-background hover:text-primary"
                          onClick={() => openBuilderAssistant("question")}
                          type="button"
                        >
                          <Plus aria-hidden="true" size={18} />
                        </button>
                        <button
                          aria-label="Add section"
                          title="Add section"
                          className="mx-auto mt-2 flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition hover:bg-background hover:text-primary"
                          onClick={() => openBuilderAssistant("section")}
                          type="button"
                        >
                          <Layers3 aria-hidden="true" size={18} />
                        </button>
                        <button
                          aria-label="Choose template"
                          title="Choose template"
                          className="mx-auto mt-2 flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition hover:bg-background hover:text-primary"
                          onClick={() => setBuilderMode("templates")}
                          type="button"
                        >
                          <Star aria-hidden="true" size={18} />
                        </button>
                        <button
                          aria-label="Logic tools"
                          title="Logic tools"
                          className="mx-auto mt-2 flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition hover:bg-background hover:text-primary"
                          onClick={() => openBuilderAssistant("logic")}
                          type="button"
                        >
                          <Workflow aria-hidden="true" size={18} />
                        </button>
                        <button
                          aria-label="Preview form"
                          title="Preview form"
                          className="mx-auto mt-2 flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition hover:bg-background hover:text-primary"
                          onClick={() => openBuilderAssistant("preview")}
                          type="button"
                        >
                          <Eye aria-hidden="true" size={18} />
                        </button>
                        <button
                          aria-label="Publish checklist"
                          title="Publish checklist"
                          className="mx-auto mt-2 flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition hover:bg-background hover:text-primary"
                          onClick={() => openBuilderAssistant("readiness")}
                          type="button"
                        >
                          <ClipboardList aria-hidden="true" size={18} />
                        </button>
                      </div>
                      <div
                        className={cn(
                          "border-b bg-background px-4 py-3",
                          questionFirstMode && "px-3 py-2",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold">Questions</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {activePageFields.length} on this page
                            </p>
                          </div>
                          {!questionFirstMode ? (
                            <Button
                              aria-label="Show advanced builder tools"
                              onClick={() => setBuilderFocusMode(false)}
                              size="icon"
                              type="button"
                              variant="ghost"
                            >
                              <PanelsTopLeft aria-hidden="true" />
                            </Button>
                          ) : null}
                        </div>
                        <div
                          className={cn(
                            "mt-3 rounded-md border bg-panel p-2",
                            questionFirstMode && "mt-1.5 p-1.5",
                          )}
                        >
                          <div className="flex items-center gap-1.5 text-xs font-semibold">
                            <Sparkles
                              aria-hidden="true"
                              className="text-primary"
                              size={13}
                            />
                            Ask a question
                          </div>
                          <div
                            className={cn(
                              "mt-2 grid gap-1.5 sm:grid-cols-[minmax(0,1fr)_auto]",
                              questionFirstMode && "mt-1 gap-1",
                            )}
                          >
                            {questionFirstMode ? (
                              <Input
                                className="h-8 bg-background"
                                onChange={(event) =>
                                  setQuestionComposerText(event.target.value)
                                }
                                onKeyDown={(event) => {
                                  if (
                                    (event.metaKey || event.ctrlKey) &&
                                    event.key === "Enter" &&
                                    questionComposerText.trim()
                                  ) {
                                    event.preventDefault();
                                    if (recommendedQuestionSuggestion) {
                                      addQuestionFromComposer(
                                        recommendedQuestionSuggestion,
                                      );
                                    }
                                  }
                                }}
                                placeholder="Type a question, e.g. Farmer name"
                                value={questionComposerText}
                              />
                            ) : (
                              <Textarea
                                className="min-h-14 bg-background text-xs"
                                onChange={(event) =>
                                  setQuestionComposerText(event.target.value)
                                }
                                onKeyDown={(event) => {
                                  if (
                                    (event.metaKey || event.ctrlKey) &&
                                    event.key === "Enter" &&
                                    questionComposerText.trim()
                                  ) {
                                    event.preventDefault();
                                    if (recommendedQuestionSuggestion) {
                                      addQuestionFromComposer(
                                        recommendedQuestionSuggestion,
                                      );
                                    }
                                  }
                                }}
                                placeholder="Type a question, e.g. Farmer name"
                                value={questionComposerText}
                              />
                            )}
                            <Button
                              aria-label="Choose response type"
                              className={cn(
                                "self-stretch",
                                questionFirstMode && "h-8 self-auto px-2",
                              )}
                              onClick={() => {
                                setSmartFieldQuery("");
                                openBuilderAssistant("question");
                              }}
                              title="Choose response type"
                              type="button"
                              variant="secondary"
                            >
                              <ListFilter aria-hidden="true" />
                              Type
                            </Button>
                          </div>
                          {questionComposerText.trim() ? (
                            <div className="mt-2 grid gap-1.5">
                              {questionTypeSuggestions
                                .slice(0, 2)
                                .map((suggestion) => {
                                  const Icon = fieldTypeIcons[suggestion.type];
                                  return (
                                    <button
                                      className="flex items-center justify-between gap-2 rounded border bg-background px-2 py-1.5 text-left text-xs transition hover:border-primary/35 hover:bg-primary/5"
                                      key={`${suggestion.id}-${suggestion.type}`}
                                      onClick={() =>
                                        addQuestionFromComposer(suggestion)
                                      }
                                      type="button"
                                    >
                                      <span className="flex min-w-0 items-center gap-1.5">
                                        <Icon
                                          aria-hidden="true"
                                          className="shrink-0 text-primary"
                                          size={13}
                                        />
                                        <span className="truncate font-medium">
                                          {suggestion.label}
                                        </span>
                                      </span>
                                      <Badge
                                        tone={
                                          suggestion.confidence === "Best match"
                                            ? "success"
                                            : "neutral"
                                        }
                                      >
                                        {suggestion.confidence}
                                      </Badge>
                                    </button>
                                  );
                                })}
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <div
                        className={cn(
                          "max-h-[56vh] overflow-y-auto product-scrollbar",
                          questionFirstMode && "min-h-0",
                        )}
                      >
                        {activePageFields.length ? (
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={onDragEnd}
                          >
                            <SortableContext
                              items={activePageFields.map((field) => field.id)}
                              strategy={verticalListSortingStrategy}
                            >
                              {activePageFields.map((field, index) => (
                                <FocusQuestionRow
                                  field={field}
                                  index={index}
                                  key={field.id}
                                  onDelete={() => deleteQuestion(field.id)}
                                  onSelect={() => setSelectedFieldId(field.id)}
                                  selected={selectedField?.id === field.id}
                                />
                              ))}
                            </SortableContext>
                          </DndContext>
                        ) : (
                          <div className="p-4">
                            <div className="rounded-lg border border-dashed bg-background p-5 text-center">
                              <Plus
                                aria-hidden="true"
                                className="mx-auto text-primary"
                                size={20}
                              />
                              <p className="mt-2 text-sm font-semibold">
                                Start with one question
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                Write the question above, then add the
                                recommended response type.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="min-h-[560px] bg-background p-4">
                      {selectedField ? (
                        <div className="mx-auto max-w-5xl">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-lg font-bold text-foreground">
                                Q
                                {Math.max(
                                  1,
                                  activePageFields.findIndex(
                                    (field) => field.id === selectedField.id,
                                  ) + 1,
                                )}
                              </p>
                              <p className="mt-1 text-xs font-medium text-muted-foreground">
                                Question settings
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center justify-end gap-1.5">
                              <Badge tone="neutral">
                                {selectedField.type.replace("_", " ")}
                              </Badge>
                              {selectedField.required ? (
                                <Badge tone="warning">Mandatory</Badge>
                              ) : (
                                <Badge tone="neutral">Optional</Badge>
                              )}
                              {selectedField.logic?.length ? (
                                <Badge tone="accent">Logic</Badge>
                              ) : null}
                              {Object.keys(selectedField.validation ?? {})
                                .length ? (
                                <Badge tone="warning">Validation</Badge>
                              ) : null}
                            </div>
                            <Button
                              aria-label="Delete selected question"
                              onClick={() => deleteQuestion(selectedField.id)}
                              size="icon"
                              title="Delete question"
                              type="button"
                              variant="ghost"
                            >
                              <Trash2 aria-hidden="true" />
                            </Button>
                            <Button
                              aria-label="Open full question settings"
                              onClick={() =>
                                openFieldSettings(selectedField.id)
                              }
                              size="icon"
                              type="button"
                              variant="secondary"
                            >
                              <Settings2 aria-hidden="true" />
                            </Button>
                          </div>

                          <div className="mt-3 rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 shadow-sm">
                            <span className="text-[11px] font-bold uppercase tracking-wide text-primary">
                              Question text
                            </span>
                            <Textarea
                              className="mt-1 min-h-16 border-0 bg-transparent px-0 text-lg font-semibold text-foreground shadow-none placeholder:font-normal placeholder:text-muted-foreground/60 focus:ring-0"
                              onChange={(event) => {
                                const siblingVariableNames = selectedForm.fields
                                  .filter(
                                    (field) => field.id !== selectedField.id,
                                  )
                                  .map((field) => field.variableName)
                                  .filter((name): name is string =>
                                    Boolean(name),
                                  );
                                updateSelectedForm(
                                  updateField(
                                    selectedForm,
                                    selectedField.id,
                                    labelPatchWithAutoVariable(
                                      selectedField,
                                      event.target.value,
                                      siblingVariableNames,
                                    ),
                                  ),
                                );
                              }}
                              placeholder="Type the question field officers will see…"
                              value={selectedField.label}
                            />
                          </div>

                          <div className="mt-4 flex gap-1 overflow-x-auto rounded-xl border bg-muted/60 p-1.5 shadow-sm sm:grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
                            {(
                              [
                                ["common", Settings2, "Basics"],
                                ["response", ListFilter, "Response"],
                                ["validation", Check, "Validation"],
                                ["logic", Workflow, "Logic"],
                                ["indicator", Sigma, "Indicator"],
                                ["beneficiary", Fingerprint, "Entity"],
                                ["reference", Database, "Reference"],
                                ["evidence", Camera, "Evidence"],
                                ["privacy", ShieldCheck, "Privacy"],
                                ["mobile", Smartphone, "Mobile"],
                                ["governance", History, "Governance"],
                                ["appearance", Palette, "Advanced"],
                              ] satisfies [
                                FocusSettingsTab,
                                typeof Type,
                                string,
                              ][]
                            )
                              // Only show tabs that apply to this response type, so builders aren't
                              // shown irrelevant settings (e.g. Reference for a currency answer).
                              .filter(([tab]) => focusTabApplies(tab, selectedField.type))
                              .map(([tab, Icon, label]) => (
                              <button
                                className={cn(
                                  "flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-xs font-semibold text-muted-foreground transition hover:bg-background hover:text-foreground",
                                  focusSettingsTab === tab &&
                                    "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground",
                                )}
                                key={tab}
                                onClick={() => setFocusSettingsTab(tab)}
                                type="button"
                              >
                                <Icon aria-hidden="true" size={14} />
                                {label}
                              </button>
                            ))}
                          </div>

                          {focusSettingsTab === "common" ? (
                            <CommonSettingsPanel
                              field={selectedField}
                              form={selectedForm}
                              onUpdateForm={updateSelectedForm}
                              onMoveField={moveField}
                              onDeleteQuestion={deleteQuestion}
                            />
                          ) : null}

                          {focusSettingsTab === "logic" ? (
                            <LogicSettingsPanel
                              field={selectedField}
                              form={selectedForm}
                              onUpdateForm={updateSelectedForm}
                              logicActionKind={logicActionKind}
                              setLogicActionKind={setLogicActionKind}
                              logicConditionFieldId={logicConditionFieldId}
                              setLogicConditionFieldId={setLogicConditionFieldId}
                              logicConditionValue={logicConditionValue}
                              setLogicConditionValue={setLogicConditionValue}
                              advancedLogicKind={advancedLogicKind}
                              setAdvancedLogicKind={setAdvancedLogicKind}
                              advancedLogicExpression={advancedLogicExpression}
                              setAdvancedLogicExpression={setAdvancedLogicExpression}
                              advancedLogicMessage={advancedLogicMessage}
                              setAdvancedLogicMessage={setAdvancedLogicMessage}
                              onAddVisualLogicRule={addVisualLogicRule}
                              onAddAdvancedLogicRule={addAdvancedLogicRule}
                            />
                          ) : null}


                          {focusSettingsTab === "response" ? (
                            <ResponseSettingsPanel
                              field={selectedField}
                              form={selectedForm}
                              onUpdateForm={updateSelectedForm}
                              otherForms={backendFormsQuery.data ?? []}
                              onUpdateValidation={updateSelectedFieldValidation}
                              onTabChange={setFocusSettingsTab}
                            />
                          ) : null}

                          {focusSettingsTab === "validation" ? (
                            <section className="mt-4 rounded-lg border bg-panel p-4">
                              <div className="flex items-center gap-2">
                                <Check
                                  aria-hidden="true"
                                  className="text-primary"
                                  size={16}
                                />
                                <h3 className="text-sm font-semibold">
                                  Validation
                                </h3><HelpHint label="About this tab" title="Validation">Rules that protect data quality before submission. Only the rules that fit this response type are shown.</HelpHint>
                              </div>
                              <p className="mt-4 rounded-md border bg-background p-2 text-xs text-muted-foreground">
                                Showing validations for a{" "}
                                <span className="font-semibold">
                                  {selectedField.type.replace("_", " ")}
                                </span>{" "}
                                answer.
                              </p>
                              <label className="mt-3 flex items-center gap-2 text-sm font-semibold">
                                <input
                                  checked={Boolean(selectedField.validation?.warnOnly)}
                                  className="h-4 w-4"
                                  onChange={(event) => updateSelectedFieldValidation({ warnOnly: event.target.checked || undefined })}
                                  type="checkbox"
                                />
                                <span className="inline-flex items-center gap-1.5">
                                  Warn instead of block
                                  <HelpHint label="About warn vs block" title="Warn instead of block">
                                    These rules become advisory — the officer sees a warning but can still submit. Use for
                                    “unusual but possible” values; leave off for rules that must be enforced.
                                  </HelpHint>
                                </span>
                              </label>
                              <div className="mt-3 grid gap-3 lg:grid-cols-4">
                                {fieldValidationCapabilities(selectedField.type)
                                  .numericRange ? (
                                  <>
                                    <label className="text-sm font-semibold">
                                      Minimum value
                                      <Input
                                        className="mt-2"
                                        onChange={(event) =>
                                          updateSelectedFieldValidation({
                                            min:
                                              event.target.value === ""
                                                ? undefined
                                                : Number(event.target.value),
                                          })
                                        }
                                        type="number"
                                        value={selectedField.validation?.min ?? ""}
                                      />
                                    </label>
                                    <label className="text-sm font-semibold">
                                      Maximum value
                                      <Input
                                        className="mt-2"
                                        onChange={(event) =>
                                          updateSelectedFieldValidation({
                                            max:
                                              event.target.value === ""
                                                ? undefined
                                                : Number(event.target.value),
                                          })
                                        }
                                        type="number"
                                        value={selectedField.validation?.max ?? ""}
                                      />
                                    </label>
                                  </>
                                ) : null}
                                {fieldValidationCapabilities(selectedField.type)
                                  .textLength ? (
                                  <>
                                    <label className="text-sm font-semibold">
                                      Minimum length
                                      <Input
                                        className="mt-2"
                                        onChange={(event) =>
                                          updateSelectedFieldValidation({
                                            minLength:
                                              event.target.value === ""
                                                ? undefined
                                                : Number(event.target.value),
                                          })
                                        }
                                        type="number"
                                        value={
                                          selectedField.validation?.minLength ?? ""
                                        }
                                      />
                                    </label>
                                    <label className="text-sm font-semibold">
                                      Maximum length
                                      <Input
                                        className="mt-2"
                                        onChange={(event) =>
                                          updateSelectedFieldValidation({
                                            maxLength:
                                              event.target.value === ""
                                                ? undefined
                                                : Number(event.target.value),
                                          })
                                        }
                                        type="number"
                                        value={
                                          selectedField.validation?.maxLength ?? ""
                                        }
                                      />
                                    </label>
                                  </>
                                ) : null}
                                {fieldValidationCapabilities(selectedField.type)
                                  .dateRange ? (
                                  <>
                                    <label className="text-sm font-semibold">
                                      Earliest date
                                      <Input
                                        className="mt-2"
                                        onChange={(event) =>
                                          updateSelectedFieldValidation({
                                            minDate:
                                              event.target.value || undefined,
                                          })
                                        }
                                        type="date"
                                        value={
                                          selectedField.validation?.minDate ?? ""
                                        }
                                      />
                                    </label>
                                    <label className="text-sm font-semibold">
                                      Latest date
                                      <Input
                                        className="mt-2"
                                        onChange={(event) =>
                                          updateSelectedFieldValidation({
                                            maxDate:
                                              event.target.value || undefined,
                                          })
                                        }
                                        type="date"
                                        value={
                                          selectedField.validation?.maxDate ?? ""
                                        }
                                      />
                                    </label>
                                  </>
                                ) : null}
                              </div>
                              {["multiselect", "checkbox"].includes(selectedField.type) ? (
                                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                                  <label className="text-sm font-semibold">
                                    Minimum selections
                                    <Input
                                      className="mt-2"
                                      onChange={(event) =>
                                        updateSelectedFieldValidation({
                                          minSelections: event.target.value === "" ? undefined : Number(event.target.value),
                                        })
                                      }
                                      type="number"
                                      value={selectedField.validation?.minSelections ?? ""}
                                    />
                                  </label>
                                  <label className="text-sm font-semibold">
                                    Maximum selections
                                    <Input
                                      className="mt-2"
                                      onChange={(event) =>
                                        updateSelectedFieldValidation({
                                          maxSelections: event.target.value === "" ? undefined : Number(event.target.value),
                                        })
                                      }
                                      type="number"
                                      value={selectedField.validation?.maxSelections ?? ""}
                                    />
                                  </label>
                                </div>
                              ) : null}
                              {["number", "decimal", "currency"].includes(selectedField.type) ? (
                                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                                  <label className="text-sm font-semibold">
                                    Decimal places
                                    <Input
                                      className="mt-2"
                                      onChange={(event) =>
                                        updateSelectedFieldValidation({
                                          decimalPlaces: event.target.value === "" ? undefined : Number(event.target.value),
                                        })
                                      }
                                      type="number"
                                      value={selectedField.validation?.decimalPlaces ?? ""}
                                    />
                                  </label>
                                  <label className="text-sm font-semibold">
                                    Unit (e.g. kg, ha, %)
                                    <Input
                                      className="mt-2"
                                      onChange={(event) =>
                                        updateSelectedFieldValidation({ unit: event.target.value || undefined })
                                      }
                                      value={selectedField.validation?.unit ?? ""}
                                    />
                                  </label>
                                </div>
                              ) : null}
                              {["select", "dropdown", "radio", "multiselect", "checkbox"].includes(selectedField.type) ? (
                                <label className="mt-3 flex items-center gap-2 text-sm font-semibold">
                                  <input
                                    checked={selectedField.validation?.allowOther ?? false}
                                    onChange={(event) =>
                                      updateSelectedFieldValidation({ allowOther: event.target.checked || undefined })
                                    }
                                    type="checkbox"
                                  />
                                  Allow “Other (specify)” with a free-text box
                                </label>
                              ) : null}
                              {["date", "datetime"].includes(selectedField.type) ? (
                                <label className="mt-3 flex items-center gap-2 text-sm font-semibold">
                                  <input
                                    checked={selectedField.validation?.defaultToday ?? false}
                                    onChange={(event) =>
                                      updateSelectedFieldValidation({ defaultToday: event.target.checked || undefined })
                                    }
                                    type="checkbox"
                                  />
                                  Pre-fill today’s date when the question opens
                                </label>
                              ) : null}
                              <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                                {fieldValidationCapabilities(selectedField.type)
                                  .pattern ? (
                                  <label className="text-sm font-semibold">
                                    Regex pattern
                                    <Input
                                      className="mt-2 font-mono"
                                      onChange={(event) =>
                                        updateSelectedFieldValidation({
                                          pattern: event.target.value,
                                        })
                                      }
                                      placeholder="^[A-Z0-9-]+$"
                                      value={
                                        selectedField.validation?.pattern ?? ""
                                      }
                                    />
                                  </label>
                                ) : null}
                                <CrossFieldRuleBuilder
                                  onApply={(expression) =>
                                    updateSelectedFieldValidation({ expression })
                                  }
                                  siblings={selectedForm.fields
                                    .filter((item) => item.id !== selectedField.id)
                                    .map((item) => ({ value: item.variableName ?? item.id, label: item.label }))}
                                  thisVariable={selectedField.variableName ?? selectedField.id}
                                />
                                <label className="text-sm font-semibold">
                                  <span className="inline-flex items-center gap-1.5">
                                    Custom validation expression
                                    <HelpHint label="About custom expressions" title="Custom validation expression">
                                      Advanced rule using variables, e.g. <code>{"${age} >= 18"}</code> or
                                      <code>{" ${end_date} >= ${start_date}"}</code>. The builder above fills this for you.
                                    </HelpHint>
                                  </span>
                                  <Input
                                    className="mt-2 font-mono"
                                    onChange={(event) =>
                                      updateSelectedForm(
                                        updateField(
                                          selectedForm,
                                          selectedField.id,
                                          {
                                            validation: {
                                              ...selectedField.validation,
                                              expression: event.target.value,
                                            },
                                          },
                                        ),
                                      )
                                    }
                                    placeholder="${age} >= 18"
                                    value={
                                      selectedField.validation?.expression ?? ""
                                    }
                                  />
                                </label>
                                <label className="text-sm font-semibold">
                                  Custom validation message
                                  <Input
                                    className="mt-2"
                                    onChange={(event) =>
                                      updateSelectedFieldValidation({
                                        customMessage:
                                          event.target.value || undefined,
                                      })
                                    }
                                    placeholder="Explain the correction in plain language"
                                    value={
                                      selectedField.validation
                                        ?.customMessage ?? ""
                                    }
                                  />
                                </label>
                              </div>
                              <div className="mt-3 grid gap-2 rounded-md border bg-background p-3 sm:grid-cols-2">
                                {(() => {
                                  const caps = fieldValidationCapabilities(
                                    selectedField.type,
                                  );
                                  const toggles: Array<[string, string]> = [];
                                  if (caps.wholeNumberToggle)
                                    toggles.push(["integerOnly", "Whole number only"]);
                                  if (caps.dateRange)
                                    toggles.push(
                                      ["blockFutureDates", "Block future dates"],
                                      ["blockPastDates", "Block past dates"],
                                    );
                                  if (caps.uniqueness)
                                    toggles.push(
                                      ["uniqueResponse", "Require a unique answer"],
                                      ["duplicateCheck", "Check this answer for duplicates"],
                                    );
                                  if (caps.dontKnowRefused)
                                    toggles.push(
                                      ["allowDontKnow", "Allow “Don’t know”"],
                                      ["allowRefused", "Allow “Refused”"],
                                    );
                                  return toggles;
                                })().map(([key, label]) => (
                                  <label
                                    className="flex items-center gap-2 text-sm font-semibold"
                                    key={key}
                                  >
                                    <input
                                      checked={Boolean(
                                        selectedField.validation?.[
                                          key as keyof NonNullable<
                                            FormField["validation"]
                                          >
                                        ],
                                      )}
                                      className="h-4 w-4"
                                      onChange={(event) =>
                                        updateSelectedFieldValidation({
                                          [key]:
                                            event.target.checked || undefined,
                                        } as Partial<
                                          NonNullable<FormField["validation"]>
                                        >)
                                      }
                                      type="checkbox"
                                    />
                                    {label}
                                  </label>
                                ))}
                              </div>
                              {fieldValidationCapabilities(selectedField.type).uniqueness &&
                              (selectedField.validation?.uniqueResponse || selectedField.validation?.duplicateCheck) ? (
                                <p className="mt-2 text-xs text-muted-foreground">
                                  When this answer repeats a value already submitted for this form, the new
                                  submission is flagged for supervisor review (the officer is not blocked, so
                                  offline data is never lost). Best for IDs like national ID or phone number.
                                </p>
                              ) : null}
                              <div className="mt-4 rounded-md border bg-background p-3">
                                <div className="flex items-center justify-between gap-2">
                                  <div>
                                    <p className="text-sm font-semibold">
                                      Exact data presets
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      Apply common rules that stop wrong entries
                                      before field officers submit the form.
                                    </p>
                                  </div>
                                  <Badge tone="success">Recommended</Badge>
                                </div>
                                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                  {[
                                    {
                                      label: "Phone format",
                                      patch: {
                                        pattern: "^\\\\+?[0-9 ()-]{7,20}$",
                                      },
                                    },
                                    {
                                      label: "Email format",
                                      patch: {
                                        pattern:
                                          "^[^\\\\s@]+@[^\\\\s@]+\\\\.[^\\\\s@]+$",
                                      },
                                    },
                                    {
                                      label: "ID code",
                                      patch: {
                                        minLength: 3,
                                        maxLength: 30,
                                        pattern: "^[A-Z0-9-]+$",
                                      },
                                    },
                                    {
                                      label: "Positive number",
                                      patch: { min: 0 },
                                    },
                                    {
                                      label: "Age 0-120",
                                      patch: { min: 0, max: 120 },
                                    },
                                    {
                                      label: "Required choice",
                                      patch: {
                                        expression: ". != ''",
                                      },
                                    },
                                    {
                                      label: "GPS <= 20m",
                                      patch: { accuracyMax: 20 },
                                    },
                                    {
                                      label: "No future date",
                                      patch: {
                                        blockFutureDates: true,
                                        expression: ". <= today()",
                                      },
                                    },
                                  ].map(({ label, patch }) => (
                                    <button
                                      className="rounded-md border bg-panel px-2.5 py-2 text-left text-xs transition hover:border-primary/40 hover:bg-primary/10"
                                      key={label}
                                      onClick={() =>
                                        updateSelectedForm(
                                          updateField(
                                            selectedForm,
                                            selectedField.id,
                                            {
                                              validation: {
                                                ...selectedField.validation,
                                                ...patch,
                                              },
                                            },
                                          ),
                                        )
                                      }
                                      type="button"
                                    >
                                      <span className="font-semibold">
                                        {label}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                              {[
                                "text",
                                "textarea",
                                "phone",
                                "email",
                                "url",
                              ].includes(selectedField.type) ? (
                                <div className="mt-4 grid gap-3 rounded-md border bg-background p-3 sm:grid-cols-3">
                                  {[
                                    ["uppercase", "Force uppercase"],
                                    ["trim-spaces", "Trim spaces"],
                                    ["unique-value", "Must be unique"],
                                  ].map(([tag, label]) => (
                                    <label
                                      className="flex items-center gap-2 text-sm font-semibold"
                                      key={tag}
                                    >
                                      <input
                                        checked={hasFieldTag(
                                          selectedField,
                                          tag,
                                        )}
                                        className="h-4 w-4"
                                        onChange={(event) =>
                                          updateSelectedForm(
                                            updateField(
                                              selectedForm,
                                              selectedField.id,
                                              {
                                                appearance:
                                                  fieldAppearanceWithTag(
                                                    selectedField,
                                                    tag,
                                                    event.target.checked,
                                                  ),
                                              },
                                            ),
                                          )
                                        }
                                        type="checkbox"
                                      />
                                      {label}
                                    </label>
                                  ))}
                                </div>
                              ) : null}
                              {[
                                "number",
                                "decimal",
                                "currency",
                                "rating",
                                "nps",
                              ].includes(selectedField.type) ? (
                                <div className="mt-4 grid gap-3 rounded-md border bg-background p-3 sm:grid-cols-3">
                                  {[
                                    ["integer-only", "Whole number only"],
                                    ["no-negative", "No negative values"],
                                    ["outlier-flag", "Flag outliers"],
                                  ].map(([tag, label]) => (
                                    <label
                                      className="flex items-center gap-2 text-sm font-semibold"
                                      key={tag}
                                    >
                                      <input
                                        checked={hasFieldTag(
                                          selectedField,
                                          tag,
                                        )}
                                        className="h-4 w-4"
                                        onChange={(event) =>
                                          updateSelectedForm(
                                            updateField(
                                              selectedForm,
                                              selectedField.id,
                                              {
                                                appearance:
                                                  fieldAppearanceWithTag(
                                                    selectedField,
                                                    tag,
                                                    event.target.checked,
                                                  ),
                                                validation:
                                                  tag === "integer-only" &&
                                                  event.target.checked
                                                    ? {
                                                        ...selectedField.validation,
                                                        integerOnly: true,
                                                      }
                                                    : tag === "no-negative" &&
                                                  event.target.checked
                                                    ? {
                                                        ...selectedField.validation,
                                                        min: 0,
                                                      }
                                                    : selectedField.validation,
                                              },
                                            ),
                                          )
                                        }
                                        type="checkbox"
                                      />
                                      {label}
                                    </label>
                                  ))}
                                </div>
                              ) : null}
                              {[
                                "photo",
                                "image",
                                "signature",
                                "audio",
                                "video",
                                "file",
                              ].includes(selectedField.type) ? (
                                <div className="mt-4 grid gap-3 rounded-md border bg-background p-3 sm:grid-cols-3">
                                  <label className="text-sm font-semibold">
                                    Max file size MB
                                    <Input
                                      className="mt-2"
                                      onChange={(event) =>
                                        updateSelectedFieldValidation({
                                          maxFileSizeMb:
                                            event.target.value === ""
                                              ? undefined
                                              : Number(event.target.value),
                                        })
                                      }
                                      type="number"
                                      value={
                                        selectedField.validation
                                          ?.maxFileSizeMb ?? ""
                                      }
                                    />
                                  </label>
                                  <label className="text-sm font-semibold">
                                    Max attachments
                                    <Input
                                      className="mt-2"
                                      onChange={(event) =>
                                        updateSelectedFieldValidation({
                                          maxAttachmentCount:
                                            event.target.value === ""
                                              ? undefined
                                              : Number(event.target.value),
                                        })
                                      }
                                      type="number"
                                      value={
                                        selectedField.validation
                                          ?.maxAttachmentCount ?? ""
                                      }
                                    />
                                  </label>
                                  <label className="text-sm font-semibold">
                                    Allowed file types
                                    <Input
                                      className="mt-2"
                                      onChange={(event) =>
                                        updateSelectedFieldValidation({
                                          allowedFileTypes:
                                            event.target.value || undefined,
                                        })
                                      }
                                      placeholder="jpg,png,pdf"
                                      value={
                                        selectedField.validation
                                          ?.allowedFileTypes ?? ""
                                      }
                                    />
                                  </label>
                                </div>
                              ) : null}
                            </section>
                          ) : null}

                          {focusSettingsTab === "data" ? (
                            <DataSettingsPanel field={selectedField} form={selectedForm} onUpdateForm={updateSelectedForm} onAddReferenceBinding={addReferenceBinding} />
                          ) : null}

                          {focusSettingsTab === "indicator" && focusTabApplies("indicator", selectedField.type) ? (
                            <IndicatorSettingsPanel field={selectedField} form={selectedForm} onUpdateForm={updateSelectedForm} />
                          ) : null}

                          {focusSettingsTab === "beneficiary" && focusTabApplies("beneficiary", selectedField.type) ? (
                            <BeneficiarySettingsPanel field={selectedField} form={selectedForm} onUpdateForm={updateSelectedForm} />
                          ) : null}

                          {focusSettingsTab === "reference" && fieldSupportsSelection(selectedField.type) ? (
                            <ReferenceSettingsPanel
                              field={selectedField}
                              form={selectedForm}
                              onUpdateForm={updateSelectedForm}
                              datasets={datasetsQuery.data ?? []}
                              otherForms={backendFormsQuery.data ?? []}
                              token={token}
                              isPreview={isPreview}
                              onRefetchDatasets={() => void datasetsQuery.refetch()}
                              onAddReferenceBinding={addReferenceBinding}
                            />
                          ) : null}

                          {focusSettingsTab === "evidence" && fieldSupportsEvidence(selectedField.type) ? (
                            <EvidenceSettingsPanel field={selectedField} form={selectedForm} onUpdateForm={updateSelectedForm} />
                          ) : null}

                          {focusSettingsTab === "privacy" && focusTabApplies("privacy", selectedField.type) ? (
                            <PrivacySettingsPanel field={selectedField} form={selectedForm} onUpdateForm={updateSelectedForm} />
                          ) : null}

                          {focusSettingsTab === "mobile" ? (
                            <MobileSettingsPanel field={selectedField} form={selectedForm} onUpdateForm={updateSelectedForm} />
                          ) : null}

                          {focusSettingsTab === "governance" && focusTabApplies("governance", selectedField.type) ? (
                            <GovernanceSettingsPanel field={selectedField} form={selectedForm} onUpdateForm={updateSelectedForm} />
                          ) : null}

                          {focusSettingsTab === "appearance" ? (
                            <AppearanceSettingsPanel field={selectedField} form={selectedForm} onUpdateForm={updateSelectedForm} />
                          ) : null}
                        </div>
                      ) : (
                        <div className="flex min-h-[420px] items-center justify-center rounded-lg border border-dashed bg-panel/60 p-6 text-center">
                          <div>
                            <Plus
                              aria-hidden="true"
                              className="mx-auto text-primary"
                              size={26}
                            />
                            <p className="mt-3 text-base font-semibold">
                              Add a question to begin
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Type a question above and Atlas will suggest the
                              response type.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={onDragEnd}
                  >
                    <SortableContext
                      items={activePageFields.map((field) => field.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div
                        className={cn(
                          "space-y-2 overflow-y-auto bg-muted/20 p-3 product-scrollbar",
                          "max-h-[56vh]",
                        )}
                      >
                        {activeSections.map((section, sectionIndex) => {
                          const sectionFields = selectedForm.fields.filter(
                            (field) => field.sectionId === section.id,
                          );
                          const tone = getSectionTone(sectionIndex);
                          return (
                            <section
                              className={cn(
                                "overflow-hidden rounded-lg border bg-background shadow-line",
                                tone.border,
                              )}
                              key={section.id}
                            >
                              <div
                                className={cn(
                                  "flex flex-col gap-2 border-b px-3 py-2 sm:flex-row sm:items-center sm:justify-between",
                                  tone.header,
                                )}
                              >
                                <button
                                  className="flex items-start gap-2 text-left"
                                  onClick={() => {
                                    setSelectedSectionId(section.id);
                                    setCollapsedSectionIds((current) => ({
                                      ...current,
                                      [section.id]: !current[section.id],
                                    }));
                                  }}
                                  type="button"
                                >
                                  <span
                                    className={cn(
                                      "mt-1 h-8 w-1.5 rounded-full",
                                      tone.rail,
                                    )}
                                  />
                                  <span>
                                    <h3 className="text-sm font-semibold">
                                      {section.title}
                                    </h3>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      {builderFocusMode
                                        ? "Section"
                                        : (section.description ??
                                          "No section description")}{" "}
                                      · {sectionFields.length} questions
                                    </p>
                                  </span>
                                </button>
                                <div className="flex gap-1">
                                  <Button
                                    aria-label={`Duplicate ${section.title}`}
                                    onClick={() =>
                                      duplicateBuilderSection(section.id)
                                    }
                                    size="icon"
                                    type="button"
                                    variant="ghost"
                                  >
                                    <Copy aria-hidden="true" />
                                  </Button>
                                  <Button
                                    onClick={() => {
                                      setSelectedSectionId(section.id);
                                      openBuilderAssistant("question");
                                    }}
                                    size="sm"
                                    type="button"
                                    variant="secondary"
                                  >
                                    <Plus aria-hidden="true" />
                                    Question
                                  </Button>
                                </div>
                              </div>
                              {collapsedSectionIds[section.id] ? (
                                <div className="px-4 py-3 text-xs text-muted-foreground">
                                  Section collapsed · {sectionFields.length}{" "}
                                  question
                                  {sectionFields.length === 1 ? "" : "s"}
                                </div>
                              ) : sectionFields.length ? (
                                sectionFields.map((field) => {
                                  const globalIndex =
                                    selectedForm.fields.findIndex(
                                      (candidate) => candidate.id === field.id,
                                    );
                                  return (
                                    <SortableField
                                      key={field.id}
                                      field={field}
                                      index={globalIndex}
                                      selected={selectedField?.id === field.id}
                                      canMoveDown={
                                        globalIndex <
                                        selectedForm.fields.length - 1
                                      }
                                      canMoveUp={globalIndex > 0}
                                      onDuplicate={() =>
                                        updateSelectedForm(
                                          duplicateField(
                                            selectedForm,
                                            field.id,
                                          ),
                                        )
                                      }
                                      onEditSettings={() =>
                                        openFieldSettings(field.id)
                                      }
                                      onLabelChange={(label) =>
                                        updateSelectedForm(
                                          updateField(
                                            selectedForm,
                                            field.id,
                                            labelPatchWithAutoVariable(
                                              field,
                                              label,
                                              selectedForm.fields
                                                .filter(
                                                  (candidate) =>
                                                    candidate.id !== field.id,
                                                )
                                                .map(
                                                  (candidate) =>
                                                    candidate.variableName,
                                                )
                                                .filter(
                                                  (name): name is string =>
                                                    Boolean(name),
                                                ),
                                            ),
                                          ),
                                        )
                                      }
                                      onMoveDown={() => moveField(field.id, 1)}
                                      onMoveUp={() => moveField(field.id, -1)}
                                      onRemove={() =>
                                        updateSelectedForm(
                                          removeField(selectedForm, field.id),
                                        )
                                      }
                                      onSelect={() =>
                                        openFieldSettings(field.id)
                                      }
                                      onToggleRequired={(required) =>
                                        updateSelectedForm(
                                          updateField(selectedForm, field.id, {
                                            required,
                                          }),
                                        )
                                      }
                                      referenceBound={selectedFormControls.reference_bindings.some(
                                        (binding) =>
                                          binding.question_id === field.id,
                                      )}
                                    />
                                  );
                                })
                              ) : (
                                <div className="p-4">
                                  <div className="rounded-lg border border-dashed bg-panel/60 p-4">
                                    <div className="text-center text-sm text-muted-foreground">
                                      <Plus
                                        aria-hidden="true"
                                        className="mx-auto mb-2 text-primary"
                                      />
                                      Start this section with a common question
                                    </div>
                                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                                      {quickFieldPresets
                                        .slice(0, 4)
                                        .map((preset) => {
                                          const Icon =
                                            fieldTypeIcons[preset.type];
                                          return (
                                            <button
                                              className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-left text-xs transition hover:border-primary/35 hover:bg-primary/5"
                                              key={preset.id}
                                              onClick={() => {
                                                setSelectedSectionId(
                                                  section.id,
                                                );
                                                addPresetField(preset, section);
                                              }}
                                              type="button"
                                            >
                                              <Icon
                                                aria-hidden="true"
                                                className="text-primary"
                                                size={14}
                                              />
                                              <span className="font-medium">
                                                {preset.label}
                                              </span>
                                            </button>
                                          );
                                        })}
                                    </div>
                                    <Button
                                      className="mt-3 w-full"
                                      onClick={() => {
                                        setSelectedSectionId(section.id);
                                        openBuilderAssistant("question");
                                      }}
                                      type="button"
                                      variant="secondary"
                                    >
                                      <Plus aria-hidden="true" />
                                      More question types
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </section>
                          );
                        })}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </section>
            </div>
          ) : null}

          {selectedForm ? (
            <aside
              className={cn(
                "hidden min-h-0 xl:block xl:overflow-y-auto xl:pr-1 product-scrollbar",
                builderFocusMode && "xl:hidden",
              )}
            >
              <FieldPropertiesPanel
                field={selectedField}
                form={selectedForm}
                logicActionKind={logicActionKind}
                logicConditionFieldId={logicConditionFieldId}
                logicConditionValue={logicConditionValue}
                onApplySmartSetup={applySmartFieldSetup}
                onAddVisualLogicRule={addVisualLogicRule}
                onBindReference={addReferenceBinding}
                onTabChange={setRightPanelTab}
                onUpdateForm={updateSelectedForm}
                setLogicActionKind={setLogicActionKind}
                setLogicConditionFieldId={setLogicConditionFieldId}
                setLogicConditionValue={setLogicConditionValue}
                tab={rightPanelTab}
              />
            </aside>
          ) : null}

          {selectedForm && selectedField ? (
            <Modal
              contentClassName="max-w-4xl"
              description="Edit the selected question without losing the live preview of the form."
              onOpenChange={setFieldSettingsDialogOpen}
              open={fieldSettingsDialogOpen}
              title={`Field settings: ${selectedField.label}`}
            >
              <div className="flex-1 overflow-y-auto p-5 product-scrollbar">
                <section className="rounded-lg border bg-panel p-4">
                  <div className="flex items-center gap-2">
                    <Settings2 aria-hidden="true" size={17} />
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-semibold">
                          Field settings
                        </h2>
                        <HelpHint
                          label="About field settings"
                          title="Field settings"
                        >
                          Configure one selected question at a time.
                        </HelpHint>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-1 rounded-md border bg-background p-1">
                    {(
                      [
                        ["field", Settings2, "Field"],
                        ["validation", Check, "Validation"],
                        ["logic", Workflow, "Logic"],
                        ["calculation", Sigma, "Formula"],
                        ["appearance", Palette, "Look"],
                        ["advanced", Command, "Advanced"],
                      ] satisfies [RightPanelTab, typeof Type, string][]
                    ).map(([tab, Icon, label]) => (
                      <button
                        className={cn(
                          "flex h-8 items-center justify-center rounded text-muted-foreground transition hover:bg-muted hover:text-foreground",
                          rightPanelTab === tab &&
                            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                        )}
                        key={String(tab)}
                        onClick={() => setRightPanelTab(tab as RightPanelTab)}
                        aria-label={String(label)}
                        title={String(label)}
                        type="button"
                      >
                        <Icon aria-hidden="true" size={15} />
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 rounded-md border bg-background p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">Setup checklist</p>
                      <Badge tone="accent">Selected field</Badge>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs">
                      {[
                        ["Label added", selectedField.label.trim().length > 0],
                        [
                          "Helper text clear",
                          Boolean(selectedField.hint?.trim()),
                        ],
                        [
                          "Choices ready",
                          !selectedField.options ||
                            selectedField.options.length >= 2,
                        ],
                        [
                          "Validation checked",
                          Boolean(
                            selectedField.validation &&
                            Object.keys(selectedField.validation).length,
                          ),
                        ],
                        [
                          "Logic reviewed",
                          Boolean(selectedField.logic?.length),
                        ],
                      ].map(([label, done]) => (
                        <div
                          className="flex items-center gap-2"
                          key={String(label)}
                        >
                          <span
                            className={cn(
                              "flex h-5 w-5 items-center justify-center rounded-full border",
                              done
                                ? "border-success bg-success/10 text-success"
                                : "border-muted text-muted-foreground",
                            )}
                          >
                            <Check aria-hidden="true" size={12} />
                          </span>
                          <span
                            className={
                              done ? "text-foreground" : "text-muted-foreground"
                            }
                          >
                            {label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 rounded-md border bg-background p-3">
                    <div className="flex items-center gap-2">
                      <Sparkles
                        aria-hidden="true"
                        className="text-primary"
                        size={15}
                      />
                      <p className="text-sm font-semibold">Smart setup</p>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {[
                        ["required", "Require"],
                        ["email", "Email rule"],
                        ["phone", "Phone rule"],
                        ["gps", "GPS rule"],
                        ["yes_no", "Yes / No"],
                        ["skip_rule", "Show rule"],
                      ].map(([kind, label]) => (
                        <Button
                          key={kind}
                          onClick={() =>
                            applySmartFieldSetup(
                              kind as
                                | "required"
                                | "email"
                                | "phone"
                                | "gps"
                                | "yes_no"
                                | "skip_rule",
                            )
                          }
                          size="sm"
                          type="button"
                          variant="secondary"
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {rightPanelTab === "field" ? (
                    <div className="mt-4 space-y-4">
                      <label className="block text-sm font-medium">
                        Field label
                        <Input
                          className="mt-2"
                          value={selectedField.label}
                          onChange={(event) => {
                            const siblingVariableNames = selectedForm.fields
                              .filter(
                                (field) => field.id !== selectedField.id,
                              )
                              .map((field) => field.variableName)
                              .filter((name): name is string =>
                                Boolean(name),
                              );
                            updateSelectedForm(
                              updateField(
                                selectedForm,
                                selectedField.id,
                                labelPatchWithAutoVariable(
                                  selectedField,
                                  event.target.value,
                                  siblingVariableNames,
                                ),
                              ),
                            );
                          }}
                        />
                      </label>
                      {selectedField.type === "repeat_group" ? (
                        <>
                          <RepeatChildrenEditor
                            field={selectedField}
                            onChange={(children) =>
                              updateSelectedForm(
                                updateField(selectedForm, selectedField.id, { children }),
                              )
                            }
                          />
                          <label className="block text-sm font-medium">
                            Number of items comes from
                            <Select
                              className="mt-2"
                              onChange={(event) =>
                                updateSelectedForm(
                                  updateField(selectedForm, selectedField.id, {
                                    repeat: {
                                      ...selectedField.repeat,
                                      countFromVariable: event.target.value || undefined,
                                    },
                                  }),
                                )
                              }
                              value={selectedField.repeat?.countFromVariable ?? ""}
                            >
                              <option value="">Field officer adds items manually</option>
                              {selectedForm.fields
                                .filter(
                                  (candidate) =>
                                    candidate.id !== selectedField.id &&
                                    ["number", "decimal"].includes(candidate.type) &&
                                    Boolean(candidate.variableName),
                                )
                                .map((candidate) => (
                                  <option key={candidate.id} value={candidate.variableName}>
                                    {candidate.label}
                                  </option>
                                ))}
                            </Select>
                            <span className="mt-1 block text-xs text-muted-foreground">
                              When set, the answer to that number question auto-creates one item to
                              fill per count — e.g. answer “3 farms” and the officer gets 3 boundaries to map.
                            </span>
                          </label>
                        </>
                      ) : null}
                      {selectedField.type === "lookup" ? (
                        <label className="block text-sm font-medium">
                          What the officer searches
                          <Select
                            className="mt-2"
                            onChange={(event) =>
                              updateSelectedForm(
                                updateField(selectedForm, selectedField.id, {
                                  lookup: { source: event.target.value as "entities" | "categories" | "reference" },
                                }),
                              )
                            }
                            value={selectedField.lookup?.source ?? "entities"}
                          >
                            <option value="entities">Registered records (entities)</option>
                            <option value="categories">Entity categories</option>
                            <option value="reference">Reference data</option>
                          </Select>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            On mobile the field officer searches this on-device list (works offline) and picks a value.
                          </span>
                        </label>
                      ) : null}
                      <ResponseTypeField
                        currentType={selectedField.type}
                        onSelect={(type) =>
                          updateSelectedForm(
                            updateField(
                              selectedForm,
                              selectedField.id,
                              typeChangePatchForField(selectedField, type),
                            ),
                          )
                        }
                      />
                      <label className="block text-sm font-medium">
                        Helper text
                        <Input
                          className="mt-2"
                          value={selectedField.hint ?? ""}
                          onChange={(event) =>
                            updateSelectedForm(
                              updateField(selectedForm, selectedField.id, {
                                hint: event.target.value,
                              }),
                            )
                          }
                          placeholder="Explain what the enumerator should capture"
                        />
                      </label>
                      <label className="block text-sm font-medium">
                        Page
                        <Select
                          className="mt-2"
                          value={selectedField.pageId ?? activePage?.id ?? ""}
                          onChange={(event) =>
                            updateSelectedForm(
                              moveFieldToPage(
                                selectedForm,
                                selectedField.id,
                                event.target.value,
                              ),
                            )
                          }
                        >
                          {selectedPages.map((page) => (
                            <option key={page.id} value={page.id}>
                              {page.title}
                            </option>
                          ))}
                        </Select>
                      </label>
                      <label className="block text-sm font-medium">
                        Section
                        <Select
                          className="mt-2"
                          value={selectedField.sectionId}
                          onChange={(event) =>
                            updateSelectedForm(
                              moveFieldToSection(
                                selectedForm,
                                selectedField.id,
                                event.target.value,
                              ),
                            )
                          }
                        >
                          {selectedForm.sections.map((section: FormSection) => (
                            <option key={section.id} value={section.id}>
                              {section.title}
                            </option>
                          ))}
                        </Select>
                      </label>
                      <label className="flex items-center gap-2 text-sm font-medium">
                        <input
                          checked={selectedField.required}
                          className="h-4 w-4"
                          onChange={(event) =>
                            updateSelectedForm(
                              updateField(selectedForm, selectedField.id, {
                                required: event.target.checked,
                              }),
                            )
                          }
                          type="checkbox"
                        />
                        Required by default
                      </label>
                      {selectedField.options ? (
                        <label className="block text-sm font-medium">
                          Choices
                          <ChoiceOptionsEditor
                            key={`${selectedField.id}-compact`}
                            onChange={(options) =>
                              updateSelectedForm(
                                updateField(selectedForm, selectedField.id, {
                                  options,
                                }),
                              )
                            }
                            options={selectedField.options}
                          />
                          <span className="mt-1 block text-xs font-normal text-muted-foreground">
                            Press Enter to add another response option.
                          </span>
                        </label>
                      ) : null}
                      <FieldTranslationsEditor
                        field={selectedField}
                        formLanguages={Array.from(
                          new Set(selectedForm.fields.flatMap((candidate) => Object.keys(candidate.translations ?? {}))),
                        )}
                        onAddLanguage={(language) =>
                          updateSelectedForm(
                            updateField(selectedForm, selectedField.id, {
                              translations: { ...(selectedField.translations ?? {}), [language]: { label: "" } },
                            }),
                          )
                        }
                        onChange={(translations) =>
                          updateSelectedForm(updateField(selectedForm, selectedField.id, { translations }))
                        }
                      />
                    </div>
                  ) : null}

                  {rightPanelTab === "validation" ? (
                    <div className="mt-4 space-y-4">
                      <div className="rounded-md border bg-background p-3 text-xs leading-5 text-muted-foreground">
                        Set rules that protect data quality before submissions
                        reach review.
                      </div>
                      <p className="rounded-md border bg-background p-2 text-xs text-muted-foreground">
                        Showing validations for a{" "}
                        <span className="font-semibold">
                          {selectedField.type.replace("_", " ")}
                        </span>{" "}
                        answer.
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        {fieldValidationCapabilities(selectedField.type)
                          .numericRange ? (
                          <>
                            <label className="text-sm font-medium">
                              Min
                              <Input
                                className="mt-2"
                                type="number"
                                value={selectedField.validation?.min ?? ""}
                                onChange={(event) =>
                                  updateSelectedFieldValidation({
                                    min:
                                      event.target.value === ""
                                        ? undefined
                                        : Number(event.target.value),
                                  })
                                }
                              />
                            </label>
                            <label className="text-sm font-medium">
                              Max
                              <Input
                                className="mt-2"
                                type="number"
                                value={selectedField.validation?.max ?? ""}
                                onChange={(event) =>
                                  updateSelectedFieldValidation({
                                    max:
                                      event.target.value === ""
                                        ? undefined
                                        : Number(event.target.value),
                                  })
                                }
                              />
                            </label>
                          </>
                        ) : null}
                        {fieldValidationCapabilities(selectedField.type)
                          .textLength ? (
                          <>
                            <label className="text-sm font-medium">
                              Min length
                              <Input
                                className="mt-2"
                                type="number"
                                value={selectedField.validation?.minLength ?? ""}
                                onChange={(event) =>
                                  updateSelectedFieldValidation({
                                    minLength:
                                      event.target.value === ""
                                        ? undefined
                                        : Number(event.target.value),
                                  })
                                }
                              />
                            </label>
                            <label className="text-sm font-medium">
                              Max length
                              <Input
                                className="mt-2"
                                type="number"
                                value={selectedField.validation?.maxLength ?? ""}
                                onChange={(event) =>
                                  updateSelectedFieldValidation({
                                    maxLength:
                                      event.target.value === ""
                                        ? undefined
                                        : Number(event.target.value),
                                  })
                                }
                              />
                            </label>
                          </>
                        ) : null}
                        {fieldValidationCapabilities(selectedField.type)
                          .dateRange ? (
                          <>
                            <label className="text-sm font-medium">
                              Earliest date
                              <Input
                                className="mt-2"
                                type="date"
                                value={selectedField.validation?.minDate ?? ""}
                                onChange={(event) =>
                                  updateSelectedFieldValidation({
                                    minDate: event.target.value || undefined,
                                  })
                                }
                              />
                            </label>
                            <label className="text-sm font-medium">
                              Latest date
                              <Input
                                className="mt-2"
                                type="date"
                                value={selectedField.validation?.maxDate ?? ""}
                                onChange={(event) =>
                                  updateSelectedFieldValidation({
                                    maxDate: event.target.value || undefined,
                                  })
                                }
                              />
                            </label>
                          </>
                        ) : null}
                      </div>
                      <div className="grid gap-2 rounded-md border bg-background p-3 text-sm">
                        {(() => {
                          const caps = fieldValidationCapabilities(
                            selectedField.type,
                          );
                          const toggles: Array<[string, string]> = [];
                          if (caps.wholeNumberToggle)
                            toggles.push(["integerOnly", "Only whole numbers"]);
                          if (caps.dateRange)
                            toggles.push(
                              ["blockFutureDates", "Block future dates"],
                              ["blockPastDates", "Block past dates"],
                            );
                          if (caps.uniqueness)
                            toggles.push(
                              ["uniqueResponse", "Require a unique answer in this form"],
                              ["duplicateCheck", "Check this answer for duplicates"],
                            );
                          if (caps.dontKnowRefused)
                            toggles.push(
                              ["allowDontKnow", "Allow “Don’t know” as a valid response"],
                              ["allowRefused", "Allow “Refused” as a valid response"],
                            );
                          return toggles;
                        })().map(([key, label]) => (
                          <label
                            className="flex items-center gap-2 font-medium"
                            key={key}
                          >
                            <input
                              checked={Boolean(
                                selectedField.validation?.[
                                  key as keyof NonNullable<
                                    FormField["validation"]
                                  >
                                ],
                              )}
                              className="h-4 w-4"
                              onChange={(event) =>
                                updateSelectedFieldValidation({
                                  [key]: event.target.checked || undefined,
                                } as Partial<
                                  NonNullable<FormField["validation"]>
                                >)
                              }
                              type="checkbox"
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                      {fieldValidationCapabilities(selectedField.type).pattern ? (
                        <label className="block text-sm font-medium">
                          Regex or format rule
                          <Input
                            className="mt-2"
                            value={selectedField.validation?.pattern ?? ""}
                            onChange={(event) =>
                              updateSelectedFieldValidation({
                                pattern: event.target.value,
                              })
                            }
                            placeholder="Example: ^[A-Z0-9-]+$"
                          />
                        </label>
                      ) : null}
                      <label className="block text-sm font-medium">
                        Custom validation message
                        <Input
                          className="mt-2"
                          value={selectedField.validation?.customMessage ?? ""}
                          onChange={(event) =>
                            updateSelectedFieldValidation({
                              customMessage:
                                event.target.value || undefined,
                            })
                          }
                          placeholder="Explain the correction in plain language"
                        />
                      </label>
                      <label className="block text-sm font-medium">
                        Cross-field expression
                        <Input
                          className="mt-2"
                          value={selectedField.validation?.expression ?? ""}
                          onChange={(event) =>
                            updateSelectedForm(
                              updateField(selectedForm, selectedField.id, {
                                validation: {
                                  ...selectedField.validation,
                                  expression: event.target.value,
                                },
                              }),
                            )
                          }
                          placeholder="${end_date} >= ${start_date}"
                        />
                      </label>
                      {["gps", "geolocation", "map", "geofence"].includes(
                        selectedField.type,
                      ) ? (
                        <label className="block text-sm font-medium">
                          Maximum GPS accuracy in meters
                          <Input
                            className="mt-2"
                            type="number"
                            value={selectedField.validation?.accuracyMax ?? ""}
                            onChange={(event) =>
                              updateSelectedForm(
                                updateField(selectedForm, selectedField.id, {
                                  validation: {
                                    ...selectedField.validation,
                                    accuracyMax:
                                      event.target.value === ""
                                        ? undefined
                                        : Number(event.target.value),
                                  },
                                }),
                              )
                            }
                          />
                        </label>
                      ) : null}
                      {selectedField.type === "polygon" ? (
                        <div className="grid gap-3 rounded-md border bg-background p-3 sm:grid-cols-2">
                          <label className="block text-sm font-medium">
                            Minimum vertices
                            <Input
                              className="mt-2"
                              type="number"
                              min={3}
                              value={selectedField.polygon?.minVertices ?? 3}
                              onChange={(event) =>
                                updateSelectedForm(
                                  updateField(selectedForm, selectedField.id, {
                                    polygon: {
                                      ...selectedField.polygon,
                                      minVertices:
                                        event.target.value === ""
                                          ? undefined
                                          : Number(event.target.value),
                                    },
                                  }),
                                )
                              }
                            />
                          </label>
                          <label className="flex items-center gap-2 text-sm font-medium">
                            <input
                              checked={selectedField.polygon?.requireClosed ?? true}
                              onChange={(event) =>
                                updateSelectedForm(
                                  updateField(selectedForm, selectedField.id, {
                                    polygon: {
                                      ...selectedField.polygon,
                                      requireClosed: event.target.checked,
                                    },
                                  }),
                                )
                              }
                              type="checkbox"
                            />
                            Require closed shape
                          </label>
                          <label className="flex items-center gap-2 text-sm font-medium">
                            <input
                              checked={selectedField.polygon?.overlapCheck ?? true}
                              onChange={(event) =>
                                updateSelectedForm(
                                  updateField(selectedForm, selectedField.id, {
                                    polygon: {
                                      ...selectedField.polygon,
                                      overlapCheck: event.target.checked,
                                    },
                                  }),
                                )
                              }
                              type="checkbox"
                            />
                            Flag overlapping boundaries
                          </label>
                        </div>
                      ) : null}
                      {[
                        "photo",
                        "image",
                        "signature",
                        "audio",
                        "video",
                        "file",
                      ].includes(selectedField.type) ? (
                        <div className="grid grid-cols-2 gap-3">
                          <label className="text-sm font-medium">
                            Max file size MB
                            <Input
                              className="mt-2"
                              type="number"
                              value={
                                selectedField.validation?.maxFileSizeMb ?? ""
                              }
                              onChange={(event) =>
                                updateSelectedFieldValidation({
                                  maxFileSizeMb:
                                    event.target.value === ""
                                      ? undefined
                                      : Number(event.target.value),
                                })
                              }
                            />
                          </label>
                          <label className="text-sm font-medium">
                            Max attachments
                            <Input
                              className="mt-2"
                              type="number"
                              value={
                                selectedField.validation?.maxAttachmentCount ??
                                ""
                              }
                              onChange={(event) =>
                                updateSelectedFieldValidation({
                                  maxAttachmentCount:
                                    event.target.value === ""
                                      ? undefined
                                      : Number(event.target.value),
                                })
                              }
                            />
                          </label>
                          <label className="block text-sm font-medium sm:col-span-2">
                            Allowed file types
                            <Input
                              className="mt-2"
                              value={
                                selectedField.validation?.allowedFileTypes ?? ""
                              }
                              onChange={(event) =>
                                updateSelectedFieldValidation({
                                  allowedFileTypes:
                                    event.target.value || undefined,
                                })
                              }
                              placeholder="jpg,png,pdf"
                            />
                          </label>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {rightPanelTab === "logic" ? (
                    <div className="mt-4 space-y-3">
                      <div className="rounded-md border bg-primary/5 p-3">
                        <div className="flex items-center gap-2">
                          <Sparkles
                            aria-hidden="true"
                            className="text-primary"
                            size={15}
                          />
                          <p className="text-sm font-semibold">
                            Build logic as a sentence
                          </p>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          Choose the condition and Atlas will create the form
                          logic expression for this question.
                        </p>
                        <div className="mt-3 grid gap-2">
                          <Select
                            value={
                              logicActionKind === "hide" ||
                              logicActionKind === "required" ||
                              logicActionKind === "skip"
                                ? logicActionKind
                                : "show"
                            }
                            onChange={(event) =>
                              setLogicActionKind(
                                event.target.value as LogicRule["kind"],
                              )
                            }
                          >
                            <option value="show">
                              Show this question when
                            </option>
                            <option value="hide">
                              Hide this question when
                            </option>
                            <option value="required">
                              Require this question when
                            </option>
                            <option value="skip">
                              Skip to this question when
                            </option>
                          </Select>
                          <Select
                            value={
                              logicConditionFieldId ||
                              selectedForm.fields.find(
                                (field) => field.id !== selectedField.id,
                              )?.id ||
                              ""
                            }
                            onChange={(event) =>
                              setLogicConditionFieldId(event.target.value)
                            }
                          >
                            {selectedForm.fields
                              .filter((field) => field.id !== selectedField.id)
                              .map((field) => (
                                <option key={field.id} value={field.id}>
                                  {field.label}
                                </option>
                              ))}
                          </Select>
                          <Input
                            value={logicConditionValue}
                            onChange={(event) =>
                              setLogicConditionValue(event.target.value)
                            }
                            placeholder="Answer value, for example Yes, Female, or High"
                          />
                          <Button
                            onClick={addVisualLogicRule}
                            disabled={
                              selectedForm.fields.filter(
                                (field) => field.id !== selectedField.id,
                              ).length === 0
                            }
                            type="button"
                            variant="primary"
                          >
                            <Plus aria-hidden="true" />
                            Add sentence logic
                          </Button>
                        </div>
                      </div>
                      <div className="rounded-md border bg-background p-3 text-xs leading-5 text-muted-foreground">
                        Existing rules remain editable below for advanced
                        XLSForm-style expressions.
                      </div>
                      {(selectedField.logic ?? []).map((rule) => (
                        <div
                          className="rounded-md border bg-background p-3"
                          key={rule.id}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <Badge tone="accent">
                              {rule.kind.replace("_", " ")}
                            </Badge>
                            <Button
                              onClick={() =>
                                updateSelectedForm(
                                  updateField(selectedForm, selectedField.id, {
                                    logic:
                                      selectedField.logic?.filter(
                                        (candidate) => candidate.id !== rule.id,
                                      ) ?? [],
                                  }),
                                )
                              }
                              aria-label={`Remove ${rule.kind} rule`}
                              size="icon"
                              type="button"
                              variant="ghost"
                            >
                              <Trash2 aria-hidden="true" />
                            </Button>
                          </div>
                          <Input
                            className="mt-3"
                            value={rule.expression}
                            onChange={(event) =>
                              updateSelectedForm(
                                updateField(selectedForm, selectedField.id, {
                                  logic: (selectedField.logic ?? []).map(
                                    (candidate) =>
                                      candidate.id === rule.id
                                        ? {
                                            ...candidate,
                                            expression: event.target.value,
                                          }
                                        : candidate,
                                  ),
                                }),
                              )
                            }
                            placeholder="${consent} = 'Yes'"
                          />
                          <Input
                            className="mt-2"
                            value={rule.message ?? ""}
                            onChange={(event) =>
                              updateSelectedForm(
                                updateField(selectedForm, selectedField.id, {
                                  logic: (selectedField.logic ?? []).map(
                                    (candidate) =>
                                      candidate.id === rule.id
                                        ? {
                                            ...candidate,
                                            message: event.target.value,
                                          }
                                        : candidate,
                                  ),
                                }),
                              )
                            }
                            placeholder="Message shown to the team"
                          />
                        </div>
                      ))}
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          ["show", "Show / Hide"],
                          ["required", "Required"],
                          ["skip", "Skip logic"],
                          ["dynamic_choices", "Dynamic choices"],
                        ].map(([kind, label]) => (
                          <Button
                            key={kind}
                            onClick={() =>
                              updateSelectedForm(
                                updateField(selectedForm, selectedField.id, {
                                  logic: [
                                    ...(selectedField.logic ?? []),
                                    {
                                      id: `${selectedField.id}-${kind}-${Date.now()}`,
                                      kind: kind as LogicRule["kind"],
                                      expression: "${answer} = 'Yes'",
                                      message: String(label),
                                    },
                                  ],
                                }),
                              )
                            }
                            type="button"
                            variant="secondary"
                          >
                            <Plus aria-hidden="true" />
                            {label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {rightPanelTab === "calculation" ? (
                    <div className="mt-4 space-y-4">
                      <label className="block text-sm font-medium">
                        Formula
                        <textarea
                          className="mt-2 min-h-24 w-full rounded-md border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary"
                          value={
                            selectedField.calculation?.expression ??
                            selectedField.logic?.find(
                              (rule) => rule.kind === "calculation",
                            )?.expression ??
                            ""
                          }
                          onChange={(event) =>
                            updateSelectedForm(
                              updateField(selectedForm, selectedField.id, {
                                calculation: {
                                  ...(selectedField.calculation ?? {
                                    preview: "Pending validation",
                                  }),
                                  expression: event.target.value,
                                },
                              }),
                            )
                          }
                          placeholder="(${weight_kg} / (${height_m} * ${height_m}))"
                        />
                      </label>
                      <div className="rounded-md border bg-background p-3">
                        <p className="text-sm font-medium">Formula preview</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {selectedField.calculation?.preview ??
                            "Add a formula to validate syntax and preview derived values."}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {rightPanelTab === "appearance" ? (
                    <div className="mt-4 space-y-4">
                      <label className="block text-sm font-medium">
                        Width
                        <Select
                          className="mt-2"
                          value={selectedField.appearance?.width ?? "full"}
                          onChange={(event) =>
                            updateSelectedForm(
                              updateField(selectedForm, selectedField.id, {
                                appearance: {
                                  ...selectedField.appearance,
                                  width: event.target.value as
                                    | "full"
                                    | "half"
                                    | "third",
                                },
                              }),
                            )
                          }
                        >
                          <option value="full">Full width</option>
                          <option value="half">Half width</option>
                          <option value="third">One third</option>
                        </Select>
                      </label>
                      <label className="block text-sm font-medium">
                        Placeholder
                        <Input
                          className="mt-2"
                          value={selectedField.appearance?.placeholder ?? ""}
                          onChange={(event) =>
                            updateSelectedForm(
                              updateField(selectedForm, selectedField.id, {
                                appearance: {
                                  ...selectedField.appearance,
                                  placeholder: event.target.value,
                                },
                              }),
                            )
                          }
                        />
                      </label>
                      <label className="block text-sm font-medium">
                        Help text
                        <Input
                          className="mt-2"
                          value={selectedField.appearance?.helpText ?? ""}
                          onChange={(event) =>
                            updateSelectedForm(
                              updateField(selectedForm, selectedField.id, {
                                appearance: {
                                  ...selectedField.appearance,
                                  helpText: event.target.value,
                                },
                              }),
                            )
                          }
                        />
                      </label>
                    </div>
                  ) : null}

                  {rightPanelTab === "advanced" ? (
                    <div className="mt-4 space-y-4">
                      <label className="block text-sm font-medium">
                        Variable name
                        <Input
                          className="mt-2 font-mono"
                          value={selectedField.variableName ?? selectedField.id}
                          onChange={(event) =>
                            updateSelectedForm(
                              updateField(selectedForm, selectedField.id, {
                                variableName: normalizeVariableNameInput(event.target.value),
                              }),
                            )
                          }
                        />
                      </label>
                      {selectedField.repeat ? (
                        <div className="grid grid-cols-2 gap-3">
                          <label className="text-sm font-medium">
                            Repeat min
                            <Input
                              className="mt-2"
                              type="number"
                              value={selectedField.repeat.min ?? ""}
                              onChange={(event) =>
                                updateSelectedForm(
                                  updateField(selectedForm, selectedField.id, {
                                    repeat: {
                                      ...selectedField.repeat,
                                      min:
                                        event.target.value === ""
                                          ? undefined
                                          : Number(event.target.value),
                                    },
                                  }),
                                )
                              }
                            />
                          </label>
                          <label className="text-sm font-medium">
                            Repeat max
                            <Input
                              className="mt-2"
                              type="number"
                              value={selectedField.repeat.max ?? ""}
                              onChange={(event) =>
                                updateSelectedForm(
                                  updateField(selectedForm, selectedField.id, {
                                    repeat: {
                                      ...selectedField.repeat,
                                      max:
                                        event.target.value === ""
                                          ? undefined
                                          : Number(event.target.value),
                                    },
                                  }),
                                )
                              }
                            />
                          </label>
                        </div>
                      ) : null}
                      {selectedField.matrix ? (
                        <div className="space-y-3">
                          <label className="block text-sm font-medium">
                            Matrix rows
                            <textarea
                              className="mt-2 min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                              value={selectedField.matrix.rows.join("\n")}
                              onChange={(event) =>
                                updateSelectedForm(
                                  updateField(selectedForm, selectedField.id, {
                                    matrix: {
                                      rows: event.target.value
                                        .split("\n")
                                        .filter(Boolean),
                                      columns:
                                        selectedField.matrix?.columns ?? [],
                                      scoring: selectedField.matrix?.scoring,
                                    },
                                  }),
                                )
                              }
                            />
                          </label>
                          <label className="block text-sm font-medium">
                            Matrix columns
                            <textarea
                              className="mt-2 min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                              value={selectedField.matrix.columns.join("\n")}
                              onChange={(event) =>
                                updateSelectedForm(
                                  updateField(selectedForm, selectedField.id, {
                                    matrix: {
                                      rows: selectedField.matrix?.rows ?? [],
                                      columns: event.target.value
                                        .split("\n")
                                        .filter(Boolean),
                                      scoring: selectedField.matrix?.scoring,
                                    },
                                  }),
                                )
                              }
                            />
                          </label>
                        </div>
                      ) : null}
                      <div className="rounded-md border bg-background p-3 text-xs leading-5 text-muted-foreground">
                        Published responses stay attached to their original
                        version. Create a draft version before making breaking
                        changes.
                      </div>
                    </div>
                  ) : null}
                </section>

                <section className="rounded-lg border bg-panel p-4">
                  <div className="flex items-center gap-2">
                    <Check aria-hidden="true" size={17} />
                    <h2 className="text-sm font-semibold">Offline readiness</h2>
                  </div>
                  <div className="mt-4 space-y-2">
                    {[
                      "Works without internet",
                      "GPS is captured automatically",
                      "Photos and signatures can retry upload",
                      "Published versions stay stable on mobile",
                    ].map((item) => (
                      <div
                        key={item}
                        className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm"
                      >
                        <Check
                          aria-hidden="true"
                          className="text-success"
                          size={15}
                        />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </Modal>
          ) : null}

          {selectedForm ? (
            <aside
              className={cn(
                "min-h-0 xl:hidden xl:overflow-y-auto xl:pr-1 product-scrollbar",
                builderFocusPanel !== "preview" && "hidden",
              )}
            >
              <section className="sticky top-0 rounded-lg border bg-panel p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Eye
                        aria-hidden="true"
                        className="text-primary"
                        size={17}
                      />
                      <h2 className="text-sm font-semibold">Live preview</h2>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {selectedForm.fields.length} fields across{" "}
                      {selectedPages.length} page(s)
                    </p>
                  </div>
                  {selectedField ? (
                    <Button
                      onClick={() => setFieldSettingsDialogOpen(true)}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      <Settings2 aria-hidden="true" />
                      Edit
                    </Button>
                  ) : null}
                </div>

                <div className="mt-3 flex flex-wrap gap-1 rounded-md border bg-background p-1">
                  {(["desktop", "tablet", "mobile"] as const).map((mode) => (
                    <button
                      className={cn(
                        "rounded px-2.5 py-1 text-xs font-medium transition",
                        previewMode === mode
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                      key={mode}
                      onClick={() => setPreviewMode(mode)}
                      type="button"
                    >
                      {mode}
                    </button>
                  ))}
                </div>

                <div
                  className={cn(
                    "mt-3 max-h-[calc(100vh-330px)] overflow-y-auto rounded-xl border bg-background p-3 product-scrollbar",
                    previewMode === "mobile" && "mx-auto max-w-[300px]",
                    previewMode === "tablet" && "mx-auto max-w-[520px]",
                  )}
                >
                  <div className="mb-3 rounded-lg border bg-panel px-3 py-2">
                    <p className="truncate text-sm font-semibold">
                      {selectedForm.name}
                    </p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {selectedSurvey?.title ?? "Survey"} / v
                      {selectedForm.version}
                    </p>
                  </div>
                  <div className="space-y-3">
                    {selectedPages.map((page, pageIndex) => {
                      const pageSections = selectedForm.sections.filter(
                        (section) => section.pageId === page.id,
                      );
                      return (
                        <section
                          className="rounded-lg border bg-panel/60 p-3"
                          key={page.id}
                        >
                          <div className="mb-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                              Page {pageIndex + 1}
                            </p>
                            <h3 className="mt-1 text-sm font-semibold">
                              {page.title}
                            </h3>
                          </div>
                          <div className="space-y-3">
                            {pageSections.map((section, sectionIndex) => {
                              const sectionFields = selectedForm.fields.filter(
                                (field) => field.sectionId === section.id,
                              );
                              const tone = getSectionTone(sectionIndex);
                              return (
                                <div
                                  className={cn(
                                    "overflow-hidden rounded-lg border bg-background",
                                    tone.border,
                                  )}
                                  key={section.id}
                                >
                                  <div
                                    className={cn(
                                      "border-b px-3 py-2",
                                      tone.header,
                                    )}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={cn(
                                          "h-6 w-1 rounded-full",
                                          tone.rail,
                                        )}
                                      />
                                      <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                        {section.title}
                                      </h4>
                                    </div>
                                  </div>
                                  <div className="space-y-2 p-3">
                                    {sectionFields.map((field) => (
                                      <button
                                        className={cn(
                                          "w-full rounded-lg border bg-panel p-2 text-left transition hover:border-primary/40 hover:bg-primary/5",
                                          selectedField?.id === field.id &&
                                            "border-primary/50 bg-primary/10",
                                        )}
                                        key={field.id}
                                        onClick={() =>
                                          openFieldSettings(field.id)
                                        }
                                        type="button"
                                      >
                                        <span className="flex flex-wrap items-center gap-1.5 text-xs">
                                          <span className="font-semibold text-foreground">
                                            {field.label}
                                          </span>
                                          {field.required ? (
                                            <span className="text-danger">
                                              *
                                            </span>
                                          ) : null}
                                          <Badge tone="neutral">
                                            {field.type.replace("_", " ")}
                                          </Badge>
                                          {field.logic?.length ? (
                                            <Badge tone="accent">logic</Badge>
                                          ) : null}
                                        </span>
                                        {field.hint ? (
                                          <span className="mt-1 line-clamp-1 block text-xs text-muted-foreground">
                                            {field.hint}
                                          </span>
                                        ) : null}
                                        <FieldInputPreview field={field} />
                                      </button>
                                    ))}
                                    {!sectionFields.length ? (
                                      <div className="rounded-md border border-dashed bg-panel px-3 py-2 text-xs text-muted-foreground">
                                        No fields yet.
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </section>
                      );
                    })}
                  </div>
                </div>
              </section>
            </aside>
          ) : null}
        </div>
      )}
    </section>
  );
}
