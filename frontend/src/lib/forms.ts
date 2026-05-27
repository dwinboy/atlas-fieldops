export type FieldType = "text" | "number" | "date" | "photo" | "gps" | "select";

export type FormField = {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
};

export type DynamicForm = {
  id: string;
  name: string;
  status: "draft" | "published";
  fields: FormField[];
  updatedAt: string;
};

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

export function publishForm(form: DynamicForm): DynamicForm {
  if (form.fields.length === 0) {
    throw new Error("A form must have at least one field before publishing.");
  }
  return { ...form, status: "published", updatedAt: new Date().toISOString() };
}

