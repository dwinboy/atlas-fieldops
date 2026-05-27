# Enterprise Collection Workflow

## Business Flow

The platform now models the core field collection loop:

1. Organization admins create offline-compatible form schemas.
2. Admins invite field officers and assign mobile-ready credentials.
3. Field officers collect data on mobile clients.
4. Mobile sync sends submissions with required system metadata.
5. Admins and supervisors review submissions.
6. Reviewers approve, reject, or request corrections.
7. Every lifecycle transition is written to status history and audit logs.

## Backend Domains

- `field_officer_profiles`: mobile workforce profile, device, sync, and GPS status.
- `data_forms`: tenant-owned form definitions.
- `data_form_versions`: immutable schema versions for offline compatibility.
- `submissions`: canonical server submission record.
- `submission_versions`: payload snapshots for correction and resubmission workflows.
- `submission_status_history`: lifecycle transition log.
- `mobile_sync_batches`: idempotent batch tracking for offline-first clients.

## Mobile Sync Contract

Mobile clients should use:

- `GET /api/v1/forms` to download assigned published form metadata.
- `POST /api/v1/submissions/sync` to send offline batches.
- `POST /api/v1/submissions` for single online submissions.

Every submission must include:

- `client_submission_id`
- `form_id`
- `form_version`
- `payload`
- `captured_at`
- `submitted_at`
- `device.device_id`
- `location.latitude`
- `location.longitude`
- `location.timestamp`

GPS, timestamp, device ID, and submitter identity are not manual form fields; the API contract enforces them as system metadata.

## Review Lifecycle

Supported states:

- `draft`
- `pending_sync`
- `synced`
- `submitted`
- `under_review`
- `approved`
- `rejected`
- `correction_requested`
- `resubmitted`

Review actions are exposed through `POST /api/v1/submissions/{submission_id}/review`.

Supported actions:

- `start_review`
- `approve`
- `reject`
- `request_correction`

## RBAC

- `organization_admin`: forms, officers, review, users, audit.
- `supervisor`: officer visibility and submission review.
- `field_officer`: form download, submission creation, mobile sync.
- `owner`: all permissions.

All repository access is tenant-scoped by `organization_id`.
