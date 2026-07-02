"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Database,
  Download,
  FileSpreadsheet,
  Gauge,
  History,
  Link2,
  MapPin,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UploadCloud,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { DataTable, type TableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpHint } from "@/components/ui/help-hint";
import { Input, Select, Textarea } from "@/components/ui/input";
import {
  analyzeImport,
  confirmImportJob,
  getImportErrorReport,
  getImportMigrationOverview,
  listImportJobs,
  listProjectImportJobs,
  listImportSupportedSources,
  listProjects,
  previewImport,
  rollbackImportJob,
  uploadImportFile,
  type ImportAnalysisResponse,
  type ImportJobRead,
  type ImportPreviewResponse,
  type ImportSupportedSourceRead,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  importTypes,
  previewImportJobs,
  previewSources,
  previewSmartAnalysis,
  previewValidation,
  sampleRows,
} from "@/modules/imports-migration/data";
import { useWorkspaceStore } from "@/stores/workspace";

type ImportsMigrationModuleProps = {
  mode?: "administration" | "project";
  projectId?: string | null;
  token: string | null;
};

const steps = [
  "Upload / Select Source",
  "Analyze Data",
  "Readiness Score",
  "Field mapping",
  "Location Matching",
  "Entity Matching",
  "Duplicate Review",
  "Validation Issues",
  "Preview Import",
  "Confirm Import",
  "Import Results",
  "Quality Report",
];

const defaultColumns = ["farmer_name", "mobile", "district", "improved_seed"];

const emptyValidation: ImportPreviewResponse = {
  duplicate_rows: 0,
  error_rows: 0,
  issues: [],
  suggested_mapping: [],
  valid_rows: 0,
};

const emptyAnalysis: ImportAnalysisResponse = {
  date_formats: [],
  duplicate_groups: [],
  entity_matches: [],
  generated_ids: [],
  gps_warnings: [],
  indicator_matches: [],
  legacy_fields: [],
  location_matches: [],
  preview_counts: { create: 0, update: 0, skip: 0, warnings: 0, errors: 0 },
  progress_percent: 0,
  quality_report: {
    data_quality_score: 100,
    duplicate_candidates: 0,
    errors: 0,
    import_batch_id: "not-started",
    location_issues: 0,
    recommendations: ["Upload a file and run Analyze Data to generate a quality report."],
    records_created: 0,
    records_skipped: 0,
    records_updated: 0,
    source_system: "Not selected",
    unlinked_submissions: 0,
    warnings: 0,
  },
  readiness: {
    category: "Not Ready",
    factors: {},
    issues: ["No import file has been analyzed yet."],
    recommended_action: "Upload an Excel, CSV, JSON, XLSForm, GeoJSON, or KML file before continuing.",
    score: 0,
  },
  suggested_mapping: [],
  validation_issues: [],
};

function statusTone(status: string): "danger" | "neutral" | "success" | "warning" {
  if (status.includes("completed") || status === "validated" || status === "ready") return "success";
  if (status.includes("error") || status === "failed" || status === "needs_fixes") return "danger";
  if (status === "processing" || status === "draft") return "warning";
  return "neutral";
}

function prettyType(value: string): string {
  return importTypes.find((item) => item.id === value)?.label ?? value.replaceAll("_", " ");
}

function formatCount(value?: number): string {
  return new Intl.NumberFormat().format(value ?? 0);
}

export function ImportsMigrationModule({
  mode = "administration",
  projectId,
  token,
}: ImportsMigrationModuleProps) {
  const preview = !token || token === "preview-token";
  const queryClient = useQueryClient();
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const [step, setStep] = useState(0);
  const [selectedType, setSelectedType] = useState("entity_registry");
  const [source, setSource] = useState("upload_file");
  const [file, setFile] = useState<File | null>(null);
  const [sourceSystem, setSourceSystem] = useState("Uploaded File");
  const [targetMode, setTargetMode] = useState(projectId ? "existing_project" : "new_project");
  const [targetProjectId, setTargetProjectId] = useState(projectId ?? "");
  const [reason, setReason] = useState("Continue an existing M&E project inside Atlas FieldOps.");
  const [validation, setValidation] = useState<ImportPreviewResponse | null>(preview ? previewValidation : emptyValidation);
  const [analysis, setAnalysis] = useState<ImportAnalysisResponse>(preview ? previewSmartAnalysis : emptyAnalysis);
  const [activeJob, setActiveJob] = useState<ImportJobRead | null>(null);
  const [errorReportSummary, setErrorReportSummary] = useState("");
  const [uploadedColumns, setUploadedColumns] = useState<string[]>(preview ? defaultColumns : []);
  const [uploadedRows, setUploadedRows] = useState<Record<string, unknown>[]>(preview ? sampleRows : []);
  const projectRequiredForImport = ["beneficiaries", "entity_registry", "form_definitions", "submissions"].includes(selectedType);

  const overviewQuery = useQuery({
    queryKey: ["imports-migration-overview", token],
    queryFn: () => getImportMigrationOverview(token ?? ""),
    enabled: Boolean(token && !preview),
  });
  const sourcesQuery = useQuery({
    queryKey: ["imports-migration-sources", token],
    queryFn: () => listImportSupportedSources(token ?? ""),
    enabled: Boolean(token && !preview),
  });
  const historyQuery = useQuery({
    queryKey: ["imports-migration-history", token, projectId],
    queryFn: () => projectId ? listProjectImportJobs(token ?? "", projectId) : listImportJobs(token ?? ""),
    enabled: Boolean(token && !preview),
  });
  const projectsQuery = useQuery({
    queryKey: ["imports-migration-projects", token],
    queryFn: () => listProjects(token ?? ""),
    enabled: Boolean(token && !preview && !projectId),
  });

  const sources = useMemo(
    () => (preview ? previewSources : (sourcesQuery.data ?? overviewQuery.data?.supported_sources ?? [])),
    [overviewQuery.data?.supported_sources, preview, sourcesQuery.data],
  );
  const history = useMemo(
    () => (preview ? previewImportJobs : (historyQuery.data ?? overviewQuery.data?.recent_batches ?? [])),
    [historyQuery.data, overviewQuery.data?.recent_batches, preview],
  );
  const selectedImportType = importTypes.find((item) => item.id === selectedType) ?? importTypes[1];
  const selectedSource = sources.find((item) => item.id === source) ?? sources[0];
  const projectOptions = projectsQuery.data ?? [];
  const mobileOutputs = overviewQuery.data?.mobile_ready_outputs ?? [
    "assignedEntities",
    "assignedForms",
    "publishedFormVersions",
    "referenceData",
    "locations",
    "prefillData",
    "duplicateRules",
    "submissionUpload",
  ];

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) {
        throw new Error("Choose a CSV, Excel, JSON, XLSForm, GeoJSON, or KML file.");
      }
      if (projectRequiredForImport && !targetProjectId) {
        throw new Error("Select the target project before importing beneficiaries, forms, or submissions.");
      }
      return uploadImportFile(token ?? "", selectedType, file, {
        importReason: reason,
        sourceSystem,
        targetMode,
        targetProjectId: targetProjectId || null,
      });
    },
    onSuccess: (result) => {
      setUploadedColumns(result.columns.length ? result.columns : []);
      setUploadedRows(result.preview_rows.length ? result.preview_rows : []);
      setValidation({
        duplicate_rows: result.job.duplicate_rows,
        error_rows: result.job.error_rows,
        issues: result.issues,
        suggested_mapping: result.job.id ? validation?.suggested_mapping ?? emptyValidation.suggested_mapping : emptyValidation.suggested_mapping,
        valid_rows: result.job.valid_rows,
      });
      setActiveJob(result.job);
      setStep(1);
      pushToast({ title: "Import file parsed", description: `${result.preview_rows.length} rows prepared for mapping preview.`, tone: "success" });
      void queryClient.invalidateQueries({ queryKey: ["imports-migration-history", token, projectId] });
    },
    onError: (error) => {
      pushToast({ title: "Upload failed", description: error instanceof Error ? error.message : "Check the file format and try again.", tone: "danger" });
    },
  });

  const previewMutation = useMutation({
    mutationFn: () => previewImport(token ?? "", { columns: uploadedColumns, dataset_type: selectedType, sample_rows: uploadedRows }),
    onSuccess: (result) => {
      setValidation(result);
      pushToast({ title: "Validation complete", description: `${result.error_rows} blocking issue(s), ${result.duplicate_rows} duplicate signal(s).`, tone: result.error_rows ? "warning" : "success" });
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: () => analyzeImport(token ?? "", {
      columns: uploadedColumns,
      dataset_type: selectedType,
      sample_rows: uploadedRows,
      source_system: sourceSystem,
      target_project_id: targetProjectId || null,
    }),
    onSuccess: (result) => {
      setAnalysis(result);
      setValidation({
        duplicate_rows: result.duplicate_groups.length,
        error_rows: result.validation_issues.filter((issue) => issue.severity === "error").length,
        issues: result.validation_issues,
        suggested_mapping: result.suggested_mapping,
        valid_rows: Math.max(0, uploadedRows.length - result.validation_issues.filter((issue) => issue.severity === "error").length),
      });
      setStep(2);
      pushToast({ title: "Data analyzed", description: `${result.readiness.score}% readiness: ${result.readiness.category}.`, tone: result.readiness.score >= 70 ? "success" : "warning" });
    },
    onError: (error) => {
      pushToast({ title: "Analysis failed", description: error instanceof Error ? error.message : "Check your file and try again.", tone: "danger" });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () => {
      if (!activeJob) throw new Error("Create or upload an import batch before confirming.");
      return confirmImportJob(token ?? "", activeJob.id, { acknowledge_warnings: true, reason });
    },
    onSuccess: (result) => {
      setActiveJob(result.job);
      setStep(10);
      pushToast({ title: "Import processed", description: result.message, tone: result.skipped_rows ? "warning" : "success" });
      void queryClient.invalidateQueries({ queryKey: ["imports-migration-history", token, projectId] });
    },
    onError: (error) => pushToast({ title: "Import not processed", description: error instanceof Error ? error.message : "Review validation results and try again.", tone: "danger" }),
  });

  const rollbackMutation = useMutation({
    mutationFn: (jobId: string) => rollbackImportJob(token ?? "", jobId, { confirm: true, reason }),
    onSuccess: (result) => {
      pushToast({ title: "Rollback recorded", description: result.message, tone: "warning" });
      void queryClient.invalidateQueries({ queryKey: ["imports-migration-history", token, projectId] });
    },
  });

  const errorReportMutation = useMutation({
    mutationFn: (jobId: string) => getImportErrorReport(token ?? "", jobId),
    onSuccess: (result) => {
      setErrorReportSummary(`${result.file_name}: ${result.errors.length} errors and ${result.warnings.length} warnings.`);
      pushToast({ title: "Error report ready", description: "The row-level report is ready to download when export storage is connected.", tone: "neutral" });
    },
  });

  const metrics = useMemo(() => {
    const batches = history.length;
    const rows = history.reduce((total, item) => total + item.total_rows, 0);
    const successful = history.reduce((total, item) => total + (item.successful_records ?? item.valid_rows), 0);
    const issues = history.reduce((total, item) => total + item.error_rows + item.duplicate_rows, 0);
    return { batches, issues, rows, successful };
  }, [history]);

  const historyColumns: TableColumn<ImportJobRead>[] = [
    {
      header: "Batch",
      key: "batch",
      render: (row) => (
        <div>
          <p className="font-medium">{row.source_name}</p>
          <p className="text-xs text-muted-foreground">{row.id}</p>
        </div>
      ),
      value: (row) => row.source_name,
    },
    { header: "Type", key: "type", render: (row) => prettyType(row.dataset_type), value: (row) => row.dataset_type },
    { header: "Source", key: "source", render: (row) => row.source_system ?? row.source_format, value: (row) => row.source_system ?? row.source_format },
    { header: "Rows", key: "rows", render: (row) => formatCount(row.total_rows), value: (row) => String(row.total_rows) },
    {
      header: "Status",
      key: "status",
      render: (row) => <Badge tone={statusTone(row.status)}>{row.status.replaceAll("_", " ")}</Badge>,
      value: (row) => row.status,
    },
    {
      header: "Actions",
      key: "actions",
      render: (row) => (
        <div className="flex flex-wrap gap-1.5">
          <Button onClick={() => setActiveJob(row)} size="sm" type="button" variant="secondary">Open</Button>
          <Button disabled={preview || errorReportMutation.isPending} onClick={() => errorReportMutation.mutate(row.id)} size="sm" type="button" variant="secondary">
            <Download aria-hidden="true" />
            Report
          </Button>
          <Button disabled={preview || !row.rollback_available || rollbackMutation.isPending} onClick={() => rollbackMutation.mutate(row.id)} size="sm" type="button" variant="secondary">
            <RotateCcw aria-hidden="true" />
            Rollback
          </Button>
        </div>
      ),
    },
  ];

  const issueRows = [...(validation?.issues ?? []), ...analysis.gps_warnings];
  const mappingRows = analysis.suggested_mapping.length ? analysis.suggested_mapping : validation?.suggested_mapping ?? emptyValidation.suggested_mapping;

  return (
    <section className="space-y-4" aria-labelledby="imports-migration-title">
      <div className="rounded-2xl border border-border-subtle bg-surface-container-lowest p-4 shadow-card">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="platform">{mode === "project" ? "PROJECT DATA IMPORT" : "ADMINISTRATION"}</Badge>
              <Badge tone="success">Mobile-ready</Badge>
              <Badge tone={preview ? "warning" : "success"}>{preview ? "Preview mode" : "Backend enabled"}</Badge>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <h1 id="imports-migration-title" className="text-xl font-semibold tracking-tight">Imports & Migration</h1>
              <HelpHint label="About imports and migration" title="Project continuity import system">
                Upload existing data, match columns, validate issues, review duplicates, preview records, confirm the import, and continue collecting new project data without losing history.
              </HelpHint>
            </div>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Move historical M&E work from KoboToolbox, ODK, SurveyCTO, Excel, DHIS2, CommCare, Google Forms, and custom databases into Atlas FieldOps.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setStep(0)} type="button" variant="secondary"><RefreshCw aria-hidden="true" />Save draft</Button>
            <Button onClick={() => setStep(step < 1 ? 1 : step)} type="button" variant="primary"><Sparkles aria-hidden="true" />Start assistant</Button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Metric icon={Database} label="Import batches" value={formatCount(metrics.batches)} />
        <Metric icon={FileSpreadsheet} label="Rows staged" value={formatCount(metrics.rows)} />
        <Metric icon={CheckCircle2} label="Successful records" value={formatCount(metrics.successful)} />
        <Metric icon={AlertTriangle} label="Issues to review" value={formatCount(metrics.issues)} tone="warning" />
      </div>

      <div className="rounded-2xl border border-border-subtle bg-surface-container-lowest p-3 shadow-card">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {steps.map((label, index) => (
            <button
              className={cn(
                "flex min-w-fit items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition",
                index === step ? "border-primary/45 bg-primary/10 text-primary" : "bg-background text-muted-foreground hover:bg-muted/50",
                index < step && "border-success/35 bg-success/10 text-success",
              )}
              key={label}
              onClick={() => setStep(index)}
              type="button"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full border text-[11px]">{index + 1}</span>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.8fr)]">
        <div className="space-y-4">
          <WizardPanel title={steps[step]} description="Complete this step, then continue to the next part of the import review.">
            {step === 0 ? (
              <div className="grid gap-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-1.5 text-sm font-medium">
                    What are you importing?
                    <Select onChange={(event) => setSelectedType(event.target.value)} value={selectedType}>
                      {importTypes.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                    </Select>
                  </label>
                  <label className="grid gap-1.5 text-sm font-medium">
                    Source
                    <Select
                      onChange={(event) => {
                        setSource(event.target.value);
                        setSourceSystem(sources.find((item) => item.id === event.target.value)?.label ?? "Uploaded File");
                      }}
                      value={source}
                    >
                      {sources.map((item) => <option key={item.id} value={item.id}>{item.label} - {item.phase}</option>)}
                    </Select>
                  </label>
                </div>
                <label className="grid gap-1.5 text-sm font-medium">
                  Upload your existing data
                  <Input accept=".csv,.xlsx,.xls,.json,.geojson,.kml,.zip" onChange={(event) => setFile(event.target.files?.[0] ?? null)} type="file" />
                </label>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-1.5 text-sm font-medium">Source system<Input onChange={(event) => setSourceSystem(event.target.value)} value={sourceSystem} /></label>
                  <label className="grid gap-1.5 text-sm font-medium">Target<Select onChange={(event) => setTargetMode(event.target.value)} value={targetMode}><option value="new_project">Create New Project</option><option value="existing_project">Import Into Existing Project</option><option value="new_form">Create New Form</option><option value="existing_form">Link to Existing Form</option><option value="existing_entity_type">Link to Existing Entity Type</option></Select></label>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-1.5 text-sm font-medium">
                    Target project
                    {projectId ? (
                      <Input disabled value={targetProjectId} />
                    ) : projectOptions.length ? (
                      <Select onChange={(event) => setTargetProjectId(event.target.value)} value={targetProjectId}>
                        <option value="">Select a project</option>
                        {projectOptions.map((project) => (
                          <option key={project.id} value={project.id}>{project.name}</option>
                        ))}
                      </Select>
                    ) : (
                      <Input onChange={(event) => setTargetProjectId(event.target.value)} placeholder={projectRequiredForImport ? "Required project UUID" : "Optional project UUID"} value={targetProjectId} />
                    )}
                    {projectRequiredForImport && !targetProjectId ? (
                      <span className="text-xs text-danger">Required for beneficiary, form, and submission imports.</span>
                    ) : null}
                  </label>
                  <label className="grid gap-1.5 text-sm font-medium">Import reason<Input onChange={(event) => setReason(event.target.value)} value={reason} /></label>
                </div>
                <div className="rounded-xl border bg-success/10 p-3 text-sm text-success">Imported records will keep source IDs, batch IDs, entity links, and project links for future mobile sync.</div>
                <Button
                  disabled={uploadMutation.isPending || (!preview && projectRequiredForImport && !targetProjectId)}
                  onClick={() => {
                    if (file && !preview) {
                      uploadMutation.mutate();
                      return;
                    }
                    setUploadedColumns(preview ? defaultColumns : []);
                    setUploadedRows(preview ? sampleRows : []);
                    setAnalysis(preview ? previewSmartAnalysis : emptyAnalysis);
                    setValidation(preview ? previewValidation : emptyValidation);
                    setStep(1);
                  }}
                  type="button"
                  variant="primary"
                >
                  <UploadCloud aria-hidden="true" />
                  {file && !preview ? (uploadMutation.isPending ? "Parsing file" : "Upload and parse") : "Use sample migration data"}
                </Button>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="space-y-3">
                <div className="rounded-xl border bg-primary/10 p-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-primary"><Sparkles aria-hidden="true" size={16} />Analyze before import</div>
                  <p className="mt-1 text-sm text-muted-foreground">Atlas will check duplicate beneficiaries, missing IDs, field mappings, location names, date formats, GPS quality, entity links, and indicator links before any record is imported.</p>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <Metric icon={FileSpreadsheet} label="Rows sampled" value={formatCount(uploadedRows.length)} />
                  <Metric icon={Database} label="Columns found" value={formatCount(uploadedColumns.length)} />
                  <Metric icon={ShieldCheck} label="Safe overwrite policy" value="Manual" />
                </div>
                <Button disabled={preview ? false : analyzeMutation.isPending} onClick={() => preview ? (setAnalysis(previewSmartAnalysis), setStep(2)) : analyzeMutation.mutate()} type="button" variant="primary">
                  <Gauge aria-hidden="true" />
                  {analyzeMutation.isPending ? "Analyzing data" : "Analyze data"}
                </Button>
                {analyzeMutation.isPending ? <ProgressLine label="Import analysis running" value={45} /> : null}
              </div>
            ) : null}

            {step === 2 ? <ReadinessPanel analysis={analysis} /> : null}
            {step === 3 ? <MappingTable legacyFields={analysis.legacy_fields} rows={mappingRows} /> : null}
            {step === 4 ? <MatchingPanel emptyLabel="No location mismatches found." icon={MapPin} matches={analysis.location_matches} title="Location matches" /> : null}
            {step === 5 ? <EntityMatchingPanel analysis={analysis} /> : null}
            {step === 6 ? <DuplicateReview groups={analysis.duplicate_groups} /> : null}
            {step === 7 ? <ValidationPanel dateFormats={analysis.date_formats} issues={issueRows} validation={validation ?? emptyValidation} onValidate={() => preview ? setValidation(previewValidation) : previewMutation.mutate()} loading={previewMutation.isPending} /> : null}
            {step === 8 ? <ImportPreview analysis={analysis} selectedType={selectedImportType.label} validation={validation ?? emptyValidation} /> : null}
            {step === 9 ? (
              <div className="grid gap-3">
                <Textarea onChange={(event) => setReason(event.target.value)} rows={4} value={reason} />
                <div className="rounded-xl border bg-warning/10 p-3 text-sm text-warning">Warnings can be imported with confirmation. Errors block live import until fixed.</div>
                <ImportPreview analysis={analysis} selectedType={selectedImportType.label} validation={validation ?? emptyValidation} compact />
                <Button disabled={preview ? false : !activeJob || confirmMutation.isPending} onClick={() => preview ? setStep(10) : confirmMutation.mutate()} type="button" variant="primary">
                  <ShieldCheck aria-hidden="true" />
                  Confirm import with reason
                </Button>
              </div>
            ) : null}
            {step === 10 ? <ResultsPanel activeJob={activeJob} preview={preview} /> : null}
            {step === 11 ? <QualityReportPanel report={analysis.quality_report} /> : null}
          </WizardPanel>

          <div className="flex justify-between">
            <Button disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))} type="button" variant="secondary">Back</Button>
            <Button disabled={step === steps.length - 1} onClick={() => setStep((value) => Math.min(steps.length - 1, value + 1))} type="button" variant="primary">Next<ArrowRight aria-hidden="true" /></Button>
          </div>
        </div>

        <aside className="space-y-4">
          <WizardPanel title="Current import" description="Review the selected import type, source, target, and mobile-ready outputs.">
            <div className="space-y-3 text-sm">
              <InfoRow label="Type" value={selectedImportType.label} />
              <InfoRow label="Source" value={selectedSource?.label ?? "Upload File"} />
              <InfoRow label="Target" value={targetMode.replaceAll("_", " ")} />
              <InfoRow label="Project" value={targetProjectId || "Not selected"} />
              <InfoRow label="File" value={file?.name ?? "Sample data"} />
            </div>
          </WizardPanel>
          <WizardPanel title="Mobile-ready continuity" description="Imported data will be available for future offline-first mobile sync.">
            <div className="flex flex-wrap gap-2">
              {mobileOutputs.map((item) => <Badge key={item} tone="neutral">{item}</Badge>)}
            </div>
          </WizardPanel>
          <WizardPanel title="Connectors" description="Direct connectors are architecture-ready placeholders for Phase 2.">
            <div className="space-y-2">
              {sources.filter((item) => item.id !== "upload_file").map((item) => (
                <div className="rounded-xl border bg-background p-3" key={item.id}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{item.label}</p>
                    <Badge tone="neutral">{item.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{item.supported_formats.join(", ")}</p>
                </div>
              ))}
            </div>
          </WizardPanel>
        </aside>
      </div>

      {errorReportSummary ? <div className="rounded-xl border bg-muted/30 p-3 text-sm">{errorReportSummary}</div> : null}

      <DataTable columns={historyColumns} emptyLabel="No import batches yet" rows={history} searchLabel="Search import history" title="Import history" />
    </section>
  );
}

function Metric({ icon: Icon, label, tone = "neutral", value }: { icon: LucideIcon; label: string; tone?: "neutral" | "warning"; value: string }) {
  return (
    <section className="rounded-2xl border border-border-subtle bg-surface-container-lowest p-3 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-xl font-semibold">{value}</p>
        </div>
        <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl border", tone === "warning" ? "bg-warning/10 text-warning" : "bg-primary/10 text-primary")}>
          <Icon aria-hidden="true" size={18} />
        </span>
      </div>
    </section>
  );
}

function WizardPanel({ children, description, title }: { children: ReactNode; description: string; title: string }) {
  return (
    <section className="rounded-2xl border border-border-subtle bg-surface-container-lowest p-4 shadow-card">
      <div className="mb-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function ProgressLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-background p-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{value}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function ReadinessPanel({ analysis }: { analysis: ImportAnalysisResponse }) {
  const tone = analysis.readiness.score >= 90 ? "success" : analysis.readiness.score >= 70 ? "warning" : "danger";
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
        <div className="rounded-xl border bg-background p-4 text-center">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Readiness Score</p>
          <p className="mt-2 text-4xl font-semibold">{analysis.readiness.score}%</p>
          <Badge tone={tone}>{analysis.readiness.category}</Badge>
        </div>
        <div className="rounded-xl border bg-background p-4">
          <p className="text-sm font-medium">Recommended action</p>
          <p className="mt-1 text-sm text-muted-foreground">{analysis.readiness.recommended_action}</p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {analysis.readiness.issues.map((issue) => (
              <div className="rounded-lg border bg-muted/30 p-2 text-sm" key={issue}>{issue}</div>
            ))}
          </div>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {Object.entries(analysis.readiness.factors).slice(0, 6).map(([key, value]) => (
          <div className="rounded-xl border bg-background p-3" key={key}>
            <p className="text-xs text-muted-foreground">{key.replaceAll("_", " ")}</p>
            <p className="mt-1 text-lg font-semibold">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MappingTable({ legacyFields, rows }: { legacyFields: string[]; rows: ImportPreviewResponse["suggested_mapping"] }) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-primary/10 p-3 text-sm text-primary">
        Match each column in your old file to the field Atlas should use. If a question does not exist yet, keep it as a legacy field so historical data is preserved.
      </div>
      <div className="overflow-hidden rounded-xl border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr><th className="p-2">Your file column</th><th className="p-2">Atlas field</th><th className="p-2">Required</th><th className="p-2">Suggested action</th><th className="p-2">Cleaning</th></tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => (
              <tr key={`${row.source_column}-${row.target_field}`}>
                <td className="p-2 font-mono text-xs">{row.source_column}</td>
                <td className="p-2">{row.target_field}</td>
                <td className="p-2"><Badge tone={row.required ? "warning" : "neutral"}>{row.required ? "Required" : "Optional"}</Badge></td>
                <td className="p-2">
                  <Select defaultValue={legacyFields.includes(row.source_column) ? "legacy" : "accept"}>
                    <option value="accept">Accept</option>
                    <option value="change">Change target</option>
                    <option value="legacy">Keep as legacy field</option>
                    <option value="ignore">Ignore field</option>
                  </Select>
                </td>
                <td className="p-2 text-muted-foreground">{row.transform ?? "No transform"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {legacyFields.length ? <div className="rounded-xl border bg-muted/30 p-3 text-sm">Legacy fields preserved: {legacyFields.join(", ")}</div> : null}
    </div>
  );
}

function MatchingPanel({
  emptyLabel,
  icon: Icon,
  matches,
  title,
}: {
  emptyLabel: string;
  icon: LucideIcon;
  matches: ImportAnalysisResponse["location_matches"];
  title: string;
}) {
  if (!matches.length) {
    return <div className="rounded-xl border bg-success/10 p-3 text-sm text-success">{emptyLabel}</div>;
  }
  return (
    <div className="space-y-3">
      {matches.map((match) => (
        <div className="rounded-xl border bg-background p-3" key={`${match.match_type}-${match.source_value}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Icon aria-hidden="true" className="text-primary" size={16} />
              <p className="text-sm font-medium">{title}</p>
            </div>
            <Badge tone={match.confidence >= 90 ? "success" : match.confidence >= 70 ? "warning" : "danger"}>{match.confidence}% confidence</Badge>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border bg-muted/30 p-2"><p className="text-xs text-muted-foreground">Source value</p><p className="font-medium">{match.source_value}</p></div>
            <div className="rounded-lg border bg-muted/30 p-2"><p className="text-xs text-muted-foreground">Suggested Atlas match</p><p className="font-medium">{match.suggested_value}</p></div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Rows: {match.row_numbers.join(", ")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {match.actions.map((action) => <Button key={action} size="sm" type="button" variant="secondary">{action}</Button>)}
          </div>
        </div>
      ))}
    </div>
  );
}

function EntityMatchingPanel({ analysis }: { analysis: ImportAnalysisResponse }) {
  return (
    <div className="space-y-3">
      <MatchingPanel emptyLabel="All historical records already have beneficiary links." icon={Users} matches={analysis.entity_matches} title="Entity / beneficiary match" />
      {analysis.generated_ids.length ? (
        <div className="rounded-xl border bg-background p-3">
          <p className="text-sm font-medium">Missing IDs will be generated</p>
          <p className="mt-1 text-xs text-muted-foreground">Atlas will create platform IDs and keep legacy IDs nullable for traceability.</p>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {analysis.generated_ids.slice(0, 6).map((item) => (
              <div className="rounded-lg border bg-muted/30 p-2 text-sm" key={`${item.row_number}-${item.generated_id}`}>
                <p className="text-xs text-muted-foreground">Row {item.row_number}</p>
                <p className="font-mono font-medium">{item.generated_id}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <MatchingPanel emptyLabel="No indicator mismatches found." icon={Link2} matches={analysis.indicator_matches} title="Indicator match" />
    </div>
  );
}

function ValidationPanel({ dateFormats, issues, loading, onValidate, validation }: { dateFormats: ImportAnalysisResponse["date_formats"]; issues: ImportPreviewResponse["issues"]; loading: boolean; onValidate: () => void; validation: ImportPreviewResponse }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-3">
        <Metric icon={CheckCircle2} label="Valid rows" value={formatCount(validation.valid_rows)} />
        <Metric icon={AlertTriangle} label="Blocking errors" tone="warning" value={formatCount(validation.error_rows)} />
        <Metric icon={Link2} label="Duplicate signals" tone="warning" value={formatCount(validation.duplicate_rows)} />
      </div>
      <Button disabled={loading} onClick={onValidate} type="button" variant="secondary"><RefreshCw aria-hidden="true" />Run validation</Button>
      {dateFormats.length ? (
        <div className="grid gap-2 md:grid-cols-2">
          {dateFormats.map((format) => (
            <div className="rounded-xl border bg-background p-3" key={format.field_name}>
              <p className="text-sm font-medium">{format.field_name}</p>
              <p className="mt-1 text-xs text-muted-foreground">Detected date format: {format.detected_format}</p>
              <p className="mt-1 text-xs text-success">Normalized preview: {format.normalized_preview.join(", ") || "Ready"}</p>
              {format.invalid_rows.length ? <p className="mt-1 text-xs text-danger">Invalid rows: {format.invalid_rows.join(", ")}</p> : null}
            </div>
          ))}
        </div>
      ) : null}
      <div className="space-y-2">
        {issues.map((issue) => (
          <div className="rounded-xl border bg-background p-3" key={`${issue.row_number}-${issue.issue_type}-${issue.field_name}`}>
            <div className="flex flex-wrap items-center gap-2"><Badge tone={issue.severity === "error" ? "danger" : "warning"}>{issue.severity}</Badge><span className="text-sm font-medium">Row {issue.row_number}: {issue.issue_type.replaceAll("_", " ")}</span></div>
            <p className="mt-1 text-sm text-muted-foreground">{issue.message}</p>
            {issue.suggested_fix ? <p className="mt-1 text-xs text-success">{issue.suggested_fix}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function DuplicateReview({ groups }: { groups: ImportAnalysisResponse["duplicate_groups"] }) {
  if (!groups.length) {
    return <div className="rounded-xl border bg-success/10 p-3 text-sm text-success">No duplicate beneficiary groups were detected in the analyzed rows.</div>;
  }
  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-warning/10 p-3 text-sm text-warning">
        Possible duplicates are reviewed before import. Use existing records, update existing records, skip rows, or flag them for Data Quality.
      </div>
      {groups.map((group) => (
        <div className="rounded-xl border bg-background p-3" key={group.group_id}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><p className="font-medium">Possible duplicate group</p><p className="text-xs text-muted-foreground">{group.reason}</p></div>
            <Badge tone={group.confidence >= 90 ? "danger" : "warning"}>{group.confidence}% confidence</Badge>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {group.records.map((record) => (
              <div className="rounded-lg border bg-muted/30 p-2 text-sm" key={`${group.group_id}-${record.row_number}`}>
                <p className="font-medium">Row {record.row_number}: {record.display_name}</p>
                <p className="text-xs text-muted-foreground">{record.phone_number ?? "No phone"} · {record.location ?? "No location"}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{group.recommended_action}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {group.actions.map((action) => <Button key={action} size="sm" type="button" variant="secondary">{action}</Button>)}
          </div>
        </div>
      ))}
    </div>
  );
}

function ImportPreview({ analysis, compact = false, selectedType, validation }: { analysis: ImportAnalysisResponse; compact?: boolean; selectedType: string; validation: ImportPreviewResponse }) {
  const counts = analysis.preview_counts;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="rounded-xl border bg-background p-3">
        <p className="text-sm font-medium">Records to create</p>
        <p className="mt-1 text-2xl font-semibold">{formatCount(counts.create ?? validation.valid_rows)}</p>
        <p className="text-xs text-muted-foreground">{selectedType} records ready for import.</p>
      </div>
      <div className="rounded-xl border bg-background p-3">
        <p className="text-sm font-medium">Records to update</p>
        <p className="mt-1 text-2xl font-semibold">{formatCount(counts.update ?? 0)}</p>
        <p className="text-xs text-muted-foreground">Updates require before/after review before processing.</p>
      </div>
      <div className="rounded-xl border bg-background p-3">
        <p className="text-sm font-medium">Records to skip or review</p>
        <p className="mt-1 text-2xl font-semibold">{formatCount(counts.skip ?? validation.error_rows + validation.duplicate_rows)}</p>
        <p className="text-xs text-muted-foreground">Issues remain auditable and exportable.</p>
      </div>
      <div className="rounded-xl border bg-background p-3">
        <p className="text-sm font-medium">Warnings / errors</p>
        <p className="mt-1 text-2xl font-semibold">{formatCount((counts.warnings ?? 0) + (counts.errors ?? 0))}</p>
        <p className="text-xs text-muted-foreground">Warnings can continue with reason. Errors block live import.</p>
      </div>
      {!compact ? <div className="rounded-xl border bg-warning/10 p-3 text-sm text-warning md:col-span-2">Atlas will never overwrite automatically. Updates require confirmation, reason, source traceability, and audit logging.</div> : null}
    </div>
  );
}

function ResultsPanel({ activeJob, preview }: { activeJob: ImportJobRead | null; preview: boolean }) {
  const successful = activeJob?.successful_records ?? activeJob?.valid_rows ?? 18;
  const skipped = activeJob?.skipped_records ?? activeJob?.duplicate_rows ?? 2;
  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-success/10 p-3 text-success">You can now continue this project in the platform.</div>
      <div className="grid gap-2 md:grid-cols-2">
        {["Review imported beneficiaries", "Review imported forms", "Publish imported forms", "Assign field officers", "Continue data collection", "View imported submissions", "Configure indicators", "Build dashboard"].map((action) => (
          <div className="flex items-center gap-2 rounded-xl border bg-background p-2 text-sm" key={action}><CheckCircle2 aria-hidden="true" className="text-success" size={15} />{action}</div>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Metric icon={Smartphone} label="Mobile sync ready records" value={preview ? "Sample" : formatCount(successful)} />
        <Metric icon={History} label="Skipped / review records" tone="warning" value={formatCount(skipped)} />
      </div>
    </div>
  );
}

function QualityReportPanel({ report }: { report: ImportAnalysisResponse["quality_report"] }) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-success/10 p-3 text-success">Post-import quality report is ready for audit and reconciliation.</div>
      <div className="grid gap-3 md:grid-cols-4">
        <Metric icon={CheckCircle2} label="Created" value={formatCount(report.records_created)} />
        <Metric icon={RefreshCw} label="Updated" value={formatCount(report.records_updated)} />
        <Metric icon={History} label="Skipped" tone="warning" value={formatCount(report.records_skipped)} />
        <Metric icon={Gauge} label="Quality score" value={`${report.data_quality_score}%`} />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border bg-background p-3"><p className="text-xs text-muted-foreground">Duplicate candidates</p><p className="mt-1 text-xl font-semibold">{report.duplicate_candidates}</p></div>
        <div className="rounded-xl border bg-background p-3"><p className="text-xs text-muted-foreground">Location issues</p><p className="mt-1 text-xl font-semibold">{report.location_issues}</p></div>
        <div className="rounded-xl border bg-background p-3"><p className="text-xs text-muted-foreground">Unlinked submissions</p><p className="mt-1 text-xl font-semibold">{report.unlinked_submissions}</p></div>
      </div>
      <div className="rounded-xl border bg-background p-3">
        <p className="text-sm font-medium">Recommendations</p>
        <div className="mt-2 grid gap-2">
          {report.recommendations.map((item) => <div className="rounded-lg border bg-muted/30 p-2 text-sm" key={item}>{item}</div>)}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary"><Download aria-hidden="true" />Download Excel later</Button>
        <Button type="button" variant="secondary"><Download aria-hidden="true" />Download PDF later</Button>
      </div>
    </div>
  );
}
