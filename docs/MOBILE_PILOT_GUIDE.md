# Atlas FieldOps Mobile Pilot Guide

## Purpose

Use this guide to run a controlled field pilot before wider mobile rollout. A pilot should prove that field officers can log in, sync assigned work, collect data offline, submit safely, and receive support when sync or device issues occur.

## Pilot Roles

- Pilot Coordinator: owns the pilot plan, devices, dates, field officers, and go/no-go decision.
- System Admin: manages mobile devices, versions, monitoring, and support access under Administration.
- Supervisor: monitors assigned field officers, returned submissions, progress, and quality alerts.
- Field Officer: collects data on assigned forms and reports issues through mobile feedback.
- QA Lead: records offline, GPS, attachment, sync, and large-form test results.

## Web Setup

1. Open Administration -> Mobile Versions and confirm the current production version, staging version, and minimum supported version.
2. Open Administration -> Mobile Pilots and create the pilot with project, start date, end date, devices, field officers, and supervisors.
3. Open Administration -> Mobile Devices and confirm each test device registers after first login.
4. Open Administration -> Mobile Monitoring to watch sync health, crashes, offline devices, and app version distribution.
5. Open Administration -> Mobile Testing and record evidence for required field scenarios.

## Required Pilot Tests

1. Login and bootstrap sync.
2. Assigned project and assignment download.
3. Entity selection and entity-linked form start.
4. Offline draft save and app restart recovery.
5. Queue submission while offline.
6. Sync queued submission when online.
7. Confirm submission appears in the web Submissions module.
8. Confirm beneficiary/entity linkage appears in the registry.
9. Capture GPS quality warnings.
10. Submit mobile feedback with diagnostics.
11. Record crash/sync failure handling when intentionally simulated.

## Go/No-Go Gates

Proceed to wider rollout only when:

- Field officers can complete the full data collection loop without data loss.
- Sync success rate is acceptable for the project connectivity profile.
- No critical crash is unresolved.
- Failed submissions remain retryable.
- Device registration, blocking, and force logout controls are verified.
- Training materials and support contacts are ready.

## Support Workflow

When a field issue is reported:

1. Ask the user to open Settings -> Diagnostics and send diagnostics.
2. Review Administration -> Mobile Feedback.
3. Check Administration -> Mobile Devices for last sync, version, and status.
4. Check Administration -> Mobile Monitoring for crash and sync trends.
5. Record the field test result or issue in Administration -> Mobile Testing.

