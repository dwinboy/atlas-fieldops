import type { MobileFormVersion } from "@/models/contracts";
import { getQuestionRenderModel, type QuestionRenderModel } from "@/forms/questionRendererRegistry";

export type FormRenderSection = {
  id: string;
  title: string;
  questions: QuestionRenderModel[];
};

export function buildFormRenderModel(formVersion: MobileFormVersion): FormRenderSection[] {
  return formVersion.sections
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((section) => ({
      id: section.id,
      title: section.title,
      questions: section.questions
        .slice()
        .sort((a, b) => a.order - b.order)
        .map(getQuestionRenderModel),
    }));
}
