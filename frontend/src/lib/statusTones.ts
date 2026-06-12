import type { BadgeProps } from "@/components/ui/badge";

// Canonical platform-wide status→tone vocabulary. Modules whose status words
// carry different semantics (e.g. Data Quality, where "Closed" means an issue
// was resolved and is therefore a success) keep their own local mapping.
const SUCCESS_STATUSES = new Set([
  "active",
  "approved",
  "assigned",
  "clear",
  "completed",
  "configured",
  "connected",
  "enabled",
  "healthy",
  "in progress",
  "passed",
  "published",
  "ready",
  "resolved",
  "success",
  "synced",
  "validated",
]);

const WARNING_STATUSES = new Set([
  "attention",
  "correction requested",
  "draft",
  "import staged",
  "moved",
  "needs correction",
  "needs review",
  "not connected",
  "on leave",
  "open",
  "paused",
  "pending",
  "pending review",
  "planning",
  "possible duplicate",
  "processing",
  "resubmitted",
  "returned",
  "submitted",
  "testing",
  "trial",
  "under review",
  "warning",
]);

const DANGER_STATUSES = new Set([
  "cancelled",
  "critical",
  "duplicate",
  "error",
  "escalated",
  "failed",
  "high risk",
  "likely duplicate",
  "locked",
  "needs fixes",
  "overdue",
  "rejected",
  "revoked",
  "suspended",
]);

export function statusTone(
  status: string | null | undefined,
): BadgeProps["tone"] {
  const normalized = (status ?? "").toLowerCase().replaceAll("_", " ").trim();
  if (SUCCESS_STATUSES.has(normalized)) return "success";
  if (WARNING_STATUSES.has(normalized)) return "warning";
  if (DANGER_STATUSES.has(normalized)) return "danger";
  return "neutral";
}
