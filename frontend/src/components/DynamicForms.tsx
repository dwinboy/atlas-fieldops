"use client";

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
  publishForm,
  removeField,
  reorderFields,
  updateField,
  type DynamicForm,
  type FieldType,
  type FormField
} from "@/lib/forms";
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

function SortableField({
  field,
  index,
  selected,
  onDuplicate,
  onRemove,
  onSelect
}: {
  field: FormField;
  index: number;
  selected: boolean;
  onDuplicate: () => void;
  onRemove: () => void;
  onSelect: () => void;
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
      <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={onSelect} type="button">
        <span
          className="flex cursor-grab touch-none items-center text-muted-foreground"
          {...attributes}
          {...listeners}
          aria-label={`Drag ${field.label}`}
        >
          <GripVertical aria-hidden="true" size={15} />
        </span>
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
      <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
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

export function DynamicForms() {
  const [forms, setForms] = useState<DynamicForm[]>(starterForms);
  const [selectedFormId, setSelectedFormId] = useState(starterForms[0]?.id ?? "");
  const [selectedFieldId, setSelectedFieldId] = useState(starterForms[0]?.fields[0]?.id ?? "");
  const [builderMode, setBuilderMode] = useState<"builder" | "templates">("builder");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("mobile");
  const [templateCategory, setTemplateCategory] = useState("Recommended");
  const [templateQuery, setTemplateQuery] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState(formTemplates[0]?.id ?? "");
  const pendingTemplateId = useWorkspaceStore((state) => state.pendingTemplateId);
  const setPendingTemplateId = useWorkspaceStore((state) => state.setPendingTemplateId);
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const selectedForm = useMemo(() => forms.find((form) => form.id === selectedFormId) ?? forms[0], [forms, selectedFormId]);
  const selectedField = selectedForm?.fields.find((field) => field.id === selectedFieldId) ?? selectedForm?.fields[0];
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
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function updateSelectedForm(nextForm: DynamicForm) {
    setForms((current) => current.map((form) => (form.id === nextForm.id ? nextForm : form)));
  }

  function applyTemplate(template: FormTemplateCard) {
    const nextForm = templateToForm(template);
    setForms((current) => [nextForm, ...current]);
    setSelectedFormId(nextForm.id);
    setSelectedFieldId(nextForm.fields[0]?.id ?? "");
    setBuilderMode("builder");
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
  }

  function onDragEnd(event: DragEndEvent) {
    if (!selectedForm || !event.over || event.active.id === event.over.id) {
      return;
    }
    updateSelectedForm(reorderFields(selectedForm, String(event.active.id), String(event.over.id)));
  }

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
              pushToast({ title: "Export prepared", description: `${selectedForm?.name ?? "Form"} schema is ready as JSON/XLSForm.`, tone: "success" });
            }}
            type="button"
          >
            <FileDown aria-hidden="true" />
            Export
          </Button>
          <Button
            onClick={() => {
              pushToast({ title: "Import workflow ready", description: "Upload handling is configured for XLSForm, JSON, and CSV form structures.", tone: "neutral" });
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
              {forms.map((form) => (
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
                    {form.fields.length} questions · {form.status}
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
                      updateSelectedForm(createDraftVersion(selectedForm));
                      pushToast({ title: "Draft ready to edit", description: `${selectedForm.name} can now be updated`, tone: "success" });
                    }}
                  >
                    <GitBranch aria-hidden="true" />
                    Edit draft
                  </Button>
                  <Button>
                    <Archive aria-hidden="true" />
                    Archive
                  </Button>
                  <Button
                    onClick={() => {
                      updateSelectedForm(publishForm(selectedForm));
                      pushToast({ title: "Form published", description: `${selectedForm.name} version ${selectedForm.version} is live`, tone: "success" });
                    }}
                    variant="primary"
                  >
                    <UploadCloud aria-hidden="true" />
                    Publish
                  </Button>
                </div>
              </div>
            </section>

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
                        onDuplicate={() => updateSelectedForm(duplicateField(selectedForm, field.id))}
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
                Label
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
