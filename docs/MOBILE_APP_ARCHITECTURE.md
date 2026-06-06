# Atlas FieldOps Mobile App Architecture

## Purpose

The mobile app is the offline-first field extension of Atlas FieldOps. It is designed for field officers and supervisors who need assigned projects, assigned entities, published forms, reference data, draft submissions, attachments, and sync status on Android devices.

The mobile app must consume stable API and data contracts from the web platform. It must not depend on web UI logic, dashboard routes, or browser-only state.

## Current Scope

This foundation creates architecture only:

- Shared TypeScript mobile contracts in `shared/types/mobile.ts`.
- Mobile API services under `mobile/src/api`.
- Auth/session abstractions under `mobile/src/auth`.
- Offline local storage schema and repository abstraction under `mobile/src/storage`.
- Sync queue and network status services under `mobile/src/sync`.
- Entity-linked prefill, duplicate check, and frequency rule services.
- Draft submission model and service.
- Placeholder screen models and navigation route constants.
- Backend contract facade under `/api/v1/mobile/*`.
- MVP data collection loop services for login bootstrap sync, assignment/entity/form selection, draft creation, required-field validation, local queueing, and sync upload.

It intentionally does not build full mobile dashboards, administration, governance, reports, mapping analytics, or project management.

## Mobile Business Objects

The mobile app is built around business objects, not web pages:

- User
- Organization
- Project
- Assignment
- Entity / Beneficiary
- Location
- Form
- Form Version
- Question
- Reference Data
- Submission
- Submission Draft
- Attachment
- Notification
- Sync Queue Item
- Audit Event

## API Contracts

Mobile APIs are versioned under `/api/v1/mobile/*`.

Download endpoints:

- `GET /api/v1/mobile/bootstrap`
- `GET /api/v1/mobile/projects`
- `GET /api/v1/mobile/assignments`
- `GET /api/v1/mobile/forms`
- `GET /api/v1/mobile/form-versions`
- `GET /api/v1/mobile/entities`
- `GET /api/v1/mobile/locations`
- `GET /api/v1/mobile/reference-data`
- `GET /api/v1/mobile/returned-submissions`
- `GET /api/v1/mobile/notifications`
- `GET /api/v1/mobile/sync`

Upload endpoints:

- `POST /api/v1/mobile/submissions`
- `POST /api/v1/mobile/attachments`
- `POST /api/v1/mobile/audit-events`
- `POST /api/v1/mobile/sync`

All mobile APIs must enforce backend authorization. Frontend hiding is never sufficient.

Individual list endpoints accept bounded `limit` and `cursor` query parameters for large deployments. The mobile client sends `X-Mobile-Contract-Version` and `X-Mobile-App-Version` headers on every request. Upload operations are idempotent by local submission ID and must return field-friendly, retry-aware errors.

## Offline Storage Design

The storage foundation is SQLite-ready and currently exposed through a repository abstraction so screens and services do not depend on a concrete storage driver.

Local collections include:

- MobileSession
- Projects
- Assignments
- Entities
- Locations
- Forms
- FormVersions
- Questions
- ReferenceLists
- ReferenceValues
- DraftSubmissions
- SubmissionResponses
- Attachments
- SyncQueue
- SyncLogs
- Notifications
- AuditEvents

Each offline-capable record includes:

- `localId`
- `serverId`
- `syncStatus`
- `createdAt`
- `updatedAt`
- `lastSyncedAt`
- `deviceId`
- `conflictStatus`
- `deletedAt`

## Sync Model

Every offline action that must reach the server is added to the Sync Queue.

Supported queue operations:

- `CREATE_SUBMISSION`
- `UPDATE_DRAFT`
- `UPLOAD_ATTACHMENT`
- `SUBMIT_CORRECTION`
- `UPLOAD_AUDIT_EVENT`
- `MARK_NOTIFICATION_READ`

Sync statuses:

- `NotSynced`
- `Queued`
- `Syncing`
- `Synced`
- `Failed`
- `Conflict`
- `ReturnedForCorrection`

The server remains the final authority for authorization, duplicate validation, frequency rules, and submission acceptance.

## Production Sync Hardening

The sync layer now supports manual, automatic, background, and retry-failed execution modes.

Production rules:

- Every sync run writes a local Sync Log with processed, synced, failed, mode, status, and message.
- Attachment metadata sync is handled separately from submission sync so failed media does not destroy text responses.
- Failed submissions remain in local draft storage and can be retried.
- Server conflicts create local conflict records instead of silently discarding data.
- Conflict types include form version changed, entity updated, assignment cancelled, and submission rejected.
- Existing drafts continue on the original downloaded form version. New submissions should use the latest synced version.
- Cancelled assignment conflicts block new work but allow existing drafts to be reviewed and submitted according to policy.

## Attachment Sync

Attachments are first-class local records with:

- Type
- Local URI
- MIME type
- Size
- Encrypted flag
- Upload progress
- Error message
- Sync status

Supported attachment types are photo, audio, video, signature, and file upload. Binary upload provider integration remains future work, but the queue, retry, progress, and metadata contract are in place.

## Form Renderer Hardening

The renderer contract supports:

- Text, long text, number, date, select, dropdown, consent, GPS, photo, audio, video, signature, barcode, QR code, calculated fields, repeat groups, matrix, ranking, and file upload.
- Offline Show If, Hide If, Required If, Skip To, and Calculate logic.
- Required, numeric min/max, text length, regex, date future-date, approved option, and GPS accuracy validation that respects offline visibility rules.
- Basic repeat group add/remove row services.
- Cascading reference data filtering using parent codes.

The backend mobile contract maps validation, simple builder logic expressions, calculation markers, controlled-value options, and Administration-owned reference-list bindings into the downloaded form version. Mobile validation is a first-pass field experience; the backend remains final authority and flags questionable synced submissions for human review instead of approving them automatically.

Reference data remains owned by Administration. Mobile downloads active organization/global reference lists through `/api/v1/mobile/reference-data` and the bootstrap sync package so field officers can select approved site codes, beneficiary categories, and other controlled values while offline.

## GPS Quality

Mobile GPS validation is advisory and offline-capable.

Checks include:

- Missing GPS
- Poor accuracy
- Manual coordinates
- Duplicate GPS points
- Boundary validation placeholder

Final boundary and spatial validation remain owned by Mapping/Data Quality services during sync and review.

## Returned Submission Workflow

Returned submissions are stored as local drafts with reviewer comments, fields to correct, and correction deadlines. Users can edit allowed fields and queue a correction using the same sync queue. Resubmission history remains preserved by the backend submission workflow.

## Supervisor Mode

Supervisor mode is intentionally lightweight and does not duplicate web review workflows. It exposes:

- Team assignments
- Field officer progress summaries
- Returned submission count
- Coverage progress
- Quality alert count

## Security

Security hardening includes:

- Expo SecureStore token storage implementation for native runtime.
- Session timeout service.
- App lock state for PIN and biometric readiness.
- Screenshot protection flag placeholder for sensitive forms.
- Device registration payload for remote logout and remote wipe readiness.
- No plain-text password storage.

## Notifications

Local notification records support assignment created, assignment updated, submission returned, sync failed, form updated, and reference data updated events. Notification states include unread, read, and archived. Push notification provider integration remains future-ready.

## QA And Production Readiness

Developer diagnostics support:

- Fake offline mode
- Storage diagnostics
- Sync diagnostics
- Submission diagnostics

Production readiness services support:

- Crash reporting placeholder
- Version checking
- Minimum supported version
- Update required / update available state

Mobile analytics events are stored through the local audit-event queue and must not include sensitive answers.

Field readiness test scenarios are documented in `docs/MOBILE_FIELD_READINESS_TEST_PLAN.md` and cover seven-day offline operation, 500 unsynced submissions, large repeat groups, large beneficiary registries, poor network recovery, app restart during sync, phone reboot, attachment failures, returned corrections, and expired sessions.

## Pilot Readiness And Deployment Management

Mobile pilot controls are managed in the web Administration module:

- `/administration/mobile-devices`
- `/administration/mobile-versions`
- `/administration/mobile-pilots`
- `/administration/mobile-monitoring`
- `/administration/mobile-monitoring/crashes`
- `/administration/mobile-feedback`
- `/administration/mobile-testing`

Device registration happens after successful mobile login through `POST /api/v1/mobile/devices/register`. The payload includes device ID, device name, platform, app version, OS version, and last seen time. The response exposes device status, remote logout readiness, and future remote wipe readiness. Native device identifiers can replace the generated architecture-safe ID when Expo device modules are connected.

Version policy is exposed through `GET /api/v1/mobile/version-policy`. The mobile app normalizes backend production/staging policy into a stable `MobileVersionState` with current version, minimum supported version, update available, update required, and user-facing message.

Pilot monitoring is split into:

- Device management: active, inactive, blocked, lost, and retired devices.
- Version management: production, staging, and minimum supported versions.
- Pilot management: planned, active, completed, and archived pilot programs.
- Monitoring center: active devices, sync success rate, sync failures, crashes, offline devices, app versions, active users, and throughput.
- Crash reporting: severity, device, app version, message, stack trace, and context without sensitive answers.
- Feedback: bug, feature request, performance, sync problem, and other categories with optional diagnostics.
- Field testing: offline, GPS, attachment, sync, and large-form test evidence.

Release metadata is centralized in `mobile/src/config/releaseConfig.ts` and includes app name, Android package name, API URL by channel, logging level, feature flags, privacy URL, terms URL, support URL, contact email, icon path, splash path, and Android permissions.

Operational rollout guides live in:

- `docs/MOBILE_PILOT_GUIDE.md`
- `docs/MOBILE_RELEASE_PROCESS.md`
- `docs/PLAY_STORE_RELEASE.md`

## Entity-Linked Collection Flow

The target field flow is:

Assignment -> Select Entity -> Select Form -> Load Prefilled Data -> Complete Form -> Save Draft -> Queue Submission -> Sync

Entity-linked forms must not create disconnected submissions unless the form settings explicitly allow anonymous submissions.

Prefill mappings support:

- `ReadOnly`
- `Editable`
- `EditableWithReason`

Duplicate checks on mobile are advisory. The backend must re-check during sync.

## MVP Data Collection Loop

The first usable mobile loop is:

Login -> Bootstrap Sync -> View Assignments -> Select Entity -> Open Form -> Save Draft -> Queue Submission -> Sync Now -> Web Submission.

Current backend behavior:

- Web Field Operations assignments must persist the field officer profile, project ID, and published form ID on the backend. Mobile bootstrap sync downloads only those form-specific assignments for new records, with project-wide published forms used only for older project-only assignments.
- `/api/v1/mobile/sync` returns assigned projects, project assignments, published forms, current form versions, assigned beneficiaries, and derived location/reference placeholders for the authenticated field officer.
- `/api/v1/mobile/submissions` validates the downloaded form version, reuses the existing Submissions service, stores mobile metadata, and returns the server submission ID.
- When a published form is configured to create a new entity, mobile registration sync creates a beneficiary/entity record and links the submission to it.
- Same-phone duplicate beneficiary registration is blocked with a clear conflict response.

Current mobile behavior:

- The first screen after login is a field-officer home screen, not an administration dashboard. It shows the signed-in user, organization, a manual "Sync assigned work" action, assignment readiness, downloaded forms, assigned beneficiaries, drafts, and queued sync items in plain field language.
- Field officers can tap an assigned work card, select an assigned beneficiary when the form requires one, answer downloaded questions, record the submission GPS location, save the draft, queue the submission, and manually sync queued submissions.
- Successful login loads the current user and runs assigned work sync.
- Assigned work is stored locally with sync metadata.
- Drafts are created from assignment, form version, and selected entity context.
- Required questions are validated locally before queueing.
- Queued submissions remain stored locally and can be retried.
- Sync Now uploads queued submissions and marks drafts as Synced or Failed.

## Current Limitations

- The Expo app has placeholder screens only.
- The local database abstraction is SQLite-ready but uses an in-memory repository plus snapshot/restore helpers until the concrete SQLite driver is connected.
- Local database migration and encryption readiness services are present, but the final encrypted SQLite/SQLCipher provider still needs native integration.
- Attachment upload currently accepts metadata; binary upload provider integration is future work.
- Full media capture, native GPS capture, barcode scanning UI, biometric prompt integration, remote wipe execution, refresh-token rotation, and conflict resolution UI are future work.

## Roadmap

1. Connect local storage abstraction to Expo SQLite.
2. Implement repository-backed mobile API queries for assigned projects, forms, entities, assignments, and reference data.
3. Add login and secure token storage using secure device storage.
4. Build assignment, entity search, form list, and draft submission screens.
5. Implement dynamic question rendering for priority field types.
6. Add attachment capture and GPS capture.
7. Implement sync worker retries, conflict responses, and returned correction handling.
8. Add mobile E2E tests for offline draft creation and sync queue processing.
