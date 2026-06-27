import { type DynamicForm, type FormField } from "@/lib/forms";
import { type FormTemplateCard } from "@/lib/mockData";

export function templateToForm(template: FormTemplateCard): DynamicForm {
  const pageId = `${template.id}-page-1`;
  const sectionId = `${template.id}-main`;
  const evidenceSectionId = `${template.id}-evidence`;
  const fields: FormField[] = [
    {
      id: `${template.id}-beneficiary`,
      label: "Entity or respondent name",
      type: "text",
      required: true,
      pageId,
      sectionId,
    },
    {
      id: `${template.id}-uid`,
      label: "Unique ID or program code",
      type: "text",
      required: true,
      pageId,
      sectionId,
    },
    {
      id: `${template.id}-community`,
      label: "Community or village",
      type: "text",
      required: true,
      pageId,
      sectionId,
    },
    {
      id: `${template.id}-status`,
      label: `${template.name.replace(" Form", "")} status`,
      type: "select",
      required: true,
      pageId,
      sectionId,
      options: ["New", "In progress", "Needs follow-up", "Complete"],
    },
    {
      id: `${template.id}-notes`,
      label: "Field officer notes",
      type: "textarea",
      required: false,
      pageId,
      sectionId,
    },
    {
      id: `${template.id}-quality`,
      label: "Data quality confidence",
      type: "radio",
      required: true,
      pageId,
      sectionId: evidenceSectionId,
      options: ["High", "Medium", "Low"],
    },
  ];

  if (template.hasGps) {
    fields.push({
      id: `${template.id}-gps`,
      label: "Automatic GPS location",
      type: "gps",
      required: true,
      pageId,
      sectionId: evidenceSectionId,
      validation: { accuracyMax: 25 },
    });
  }

  if (template.hasMedia) {
    fields.push({
      id: `${template.id}-photo`,
      label: "Photo or signature evidence",
      type: "photo",
      required: false,
      pageId,
      sectionId: evidenceSectionId,
      logic: [
        {
          id: `${template.id}-photo-required`,
          kind: "required",
          expression: "${quality} = 'Low'",
          message: "Add proof when confidence is low",
        },
      ],
    });
  }

  if (template.repeatGroups > 0) {
    fields.push({
      id: `${template.id}-repeat`,
      label:
        template.category === "Agriculture"
          ? "Crops or farm plots"
          : "Household members or linked records",
      type: "repeat_group",
      required: false,
      pageId,
      sectionId,
      children: [
        {
          id: `${template.id}-repeat-name`,
          label: "Record name",
          type: "text",
          required: true,
          sectionId,
        },
        {
          id: `${template.id}-repeat-value`,
          label: "Value or count",
          type: "number",
          required: false,
          sectionId,
          validation: { min: 0 },
        },
      ],
    });
  }

  return {
    id: `${template.id}-${Date.now()}`,
    name: template.name,
    status: "draft",
    version: 1,
    activeVersion: 0,
    updatedAt: new Date().toISOString(),
    pages: [
      {
        id: pageId,
        title: "Page 1",
        description: "Primary collection flow for this survey form.",
      },
    ],
    sections: [
      {
        id: sectionId,
        title: "Core questions",
        description: template.description,
        pageId,
      },
      {
        id: evidenceSectionId,
        title: "Evidence and review",
        description: "GPS, proof, quality checks, and supervisor review.",
        pageId,
      },
    ],
    fields,
  };
}
