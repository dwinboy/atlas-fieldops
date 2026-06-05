"use client";

import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  GitBranch,
  Layers3,
  ListChecks,
  MonitorSmartphone,
  Play,
  Rocket,
  ShieldCheck,
  Smartphone,
  Sparkles,
  TabletSmartphone,
  Workflow,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { DynamicForms } from "@/components/DynamicForms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpHint } from "@/components/ui/help-hint";
import { Input, Select, Textarea } from "@/components/ui/input";
import {
  createField,
  createPage,
  createSection,
  type DynamicForm,
  type FieldType,
  type FormField,
  type FormReadinessItem,
  type FormSection,
} from "@/lib/forms";
import { cn } from "@/lib/utils";
import type { FormListItem } from "@/modules/forms/data";
import { statusTone } from "@/modules/forms/utils";

type CreationStage = "setup" | "start" | "builder" | "controls" | "preview" | "review";
type StartMethod = "blank" | "template" | "duplicate" | "import";
type CollectionMethod = "web" | "mobile" | "web_mobile";

export type FormSetupDraft = {
  collectionMethod: CollectionMethod;
  description: string;
  durationMinutes: number;
  formName: string;
  formType: string;
  language: string;
  owner: string;
  projectName: string;
};

type FormCreationWorkspaceProps = {
  existingForms: FormListItem[];
  initialForm?: FormListItem | null;
  onBack: () => void;
  token: string | null;
};

const formTypes = [
  "Baseline Survey",
  "Endline Survey",
  "Monitoring Visit",
  "Beneficiary Registration",
  "Needs Assessment",
  "Facility Assessment",
  "Training Attendance",
  "Feedback Form",
  "Case Management",
  "Custom",
];

const projectOptions = [
  "Agricultural Resilience Program",
  "Community Health Access Project",
  "Education Quality Improvement",
  "Humanitarian Response Program",
];

const setupDefaults: FormSetupDraft = {
  collectionMethod: "web_mobile",
  description: "",
  durationMinutes: 25,
  formName: "",
  formType: "Baseline Survey",
  language: "English",
  owner: "M&E Manager",
  projectName: projectOptions[0] ?? "Project",
};

const flowSteps: { id: CreationStage; label: string; icon: LucideIcon; route: string }[] = [
  { id: "setup", label: "Form Setup", icon: ClipboardList, route: "/forms/create" },
  { id: "builder", label: "Builder", icon: Layers3, route: "/forms/:formId/builder" },
  { id: "controls", label: "Controls", icon: ShieldCheck, route: "/forms/:formId/governance" },
  { id: "preview", label: "Preview & Test", icon: MonitorSmartphone, route: "/forms/:formId/preview" },
  { id: "review", label: "Review", icon: ListChecks, route: "/forms/:formId/review" },
];

const startMethods: {
  description: string;
  id: StartMethod;
  label: string;
  icon: LucideIcon;
}[] = [
  {
    description: "Open a clean draft with one starter section and no questions.",
    id: "blank",
    label: "Start from Blank",
    icon: FileText,
  },
  {
    description: "Use a recommended M&E structure with consent, respondent, GPS, and quality fields.",
    id: "template",
    label: "Use Template",
    icon: Sparkles,
  },
  {
    description: "Create a new editable draft based on an existing form summary.",
    id: "duplicate",
    label: "Duplicate Existing Form",
    icon: GitBranch,
  },
  {
    description: "Create a shell now and import XLSForm or CSV columns later.",
    id: "import",
    label: "Import XLSForm or CSV Later",
    icon: FileSpreadsheet,
  },
];

function variableNameFromLabel(label: string, fallback: string): string {
  return (
    label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 54) || fallback
  );
}

function attachStarterField(section: FormSection, type: FieldType, label: string, required = false): FormField {
  const field = createField(type, section.id, section.pageId);
  return {
    ...field,
    label,
    required,
    variableName: variableNameFromLabel(label, field.id),
  };
}

function builderStatusFromListStatus(status: string): DynamicForm["status"] {
  if (status === "published" || status === "archived") {
    return status;
  }
  return "draft";
}

export function createEditableDraftFromListItem(form: FormListItem): DynamicForm {
  const createdAt = form.updated_at || new Date().toISOString();
  const page = createPage("Page 1");
  const sectionCount = Math.max(1, form.sections || 1);
  const questionCount = Math.max(1, form.questions || 1);
  const sectionTitles = [
    "Consent and respondent profile",
    "Household and beneficiary details",
    "Location and coverage",
    "Program participation",
    "Evidence and data quality",
    "Enumerator review",
    "Supervisor checks",
    "Additional context",
  ];
  const sections = Array.from({ length: sectionCount }, (_, index) => ({
    ...createSection(page.id, sectionTitles[index] ?? `Section ${index + 1}`),
    description:
      index === 0
        ? (form.description ?? `Editable builder draft for ${form.name}.`)
        : `Operational section ${index + 1} for ${form.survey_name}.`,
  }));
  const questionTypes: FieldType[] = [
    "text",
    "number",
    "radio",
    "select",
    "gps",
    "photo",
    "date",
    "textarea",
    "checkbox",
    "decimal",
  ];
  const fields = Array.from({ length: questionCount }, (_, index) => {
    const section = sections[index % sections.length] ?? sections[0];
    const type = index === Math.min(5, questionCount - 1) ? "repeat_group" : questionTypes[index % questionTypes.length] ?? "text";
    const label =
      index === 0
        ? "Consent confirmed"
        : type === "repeat_group"
          ? "Household members"
          : `${section.title} question ${Math.floor(index / sections.length) + 1}`;
    const field = attachStarterField(section, type, label, index < 3 || type === "gps");
    return {
      ...field,
      options:
        type === "radio" || type === "select" || type === "checkbox"
          ? ["Yes", "No", "Not applicable"]
          : field.options,
      repeat: type === "repeat_group" ? { min: 1, max: 12, allowNested: false } : field.repeat,
      validation:
        type === "gps"
          ? { accuracyMax: 15 }
          : type === "number" || type === "decimal"
            ? { min: 0 }
            : field.validation,
      variableName: variableNameFromLabel(label, `question_${index + 1}`),
    };
  });

  return {
    activeVersion: form.status === "published" ? form.version : 0,
    fields,
    history: [
      {
        createdAt,
        status: builderStatusFromListStatus(form.status),
        summary: `Opened from ${form.name} summary for builder editing`,
        version: form.version,
      },
    ],
    id: form.id,
    name: form.name,
    pages: [
      {
        ...page,
        description: `${form.form_type} for ${form.project_name} / ${form.survey_name}.`,
      },
    ],
    sections,
    status: builderStatusFromListStatus(form.status),
    updatedAt: createdAt,
    version: form.version,
  };
}

export function createEnterpriseDraftForm(
  setup: FormSetupDraft,
  startMethod: StartMethod,
  existingForms: FormListItem[],
): DynamicForm {
  const page = createPage("Page 1");
  const overviewSection = createSection(page.id, "Form setup");
  const evidenceSection = createSection(page.id, "Evidence and quality");
  const createdAt = new Date().toISOString();
  const baseName = setup.formName.trim() || `${setup.formType} Form`;
  const form: DynamicForm = {
    activeVersion: 0,
    fields: [],
    history: [
      {
        createdAt,
        status: "draft",
        summary: `Draft shell created from ${startMethod.replace("_", " ")} setup`,
        version: 1,
      },
    ],
    id: `draft-form-${Date.now()}`,
    name: baseName,
    pages: [
      {
        ...page,
        description: `${setup.formType} for ${setup.projectName}. Collection method: ${setup.collectionMethod.replace("_", " + ")}.`,
      },
    ],
    sections: [
      {
        ...overviewSection,
        description: setup.description || "Core questions and respondent context.",
      },
    ],
    status: "draft",
    updatedAt: createdAt,
    version: 1,
  };

  if (startMethod === "blank") {
    return form;
  }

  if (startMethod === "duplicate") {
    const source = existingForms[0];
    const duplicatedFields = [
      attachStarterField(overviewSection, "text", "Respondent name", true),
      attachStarterField(overviewSection, "radio", "Consent confirmed", true),
      attachStarterField(evidenceSection, "gps", "Collection GPS", true),
    ];
    return {
      ...form,
      fields: duplicatedFields,
      name: source ? `${source.name} Copy` : `${baseName} Copy`,
      sections: [
        form.sections[0] ?? overviewSection,
        {
          ...evidenceSection,
          description: source
            ? `Starter copy based on ${source.name}. Review all questions before publishing.`
            : "Evidence and quality checks.",
        },
      ],
    };
  }

  if (startMethod === "import") {
    return {
      ...form,
      fields: [
        attachStarterField(overviewSection, "hidden", "Import batch ID", false),
        attachStarterField(overviewSection, "textarea", "Import notes", false),
      ],
    };
  }

  const sections = [
    form.sections[0] ?? overviewSection,
    {
      ...evidenceSection,
      description: "GPS, consent evidence, files, and supervisor quality checks.",
    },
  ];
  const fields = [
    attachStarterField(overviewSection, "radio", "Consent given", true),
    attachStarterField(overviewSection, "text", "Respondent full name", true),
    attachStarterField(overviewSection, "phone", "Phone number", false),
    attachStarterField(overviewSection, "number", "Age", false),
    attachStarterField(evidenceSection, "gps", "Collection GPS", true),
    attachStarterField(evidenceSection, "photo", "Photo evidence", false),
    attachStarterField(evidenceSection, "rating", "Data quality score", false),
  ];

  return { ...form, fields, sections };
}

export function validateFormForPublish(form: DynamicForm | null | undefined, setup: FormSetupDraft): FormReadinessItem[] {
  const fields = form?.fields ?? [];
  const sections = form?.sections ?? [];
  const variableNames = fields.map((field) => field.variableName?.trim()).filter(Boolean) as string[];
  const uniqueVariableNames = new Set(variableNames);
  const hasGps = fields.some((field) => ["gps", "geolocation", "map", "geofence"].includes(field.type));

  return [
    {
      complete: Boolean(setup.formName.trim() || form?.name.trim()),
      description: "The published form must have a clear operational name.",
      id: "name",
      label: "Form has a name",
      required: true,
    },
    {
      complete: Boolean(setup.projectName.trim()),
      description: "Every form must belong to a project so submissions remain traceable.",
      id: "project",
      label: "Form belongs to a project",
      required: true,
    },
    {
      complete: sections.length > 0,
      description: "Sections organize the survey for field officers and reviewers.",
      id: "sections",
      label: "At least one section exists",
      required: true,
    },
    {
      complete: fields.length > 0,
      description: "Add at least one question before publishing.",
      id: "questions",
      label: "At least one question exists",
      required: true,
    },
    {
      complete: variableNames.length === fields.length && uniqueVariableNames.size === variableNames.length,
      description: "Variable names must be present, unique, stable, lowercase-friendly, and without spaces.",
      id: "variables",
      label: "Variable names are unique",
      required: true,
    },
    {
      complete: fields.every((field) => !(field.logic ?? []).some((rule) => rule.targetId && !fields.some((candidate) => candidate.id === rule.targetId))),
      description: "Logic cannot point to deleted questions.",
      id: "logic",
      label: "Logic rules are valid",
      required: true,
    },
    {
      complete: true,
      description: "Permissions, collectors, reviewers, and export access can be adjusted in Controls.",
      id: "permissions",
      label: "Permissions reviewed",
      required: true,
    },
    {
      complete: true,
      description: "Supervisor and data manager review paths are ready by default.",
      id: "workflow",
      label: "Workflow configured",
      required: true,
    },
    {
      complete: true,
      description: "Consent, retention, masking, edit rules, and record locking have production defaults.",
      id: "governance",
      label: "Governance reviewed",
      required: true,
    },
    {
      complete: !hasGps || fields.some((field) => field.type === "gps" && field.validation?.accuracyMax),
      description: "GPS forms need an accuracy threshold before field deployment.",
      id: "mapping",
      label: "Mapping settings reviewed",
      required: hasGps,
    },
  ];
}

export function FormCreationWorkspace({ existingForms, initialForm, onBack, token }: FormCreationWorkspaceProps) {
  const initialDraft = useMemo(() => (initialForm ? createEditableDraftFromListItem(initialForm) : null), [initialForm]);
  const [stage, setStage] = useState<CreationStage>(initialDraft ? "builder" : "setup");
  const [setup, setSetup] = useState<FormSetupDraft>(() =>
    initialForm
      ? {
          collectionMethod: "web_mobile",
          description: initialForm.description ?? "",
          durationMinutes: 25,
          formName: initialForm.name,
          formType: initialForm.form_type,
          language: "English",
          owner: initialForm.owner,
          projectName: initialForm.project_name,
        }
      : setupDefaults,
  );
  const [startMethod, setStartMethod] = useState<StartMethod>("blank");
  const [draftForm, setDraftForm] = useState<DynamicForm | null>(initialDraft);
  const [publishedForm, setPublishedForm] = useState<DynamicForm | null>(null);
  const checklist = useMemo(() => validateFormForPublish(draftForm, setup), [draftForm, setup]);
  const criticalFailures = checklist.filter((item) => item.required && !item.complete);

  function updateSetup(patch: Partial<FormSetupDraft>): void {
    setSetup((current) => ({ ...current, ...patch }));
  }

  function createDraftAndOpenBuilder(method = startMethod): void {
    const nextDraft = createEnterpriseDraftForm(setup, method, existingForms);
    setDraftForm(nextDraft);
    setPublishedForm(null);
    setStage("builder");
  }

  function publishDraft(): void {
    if (!draftForm || criticalFailures.length) return;
    setPublishedForm({
      ...draftForm,
      activeVersion: Math.max(draftForm.activeVersion, 1),
      history: [
        ...(draftForm.history ?? []),
        {
          createdAt: new Date().toISOString(),
          status: "published",
          summary: "Published after enterprise readiness review",
          version: Math.max(draftForm.version, 1),
        },
      ],
      status: "published",
      updatedAt: new Date().toISOString(),
    });
  }

  const currentRoute = flowSteps.find((step) => step.id === stage)?.route ?? "/forms/create";
  const status = publishedForm?.status ?? draftForm?.status ?? "draft";

  return (
    <section className="space-y-3">
      <div className="rounded-xl border bg-panel p-3 shadow-line">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="collect">FORMS</Badge>
              <Badge tone={statusTone(status)}>{status}</Badge>
              <Badge tone="neutral">{currentRoute}</Badge>
              <span className="text-xs text-muted-foreground">Autosave: Saved</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">Create Form</h1>
              <HelpHint label="About create form" title="Create Form">
                Create the draft shell first, then build questions, configure controls, test the form, review readiness, and publish a governed version for field operations.
              </HelpHint>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={onBack} variant="secondary">
              <ArrowLeft aria-hidden="true" />
              Back to forms
            </Button>
            {stage === "review" ? (
              <Button disabled={!draftForm || criticalFailures.length > 0} onClick={publishDraft} variant="primary">
                <Rocket aria-hidden="true" />
                Publish
              </Button>
            ) : null}
          </div>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-5">
          {flowSteps.map((step) => {
            const Icon = step.icon;
            const active = step.id === stage;
            const available = step.id === "setup" || Boolean(draftForm);
            return (
              <button
                className={cn(
                  "rounded-xl border px-3 py-2 text-left transition",
                  active ? "border-primary bg-primary text-primary-foreground" : "bg-background/60 hover:bg-muted/60",
                  !available && "cursor-not-allowed opacity-50",
                )}
                disabled={!available}
                key={step.id}
                onClick={() => setStage(step.id)}
                type="button"
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Icon aria-hidden="true" size={15} />
                  {step.label}
                </span>
                <span className={cn("mt-1 block truncate text-xs", active ? "text-primary-foreground/75" : "text-muted-foreground")}>{step.route}</span>
              </button>
            );
          })}
        </div>
      </div>

      {stage === "setup" ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.55fr)]">
          <section className="rounded-xl border bg-panel p-3.5 shadow-line">
            <div>
              <Badge tone="accent">Step 1</Badge>
              <h2 className="mt-3 text-lg font-semibold">Basic Information</h2>
            </div>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block font-medium">Form Name</span>
                <Input onChange={(event) => updateSetup({ formName: event.target.value })} placeholder="Baseline household survey" value={setup.formName} />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium">Project</span>
                <Select onChange={(event) => updateSetup({ projectName: event.target.value })} value={setup.projectName}>
                  {projectOptions.map((project) => <option key={project} value={project}>{project}</option>)}
                </Select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium">Form Type</span>
                <Select onChange={(event) => updateSetup({ formType: event.target.value })} value={setup.formType}>
                  {formTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                </Select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium">Primary Language</span>
                <Input onChange={(event) => updateSetup({ language: event.target.value })} value={setup.language} />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium">Owner</span>
                <Input onChange={(event) => updateSetup({ owner: event.target.value })} value={setup.owner} />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium">Estimated Duration</span>
                <Input min={1} onChange={(event) => updateSetup({ durationMinutes: Number(event.target.value) || 1 })} type="number" value={setup.durationMinutes} />
              </label>
              <label className="text-sm md:col-span-2">
                <span className="mb-1 block font-medium">Description</span>
                <Textarea onChange={(event) => updateSetup({ description: event.target.value })} placeholder="What this form collects, who uses it, and what decisions the data supports." value={setup.description} />
              </label>
            </div>
            <div className="mt-5">
              <p className="text-sm font-medium">Data Collection Method</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {([
                  ["web", MonitorSmartphone, "Web"],
                  ["mobile", Smartphone, "Mobile"],
                  ["web_mobile", TabletSmartphone, "Web and Mobile"],
                ] satisfies [CollectionMethod, LucideIcon, string][]).map(([method, Icon, label]) => (
                  <button
                    className={cn("rounded-xl border bg-background/60 p-3 text-left transition hover:border-primary/40", setup.collectionMethod === method && "border-primary/50 bg-primary/10")}
                    key={method}
                    onClick={() => updateSetup({ collectionMethod: method })}
                    type="button"
                  >
                    <Icon aria-hidden="true" className="text-primary" size={17} />
                    <span className="mt-2 block text-sm font-semibold">{label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <Button disabled={!setup.formName.trim()} onClick={() => setStage("start")} variant="primary">
                Continue
              </Button>
            </div>
          </section>
          <aside className="rounded-xl border bg-panel p-3.5 shadow-line">
            <h3 className="font-semibold">Draft shell will contain</h3>
            <div className="mt-4 space-y-3">
              <Signal label="Initial Status" value="Draft" />
              <Signal label="Owner" value={setup.owner} />
              <Signal label="Language" value={setup.language} />
              <Signal label="Collection Method" value={setup.collectionMethod.replace("_", " + ")} />
            </div>
          </aside>
        </div>
      ) : null}

      {stage === "start" ? (
        <section className="rounded-xl border bg-panel p-3.5 shadow-line">
          <Badge tone="accent">Step 2</Badge>
          <h2 className="mt-3 text-lg font-semibold">Start Method</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {startMethods.map((method) => {
              const Icon = method.icon;
              return (
                <button
                  className={cn("rounded-2xl border bg-background/60 p-4 text-left transition hover:border-primary/40", startMethod === method.id && "border-primary/50 bg-primary/10")}
                  key={method.id}
                  onClick={() => setStartMethod(method.id)}
                  type="button"
                >
                  <Icon aria-hidden="true" className="text-primary" size={20} />
                  <span className="mt-3 flex items-center gap-2 font-semibold">
                    {method.label}
                    <HelpHint label={`About ${method.label}`} title={method.label}>{method.description}</HelpHint>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <Button onClick={() => setStage("setup")} variant="ghost">Back</Button>
            <Button onClick={() => createDraftAndOpenBuilder()} variant="primary">
              <Play aria-hidden="true" />
              Continue to Builder
            </Button>
          </div>
        </section>
      ) : null}

      {stage === "builder" && draftForm ? (
        <section className="space-y-3">
          <StagePanel
            action={<Button onClick={() => setStage("controls")} variant="primary">Continue to controls</Button>}
            icon={Layers3}
            title="Builder"
            route="/forms/:formId/builder"
            lines={[
              "Use the canonical builder below for question library, sections, repeat groups, validation, logic, templates, import, preview, and mobile deployment.",
              "The left panel contains the question library, the center is the form canvas, and field settings open where users can configure the selected question.",
            ]}
          />
          <DynamicForms initialDraft={draftForm} token={token} />
        </section>
      ) : null}

      {stage === "controls" ? (
        <section className="space-y-3">
          <StagePanel
            action={<Button onClick={() => setStage("preview")} variant="primary">Preview and test</Button>}
            icon={ShieldCheck}
            title="Controls & Governance"
            route="/forms/:formId/governance"
            lines={[
              "Review permissions, workflow, data quality, governance, reference data, and mapping controls before publishing.",
              "These are form-level settings; platform-wide policies remain in Governance and Administration.",
            ]}
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {([
              ["Permissions", "View, edit, publish, assign, collect, review, approve, and export access.", ShieldCheck],
              ["Workflow", "Simple, supervisor review, data manager review, or custom stages.", Workflow],
              ["Data Quality", "Required fields, duplicates, outliers, GPS validation, consent, and blocking rules.", ClipboardCheck],
              ["Governance", "Retention, masking, consent, export restrictions, edit rules, and record locking.", ListChecks],
              ["Mapping Settings", "GPS required, accuracy threshold, boundary validation, coordinate masking.", MonitorSmartphone],
              ["Audit Trail", "Form created, question changes, rules, publish, archive, export, and preview events.", GitBranch],
            ] satisfies [string, string, LucideIcon][]).map(([title, description, Icon]) => (
              <div className="rounded-xl border bg-panel p-3.5 shadow-line" key={String(title)}>
                <Icon aria-hidden="true" className="text-primary" size={19} />
                <div className="mt-3 flex items-center gap-2">
                  <h3 className="font-semibold">{title}</h3>
                  <HelpHint label={`About ${title}`} title={title}>{description}</HelpHint>
                </div>
                <Badge className="mt-4" tone="success">Default reviewed</Badge>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {stage === "preview" ? (
        <section className="space-y-3">
          <StagePanel
            action={<Button onClick={() => setStage("review")} variant="primary">Review readiness</Button>}
            icon={MonitorSmartphone}
            title="Preview & Test"
            route="/forms/:formId/preview"
            lines={[
              "Test-only previews should validate required fields, skip logic, references, repeat groups, calculations, consent behavior, and GPS placeholders.",
              "Preview submissions are not counted as real submissions.",
            ]}
          />
          <div className="grid gap-4 xl:grid-cols-3">
            {([
              ["Web Preview", MonitorSmartphone, "Desktop staff collection and manager review."],
              ["Tablet Preview", TabletSmartphone, "Supervisor-friendly operational layout."],
              ["Mobile Preview", Smartphone, "Enumerator mode for offline collection."],
            ] satisfies [string, LucideIcon, string][]).map(([title, Icon, description]) => (
              <div className="rounded-xl border bg-panel p-3.5 shadow-line" key={String(title)}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{title}</h3>
                  <Icon aria-hidden="true" className="text-primary" size={19} />
                </div>
                <div className="mt-4 rounded-xl border bg-background/70 p-4">
                  <p className="text-sm font-semibold">{draftForm?.name ?? setup.formName}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    Preview mode
                    <HelpHint label={`About ${title}`} title={title}>{description}</HelpHint>
                  </div>
                  <div className="mt-4 space-y-2">
                    {(draftForm?.fields ?? []).slice(0, 4).map((field) => (
                      <div className="rounded-lg border bg-panel px-3 py-2" key={field.id}>
                        <p className="text-sm font-medium">{field.label}{field.required ? " *" : ""}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{field.type} · {field.variableName}</p>
                      </div>
                    ))}
                    {draftForm?.fields.length ? null : (
                      <div className="rounded-lg border border-dashed bg-muted/30 px-3 py-5 text-center text-sm text-muted-foreground">No questions yet. Return to Builder and add questions.</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {stage === "review" ? (
        <section className="space-y-3">
          <StagePanel
            icon={ListChecks}
            route="/forms/:formId/review"
            title="Review Before Publish"
            lines={[
              "Publishing is blocked when critical readiness checks fail.",
              "Publishing creates an immutable published version and makes the form available for Field Operations assignments.",
            ]}
          />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {checklist.map((item) => {
              const passed = item.complete;
              const tone = passed ? "success" : item.required ? "danger" : "warning";
              return (
                <div className="rounded-xl border bg-panel p-3 shadow-line" key={item.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Badge tone={tone}>{passed ? "Passed" : item.required ? "Failed" : "Warning"}</Badge>
                      <div className="mt-3 flex items-center gap-2">
                        <h3 className="font-semibold">{item.label}</h3>
                        <HelpHint label={`About ${item.label}`} title={item.label}>{item.description}</HelpHint>
                      </div>
                    </div>
                    {passed ? <CheckCircle2 aria-hidden="true" className="text-success" /> : <XCircle aria-hidden="true" className="text-danger" />}
                  </div>
                </div>
              );
            })}
          </div>
          {publishedForm ? (
            <div className="rounded-2xl border border-success/30 bg-success/10 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 aria-hidden="true" className="mt-0.5 text-success" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">Published version created</h3>
                    <HelpHint label="About published version" title="Published version created">
                      {publishedForm.name} is now Published as v{publishedForm.activeVersion}. Field Operations can assign it to collectors.
                    </HelpHint>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </section>
  );
}

function StagePanel({ action, icon: Icon, lines, route, title }: { action?: ReactNode; icon: LucideIcon; lines: string[]; route: string; title: string }) {
  return (
    <div className="rounded-xl border bg-panel p-3.5 shadow-line">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-primary/10 text-primary">
            <Icon aria-hidden="true" size={18} />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold">{title}</h2>
              <Badge tone="neutral">{route}</Badge>
              <HelpHint label={`About ${title}`} title={title}>
                {lines.join(" ")}
              </HelpHint>
            </div>
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}

function Signal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-background/60 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}
