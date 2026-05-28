"use client";

import {
  BadgeCheck,
  Clock3,
  Copy,
  Filter,
  MapPin,
  MonitorSmartphone,
  Play,
  Search,
  Sparkles,
  Star,
  Wand2
} from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formTemplateCategories, formTemplates, type FormTemplateCard } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/stores/workspace";

function categoryCount(category: string) {
  if (category === "Recommended") {
    return formTemplates.filter((template) => template.featured).length;
  }
  return formTemplates.filter((template) => template.category === category).length;
}

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
    "Respondent or beneficiary name",
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

export function FormTemplateLibrary() {
  const [activeCategory, setActiveCategory] = useState("Recommended");
  const [query, setQuery] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState(formTemplates[0]?.id ?? "");
  const setActiveView = useWorkspaceStore((state) => state.setActiveView);
  const setPendingTemplateId = useWorkspaceStore((state) => state.setPendingTemplateId);
  const pushToast = useWorkspaceStore((state) => state.pushToast);

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
    setPendingTemplateId(template.id);
    pushToast({
      title: "Template copied",
      description: `${template.name} is ready for quick edits in the form builder.`,
      tone: "success"
    });
    setActiveView("forms");
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
          <Button type="button">
            <Wand2 aria-hidden="true" />
            AI suggestions
          </Button>
          <Button onClick={() => selectedTemplate && handleUseTemplate(selectedTemplate)} type="button" variant="primary">
            <Copy aria-hidden="true" />
            Use selected
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-panel p-3 shadow-line">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative max-w-2xl flex-1">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input
              className="pl-9"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search farmer registration, baseline survey, vaccination..."
              value={query}
            />
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

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
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
