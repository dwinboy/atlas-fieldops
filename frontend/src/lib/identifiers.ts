/**
 * Human-readable submission identifiers.
 *
 * Submissions carry a `client_submission_id` that is sometimes already a friendly code
 * (e.g. `MOB-2026-564TZD`) and sometimes a raw device/UUID value (e.g.
 * `4256cdae-661c-4bed-825f-bba810598f87`). Users should only ever see the friendly form,
 * so every table/list/toast renders ids through this helper instead of the raw value.
 */

const FRIENDLY_ID_PATTERN = /^(MOB|UPL|IMP|SUB|WEB)-\d{4}-[A-Z0-9-]+$/i;

export type SubmissionIdInput = {
  client_submission_id?: string | null;
  id?: string | null;
  is_imported?: boolean | null;
  submitted_at?: string | null;
  imported_at?: string | null;
};

/** Format any submission identifier into the human-readable `PREFIX-YEAR-SUFFIX` form. */
export function formatSubmissionId(submission: SubmissionIdInput): string {
  const raw = (submission.client_submission_id || submission.id || "").trim();
  if (!raw) return "";
  if (FRIENDLY_ID_PATTERN.test(raw)) return raw.toUpperCase();
  const year = new Date(submission.imported_at ?? submission.submitted_at ?? Date.now()).getFullYear();
  const suffix = raw.replace(/[^a-z0-9]/gi, "").slice(-6).toUpperCase() || "000001";
  const prefix = submission.is_imported
    ? "IMP"
    : raw.startsWith("draft_") || raw.startsWith("submission_")
      ? "MOB"
      : "SUB";
  return `${prefix}-${Number.isFinite(year) ? year : new Date().getFullYear()}-${suffix}`;
}
