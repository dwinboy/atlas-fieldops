import { type FormImportRun, type FormQualityFlag } from "@/components/forms/formBuilderTypes";
import { type BadgeProps } from "@/components/ui/badge";

export const formReviewStatusTone: Record<string, BadgeProps["tone"]> = {
  submitted: "accent",
  under_review: "warning",
  approved: "success",
  rejected: "danger",
  correction_requested: "warning",
  resubmitted: "accent",
};

export function getReviewStatusTone(status: string): BadgeProps["tone"] {
  return formReviewStatusTone[status] ?? "neutral";
}

export function getImportStatusTone(
  status: FormImportRun["status"],
): BadgeProps["tone"] {
  if (status === "imported") return "success";
  if (status === "validated") return "accent";
  return "warning";
}

export function getQualitySeverityTone(
  severity: FormQualityFlag["severity"],
): BadgeProps["tone"] {
  if (severity === "Critical") return "danger";
  if (severity === "High") return "warning";
  if (severity === "Medium") return "accent";
  return "neutral";
}


export function formatReviewStatus(status: string) {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
