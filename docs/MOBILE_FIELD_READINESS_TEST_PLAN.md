# Mobile Field Readiness Test Plan

This plan verifies the Atlas FieldOps mobile app before real field deployment.

## Scenario 1: Offline For 7 Days

Goal: prove drafts and queue items survive long offline periods.

Steps:

1. Login and run bootstrap sync.
2. Enable fake offline mode.
3. Create at least 20 drafts across assigned forms.
4. Queue at least 10 completed submissions.
5. Export a local database snapshot.
6. Restore the snapshot into a fresh local database instance.
7. Disable fake offline mode and run Sync Now.

Expected result: all queued submissions remain available and sync or fail with retryable errors. No draft disappears.

## Scenario 2: 500 Unsynced Submissions

Goal: prove queue recovery and local paging.

Steps:

1. Generate 500 queued submissions using the draft service.
2. Run diagnostics.
3. Run background sync with a small batch policy.

Expected result: diagnostics warn about a large local queue, sync logs are written, and failed items remain retryable.

## Scenario 3: Large Repeat Group

Goal: prove repeat group answers remain structured.

Steps:

1. Open a household form with a repeat group.
2. Add 50 household member rows.
3. Remove 5 rows.
4. Save draft, export snapshot, restore snapshot.

Expected result: repeat rows remain in order, removed rows stay removed, draft can be queued.

## Scenario 4: Large Beneficiary Registry

Goal: prove search and paging do not require loading every record into a screen.

Steps:

1. Sync or seed at least 10,000 entities.
2. Search by entity ID, phone, name, household ID, and village.
3. Page through entity repository results.

Expected result: searches return bounded result sets and remain responsive on low-end Android devices.

## Scenario 5: Poor Network

Goal: prove partial sync recovery.

Steps:

1. Queue submissions and attachments.
2. Force intermittent API failures.
3. Run Sync Now.
4. Retry failed sync.

Expected result: synced items are marked synced, failed items keep error messages, and no queued data is deleted.

## Scenario 6: App Restart During Sync

Goal: prove queue status recovery.

Steps:

1. Start sync with queued items.
2. Snapshot while some items are syncing.
3. Restore snapshot.
4. Run Retry Failed.

Expected result: syncing/failed items are recoverable and can be retried.

## Scenario 7: Phone Reboot Or Battery Death

Goal: prove local data survival.

Steps:

1. Create drafts, attachments, conflicts, and sync logs.
2. Export snapshot.
3. Reinitialize database and restore snapshot.

Expected result: drafts, attachments, conflicts, notifications, and queue items are present.

## Scenario 8: Attachment Upload Failure

Goal: prove attachments do not block text submission data.

Steps:

1. Queue a submission with photo and signature metadata.
2. Force attachment upload failure.
3. Run Sync Now.

Expected result: attachment records show Failed with error messages; text submission is preserved and retryable.

## Scenario 9: Returned Submission Correction

Goal: prove returned submissions can be corrected offline.

Steps:

1. Apply returned-submission metadata to a draft.
2. Edit allowed responses.
3. Queue correction.
4. Sync correction.

Expected result: correction is queued through `SUBMIT_CORRECTION`; server history remains preserved.

## Scenario 10: Expired Session

Goal: prove safe auth behavior.

Steps:

1. Login and sync assigned work.
2. Expire session timeout.
3. Attempt Sync Now.

Expected result: mobile asks the user to sign in again, local drafts remain intact, and tokens are not logged.
