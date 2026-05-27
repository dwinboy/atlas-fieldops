export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "decimal"
  | "currency"
  | "phone"
  | "email"
  | "password"
  | "select"
  | "multiselect"
  | "radio"
  | "checkbox"
  | "gps"
  | "photo"
  | "signature"
  | "barcode"
  | "audio"
  | "video"
  | "file"
  | "date"
  | "time"
  | "datetime"
  | "calculated"
  | "repeat_group"
  | "grid";

export type LogicRule = {
  id: string;
  kind: "visibility" | "required" | "calculation" | "validation" | "default";
  expression: string;
  message?: string;
};

export type FormField = {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  hint?: string;
  sectionId: string;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    accuracyMax?: number;
  };
  logic?: LogicRule[];
  children?: FormField[];
};

export type FormSection = {
  id: string;
  title: string;
  description?: string;
};

export type DynamicForm = {
  id: string;
  name: string;
  status: "draft" | "published" | "archived";
  version: number;
  activeVersion: number;
  defaultLanguage: string;
  languages: string[];
  sections: FormSection[];
  fields: FormField[];
  updatedAt: string;
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
      { type: "decimal", label: "Decimal", description: "Measurements and percentages" },
      { type: "phone", label: "Phone", description: "Validated phone capture" },
      { type: "email", label: "Email", description: "Validated email capture" }
    ]
  },
  {
    group: "Choice",
    fields: [
      { type: "select", label: "Select", description: "Single choice dropdown" },
      { type: "multiselect", label: "Multiselect", description: "Multiple choice list" },
      { type: "radio", label: "Radio group", description: "Visible single choice" },
      { type: "checkbox", label: "Checkboxes", description: "Visible multi choice" }
    ]
  },
  {
    group: "Advanced",
    fields: [
      { type: "gps", label: "GPS location", description: "Automatic coordinate capture" },
      { type: "photo", label: "Image upload", description: "Offline media queue" },
      { type: "signature", label: "Signature", description: "Consent and acknowledgement" },
      { type: "barcode", label: "Barcode / QR", description: "Scan IDs and inventory" },
      { type: "calculated", label: "Calculated", description: "Formula and scoring field" },
      { type: "repeat_group", label: "Repeat group", description: "Crops, members, assets" }
    ]
  }
];

export function createField(type: FieldType, sectionId: string): FormField {
  const catalogField = fieldCatalog.flatMap((group) => group.fields).find((field) => field.type === type);
  const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  return {
    id,
    label: catalogField?.label ?? "Untitled field",
    type,
    required: ["text", "number", "gps"].includes(type),
    sectionId,
    hint: catalogField?.description,
    options: ["select", "multiselect", "radio", "checkbox"].includes(type) ? ["Yes", "No"] : undefined,
    validation: type === "gps" ? { accuracyMax: 25 } : undefined,
    logic:
      type === "calculated"
        ? [{ id: `${id}-logic`, kind: "calculation", expression: "sum(${field_a}, ${field_b})" }]
        : []
  };
}

export function addField(form: DynamicForm, field: FormField): DynamicForm {
  return {
    ...form,
    fields: [...form.fields, field],
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

export function duplicateField(form: DynamicForm, fieldId: string): DynamicForm {
  const field = form.fields.find((candidate) => candidate.id === fieldId);
  if (!field) {
    return form;
  }
  const copy = {
    ...field,
    id: `${field.type}-${Date.now()}`,
    label: `${field.label} copy`
  };
  const index = form.fields.findIndex((candidate) => candidate.id === fieldId);
  return {
    ...form,
    fields: [...form.fields.slice(0, index + 1), copy, ...form.fields.slice(index + 1)],
    updatedAt: new Date().toISOString()
  };
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
  if (form.fields.length === 0) {
    throw new Error("A form must have at least one field before publishing.");
  }
  return {
    ...form,
    status: "published",
    activeVersion: form.version,
    updatedAt: new Date().toISOString()
  };
}

export function createDraftVersion(form: DynamicForm): DynamicForm {
  return {
    ...form,
    status: "draft",
    version: form.version + 1,
    updatedAt: new Date().toISOString()
  };
}

export function toMobileSchema(form: DynamicForm) {
  return {
    id: form.id,
    name: form.name,
    version: form.version,
    default_language: form.defaultLanguage,
    languages: form.languages,
    offline_compatible: true,
    sections: form.sections.map((section) => ({
      id: section.id,
      title: { [form.defaultLanguage]: section.title },
      description: section.description,
      fields: form.fields
        .filter((field) => field.sectionId === section.id)
        .map((field) => ({
          id: field.id,
          type: field.type,
          label: { [form.defaultLanguage]: field.label },
          hint: field.hint,
          required: field.required,
          options: field.options?.map((option) => ({ label: option, value: option.toLowerCase().replaceAll(" ", "_") })) ?? [],
          validation: field.validation ?? {},
          logic: field.logic ?? [],
          children: field.children ?? []
        }))
    }))
  };
}
