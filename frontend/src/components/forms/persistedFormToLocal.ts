import { type DataFormRead } from "@/lib/api";
import { type DynamicForm } from "@/lib/forms";

export function persistedFormToLocal(form: DataFormRead): DynamicForm {
  const pageId = `${form.id}-page-1`;
  const sectionId = `${form.id}-summary`;
  return {
    id: form.id,
    name: form.name,
    status:
      form.status === "published"
        ? "published"
        : form.status === "archived"
          ? "archived"
          : "draft",
    version: form.current_version,
    activeVersion: form.status === "published" ? form.current_version : 0,
    updatedAt: new Date().toISOString(),
    pages: [
      {
        id: pageId,
        title: "Saved version",
        description: "Published backend structure summarized for review.",
      },
    ],
    sections: [
      {
        id: sectionId,
        title: "Saved form",
        description: form.description ?? "Stored in the backend.",
        pageId,
      },
    ],
    fields: [
      {
        id: `${form.id}-respondent`,
        label: "Respondent name",
        type: "text",
        required: true,
        pageId,
        sectionId,
      },
      {
        id: `${form.id}-location`,
        label: "Collection GPS",
        type: "gps",
        required: true,
        pageId,
        sectionId,
        validation: { accuracyMax: 25 },
      },
      {
        id: `${form.id}-notes`,
        label: "Field notes",
        type: "textarea",
        required: false,
        pageId,
        sectionId,
      },
    ],
  };
}
