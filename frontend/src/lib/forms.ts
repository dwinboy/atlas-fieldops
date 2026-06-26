export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "decimal"
  | "currency"
  | "phone"
  | "email"
  | "url"
  | "password"
  | "select"
  | "dropdown"
  | "multiselect"
  | "radio"
  | "checkbox"
  | "ranking"
  | "likert"
  | "matrix_single"
  | "matrix_multi"
  | "nps"
  | "rating"
  | "gps"
  | "geolocation"
  | "map"
  | "geofence"
  | "polygon"
  | "photo"
  | "image"
  | "signature"
  | "barcode"
  | "qr"
  | "audio"
  | "video"
  | "file"
  | "date"
  | "time"
  | "datetime"
  | "hidden"
  | "calculated"
  | "repeat_group"
  | "grid"
  | "lookup";

export type LogicRule = {
  id: string;
  kind:
    | "visibility"
    | "required"
    | "calculation"
    | "validation"
    | "default"
    | "show"
    | "hide"
    | "enable"
    | "disable"
    | "skip"
    | "dynamic_choices";
  expression: string;
  message?: string;
  targetId?: string;
  operator?: "and" | "or";
};

export type FormField = {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  hint?: string;
  pageId?: string;
  sectionId: string;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    accuracyMax?: number;
    expression?: string;
    minDate?: string;
    maxDate?: string;
    blockFutureDates?: boolean;
    blockPastDates?: boolean;
    integerOnly?: boolean;
    uniqueResponse?: boolean;
    duplicateCheck?: boolean;
    allowDontKnow?: boolean;
    allowRefused?: boolean;
    customMessage?: string;
    allowedFileTypes?: string;
    maxFileSizeMb?: number;
    maxAttachmentCount?: number;
  };
  logic?: LogicRule[];
  appearance?: {
    width?: "full" | "half" | "third";
    helpText?: string;
    placeholder?: string;
  };
  calculation?: {
    expression: string;
    preview?: string;
  };
  matrix?: {
    rows: string[];
    columns: string[];
    scoring?: Record<string, number>;
  };
  repeat?: {
    min?: number;
    max?: number;
    allowNested?: boolean;
    /** Variable name of a number question whose answer sets how many rows to create
     * automatically (e.g. "how many farms?" → that many farm-mapping rows). */
    countFromVariable?: string;
  };
  /** Config for a `lookup` question: which on-device dataset the field officer searches. */
  lookup?: {
    source: "entities" | "categories" | "reference";
  };
  beneficiary?: {
    profileField?: string;
    profileImpact?: "no_impact" | "creates_profile" | "updates_profile";
  };
  media?: {
    compression?: "standard" | "high";
    metadata?: boolean;
  };
  gps?: {
    latitude?: boolean;
    longitude?: boolean;
    altitude?: boolean;
    accuracy?: boolean;
    timestamp?: boolean;
    geofenceRadius?: number;
  };
  polygon?: {
    minVertices?: number;
    maxVertices?: number;
    requireClosed?: boolean;
    overlapCheck?: boolean;
    overlapScope?: "form" | "project" | "organization";
  };
  variableName?: string;
  children?: FormField[];
};

export type FormPage = {
  id: string;
  title: string;
  description?: string;
};

export type FormSection = {
  id: string;
  title: string;
  description?: string;
  pageId?: string;
};

export type FormVersionHistory = {
  version: number;
  status: "draft" | "published" | "archived";
  createdAt: string;
  summary: string;
};

export type DynamicForm = {
  id: string;
  name: string;
  status: "draft" | "published" | "archived";
  version: number;
  activeVersion: number;
  mobileDeployment?: MobileDeployment;
  pages?: FormPage[];
  sections: FormSection[];
  fields: FormField[];
  history?: FormVersionHistory[];
  updatedAt: string;
};

export type MobileDeployment = {
  assignedAudience: string;
  channel: "survey_app" | "web_link" | "kiosk";
  deployedAt: string;
  instructions: string;
  status: "deployed";
  syncMode: "offline_first" | "online_required";
};

export type XlsFormSurveyRow = {
  type: string;
  name: string;
  label: string;
  hint?: string;
  required?: "yes" | "no";
  constraint?: string;
  relevant?: string;
  calculation?: string;
};

export type XlsFormChoiceRow = {
  list_name: string;
  name: string;
  label: string;
};

export type XlsFormWorkbook = {
  survey: XlsFormSurveyRow[];
  choices: XlsFormChoiceRow[];
  settings: {
    form_title: string;
    form_id: string;
    version: string;
    default_language: string;
  };
};

type ExportedSchemaField = {
  id: string;
  type: FieldType;
  label: string;
  hint?: string;
  required: boolean;
  page_id?: string;
  section_id: string;
  variable_name: string;
  options: Array<{ label: string; value: string }>;
  validation: FormField["validation"] | Record<string, never>;
  logic: LogicRule[];
  appearance: FormField["appearance"] | Record<string, never>;
  calculation?: string;
  matrix?: FormField["matrix"];
  repeat?: FormField["repeat"];
  lookup?: FormField["lookup"];
  media?: FormField["media"];
  gps?: FormField["gps"];
  children: ExportedSchemaField[];
};

export type FormReadinessFlags = {
  hasProject: boolean;
  hasSurvey: boolean;
  controlsConfigured: boolean;
  workflowConfigured: boolean;
  qualityChecksConfigured: boolean;
  mobilePreviewChecked: boolean;
  pilotTestCompleted: boolean;
  deploymentAudienceSelected: boolean;
};

export type FormReadinessItem = {
  id: string;
  label: string;
  description: string;
  complete: boolean;
  required: boolean;
};

export const fieldCatalog: {
  group: string;
  fields: { type: FieldType; label: string; description: string }[];
}[] = [
  {
    group: "Basic",
    fields: [
      { type: "text", label: "Short text", description: "Names, IDs, short answers" },
      { type: "textarea", label: "Long text", description: "Narrative notes and observations" },
      { type: "number", label: "Number", description: "Integer values and counts" },
      { type: "email", label: "Email", description: "Validated email capture" },
      { type: "phone", label: "Phone", description: "Validated phone capture" },
      { type: "url", label: "URL", description: "Website or document link" },
      { type: "date", label: "Date", description: "Calendar date capture" },
      { type: "time", label: "Time", description: "Time of day capture" },
      { type: "datetime", label: "Datetime", description: "Date and time together" }
    ]
  },
  {
    group: "Choice questions",
    fields: [
      { type: "radio", label: "Radio group", description: "Visible single choice" },
      { type: "checkbox", label: "Checkboxes", description: "Visible multi choice" },
      { type: "dropdown", label: "Dropdown", description: "Compact single choice" },
      { type: "multiselect", label: "Multi-select", description: "Multiple choice list" },
      { type: "ranking", label: "Ranking", description: "Rank options by priority" },
      { type: "lookup", label: "Search & pick", description: "Search records, categories, or reference data" }
    ]
  },
  {
    group: "Survey questions",
    fields: [
      { type: "likert", label: "Likert scale", description: "Agreement and perception scales" },
      { type: "matrix_single", label: "Matrix single", description: "Spreadsheet-style single choice" },
      { type: "matrix_multi", label: "Matrix multi", description: "Spreadsheet-style multi choice" },
      { type: "nps", label: "NPS", description: "0 to 10 recommendation score" },
      { type: "rating", label: "Rating", description: "Stars, scores, and satisfaction" },
      { type: "grid", label: "Grid", description: "Structured table input" }
    ]
  },
  {
    group: "Advanced",
    fields: [
      { type: "signature", label: "Signature", description: "Consent and acknowledgement" },
      { type: "barcode", label: "Barcode", description: "Scan IDs and inventory" },
      { type: "qr", label: "QR scanner", description: "Scan digital codes" },
      { type: "hidden", label: "Hidden field", description: "Store system values" },
      { type: "calculated", label: "Calculated", description: "Formula and scoring field" },
      { type: "repeat_group", label: "Repeat group", description: "Crops, members, assets" }
    ]
  },
  {
    group: "Media",
    fields: [
      { type: "image", label: "Image capture", description: "Camera or gallery image" },
      { type: "photo", label: "Photo evidence", description: "Offline media queue" },
      { type: "video", label: "Video capture", description: "Record or upload video" },
      { type: "audio", label: "Audio capture", description: "Voice notes and interviews" },
      { type: "file", label: "File upload", description: "Attach supporting documents" }
    ]
  },
  {
    group: "Location",
    fields: [
      { type: "gps", label: "GPS coordinates", description: "Automatic coordinate capture" },
      { type: "geolocation", label: "Geolocation", description: "Lat, long, accuracy, timestamp" },
      { type: "map", label: "Map selection", description: "Pick a point from a map" },
      { type: "geofence", label: "Geofence", description: "Validate collection area" },
      { type: "polygon", label: "Polygon / Boundary", description: "Draw a farm or project boundary on the map" }
    ]
  }
];

/**
 * Plain-language, sector-aware explanation of what each control does and when to
 * use it. Surfaced as a small "?" help popover on every control in the builder so
 * a manager never has to guess which question type to pick.
 */
export const fieldTypeHelp: Record<FieldType, string> = {
  text: "A single line for short answers like a name, ID number, or village. Use it when the answer is a few words.",
  textarea: "A larger box for long, free-text answers such as observations, narratives, or case notes.",
  number: "Whole numbers only — counts like household size, number of animals, or attendance. Use Decimal for fractions.",
  decimal: "Numbers with decimals — measurements like weight (kg), area (ha), or yield. Use Number for whole counts.",
  currency: "A money amount such as income, price, or grant value. Captures decimals and is tagged as currency for reports.",
  phone: "A phone number with format validation — useful for follow-up calls and SMS to beneficiaries or officers.",
  email: "An email address with format validation. Use for staff or partners; most field beneficiaries won't have one.",
  url: "A web or document link, e.g. a reference page or shared file.",
  password: "A masked secret value. Rarely needed in field forms — avoid collecting sensitive credentials.",
  select: "A single-choice question shown as a compact picker. Choose one option from a defined list.",
  dropdown: "Single choice from a compact dropdown — best when there are many options (e.g. district, crop type).",
  multiselect: "Multiple choice — the respondent can pick several options from a list (e.g. crops grown, services received).",
  radio: "Single choice shown as visible buttons — best for short lists like Yes/No or Male/Female where options should stay in view.",
  checkbox: "Multiple choice shown as visible boxes — pick all that apply, ideal for short multi-answer lists.",
  ranking: "Ask the respondent to order options by priority (e.g. rank top 3 needs). Exports as a ranked list.",
  likert: "An agreement or perception scale (e.g. Strongly disagree → Strongly agree). Common in satisfaction surveys.",
  matrix_single: "A grid where each row takes one choice across shared columns — efficient for rating several items the same way.",
  matrix_multi: "A grid where each row can take several choices across shared columns.",
  nps: "Net Promoter Score: a 0–10 'how likely to recommend' question used to gauge satisfaction.",
  rating: "A star or score rating (e.g. 1–5) for quick satisfaction or quality scoring.",
  gps: "Automatically captures the device's GPS coordinates — proves where collection happened. Core for field verification.",
  geolocation: "Captures latitude, longitude, accuracy, and timestamp together as location evidence.",
  map: "Lets the officer pick an exact point on a map — useful when GPS drift needs manual correction.",
  geofence: "Validates that collection happens inside an allowed area, flagging submissions taken out of zone.",
  polygon: "Draw an area on the map — a farm plot, project site, or boundary. Captures shape and size (hectares).",
  photo: "Capture a photo as evidence; works offline and syncs later. Use for site, asset, or document proof.",
  image: "Take or upload an image. Similar to Photo but without the offline evidence queue.",
  signature: "Capture a drawn signature — used for consent, receipt, or acknowledgement.",
  barcode: "Scan a 1D barcode to capture an ID — e.g. asset tags, ration cards, or stock items.",
  qr: "Scan a QR code to capture a value quickly — e.g. beneficiary cards or equipment codes.",
  audio: "Record or attach a voice note — useful for interviews or where typing is hard.",
  video: "Record or attach a short video as evidence.",
  file: "Attach a supporting document (PDF, image, spreadsheet) to the submission.",
  date: "Pick a calendar date — birth date, visit date, planting date. Add rules to block future or past dates.",
  time: "Capture a time of day, e.g. when an activity started.",
  datetime: "Capture a date and time together, e.g. an exact visit timestamp.",
  hidden: "A field the respondent never sees — stores a system value (like a code) carried into the submission.",
  calculated: "Auto-computes a value from other answers using a formula (e.g. a score or total). Read-only for the officer.",
  repeat_group: "Repeats a set of questions for each item — household members, crops, assets, or visits — as many times as needed.",
  grid: "A structured table for entering several values in rows and columns.",
  lookup: "Lets the field officer search a list — registered records, categories, or reference data — and pick a value, even offline.",
};

const choiceFieldTypes: FieldType[] = ["select", "dropdown", "multiselect", "radio", "checkbox", "ranking", "likert"];
const locationFieldTypes: FieldType[] = ["gps", "geolocation", "map", "geofence", "polygon"];
const mediaFieldTypes: FieldType[] = ["photo", "image", "signature", "audio", "video", "file"];

export function defaultPages(form: DynamicForm): FormPage[] {
  if (form.pages?.length) {
    return form.pages;
  }
  return [{ id: "page-1", title: "Page 1", description: "Primary survey page" }];
}

export function defaultPageId(form: DynamicForm): string {
  return defaultPages(form)[0]?.id ?? "page-1";
}

export function normalizeForm(form: DynamicForm): DynamicForm {
  const pages = defaultPages(form);
  const firstPageId = pages[0]?.id ?? "page-1";
  const sections = form.sections.length
    ? form.sections.map((section) => ({ ...section, pageId: section.pageId ?? firstPageId }))
    : [{ id: "main", title: "Main", pageId: firstPageId }];
  const firstSectionId = sections[0]?.id ?? "main";
  const fields = form.fields.map((field) => ({
    ...field,
    pageId: field.pageId ?? sections.find((section) => section.id === field.sectionId)?.pageId ?? firstPageId,
    sectionId: field.sectionId || firstSectionId,
    variableName: field.variableName ?? slugifyName(field.id)
  }));
  return { ...form, pages, sections, fields };
}

export function createPage(title = "New page"): FormPage {
  return {
    id: `page-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title,
    description: "Organize related questions into a focused survey step."
  };
}

export function createSection(pageId: string, title = "New section"): FormSection {
  return {
    id: `section-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title,
    description: "Group questions that belong together.",
    pageId
  };
}

export function createField(type: FieldType, sectionId: string, pageId?: string): FormField {
  const catalogField = fieldCatalog.flatMap((group) => group.fields).find((field) => field.type === type);
  const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  return {
    id,
    label: catalogField?.label ?? "Untitled field",
    type,
    required: false,
    pageId,
    sectionId,
    hint: catalogField?.description,
    options: choiceFieldTypes.includes(type) ? ["Yes", "No"] : undefined,
    validation: locationFieldTypes.includes(type) ? { accuracyMax: 25 } : undefined,
    appearance: { width: "full" },
    matrix: ["matrix_single", "matrix_multi", "grid"].includes(type)
      ? { rows: ["Row 1", "Row 2", "Row 3"], columns: ["Option 1", "Option 2", "Option 3"] }
      : undefined,
    repeat: type === "repeat_group" ? { min: 0, max: 10, allowNested: false } : undefined,
    lookup: type === "lookup" ? { source: "entities" as const } : undefined,
    media: mediaFieldTypes.includes(type) ? { compression: "standard", metadata: true } : undefined,
    gps: locationFieldTypes.includes(type) && type !== "polygon"
      ? { latitude: true, longitude: true, altitude: true, accuracy: true, timestamp: true, geofenceRadius: type === "geofence" ? 250 : undefined }
      : undefined,
    polygon: type === "polygon"
      ? { minVertices: 3, requireClosed: true, overlapCheck: true, overlapScope: "form" }
      : undefined,
    calculation: type === "calculated" ? { expression: "sum(${field_a}, ${field_b})", preview: "Waiting for source fields" } : undefined,
    variableName: slugifyName(id),
    logic:
      type === "calculated"
        ? [{ id: `${id}-logic`, kind: "calculation", expression: "sum(${field_a}, ${field_b})" }]
        : []
  };
}

export function addField(form: DynamicForm, field: FormField): DynamicForm {
  const normalized = normalizeForm(form);
  const section = normalized.sections.find((candidate) => candidate.id === field.sectionId) ?? normalized.sections[0];
  return {
    ...normalized,
    fields: [
      ...normalized.fields,
      {
        ...field,
        pageId: field.pageId ?? section?.pageId ?? defaultPageId(normalized),
        sectionId: field.sectionId || section?.id || "main",
        variableName: field.variableName ?? slugifyName(field.id)
      }
    ],
    updatedAt: new Date().toISOString()
  };
}

export function removeField(form: DynamicForm, fieldId: string): DynamicForm {
  return {
    ...form,
    fields: form.fields.filter((field) => field.id !== fieldId),
    updatedAt: new Date().toISOString()
  };
}

function uniqueCopiedVariableName(base: string, existingNames: Set<string>): string {
  const normalizedBase = base || "field";
  let candidate = `${normalizedBase}_copy`;
  let index = 2;
  while (existingNames.has(candidate)) {
    candidate = `${normalizedBase}_copy_${index}`;
    index += 1;
  }
  existingNames.add(candidate);
  return candidate;
}

function fieldVariableName(field: FormField): string {
  return slugifyName(field.variableName?.trim() || field.label || field.id);
}

function uniqueExportName(base: string, usedNames: Set<string>): string {
  const normalizedBase = slugifyName(base);
  let candidate = normalizedBase;
  let index = 2;
  while (usedNames.has(candidate)) {
    candidate = `${normalizedBase}_${index}`;
    index += 1;
  }
  usedNames.add(candidate);
  return candidate;
}

function exportedOptions(options: string[] | undefined): Array<{ label: string; value: string }> {
  const usedValues = new Set<string>();
  return (options ?? []).map((option) => ({
    label: option,
    value: uniqueExportName(option, usedValues),
  }));
}

export function duplicateField(form: DynamicForm, fieldId: string): DynamicForm {
  const field = form.fields.find((candidate) => candidate.id === fieldId);
  if (!field) {
    return form;
  }
  const existingNames = new Set(
    form.fields.map((candidate) => candidate.variableName ?? slugifyName(candidate.id)),
  );
  const sourceVariable = field.variableName ?? slugifyName(field.id);
  const copy = {
    ...field,
    id: `${field.type}-${Date.now()}`,
    label: `${field.label} copy`,
    variableName: uniqueCopiedVariableName(sourceVariable, existingNames)
  };
  const index = form.fields.findIndex((candidate) => candidate.id === fieldId);
  return {
    ...form,
    fields: [...form.fields.slice(0, index + 1), copy, ...form.fields.slice(index + 1)],
    updatedAt: new Date().toISOString()
  };
}

export function addPage(form: DynamicForm, page: FormPage): DynamicForm {
  const normalized = normalizeForm(form);
  const section = createSection(page.id, "General questions");
  return {
    ...normalized,
    pages: [...defaultPages(normalized), page],
    sections: [...normalized.sections, section],
    updatedAt: new Date().toISOString()
  };
}

export function duplicatePage(form: DynamicForm, pageId: string): DynamicForm {
  const normalized = normalizeForm(form);
  const page = defaultPages(normalized).find((candidate) => candidate.id === pageId);
  if (!page) return normalized;
  const nextPageId = `page-${Date.now()}`;
  const sectionIdMap = new Map<string, string>();
  const copiedSections = normalized.sections
    .filter((section) => section.pageId === pageId)
    .map((section) => {
      const nextSectionId = `${section.id}-copy-${Date.now()}`;
      sectionIdMap.set(section.id, nextSectionId);
      return { ...section, id: nextSectionId, pageId: nextPageId, title: `${section.title} copy` };
    });
  const existingNames = new Set(
    normalized.fields.map((candidate) => candidate.variableName ?? slugifyName(candidate.id)),
  );
  const copiedFields = normalized.fields
    .filter((field) => field.pageId === pageId)
    .map((field) => {
      return {
        ...field,
        id: `${field.id}-copy-${Date.now()}`,
        pageId: nextPageId,
        sectionId: sectionIdMap.get(field.sectionId) ?? field.sectionId,
        label: `${field.label} copy`,
        variableName: uniqueCopiedVariableName(field.variableName ?? slugifyName(field.id), existingNames)
      };
    });
  return {
    ...normalized,
    pages: [...defaultPages(normalized), { ...page, id: nextPageId, title: `${page.title} copy` }],
    sections: [...normalized.sections, ...copiedSections],
    fields: [...normalized.fields, ...copiedFields],
    updatedAt: new Date().toISOString()
  };
}

export function reorderPages(form: DynamicForm, activeId: string, overId: string): DynamicForm {
  const normalized = normalizeForm(form);
  const pages = defaultPages(normalized);
  const oldIndex = pages.findIndex((page) => page.id === activeId);
  const newIndex = pages.findIndex((page) => page.id === overId);
  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return normalized;
  const nextPages = [...pages];
  const [moved] = nextPages.splice(oldIndex, 1);
  if (!moved) return normalized;
  nextPages.splice(newIndex, 0, moved);
  return { ...normalized, pages: nextPages, updatedAt: new Date().toISOString() };
}

export function addSection(form: DynamicForm, section: FormSection): DynamicForm {
  const normalized = normalizeForm(form);
  return {
    ...normalized,
    sections: [...normalized.sections, section],
    updatedAt: new Date().toISOString()
  };
}

export function duplicateSection(form: DynamicForm, sectionId: string): DynamicForm {
  const normalized = normalizeForm(form);
  const section = normalized.sections.find((candidate) => candidate.id === sectionId);
  if (!section) return normalized;
  const nextSectionId = `${section.id}-copy-${Date.now()}`;
  const existingNames = new Set(
    normalized.fields.map((candidate) => candidate.variableName ?? slugifyName(candidate.id)),
  );
  const copiedFields = normalized.fields
    .filter((field) => field.sectionId === sectionId)
    .map((field) => {
      return {
        ...field,
        id: `${field.id}-copy-${Date.now()}`,
        sectionId: nextSectionId,
        label: `${field.label} copy`,
        variableName: uniqueCopiedVariableName(field.variableName ?? slugifyName(field.id), existingNames)
      };
    });
  return {
    ...normalized,
    sections: [...normalized.sections, { ...section, id: nextSectionId, title: `${section.title} copy` }],
    fields: [...normalized.fields, ...copiedFields],
    updatedAt: new Date().toISOString()
  };
}

export function reorderSections(form: DynamicForm, activeId: string, overId: string): DynamicForm {
  const normalized = normalizeForm(form);
  const oldIndex = normalized.sections.findIndex((section) => section.id === activeId);
  const newIndex = normalized.sections.findIndex((section) => section.id === overId);
  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return normalized;
  const nextSections = [...normalized.sections];
  const [moved] = nextSections.splice(oldIndex, 1);
  if (!moved) return normalized;
  nextSections.splice(newIndex, 0, moved);
  return { ...normalized, sections: nextSections, updatedAt: new Date().toISOString() };
}

export function moveFieldToSection(form: DynamicForm, fieldId: string, sectionId: string): DynamicForm {
  const normalized = normalizeForm(form);
  const section = normalized.sections.find((candidate) => candidate.id === sectionId);
  if (!section) return normalized;
  return updateField(normalized, fieldId, { sectionId, pageId: section.pageId ?? defaultPageId(normalized) });
}

export function moveFieldToPage(form: DynamicForm, fieldId: string, pageId: string): DynamicForm {
  const normalized = normalizeForm(form);
  const section = normalized.sections.find((candidate) => candidate.pageId === pageId) ?? normalized.sections[0];
  if (!section) return normalized;
  return updateField(normalized, fieldId, { pageId, sectionId: section.id });
}

export function reorderFields(form: DynamicForm, activeId: string, overId: string): DynamicForm {
  const oldIndex = form.fields.findIndex((field) => field.id === activeId);
  const newIndex = form.fields.findIndex((field) => field.id === overId);
  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
    return form;
  }
  const nextFields = [...form.fields];
  const [moved] = nextFields.splice(oldIndex, 1);
  nextFields.splice(newIndex, 0, moved);
  return { ...form, fields: nextFields, updatedAt: new Date().toISOString() };
}

export function updateField(form: DynamicForm, fieldId: string, patch: Partial<FormField>): DynamicForm {
  return {
    ...form,
    fields: form.fields.map((field) => (field.id === fieldId ? { ...field, ...patch } : field)),
    updatedAt: new Date().toISOString()
  };
}

export function publishForm(form: DynamicForm): DynamicForm {
  const normalized = normalizeForm(form);
  if (normalized.fields.length === 0) {
    throw new Error("A form must have at least one field before publishing.");
  }
  const timestamp = new Date().toISOString();
  return {
    ...normalized,
    status: "published",
    activeVersion: normalized.version,
    history: [
      ...(normalized.history ?? []),
      { version: normalized.version, status: "published", createdAt: timestamp, summary: "Published stable survey version" }
    ],
    updatedAt: timestamp
  };
}

export function deployFormToMobileApp(
  form: DynamicForm,
  options: {
    assignedAudience: string;
    instructions?: string;
    syncMode?: "offline_first" | "online_required";
  },
): DynamicForm {
  const published = form.status === "published" ? normalizeForm(form) : publishForm(form);
  const timestamp = new Date().toISOString();
  return {
    ...published,
    mobileDeployment: {
      assignedAudience: options.assignedAudience,
      channel: "survey_app",
      deployedAt: timestamp,
      instructions:
        options.instructions ??
        "Field officers should sync the Survey App, open Assigned forms, and start collection from the latest published version.",
      status: "deployed",
      syncMode: options.syncMode ?? "offline_first",
    },
    updatedAt: timestamp,
  };
}

export function createDraftVersion(form: DynamicForm): DynamicForm {
  const normalized = normalizeForm(form);
  const timestamp = new Date().toISOString();
  return {
    ...normalized,
    status: "draft",
    version: normalized.version + 1,
    history: [
      ...(normalized.history ?? []),
      { version: normalized.version + 1, status: "draft", createdAt: timestamp, summary: "Created editable draft version" }
    ],
    updatedAt: timestamp
  };
}

export function toMobileSchema(form: DynamicForm) {
  const normalized = normalizeForm(form);
  const usedVariableNames = new Set<string>();
  const exportField = (field: FormField): ExportedSchemaField => {
    const variableName = uniqueExportName(fieldVariableName(field), usedVariableNames);
    return {
      id: field.id,
      type: field.type,
      label: field.label,
      hint: field.hint,
      required: field.required,
      page_id: field.pageId,
      section_id: field.sectionId,
      variable_name: variableName,
      options: exportedOptions(field.options),
      validation: field.validation ?? {},
      logic: field.logic ?? [],
      appearance: field.appearance ?? {},
      calculation: field.calculation?.expression ?? field.logic?.find((rule) => rule.kind === "calculation")?.expression,
      matrix: field.matrix,
      repeat: field.repeat,
      lookup: field.lookup,
      media: field.media,
      gps: field.gps,
      children: (field.children ?? []).map((child) => exportField(child)),
    };
  };
  return {
    id: normalized.id,
    name: normalized.name,
    version: normalized.version,
    language: "en",
    offline_compatible: true,
    pages: defaultPages(normalized).map((page) => ({
      id: page.id,
      title: page.title,
      description: page.description,
      sections: normalized.sections
        .filter((section) => section.pageId === page.id)
        .map((section) => section.id)
    })),
    sections: normalized.sections.map((section) => ({
      id: section.id,
      title: section.title,
      description: section.description,
      page_id: section.pageId,
      fields: normalized.fields
        .filter((field) => field.sectionId === section.id)
        .map((field) => exportField(field))
    }))
  };
}

function slugifyName(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || "field";
}

function toXlsType(field: FormField, listName = fieldVariableName(field)): string {
  if (field.options?.length && ["select", "dropdown", "radio", "likert"].includes(field.type)) {
    return `select_one ${listName}`;
  }
  if (field.options?.length && field.type === "ranking") {
    return `rank ${listName}`;
  }
  if (field.options?.length && ["multiselect", "checkbox"].includes(field.type)) {
    return `select_multiple ${listName}`;
  }
  const typeMap: Record<FieldType, string> = {
    text: "text",
    textarea: "text",
    number: "integer",
    decimal: "decimal",
    currency: "decimal",
    phone: "text",
    email: "text",
    url: "text",
    password: "text",
    select: "select_one",
    dropdown: "select_one",
    multiselect: "select_multiple",
    radio: "select_one",
    checkbox: "select_multiple",
    ranking: "rank",
    likert: "select_one likert",
    matrix_single: "table-list",
    matrix_multi: "table-list",
    nps: "integer",
    rating: "integer",
    gps: "geopoint",
    geolocation: "geopoint",
    map: "geopoint",
    geofence: "geopoint",
    polygon: "geoshape",
    photo: "image",
    image: "image",
    signature: "image",
    barcode: "barcode",
    qr: "barcode",
    audio: "audio",
    video: "video",
    file: "file",
    date: "date",
    time: "time",
    datetime: "dateTime",
    hidden: "hidden",
    calculated: "calculate",
    repeat_group: "begin_repeat",
    grid: "table-list",
    lookup: "select_one_external"
  };
  return typeMap[field.type];
}

function toConstraint(field: FormField): string | undefined {
  const rules = field.validation;
  if (!rules) return undefined;
  const constraints: string[] = [];
  if (typeof rules.min === "number") constraints.push(`. >= ${rules.min}`);
  if (typeof rules.max === "number") constraints.push(`. <= ${rules.max}`);
  if (typeof rules.minLength === "number") constraints.push(`string-length(.) >= ${rules.minLength}`);
  if (typeof rules.maxLength === "number") constraints.push(`string-length(.) <= ${rules.maxLength}`);
  if (rules.pattern) constraints.push(`regex(., '${rules.pattern}')`);
  if (typeof rules.accuracyMax === "number" && locationFieldTypes.includes(field.type)) constraints.push(`pulldata("@geopoint", ., "accuracy") <= ${rules.accuracyMax}`);
  if (rules.expression) constraints.push(rules.expression);
  return constraints.length ? constraints.join(" and ") : undefined;
}

function exportHint(field: FormField): string | undefined {
  const parts = [field.hint].filter(Boolean);
  if (field.type === "repeat_group") {
    parts.push('For spreadsheet upload, enter repeated rows as JSON: [{"field":"value"}].');
  }
  if (["matrix_single", "matrix_multi", "grid"].includes(field.type)) {
    parts.push('For spreadsheet upload, enter matrix answers as JSON: {"Row label":"Choice"}.');
  }
  return parts.length ? parts.join(" ") : undefined;
}

export function toXlsFormWorkbook(form: DynamicForm): XlsFormWorkbook {
  const normalized = normalizeForm(form);
  const survey: XlsFormSurveyRow[] = [];
  const choices: XlsFormChoiceRow[] = [];
  const usedSurveyNames = new Set<string>();

  for (const page of defaultPages(normalized)) {
    survey.push({
      type: "begin_group",
      name: slugifyName(page.id),
      label: page.title,
      hint: page.description,
      required: "no"
    });

  for (const section of normalized.sections.filter((candidate) => candidate.pageId === page.id)) {
    survey.push({
      type: "begin_group",
      name: slugifyName(section.id),
      label: section.title,
      hint: section.description,
      required: "no"
    });

    for (const field of normalized.fields.filter((candidate) => candidate.sectionId === section.id)) {
      const name = uniqueExportName(fieldVariableName(field), usedSurveyNames);
      const calculation = field.calculation?.expression ?? field.logic?.find((rule) => rule.kind === "calculation")?.expression;
      const relevant = field.logic?.find((rule) => ["visibility", "show", "hide"].includes(rule.kind))?.expression;

      survey.push({
        type: toXlsType(field, name),
        name,
        label: field.label,
        hint: exportHint(field),
        required: field.required ? "yes" : "no",
        constraint: toConstraint(field),
        relevant,
        calculation
      });

      for (const option of exportedOptions(field.options)) {
        choices.push({
          list_name: name,
          name: option.value,
          label: option.label
        });
      }

      if (field.type === "repeat_group") {
        for (const child of field.children ?? []) {
          const childName = uniqueExportName(child.variableName?.trim() || child.label || child.id, usedSurveyNames);
          survey.push({
            type: toXlsType(child, childName),
            name: childName,
            label: child.label,
            hint: exportHint(child),
            required: child.required ? "yes" : "no",
            constraint: toConstraint(child)
          });
          for (const option of exportedOptions(child.options)) {
            choices.push({
              list_name: childName,
              name: option.value,
              label: option.label
            });
          }
        }
        survey.push({ type: "end_repeat", name: `${name}_end`, label: `End ${field.label}` });
      }
    }

    survey.push({ type: "end_group", name: `${slugifyName(section.id)}_end`, label: `End ${section.title}` });
  }
    survey.push({ type: "end_group", name: `${slugifyName(page.id)}_end`, label: `End ${page.title}` });
  }

  return {
    survey,
    choices,
    settings: {
      form_title: normalized.name,
      form_id: slugifyName(normalized.id),
      version: String(normalized.version),
      default_language: "en"
    }
  };
}

export function getCollectionCompatibility(form: DynamicForm) {
  const normalized = normalizeForm(form);
  const fieldTypes = new Set(normalized.fields.map((field) => field.type));
  const mediaFields = normalized.fields.filter((field) => mediaFieldTypes.includes(field.type));
  const hasRepeatGroups = fieldTypes.has("repeat_group");
  const hasGps = locationFieldTypes.some((fieldType) => fieldTypes.has(fieldType));
  const hasCodeScan = fieldTypes.has("barcode") || fieldTypes.has("qr");
  return {
    offlineReady: true,
    xlsFormReady: normalized.fields.length > 0,
    webFormReady: normalized.fields.length > 0,
    mobileAppReady: true,
    hasGps,
    hasRepeatGroups,
    mediaCount: mediaFields.length,
    warnings: [
      ...(normalized.fields.length === 0 ? ["Add at least one question before sharing or publishing."] : []),
      ...(mediaFields.length > 3 ? ["Large media-heavy forms need clear sync guidance for field officers."] : []),
      ...(hasRepeatGroups ? ["Test repeat groups carefully before live mobile collection."] : []),
      ...(hasCodeScan ? ["Barcode and QR questions can still be collected on web with manual entry when camera scanning is unavailable."] : []),
    ]
  };
}

export function buildFormReadinessChecklist(
  form: DynamicForm | undefined,
  flags: FormReadinessFlags
): FormReadinessItem[] {
  const normalized = form ? normalizeForm(form) : undefined;
  const requiredFieldCount = normalized?.fields.filter((field) => field.required).length ?? 0;
  const evidenceFieldCount =
    normalized?.fields.filter((field) => locationFieldTypes.includes(field.type) || mediaFieldTypes.includes(field.type)).length ?? 0;

  return [
    {
      id: "survey-context",
      label: "Project and survey selected",
      description: "The form must belong to the exact M&E project and survey activity.",
      complete: flags.hasProject && flags.hasSurvey,
      required: true
    },
    {
      id: "questions",
      label: "Questions added",
      description: "Field officers need at least one clear question before collection can begin.",
      complete: Boolean(normalized?.fields.length),
      required: true
    },
    {
      id: "required-rules",
      label: "Required fields reviewed",
      description: `${requiredFieldCount} required field${requiredFieldCount === 1 ? "" : "s"} configured for collection.`,
      complete: true,
      required: false
    },
    {
      id: "evidence",
      label: "Evidence and location checked",
      description: `${evidenceFieldCount} GPS, media, signature, or file evidence field${evidenceFieldCount === 1 ? "" : "s"} included.`,
      complete: evidenceFieldCount > 0,
      required: false
    },
    {
      id: "controls",
      label: "Form controls configured",
      description: "Permissions, reference data, workflow, quality, audit, and version rules have been reviewed.",
      complete: flags.controlsConfigured,
      required: true
    },
    {
      id: "workflow",
      label: "Approval workflow selected",
      description: "Submitted records have a clear review and approval path.",
      complete: flags.workflowConfigured,
      required: true
    },
    {
      id: "quality",
      label: "Data quality checks active",
      description: "Critical and warning checks are ready to protect field data quality.",
      complete: flags.qualityChecksConfigured,
      required: true
    },
    {
      id: "mobile-preview",
      label: "Mobile preview checked",
      description: "The form was reviewed in mobile or enumerator mode before field deployment.",
      complete: flags.mobilePreviewChecked,
      required: false
    },
    {
      id: "pilot-test",
      label: "Pilot test completed",
      description: "A test collection pass was completed before live rollout.",
      complete: flags.pilotTestCompleted,
      required: false
    },
    {
      id: "deployment",
      label: "Deployment audience selected",
      description: "The manager has chosen who should receive the form in the Survey App.",
      complete: flags.deploymentAudienceSelected,
      required: true
    }
  ];
}

export function isFormReadyForPublish(items: FormReadinessItem[]): boolean {
  return items.every((item) => !item.required || item.complete);
}
