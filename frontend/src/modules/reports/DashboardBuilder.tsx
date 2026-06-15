"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Maximize2, Minimize2, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import type { CustomDashboardCreate, CustomDashboardRead, DashboardWidget } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  DashboardWidgetBody,
  cycleWidgetWidth,
  donorMetricLabels,
  formMetricLabels,
  submissionMetricLabels,
  type DashboardWidgetData,
} from "@/modules/reports/DashboardWidgets";
import {
  dashboardTypeOptions,
  dashboardVisibilityOptions,
  dataSourceLabels,
  widgetTypeDataSources,
  widgetTypeIcons,
  widgetTypeLabels,
  type WidgetDataSource,
  type WidgetType,
} from "@/modules/reports/data";

const widthLabels: Record<1 | 2 | 3, string> = { 1: "S", 2: "M", 3: "Full" };
export const colSpanClasses: Record<1 | 2 | 3, string> = { 1: "col-span-1", 2: "col-span-2", 3: "col-span-3" };

const referenceDataSources: WidgetDataSource[] = ["indicators", "form_performance", "donor_report"];
const metricDataSources: WidgetDataSource[] = ["submissions", "data_quality", "donor_report", "form_performance"];

function metricOptions(dataSource: WidgetDataSource): { value: string; label: string }[] {
  if (dataSource === "submissions") return Object.entries(submissionMetricLabels).map(([value, label]) => ({ value, label }));
  if (dataSource === "donor_report") return Object.entries(donorMetricLabels).map(([value, label]) => ({ value, label }));
  if (dataSource === "form_performance") return Object.entries(formMetricLabels).map(([value, label]) => ({ value, label }));
  if (dataSource === "data_quality") return [{ value: "open", label: "Open quality issues" }, { value: "critical", label: "Critical quality issues" }];
  return [];
}

function referenceOptions(dataSource: WidgetDataSource, data: DashboardWidgetData): { value: string; label: string }[] {
  if (dataSource === "indicators") return data.indicators.map((indicator) => ({ value: indicator.id, label: `${indicator.code} · ${indicator.name}` }));
  if (dataSource === "form_performance") return data.formPerformance.map((item) => ({ value: item.form.id, label: item.form.name }));
  if (dataSource === "donor_report") return data.donorReports.map((report) => ({ value: report.id, label: report.title }));
  return [];
}

function defaultWidgetTitle(type: WidgetType, dataSource: WidgetDataSource, referenceId: string, metric: string, data: DashboardWidgetData): string {
  if (referenceDataSources.includes(dataSource) && referenceId) {
    const option = referenceOptions(dataSource, data).find((item) => item.value === referenceId);
    if (option) return option.label;
  }
  if (dataSource === "submissions") return submissionMetricLabels[metric] ?? submissionMetricLabels.total;
  if (dataSource === "data_quality") return metric === "critical" ? "Critical quality issues" : "Open quality issues";
  return `${widgetTypeLabels[type]} · ${dataSourceLabels[dataSource]}`;
}

export type DashboardDraft = {
  name: string;
  description: string;
  dashboard_type: string;
  visibility: string;
  status: "draft" | "active" | "archived";
  widgets: DashboardWidget[];
};

function draftFromDashboard(dashboard: CustomDashboardRead | null): DashboardDraft {
  if (!dashboard) {
    return { name: "", description: "", dashboard_type: "Project Dashboard", visibility: "Managers", status: "draft", widgets: [] };
  }
  return {
    name: dashboard.name,
    description: dashboard.description ?? "",
    dashboard_type: dashboard.dashboard_type,
    visibility: dashboard.visibility,
    status: dashboard.status,
    widgets: dashboard.widgets,
  };
}

function SortableWidgetCard({
  widget,
  data,
  onRemove,
  onResize,
}: {
  widget: DashboardWidget;
  data: DashboardWidgetData;
  onRemove: () => void;
  onResize: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: widget.id });
  const TypeIcon = widgetTypeIcons[widget.type as WidgetType];

  return (
    <div
      className={cn(
        "rounded-xl border bg-background p-3 shadow-line",
        colSpanClasses[widget.width],
        isDragging && "relative z-10 shadow-elevated",
      )}
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <button
            aria-label={`Drag ${widget.title} to reorder`}
            className="mt-0.5 flex h-7 w-6 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            type="button"
            {...attributes}
            {...listeners}
          >
            <GripVertical aria-hidden="true" size={14} />
          </button>
          {TypeIcon ? <TypeIcon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /> : null}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{widget.title}</p>
            <p className="text-xs text-muted-foreground">
              {widgetTypeLabels[widget.type as WidgetType] ?? widget.type} · {dataSourceLabels[widget.data_source as WidgetDataSource] ?? widget.data_source}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            aria-label={`Resize ${widget.title}`}
            onClick={onResize}
            size="icon"
            title={`Size: ${widthLabels[widget.width]}. Click to resize.`}
            type="button"
            variant="ghost"
          >
            {widget.width >= 3 ? <Minimize2 aria-hidden="true" size={14} /> : <Maximize2 aria-hidden="true" size={14} />}
          </Button>
          <Button aria-label={`Remove ${widget.title}`} onClick={onRemove} size="icon" type="button" variant="ghost">
            <Trash2 aria-hidden="true" size={14} />
          </Button>
        </div>
      </div>
      <DashboardWidgetBody data={data} widget={widget} />
    </div>
  );
}

export function DashboardBuilder({
  data,
  dashboard,
  onOpenChange,
  onSave,
  open,
  saving,
}: {
  data: DashboardWidgetData;
  dashboard: CustomDashboardRead | null;
  onOpenChange: (open: boolean) => void;
  onSave: (payload: CustomDashboardCreate) => void;
  open: boolean;
  saving: boolean;
}) {
  const [draft, setDraft] = useState<DashboardDraft>(() => draftFromDashboard(dashboard));
  const [newWidgetType, setNewWidgetType] = useState<WidgetType>("kpi");
  const [newWidgetDataSource, setNewWidgetDataSource] = useState<WidgetDataSource>(widgetTypeDataSources.kpi[0]);
  const [newWidgetReference, setNewWidgetReference] = useState("");
  const [newWidgetMetric, setNewWidgetMetric] = useState("");
  const [newWidgetTitle, setNewWidgetTitle] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (open) {
      setDraft(draftFromDashboard(dashboard));
      resetNewWidget("kpi");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dashboard]);

  function resetNewWidget(type: WidgetType): void {
    const dataSource = widgetTypeDataSources[type][0];
    setNewWidgetType(type);
    setNewWidgetDataSource(dataSource);
    setNewWidgetReference("");
    setNewWidgetMetric(metricOptions(dataSource)[0]?.value ?? "");
    setNewWidgetTitle("");
  }

  function changeDataSource(dataSource: WidgetDataSource): void {
    setNewWidgetDataSource(dataSource);
    setNewWidgetReference("");
    setNewWidgetMetric(metricOptions(dataSource)[0]?.value ?? "");
    setNewWidgetTitle("");
  }

  function addWidget(): void {
    const needsReference = referenceDataSources.includes(newWidgetDataSource);
    const referenceChoices = referenceOptions(newWidgetDataSource, data);
    const referenceId = needsReference ? newWidgetReference || referenceChoices[0]?.value || "" : "";
    if (needsReference && !referenceId) return;

    const needsMetric = metricDataSources.includes(newWidgetDataSource);
    const metricChoices = metricOptions(newWidgetDataSource);
    const metric = needsMetric ? newWidgetMetric || metricChoices[0]?.value || "" : "";

    const title = newWidgetTitle.trim() || defaultWidgetTitle(newWidgetType, newWidgetDataSource, referenceId, metric, data);

    const widget: DashboardWidget = {
      id: crypto.randomUUID(),
      type: newWidgetType,
      title,
      data_source: newWidgetDataSource,
      reference_id: needsReference ? referenceId : null,
      metric: needsMetric ? metric : null,
      width: 1,
    };
    setDraft((current) => ({ ...current, widgets: [...current.widgets, widget] }));
    resetNewWidget(newWidgetType);
  }

  function removeWidget(id: string): void {
    setDraft((current) => ({ ...current, widgets: current.widgets.filter((widget) => widget.id !== id) }));
  }

  function resizeWidget(id: string): void {
    setDraft((current) => ({
      ...current,
      widgets: current.widgets.map((widget) => (widget.id === id ? { ...widget, width: cycleWidgetWidth(widget.width) } : widget)),
    }));
  }

  function onDragEnd(event: DragEndEvent): void {
    if (!event.over || event.active.id === event.over.id) return;
    setDraft((current) => {
      const oldIndex = current.widgets.findIndex((widget) => widget.id === event.active.id);
      const newIndex = current.widgets.findIndex((widget) => widget.id === event.over!.id);
      if (oldIndex === -1 || newIndex === -1) return current;
      return { ...current, widgets: arrayMove(current.widgets, oldIndex, newIndex) };
    });
  }

  function handleSave(): void {
    onSave({
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      dashboard_type: draft.dashboard_type,
      visibility: draft.visibility,
      status: draft.status,
      widgets: draft.widgets,
    });
  }

  const needsReference = referenceDataSources.includes(newWidgetDataSource);
  const needsMetric = metricDataSources.includes(newWidgetDataSource);
  const referenceChoices = referenceOptions(newWidgetDataSource, data);
  const metricChoices = metricOptions(newWidgetDataSource);
  const canAddWidget = draft.widgets.length < 24 && (!needsReference || referenceChoices.length > 0);

  return (
    <Modal
      contentClassName="max-w-6xl"
      onOpenChange={onOpenChange}
      open={open}
      title={dashboard ? "Edit dashboard" : "Create dashboard"}
    >
      <div className="flex max-h-[75vh] flex-col overflow-y-auto px-5 py-4 product-scrollbar">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Name</span>
            <Input onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Dashboard name" value={draft.name} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Dashboard type</span>
            <Select onChange={(event) => setDraft((current) => ({ ...current, dashboard_type: event.target.value }))} value={draft.dashboard_type}>
              {dashboardTypeOptions.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Visibility</span>
            <Select onChange={(event) => setDraft((current) => ({ ...current, visibility: event.target.value }))} value={draft.visibility}>
              {dashboardVisibilityOptions.map((visibility) => (
                <option key={visibility} value={visibility}>
                  {visibility}
                </option>
              ))}
            </Select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Status</span>
            <Select
              onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as DashboardDraft["status"] }))}
              value={draft.status}
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </Select>
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="font-medium">Description</span>
            <Textarea
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
              placeholder="What this dashboard is for and who should use it"
              rows={2}
              value={draft.description}
            />
          </label>
        </div>

        <div className="mt-4 rounded-xl border bg-panel p-3">
          <p className="mb-2 text-sm font-semibold">Add widget</p>
          <div className="grid gap-2 md:grid-cols-5">
            <label className="space-y-1 text-xs">
              <span className="font-medium text-muted-foreground">Widget type</span>
              <Select onChange={(event) => resetNewWidget(event.target.value as WidgetType)} value={newWidgetType}>
                {Object.entries(widgetTypeLabels).map(([type, label]) => (
                  <option key={type} value={type}>
                    {label}
                  </option>
                ))}
              </Select>
            </label>
            <label className="space-y-1 text-xs">
              <span className="font-medium text-muted-foreground">Data source</span>
              <Select onChange={(event) => changeDataSource(event.target.value as WidgetDataSource)} value={newWidgetDataSource}>
                {widgetTypeDataSources[newWidgetType].map((source) => (
                  <option key={source} value={source}>
                    {dataSourceLabels[source]}
                  </option>
                ))}
              </Select>
            </label>
            {needsReference ? (
              <label className="space-y-1 text-xs">
                <span className="font-medium text-muted-foreground">
                  {newWidgetDataSource === "indicators" ? "Indicator" : newWidgetDataSource === "form_performance" ? "Form" : "Donor report"}
                </span>
                <Select onChange={(event) => setNewWidgetReference(event.target.value)} value={newWidgetReference || referenceChoices[0]?.value || ""}>
                  {referenceChoices.length ? (
                    referenceChoices.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))
                  ) : (
                    <option value="">No options available</option>
                  )}
                </Select>
              </label>
            ) : null}
            {needsMetric ? (
              <label className="space-y-1 text-xs">
                <span className="font-medium text-muted-foreground">Metric</span>
                <Select onChange={(event) => setNewWidgetMetric(event.target.value)} value={newWidgetMetric || metricChoices[0]?.value || ""}>
                  {metricChoices.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </label>
            ) : null}
            <label className="space-y-1 text-xs">
              <span className="font-medium text-muted-foreground">Title (optional)</span>
              <Input
                onChange={(event) => setNewWidgetTitle(event.target.value)}
                placeholder={defaultWidgetTitle(newWidgetType, newWidgetDataSource, newWidgetReference || referenceChoices[0]?.value || "", newWidgetMetric || metricChoices[0]?.value || "", data)}
                value={newWidgetTitle}
              />
            </label>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            {draft.widgets.length >= 24 ? <span className="text-xs text-muted-foreground">Maximum of 24 widgets per dashboard.</span> : <span />}
            <Button disabled={!canAddWidget} onClick={addWidget} size="sm" type="button">
              <Plus aria-hidden="true" /> Add widget
            </Button>
          </div>
        </div>

        <div className="mt-4">
          {draft.widgets.length ? (
            <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd} sensors={sensors}>
              <SortableContext items={draft.widgets.map((widget) => widget.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {draft.widgets.map((widget) => (
                    <SortableWidgetCard data={data} key={widget.id} onRemove={() => removeWidget(widget.id)} onResize={() => resizeWidget(widget.id)} widget={widget} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed text-center text-xs text-muted-foreground">
              No widgets yet. Add a KPI, chart, table, or progress widget above.
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
        <Badge tone="neutral">{draft.widgets.length} widget{draft.widgets.length === 1 ? "" : "s"}</Badge>
        <div className="flex-1" />
        <Button onClick={() => onOpenChange(false)} type="button" variant="secondary">
          Cancel
        </Button>
        <Button disabled={!draft.name.trim() || saving} onClick={handleSave} type="button">
          {saving ? "Saving..." : "Save dashboard"}
        </Button>
      </div>
    </Modal>
  );
}
