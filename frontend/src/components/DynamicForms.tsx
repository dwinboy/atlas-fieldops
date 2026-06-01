"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  Braces,
  Calendar,
  Camera,
  Check,
  ClipboardList,
  Copy,
  FileDown,
  FileUp,
  GitBranch,
  GripVertical,
  Hash,
  Layers3,
  ListFilter,
  MapPin,
  MessageSquareText,
  MonitorSmartphone,
  Plus,
  Repeat2,
  Search,
  Settings2,
  Sigma,
  Smartphone,
  Star,
  Trash2,
  Type,
  UploadCloud
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import {
  addField,
  createDraftVersion,
  createField,
  duplicateField,
  fieldCatalog,
  getCollectionCompatibility,
  publishForm,
  removeField,
  reorderFields,
  toMobileSchema,
  toXlsFormWorkbook,
  updateField,
  type DynamicForm,
  type FieldType,
  type FormField
} from "@/lib/forms";
import {
  createForm,
  createPublicCollectionLink,
  exportFormXlsForm,
  getFormCollectionCompatibility,
  listForms,
  type DataFormRead
} from "@/lib/api";
import { formTemplateCategories, formTemplates, starterForms, type FormTemplateCard } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/stores/workspace";

const fieldTypeIcons: Record<FieldType, typeof Type> = {
  text: Type,
  textarea: MessageSquareText,
  number: Hash,
  decimal: Hash,
  currency: Hash,
  phone: Type,
  email: Type,
  password: Type,
  select: ListFilter,
  multiselect: ListFilter,
  radio: ListFilter,
  checkbox: Check,
  gps: MapPin,
  photo: Camera,
  signature: Type,
  barcode: Braces,
  audio: MonitorSmartphone,
  video: MonitorSmartphone,
  file: FileUp,
  date: Calendar,
  time: Calendar,
  datetime: Calendar,
  calculated: Sigma,
  repeat_group: Repeat2,
  grid: Layers3
};

function templateToForm(template: FormTemplateCard): DynamicForm {
  const sectionId = `${template.id}-main`;
  const evidenceSectionId = `${template.id}-evidence`;
  const fields: FormField[] = [
    { id: `${template.id}-beneficiary`, label: "Beneficiary or respondent name", type: "text", required: true, sectionId },
    { id: `${template.id}-uid`, label: "Unique ID or program code", type: "text", required: true, sectionId },
    { id: `${template.id}-community`, label: "Community or village", type: "text", required: true, sectionId },
    {
      id: `${template.id}-status`,
      label: `${template.name.replace(" Form", "")} status`,
      type: "select",
      required: true,
      sectionId,
      options: ["New", "In progress", "Needs follow-up", "Complete"]
    },
    { id: `${template.id}-notes`, label: "Field officer notes", type: "textarea", required: false, sectionId },
    {
      id: `${template.id}-quality`,
      label: "Data quality confidence",
      type: "radio",
      required: true,
      sectionId: evidenceSectionId,
      options: ["High", "Medium", "Low"]
    }
  ];

  if (template.hasGps) {
    fields.push({
      id: `${template.id}-gps`,
      label: "Automatic GPS location",
      type: "gps",
      required: true,
      sectionId: evidenceSectionId,
      validation: { accuracyMax: 25 }
    });
  }

  if (template.hasMedia) {
    fields.push({
      id: `${template.id}-photo`,
      label: "Photo or signature evidence",
      type: "photo",
      required: false,
      sectionId: evidenceSectionId,
      logic: [{ id: `${template.id}-photo-required`, kind: "required", expression: "${quality} = 'Low'", message: "Add proof when confidence is low" }]
    });
  }

  if (template.repeatGroups > 0) {
    fields.push({
      id: `${template.id}-repeat`,
      label: template.category === "Agriculture" ? "Crops or farm plots" : "Household members or linked records",
      type: "repeat_group",
      required: false,
      sectionId,
      children: [
        { id: `${template.id}-repeat-name`, label: "Record name", type: "text", required: true, sectionId },
        { id: `${template.id}-repeat-value`, label: "Value or count", type: "number", required: false, sectionId, validation: { min: 0 } }
      ]
    });
  }

  return {
    id: `${template.id}-${Date.now()}`,
    name: template.name,
    status: "draft",
    version: 1,
    activeVersion: 0,
    updatedAt: new Date().toISOString(),
    sections: [
      { id: sectionId, title: "Core questions", description: template.description },
      { id: evidenceSectionId, title: "Evidence and review", description: "GPS, proof, quality checks, and supervisor review." }
    ],
    fields
  };
}

type DynamicFormsProps = {
  token: string | null;
};

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120) || `form-${Date.now()}`
  );
}

function persistedFormToLocal(form: DataFormRead): DynamicForm {
  const sectionId = `${form.id}-summary`;
  return {
    id: form.id,
    name: form.name,
    status: form.status === "published" ? "published" : form.status === "archived" ? "archived" : "draft",
    version: form.current_version,
    activeVersion: form.status === "published" ? form.current_version : 0,
    updatedAt: new Date().toISOString(),
    sections: [{ id: sectionId, title: "Saved form", description: form.description ?? "Stored in the backend." }],
    fields: [
      { id: `${form.id}-respondent`, label: "Respondent name", type: "text", required: true, sectionId },
      { id: `${form.id}-location`, label: "Collection GPS", type: "gps", required: true, sectionId, validation: { accuracyMax: 25 } },
      { id: `${form.id}-notes`, label: "Field notes", type: "textarea", required: false, sectionId }
    ]
  };
}

function SortableField({
  field,
  index,
  selected,
  onDuplicate,
  onMoveDown,
  onMoveUp,
  onRemove,
  onSelect,
  canMoveDown,
  canMoveUp
}: {
  field: FormField;
  index: number;
  selected: boolean;
  onDuplicate: () => void;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onRemove: () => void;
  onSelect: () => void;
  canMoveDown: boolean;
  canMoveUp: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });
  const FieldIcon = fieldTypeIcons[field.type];

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group flex items-center justify-between gap-4 border-b bg-panel p-4 transition last:border-b-0 hover:bg-muted/30",
        selected && "bg-primary/10",
        isDragging && "relative z-10 shadow-elevated"
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          className="flex h-9 w-8 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          {...attributes}
          {...listeners}
          aria-label={`Drag ${field.label} to reorder`}
          type="button"
        >
          <GripVertical aria-hidden="true" size={15} />
        </button>
        <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={onSelect} type="button">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground">
            <FieldIcon aria-hidden="true" size={16} />
          </span>
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
              <span className="font-mono text-[11px] text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
              {field.label}
              {field.required ? <Badge tone="warning">required</Badge> : null}
              {field.logic?.length ? <Badge tone="accent">logic</Badge> : null}
            </span>
            <span className="mt-1 block truncate text-xs text-muted-foreground">
              {field.type.replace("_", " ")} · {field.hint ?? "No helper text"}
            </span>
          </span>
        </button>
      </div>
      <div className="flex items-center gap-1 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
        <Button aria-label={`Move ${field.label} up`} disabled={!canMoveUp} onClick={onMoveUp} size="icon" type="button" variant="ghost">
          <ArrowUp aria-hidden="true" />
        </Button>
        <Button aria-label={`Move ${field.label} down`} disabled={!canMoveDown} onClick={onMoveDown} size="icon" type="button" variant="ghost">
          <ArrowDown aria-hidden="true" />
        </Button>
        <Button aria-label={`Duplicate ${field.label}`} onClick={onDuplicate} size="icon" type="button" variant="ghost">
          <Copy aria-hidden="true" />
        </Button>
        <Button aria-label={`Remove ${field.label}`} onClick={onRemove} size="icon" type="button" variant="ghost">
          <Trash2 aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

export function DynamicForms({ token }: DynamicFormsProps) {
  const [forms, setForms] = useState<DynamicForm[]>(starterForms);
  const [selectedFormId, setSelectedFormId] = useState(starterForms[0]?.id ?? "");
  const [selectedFieldId, setSelectedFieldId] = useState(starterForms[0]?.fields[0]?.id ?? "");
  const [builderMode, setBuilderMode] = useState<"builder" | "templates">("builder");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("mobile");
  const [templateCategory, setTemplateCategory] = useState("Recommended");
  const [templateQuery, setTemplateQuery] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState(formTemplates[0]?.id ?? "");
  const [builderResult, setBuilderResult] = useState("");
  const pendingTemplateId = useWorkspaceStore((state) => state.pendingTemplateId);
  const setPendingTemplateId = useWorkspaceStore((state) => state.setPendingTemplateId);
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const backendFormsQuery = useQuery({
    queryKey: ["forms", token],
    queryFn: () => listForms(token ?? ""),
    enabled: Boolean(token && token !== "preview-token")
  });
  const persistedForms = useMemo(() => (backendFormsQuery.data ?? []).map(persistedFormToLocal), [backendFormsQuery.data]);
  const allForms = useMemo(() => (persistedForms.length ? [...forms, ...persistedForms] : forms), [forms, persistedForms]);
  const selectedForm = useMemo(() => allForms.find((form) => form.id === selectedFormId) ?? allForms[0], [allForms, selectedFormId]);
  const selectedField = selectedForm?.fields.find((field) => field.id === selectedFieldId) ?? selectedForm?.fields[0];
  const isPersistedSelectedForm = Boolean(selectedFormId && persistedForms.some((form) => form.id === selectedFormId));
  const publishMutation = useMutation({
    mutationFn: (payload: { form: DynamicForm; publish: boolean }) =>
      createForm(token ?? "", {
        name: payload.form.name,
        slug: `${slugify(payload.form.name)}-${Date.now().toString(36)}`,
        description: payload.form.sections[0]?.description ?? null,
        schema: toMobileSchema(payload.form) as Record<string, unknown>,
        publish: payload.publish
      }),
    onSuccess: async (savedForm) => {
      setBuilderResult(`${savedForm.name} is ${savedForm.status} as backend version ${savedForm.current_version}. Field teams can use the latest published version after sync.`);
      pushToast({
        title: savedForm.status === "published" ? "Form published" : "Form saved",
        description: `${savedForm.name} is stored in the backend as version ${savedForm.current_version}.`,
        tone: "success"
      });
      await backendFormsQuery.refetch();
    }
  });
  const serverCompatibilityQuery = useQuery({
    queryKey: ["form-compatibility", token, selectedFormId],
    queryFn: () => getFormCollectionCompatibility(token ?? "", selectedFormId),
    enabled: Boolean(token && token !== "preview-token" && isPersistedSelectedForm)
  });
  const xlsFormQuery = useQuery({
    queryKey: ["form-xlsform", token, selectedFormId],
    queryFn: () => exportFormXlsForm(token ?? "", selectedFormId),
    enabled: false
  });
  const publicLinkMutation = useMutation({
    mutationFn: () =>
      createPublicCollectionLink(token ?? "", {
        form_id: selectedFormId,
        slug: `${slugify(selectedForm?.name ?? "form")}-${Date.now().toString(36)}`,
        title: selectedForm?.name ?? "Public collection form",
        description: "Controlled public collection link generated from the form builder.",
        access_mode: "restricted",
        require_authentication: false,
        allow_offline_web: true,
        permission_json: { submit: true, view: false, edit: false, export: false }
      }),
    onSuccess: (link) => {
      setBuilderResult(`${link.title} has a controlled public collection link: ${link.public_url}. Share it only with the intended collection audience.`);
      pushToast({ title: "Public link created", description: `${link.public_url} is ready for controlled collection`, tone: "success" });
    },
    onError: () => {
      setBuilderResult("Public link was not created. Save this form to the backend first, then create a link from the saved form.");
      pushToast({ title: "Public link not created", description: "Select a saved backend form and sign in with form management access.", tone: "danger" });
    }
  });
  const visibleTemplates = useMemo(() => {
    const needle = templateQuery.trim().toLowerCase();
    return formTemplates.filter((template) => {
      const categoryMatch = templateCategory === "Recommended" ? template.featured : template.category === templateCategory;
      const queryMatch =
        !needle ||
        template.name.toLowerCase().includes(needle) ||
        template.description.toLowerCase().includes(needle) ||
        template.tags.some((tag) => tag.toLowerCase().includes(needle));
      return categoryMatch && queryMatch;
    });
  }, [templateCategory, templateQuery]);
  const selectedTemplate = formTemplates.find((template) => template.id === selectedTemplateId) ?? visibleTemplates[0] ?? formTemplates[0];
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function updateSelectedForm(nextForm: DynamicForm) {
    setForms((current) => {
      const exists = current.some((form) => form.id === nextForm.id);
      return exists ? current.map((form) => (form.id === nextForm.id ? nextForm : form)) : [nextForm, ...current];
    });
  }

  function moveField(fieldId: string, direction: -1 | 1) {
    if (!selectedForm) {
      return;
    }
    const currentIndex = selectedForm.fields.findIndex((field) => field.id === fieldId);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= selectedForm.fields.length) {
      return;
    }
    const nextFields = [...selectedForm.fields];
    const [field] = nextFields.splice(currentIndex, 1);
    if (!field) {
      return;
    }
    nextFields.splice(nextIndex, 0, field);
    updateSelectedForm({ ...selectedForm, fields: nextFields, updatedAt: new Date().toISOString() });
  }

  function saveSelectedForm(publish: boolean) {
    if (!selectedForm) {
      return;
    }
    if (token && token !== "preview-token") {
      publishMutation.mutate({ form: selectedForm, publish });
      return;
    }
    const nextForm = publish ? publishForm(selectedForm) : createDraftVersion(selectedForm);
    updateSelectedForm(nextForm);
    setBuilderResult(
      publish
        ? `${nextForm.name} is published in preview as version ${nextForm.activeVersion}. Review the phone preview before assigning it to field teams.`
        : `${nextForm.name} was saved as a draft preview version ${nextForm.version}. Continue editing before publishing.`
    );
    pushToast({
      title: publish ? "Preview form published" : "Preview draft saved",
      description: `${selectedForm.name} was updated in preview mode.`,
      tone: "success"
    });
  }

  function applyTemplate(template: FormTemplateCard) {
    const nextForm = templateToForm(template);
    setForms((current) => [nextForm, ...current]);
    setSelectedFormId(nextForm.id);
    setSelectedFieldId(nextForm.fields[0]?.id ?? "");
    setBuilderMode("builder");
    setBuilderResult(`${template.name} was added to the builder with ${nextForm.fields.length} starter questions. Customize labels, rules, and required fields before publishing.`);
    pushToast({
      title: "Template added to builder",
      description: `${template.name} is ready to customize and publish.`,
      tone: "success"
    });
  }

  useEffect(() => {
    if (!pendingTemplateId) {
      return;
    }
    const template = formTemplates.find((candidate) => candidate.id === pendingTemplateId);
    if (template) {
      applyTemplate(template);
    }
    setPendingTemplateId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingTemplateId, setPendingTemplateId]);

  function addCatalogField(type: FieldType) {
    if (!selectedForm) {
      return;
    }
    const sectionId = selectedForm.sections[0]?.id ?? "default";
    const field = createField(type, sectionId);
    updateSelectedForm(addField(selectedForm, field));
    setSelectedFieldId(field.id);
    setBuilderResult(`${field.label} was added. Edit the label, required setting, and rules in the properties panel.`);
  }

  function archiveSelectedForm(): void {
    if (!selectedForm) {
      return;
    }
    const nextForm = { ...selectedForm, status: "archived" as const, updatedAt: new Date().toISOString() };
    updateSelectedForm(nextForm);
    setBuilderResult(`${nextForm.name} is archived in preview. It remains visible for reference but should not be assigned to new field work.`);
    pushToast({ title: "Preview form archived", description: `${nextForm.name} was archived in the local preview workspace.`, tone: "warning" });
  }

  function onDragEnd(event: DragEndEvent) {
    if (!selectedForm || !event.over || event.active.id === event.over.id) {
      return;
    }
    updateSelectedForm(reorderFields(selectedForm, String(event.active.id), String(event.over.id)));
  }

  const selectedFormWorkbook = selectedForm ? toXlsFormWorkbook(selectedForm) : null;
  const selectedFormCompatibility = selectedForm ? getCollectionCompatibility(selectedForm) : null;
  const activeCompatibility = serverCompatibilityQuery.data ?? (
    selectedFormCompatibility
      ? {
          xlsform_ready: selectedFormCompatibility.xlsFormReady,
          mobile_app_ready: selectedFormCompatibility.mobileAppReady,
          web_form_ready: selectedFormCompatibility.webFormReady,
          media_field_count: selectedFormCompatibility.mediaCount,
          warnings: selectedFormCompatibility.warnings
        }
      : null
  );

  return (
    <section aria-labelledby="forms-title" className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Forms</p>
          <h1 id="forms-title" className="mt-2 text-2xl font-semibold tracking-tight">
            Form builder
          </h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
            Build clear, offline-ready forms your field team can use confidently on mobile devices.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              const surveyRows = selectedFormWorkbook?.survey.length ?? 0;
              setBuilderResult(`${selectedForm?.name ?? "Form"} is ready to export with ${surveyRows} survey rows, ${selectedFormWorkbook?.choices.length ?? 0} choices, and XLSForm-compatible settings.`);
              pushToast({ title: "Export prepared", description: `${selectedForm?.name ?? "Form"} is ready as JSON and XLSForm with ${surveyRows} survey rows.`, tone: "success" });
              if (isPersistedSelectedForm && token && token !== "preview-token") {
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
              setBuilderResult("Import workflow is ready. Use Data tools to review XLSForm, JSON, CSV, and Kobo/ODK migration structures before applying imported data.");
              pushToast({ title: "Import workflow ready", description: "XLSForm, JSON, CSV, and Kobo/ODK migration structures can be reviewed in Data tools.", tone: "neutral" });
            }}
            type="button"
          >
            <FileUp aria-hidden="true" />
            Import
          </Button>
          <Button onClick={() => setBuilderMode("templates")} type="button">
            <Star aria-hidden="true" />
            Choose template
          </Button>
          <Button
            onClick={() => {
              const nextForm = templateToForm({
                id: "blank-form",
                name: "Untitled field form",
                category: "Registration Workflows",
                description: "A blank form with core respondent, GPS, and review questions.",
                fields: 6,
                minutes: 5,
                popularity: 0,
                recommendedFor: ["All teams"],
                tags: ["blank", "registration"],
                hasGps: true,
                hasMedia: false,
                repeatGroups: 0
              });
              setForms((current) => [nextForm, ...current]);
              setSelectedFormId(nextForm.id);
              setSelectedFieldId(nextForm.fields[0]?.id ?? "");
              setBuilderMode("builder");
              setBuilderResult(`${nextForm.name} was created with ${nextForm.fields.length} starter questions. Rename the form and adjust required fields before publishing.`);
              pushToast({ title: "Blank form created", description: "Start editing questions and publish when ready.", tone: "success" });
            }}
            type="button"
            variant="primary"
          >
            <Plus aria-hidden="true" />
            New form
          </Button>
        </div>
      </div>

      {builderResult ? (
        <section className="rounded-2xl border border-success/30 bg-success/10 p-4" aria-live="polite">
          <div className="flex items-start gap-3">
            <Check aria-hidden="true" className="mt-0.5 text-success" size={18} />
            <div>
              <h2 className="text-sm font-semibold">Builder result</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{builderResult}</p>
            </div>
          </div>
        </section>
      ) : null}

      {builderMode === "templates" ? (
        <section className="surface-premium rounded-2xl p-4" aria-labelledby="template-picker-title">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Create Form → Choose Template → Customize → Publish</p>
              <h2 id="template-picker-title" className="mt-2 text-xl font-semibold tracking-tight">
                Choose a ready-made form template
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Templates open directly inside the builder, so teams can preview, copy, edit, and publish without leaving the form workflow.
              </p>
            </div>
            <Button onClick={() => setBuilderMode("builder")} type="button" variant="ghost">
              Back to builder
            </Button>
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <label className="relative flex-1">
                  <span className="sr-only">Search form templates</span>
                  <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
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
                      templateCategory === category ? "border-primary bg-primary/10 text-primary" : "bg-background/80 text-muted-foreground hover:text-foreground"
                    )}
                    key={category}
                    onClick={() => setTemplateCategory(category)}
                    type="button"
                  >
                    {category}
                  </button>
                ))}
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {visibleTemplates.map((template) => (
                  <button
                    className={cn(
                      "rounded-2xl border bg-background/80 p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-elevated",
                      selectedTemplate?.id === template.id && "border-primary/45 bg-primary/5"
                    )}
                    key={template.id}
                    onClick={() => setSelectedTemplateId(template.id)}
                    type="button"
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl border bg-panel text-primary">
                        <MonitorSmartphone aria-hidden="true" size={18} />
                      </span>
                      {template.featured ? <Badge tone="accent">Recommended</Badge> : <Badge tone="neutral">{template.category}</Badge>}
                    </div>
                    <h3 className="text-sm font-semibold">{template.name}</h3>
                    <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">{template.description}</p>
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
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Live preview</p>
                <h3 className="mt-2 text-lg font-semibold">{selectedTemplate.name}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{selectedTemplate.description}</p>
                <div className="mt-4 rounded-[28px] border bg-panel p-3 shadow-line">
                  <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-muted" />
                  {templateToForm(selectedTemplate).fields.slice(0, 5).map((field, index) => (
                    <div className="mb-3 rounded-xl border bg-background p-3" key={field.id}>
                      <p className="text-[11px] text-muted-foreground">Question {index + 1}</p>
                      <p className="mt-1 text-sm font-medium">{field.label}</p>
                      <div className="mt-2 h-7 rounded-lg bg-muted/70" />
                    </div>
                  ))}
                </div>
                <Button className="mt-4 w-full" onClick={() => applyTemplate(selectedTemplate)} type="button" variant="primary">
                  <Copy aria-hidden="true" />
                  Use Template
                </Button>
              </aside>
            ) : null}
          </div>
        </section>
      ) : null}

      <div className={cn("grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)] 2xl:grid-cols-[280px_minmax(0,1fr)_360px]", builderMode === "templates" && "hidden")}>
        <aside className="space-y-4">
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
                    selectedForm?.id === form.id ? "border-primary/35 bg-primary/10 text-primary" : "bg-background hover:bg-muted/60"
                  )}
                  onClick={() => {
                    setSelectedFormId(form.id);
                    setSelectedFieldId(form.fields[0]?.id ?? "");
                  }}
                  type="button"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="block font-medium">{form.name}</span>
                    <Badge tone={form.status === "published" ? "success" : "neutral"}>Version {form.version}</Badge>
                  </span>
                  <span className="mt-2 block text-xs text-muted-foreground">
                    {form.fields.length ? `${form.fields.length} questions` : "Saved backend form"} · {form.status}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-lg border bg-panel p-3">
            <div className="mb-3 flex items-center gap-2">
              <Plus aria-hidden="true" size={18} />
              <h2 className="text-sm font-semibold">Add a question</h2>
            </div>
            <div className="space-y-4">
              {fieldCatalog.map((group) => (
                <div key={group.group}>
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{group.group}</p>
                  <div className="space-y-1.5">
                    {group.fields.map((field) => {
                      const Icon = fieldTypeIcons[field.type];
                      return (
                        <button
                          key={field.type}
                          className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-sm transition hover:bg-muted"
                          onClick={() => addCatalogField(field.type)}
                          type="button"
                        >
                          <Icon aria-hidden="true" className="text-muted-foreground" size={16} />
                          <span>
                            <span className="block font-medium">{field.label}</span>
                            <span className="block text-xs text-muted-foreground">{field.description}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>

        {selectedForm ? (
          <div className="space-y-4">
            <section className="rounded-lg border bg-panel p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold">{selectedForm.name}</h2>
                    <Badge tone={selectedForm.status === "published" ? "success" : "neutral"}>{selectedForm.status}</Badge>
                    <Badge tone="accent">Live version {selectedForm.activeVersion}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Offline-ready · updated {new Date(selectedForm.updatedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => {
                      saveSelectedForm(false);
                    }}
                    disabled={publishMutation.isPending}
                  >
                    <GitBranch aria-hidden="true" />
                    Edit draft
                  </Button>
                  <Button onClick={archiveSelectedForm} type="button" variant="secondary">
                    <Archive aria-hidden="true" />
                    Archive
                  </Button>
                  <Button
                    onClick={() => {
                      saveSelectedForm(true);
                    }}
                    disabled={publishMutation.isPending}
                    variant="primary"
                  >
                    <UploadCloud aria-hidden="true" />
                    Publish
                  </Button>
                </div>
              </div>
            </section>

            {selectedFormCompatibility && selectedFormWorkbook ? (
              <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label="Collection compatibility">
                {[
                  ["XLSForm", activeCompatibility?.xlsform_ready ? "Ready" : "Needs questions"],
                  ["Mobile app", activeCompatibility?.mobile_app_ready ? "Offline-ready" : "Check fields"],
                  ["Web form", activeCompatibility?.web_form_ready ? "Ready" : "Barcode excluded"],
                  ["Media fields", String(activeCompatibility?.media_field_count ?? 0)]
                ].map(([label, value]) => (
                  <article className="rounded-lg border bg-panel p-4" key={label}>
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="mt-2 text-lg font-semibold">{value}</p>
                  </article>
                ))}
              </section>
            ) : null}

            {selectedFormCompatibility && selectedFormWorkbook ? (
              <section className="rounded-lg border bg-panel p-4">
                <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                  <div>
                    <h2 className="text-sm font-semibold">XLSForm readiness</h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Atlas can package this form into survey, choices, and settings sheets for Kobo/ODK-style migration review.
                    </p>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {[
                        ["Survey rows", xlsFormQuery.data?.survey.length ?? selectedFormWorkbook.survey.length],
                        ["Choices", xlsFormQuery.data?.choices.length ?? selectedFormWorkbook.choices.length],
                        ["Version", xlsFormQuery.data?.settings.version ?? selectedFormWorkbook.settings.version]
                      ].map(([label, value]) => (
                        <div className="rounded-md border bg-background p-3" key={label}>
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <p className="mt-1 text-sm font-semibold">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold">Collection channels</h2>
                    <div className="mt-3 space-y-2">
                      {[
                        ["Mobile collection", "Offline capture with GPS, media, repeat groups, and retry sync."],
                        ["Web forms", "Browser-based collection for desktop or shared devices."],
                        ["Public link review", "Prepare controlled external access after sharing rules are configured."]
                      ].map(([title, text]) => (
                        <div className="rounded-md border bg-background p-3" key={title}>
                          <p className="text-sm font-medium">{title}</p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {(activeCompatibility?.warnings ?? []).length ? (
                  <div className="mt-4 rounded-md border border-warning/25 bg-warning/10 p-3">
                    <p className="text-sm font-semibold text-warning">Before sharing</p>
                    <ul className="mt-2 space-y-1 text-xs leading-5 text-muted-foreground">
                      {(activeCompatibility?.warnings ?? []).map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    disabled={!isPersistedSelectedForm || !token || token === "preview-token" || xlsFormQuery.isFetching}
                    onClick={() => xlsFormQuery.refetch()}
                    type="button"
                    variant="secondary"
                  >
                    <FileDown aria-hidden="true" />
                    {xlsFormQuery.isFetching ? "Checking export" : "Get backend XLSForm"}
                  </Button>
                  <Button
                    disabled={!isPersistedSelectedForm || !token || token === "preview-token" || publicLinkMutation.isPending}
                    onClick={() => publicLinkMutation.mutate()}
                    type="button"
                    variant="secondary"
                  >
                    <FileUp aria-hidden="true" />
                    {publicLinkMutation.isPending ? "Creating link" : "Create public link"}
                  </Button>
                </div>
              </section>
            ) : null}

            <section className="overflow-hidden rounded-lg border bg-panel" aria-labelledby="canvas-title">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div>
                  <h2 id="canvas-title" className="text-sm font-semibold">
                    Questions
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">Drag questions to reorder. Select one to edit details and rules.</p>
                </div>
                <Badge tone="accent">{selectedForm.fields.length} questions</Badge>
              </div>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={selectedForm.fields.map((field) => field.id)} strategy={verticalListSortingStrategy}>
                  <div>
                    {selectedForm.fields.map((field, index) => (
                      <SortableField
                        key={field.id}
                        field={field}
                        index={index}
                        selected={selectedField?.id === field.id}
                        canMoveDown={index < selectedForm.fields.length - 1}
                        canMoveUp={index > 0}
                        onDuplicate={() => updateSelectedForm(duplicateField(selectedForm, field.id))}
                        onMoveDown={() => moveField(field.id, 1)}
                        onMoveUp={() => moveField(field.id, -1)}
                        onRemove={() => updateSelectedForm(removeField(selectedForm, field.id))}
                        onSelect={() => setSelectedFieldId(field.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </section>

            <section className="rounded-lg border bg-panel p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold">Phone preview</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Check how this form will feel for a field officer.</p>
                </div>
                <div className="flex rounded-md border bg-background p-1">
                  {(["mobile", "desktop"] as const).map((mode) => (
                    <button
                      key={mode}
                      className={cn(
                        "rounded px-2.5 py-1 text-xs font-medium",
                        previewMode === mode ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                      )}
                      onClick={() => setPreviewMode(mode)}
                      type="button"
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
              <div className={cn("mt-4 rounded-xl border bg-background p-4", previewMode === "mobile" && "mx-auto max-w-sm")}>
                <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <Smartphone aria-hidden="true" size={14} />
                  Field officer preview · version {selectedForm.version}
                </div>
                <div className="space-y-4">
                  {selectedForm.fields.slice(0, 6).map((field) => (
                    <label key={field.id} className="block text-sm font-medium">
                      {field.label}
                      {field.required ? <span className="text-danger"> *</span> : null}
                      <div className="mt-2 rounded-md border bg-panel px-3 py-2 text-sm text-muted-foreground">
                        {field.type === "repeat_group"
                          ? "Add one or more records"
                          : field.type === "gps"
                            ? "GPS captured automatically"
                            : field.options?.join(" / ") ?? field.hint ?? "Answer goes here"}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </section>
          </div>
        ) : null}

        {selectedForm && selectedField ? (
          <aside className="space-y-4 xl:col-span-2 2xl:col-span-1">
            <section className="rounded-lg border bg-panel p-4">
              <div className="flex items-center gap-2">
                <Settings2 aria-hidden="true" size={17} />
                <h2 className="text-sm font-semibold">Properties</h2>
              </div>
              <label className="mt-4 block text-sm font-medium">
                Field label
                <Input
                  className="mt-2"
                  value={selectedField.label}
                  onChange={(event) => updateSelectedForm(updateField(selectedForm, selectedField.id, { label: event.target.value }))}
                />
              </label>
              <label className="mt-4 block text-sm font-medium">
                Type
                <Select
                  className="mt-2"
                  value={selectedField.type}
                  onChange={(event) =>
                    updateSelectedForm(updateField(selectedForm, selectedField.id, { type: event.target.value as FieldType }))
                  }
                >
                  {fieldCatalog.flatMap((group) => group.fields).map((field) => (
                    <option key={field.type} value={field.type}>
                      {field.label}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="mt-4 flex items-center gap-2 text-sm font-medium">
                <input
                  checked={selectedField.required}
                  className="h-4 w-4"
                  onChange={(event) => updateSelectedForm(updateField(selectedForm, selectedField.id, { required: event.target.checked }))}
                  type="checkbox"
                />
                Required by default
              </label>
            </section>

            <section className="rounded-lg border bg-panel p-4">
              <div className="flex items-center gap-2">
                <GitBranch aria-hidden="true" size={17} />
                <h2 className="text-sm font-semibold">Question rules</h2>
              </div>
              <div className="mt-4 space-y-3">
                {[
                  ["Show this question when", "Only show it after a specific earlier answer."],
                  ["Make it required when", "Ask for an answer only in situations that need it."],
                  ["Check the answer", "Set safe ranges, formats, or accuracy limits."],
                  ["Calculate a value", "Add totals or scores from previous answers."]
                ].map(([label, helper]) => (
                  <div key={label} className="rounded-md border bg-background p-3">
                    <p className="text-sm font-medium">{label}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{helper}</p>
                  </div>
                ))}
              </div>
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
                  "Published versions stay stable on mobile"
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm">
                    <Check aria-hidden="true" className="text-success" size={15} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        ) : null}
      </div>
    </section>
  );
}
