"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  ClipboardCheck,
  Clock3,
  Copy,
  Filter,
  MapPin,
  MonitorSmartphone,
  Play,
  Search,
  Sparkles,
  Star,
  Wand2,
  X
} from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import {
  duplicateFormTemplate,
  listFormTemplates,
  listPrograms,
  listSurveys,
  type ProgramRead,
  type SurveyRead,
} from "@/lib/api";
import { formTemplateCategories, formTemplates, type FormTemplateCard } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/stores/workspace";

function categoryCount(category: string) {
  if (category === "Recommended") {
    return formTemplates.filter((template) => template.featured).length;
  }
  return formTemplates.filter((template) => template.category === category).length;
}

const previewTemplateProjects: ProgramRead[] = [
  { id: "preview-agriculture", name: "Agricultural Resilience Program", slug: "agricultural-resilience", region: "North West", is_active: true },
  { id: "preview-health", name: "Community Health Outreach", slug: "community-health", region: "Central", is_active: true },
];

const previewTemplateSurveys: SurveyRead[] = [
  {
    id: "preview-baseline",
    organization_id: "preview-org",
    project_id: "preview-agriculture",
    created_by_user_id: "preview-user",
    owner_user_id: "preview-user",
    manager_user_id: null,
    title: "Baseline Survey",
    code: "AGR-BASE-2026",
    description: "Baseline data collection.",
    survey_type: "baseline",
    status: "active",
    start_date: "2026-06-01",
    end_date: "2026-06-30",
    geographic_scope: "North West districts",
    target_population: "Smallholder farmers",
    indicator_ids_json: [],
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
    description: "Registration data collection.",
    survey_type: "farmer_survey",
    status: "draft",
    start_date: null,
    end_date: null,
    geographic_scope: "Program communities",
    target_population: "Farmers",
    indicator_ids_json: [],
    custom_type_label: null,
    is_active: true,
  },
];

function TemplateCard({
  active,
  template,
  onSelect,
  onUse
}: {
  active: boolean;
  template: FormTemplateCard;
  onSelect: () => void;
  onUse: () => void;
}) {
  return (
    <article
      className={cn(
        "group flex min-h-[238px] flex-col justify-between rounded-lg border bg-panel p-4 shadow-line transition duration-150 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-elevated",
        active && "border-primary/45 bg-primary/5"
      )}
    >
      <button className="min-w-0 text-left" onClick={onSelect} type="button">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border bg-background text-primary">
            <MonitorSmartphone aria-hidden="true" size={19} />
          </div>
          <div className="flex flex-wrap justify-end gap-1.5">
            {template.featured ? (
              <Badge tone="accent">
                <Star aria-hidden="true" size={12} />
                Recommended
              </Badge>
            ) : null}
            <Badge tone="neutral">{template.category}</Badge>
          </div>
        </div>
        <h2 className="text-base font-semibold tracking-tight">{template.name}</h2>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{template.description}</p>
      </button>

      <div className="mt-5 space-y-4">
        <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
          <span className="rounded-md bg-muted/55 px-2.5 py-2">
            <strong className="block text-sm text-foreground">{template.fields}</strong>
            fields
          </span>
          <span className="rounded-md bg-muted/55 px-2.5 py-2">
            <strong className="block text-sm text-foreground">{template.minutes}m</strong>
            setup
          </span>
          <span className="rounded-md bg-muted/55 px-2.5 py-2">
            <strong className="block text-sm text-foreground">{template.repeatGroups}</strong>
            repeats
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {template.hasGps ? (
            <span className="inline-flex items-center gap-1">
              <MapPin aria-hidden="true" size={13} />
              GPS
            </span>
          ) : null}
          {template.hasMedia ? (
            <span className="inline-flex items-center gap-1">
              <BadgeCheck aria-hidden="true" size={13} />
              Media proof
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1">
            <Clock3 aria-hidden="true" size={13} />
            Offline-ready
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button className="flex-1" onClick={onSelect} type="button">
            <Play aria-hidden="true" />
            Preview
          </Button>
          <Button className="flex-1" onClick={onUse} type="button" variant="primary">
            <Copy aria-hidden="true" />
            Use
          </Button>
        </div>
      </div>
    </article>
  );
}

function PreviewPanel({ template }: { template: FormTemplateCard }) {
  const sampleFields = [
    "Respondent or entity name",
    "Unique ID or program code",
    "Community or village",
    "Automatic GPS location",
    template.hasMedia ? "Photo or signature proof" : "Field officer notes",
    template.repeatGroups ? "Repeat group entries" : "Supervisor review notes"
  ];

  return (
    <aside className="rounded-lg border bg-panel shadow-line">
      <div className="border-b p-4">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Template preview</p>
        <h2 className="mt-2 text-lg font-semibold tracking-tight">{template.name}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{template.description}</p>
      </div>
      <div className="grid gap-4 p-4">
        <div className="rounded-lg border bg-background p-3">
          <div className="mx-auto max-w-[280px] rounded-[28px] border bg-panel p-3 shadow-line">
            <div className="mb-3 h-1.5 w-16 rounded-full bg-muted mx-auto" />
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Mobile form</p>
                <p className="text-sm font-semibold">{template.name}</p>
              </div>
              {sampleFields.map((item, index) => (
                <div key={item} className="rounded-md border bg-background p-2.5">
                  <p className="text-[11px] text-muted-foreground">Question {index + 1}</p>
                  <p className="mt-1 text-sm font-medium">{item}</p>
                  <div className="mt-2 h-7 rounded-md bg-muted/70" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold">What is included</h3>
          <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
            <div className="flex items-center justify-between rounded-md bg-muted/55 px-3 py-2">
              <span>Offline mobile schema</span>
              <Badge tone="success">Ready</Badge>
            </div>
            <div className="flex items-center justify-between rounded-md bg-muted/55 px-3 py-2">
              <span>Validation rules</span>
              <Badge tone="success">Included</Badge>
            </div>
            <div className="flex items-center justify-between rounded-md bg-muted/55 px-3 py-2">
              <span>Logic and calculations</span>
              <Badge tone="accent">{template.repeatGroups || template.hasMedia ? "Advanced" : "Simple"}</Badge>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function FormTemplateLibrary({ token }: { token: string | null }) {
  const [activeCategory, setActiveCategory] = useState("Recommended");
  const [query, setQuery] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState(formTemplates[0]?.id ?? "");
  const [selectedProjectId, setSelectedProjectId] = useState(previewTemplateProjects[0]?.id ?? "");
  const [selectedSurveyId, setSelectedSurveyId] = useState(previewTemplateSurveys[0]?.id ?? "");
  const [templateResult, setTemplateResult] = useState("");
  const setActiveView = useWorkspaceStore((state) => state.setActiveView);
  const setPendingTemplateId = useWorkspaceStore((state) => state.setPendingTemplateId);
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const isPreview = !token || token === "preview-token";
  const projectsQuery = useQuery({
    queryKey: ["programs", token],
    queryFn: () => listPrograms(token ?? ""),
    enabled: Boolean(token && !isPreview)
  });
  const surveysQuery = useQuery({
    queryKey: ["surveys", token],
    queryFn: () => listSurveys(token ?? ""),
    enabled: Boolean(token && !isPreview)
  });
  const backendTemplatesQuery = useQuery({
    queryKey: ["form-templates", token],
    queryFn: () => listFormTemplates(token ?? ""),
    enabled: Boolean(token && !isPreview)
  });
  const projects = isPreview ? previewTemplateProjects : projectsQuery.data ?? [];
  const surveys = isPreview ? previewTemplateSurveys : surveysQuery.data ?? [];
  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? projects[0];
  const projectSurveys = surveys.filter((survey) => survey.project_id === selectedProject?.id);
  const selectedSurvey = projectSurveys.find((survey) => survey.id === selectedSurveyId) ?? projectSurveys[0];
  const duplicateMutation = useMutation({
    mutationFn: (template: FormTemplateCard) =>
      duplicateFormTemplate(token ?? "", template.id, {
        project_id: selectedProject?.id ?? "",
        survey_id: selectedSurvey?.id ?? "",
        name: template.name,
        slug: `${template.id}-${Date.now().toString(36)}`,
        publish: false
      }),
    onSuccess: (form) => {
      setTemplateResult(`${form.name} was copied as a backend draft. It is ready for editing in the form builder before publication.`);
      pushToast({
        title: "Template copied",
        description: `${form.name} is now a backend draft form.`,
        tone: "success"
      });
      setActiveView("forms");
    }
  });

  const visibleTemplates = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return formTemplates.filter((template) => {
      const categoryMatch = activeCategory === "Recommended" ? template.featured : template.category === activeCategory;
      const queryMatch =
        !needle ||
        template.name.toLowerCase().includes(needle) ||
        template.description.toLowerCase().includes(needle) ||
        template.tags.some((tag) => tag.toLowerCase().includes(needle));
      return categoryMatch && queryMatch;
    });
  }, [activeCategory, query]);

  const selectedTemplate =
    formTemplates.find((template) => template.id === selectedTemplateId) ?? visibleTemplates[0] ?? formTemplates[0];

  function handleUseTemplate(template: FormTemplateCard) {
    if (!selectedProject || !selectedSurvey) {
      setTemplateResult("Select a project and survey before using a template. Templates create forms, and forms must belong to a survey.");
      pushToast({
        title: "Survey required",
        description: "Create or select a survey before copying this template.",
        tone: "warning"
      });
      setActiveView("surveys");
      return;
    }
    if (token && !isPreview) {
      setTemplateResult(`${template.name} is being copied to ${selectedSurvey.title} as a backend draft form. You will be taken to the form builder after it is ready.`);
      duplicateMutation.mutate(template);
      return;
    }
    setPendingTemplateId(template.id);
    setTemplateResult(`${template.name} was copied into the form builder for ${selectedSurvey.title}. Next: customize questions, preview mobile layout, then publish.`);
    pushToast({
      title: "Template copied",
      description: `${template.name} is ready for quick edits in the form builder.`,
      tone: "success"
    });
    setActiveView("forms");
  }

  function suggestTemplate() {
    const recommended =
      visibleTemplates.find((template) => template.featured && template.hasGps && template.hasMedia) ??
      visibleTemplates.find((template) => template.featured) ??
      visibleTemplates[0] ??
      formTemplates[0];
    if (!recommended) {
      setTemplateResult("No template matched this search. Clear the search or select another category to broaden the suggestion.");
      pushToast({ title: "No template found", description: "Try another search or category.", tone: "warning" });
      return;
    }
    setSelectedTemplateId(recommended.id);
    setTemplateResult(`${recommended.name} is selected as the best starting point because it supports offline field collection${recommended.hasGps ? ", GPS" : ""}${recommended.hasMedia ? ", and media evidence" : ""}.`);
    pushToast({
      title: "Suggested template selected",
      description: `${recommended.name} is a strong starting point for offline field collection.`,
      tone: "success"
    });
  }

  return (
    <section aria-labelledby="templates-title" className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Template library</p>
          <h1 id="templates-title" className="mt-2 text-2xl font-semibold tracking-tight">
            Start with a proven field form
          </h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
            Browse ready-made English templates for agriculture, health, education, humanitarian response, M&E, and field operations.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={suggestTemplate} type="button">
            <Wand2 aria-hidden="true" />
            AI suggestions
          </Button>
          <Button disabled={duplicateMutation.isPending} onClick={() => selectedTemplate && handleUseTemplate(selectedTemplate)} type="button" variant="primary">
            <Copy aria-hidden="true" />
            Use selected
          </Button>
        </div>
      </div>

      <section className="surface-premium rounded-2xl p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Template destination</p>
            <h2 className="mt-2 text-lg font-semibold">Choose where this form will belong</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
              A template becomes a form draft inside one survey. Select the project and survey first so the form cannot become disconnected from M&E activity.
            </p>
          </div>
          <div className="grid min-w-0 flex-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
            <label className="text-sm">
              <span className="mb-1 block font-medium">Project</span>
              <Select
                value={selectedProject?.id ?? ""}
                onChange={(event) => {
                  setSelectedProjectId(event.target.value);
                  const firstSurvey = surveys.find((survey) => survey.project_id === event.target.value);
                  setSelectedSurveyId(firstSurvey?.id ?? "");
                }}
              >
                {projects.length ? (
                  projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)
                ) : (
                  <option value="">No projects yet</option>
                )}
              </Select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Survey</span>
              <Select
                value={selectedSurvey?.id ?? ""}
                onChange={(event) => setSelectedSurveyId(event.target.value)}
              >
                {projectSurveys.length ? (
                  projectSurveys.map((survey) => <option key={survey.id} value={survey.id}>{survey.title}</option>)
                ) : (
                  <option value="">No surveys in project</option>
                )}
              </Select>
            </label>
            <Button className="md:self-end" onClick={() => setActiveView("surveys")} type="button" variant="secondary">
              <ClipboardCheck aria-hidden="true" />
              Manage surveys
            </Button>
          </div>
        </div>
      </section>

      <div className="rounded-lg border bg-panel p-3 shadow-line">
        {backendTemplatesQuery.data?.length ? (
          <p className="mb-3 rounded-md border bg-success/10 px-3 py-2 text-xs text-muted-foreground">
            Live backend template catalog connected: {backendTemplatesQuery.data.length} templates available for duplication.
          </p>
        ) : null}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative max-w-2xl flex-1">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input
              className="pl-9 pr-10"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search farmer registration, baseline survey, vaccination..."
              value={query}
            />
            {query ? (
              <button
                aria-label="Clear template search"
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => setQuery("")}
                type="button"
              >
                <X aria-hidden="true" size={14} />
              </button>
            ) : null}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Filter aria-hidden="true" size={15} />
            {visibleTemplates.length} templates shown
          </div>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {formTemplateCategories.map((category) => (
            <button
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-medium transition",
                activeCategory === category ? "border-primary bg-primary/10 text-primary" : "bg-background text-muted-foreground hover:text-foreground"
              )}
              key={category}
              onClick={() => setActiveCategory(category)}
              type="button"
            >
              {category}
              <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">{categoryCount(category)}</span>
            </button>
          ))}
        </div>
      </div>

      {templateResult ? (
        <section className="rounded-2xl border border-success/30 bg-success/10 p-4" aria-live="polite">
          <div className="flex items-start gap-3">
            <Sparkles aria-hidden="true" className="mt-0.5 text-success" size={18} />
            <div>
              <h2 className="text-sm font-semibold">Template result</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{templateResult}</p>
            </div>
          </div>
        </section>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        {visibleTemplates.length ? (
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {visibleTemplates.map((template) => (
              <TemplateCard
                active={selectedTemplate?.id === template.id}
                key={template.id}
                onSelect={() => setSelectedTemplateId(template.id)}
                onUse={() => handleUseTemplate(template)}
                template={template}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border bg-panel p-6 text-center shadow-line">
            <Search aria-hidden="true" className="mx-auto text-muted-foreground" size={24} />
            <h2 className="mt-3 text-base font-semibold">No templates match this search</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Clear the search or choose another category. Atlas templates are organized by field workflow, not only by sector name.
            </p>
            <Button className="mt-4" onClick={() => setQuery("")} type="button" variant="secondary">
              <X aria-hidden="true" />
              Clear search
            </Button>
          </div>
        )}
        {selectedTemplate ? <PreviewPanel template={selectedTemplate} /> : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {[
          ["Choose", "Pick a template by program area, field team workflow, or search."],
          ["Customize", "Rename it, remove questions, adjust validation, then preview mobile layout."],
          ["Publish", "Deploy the offline-ready version to field officers with audit tracking."]
        ].map(([title, text], index) => (
          <div className="rounded-lg border bg-panel p-4 shadow-line" key={title}>
            <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-sm font-semibold text-primary">
              {index + 1}
            </div>
            <h2 className="text-sm font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border bg-panel p-4 shadow-line">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold">Prepared for smarter templates</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The template registry is ready for AI-generated forms, field suggestions, validation recommendations, and organization-specific versions.
            </p>
          </div>
          <Badge tone="accent">
            <Sparkles aria-hidden="true" size={12} />
            Future-ready
          </Badge>
        </div>
      </div>
    </section>
  );
}
