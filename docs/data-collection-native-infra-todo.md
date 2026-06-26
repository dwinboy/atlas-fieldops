# Data collection — native & infra work (execution guide)

These items could not be implemented/verified in the code-only environment because they need a
native module + EAS/native rebuild, or a production-infrastructure change. Each section lists the
dependency, the files to touch, and how to verify. Ordered by priority.

---

## 1. On-device encryption at rest (security — highest priority)
The local SQLite snapshot (`mobile/src/storage/localDatabase.ts`) is stored as plaintext JSON;
`mobile/src/storage/encryptionService.ts` is a stub. The builder's `encryptAtRest` privacy control
is therefore not enforced on the device.

**Recommended approach — SQLCipher (encrypts the whole DB file):**
- Swap `expo-sqlite` usage for a SQLCipher-capable driver, e.g. `op-sqlite` with the SQLCipher
  build, or `expo-sqlite` + a config plugin that links SQLCipher.
- Generate/store the DB key in `expo-secure-store` (Keychain/Keystore) on first launch; open the DB
  with `PRAGMA key`.
- Files: `localDatabase.ts` (open with key), `encryptionService.ts` (key management), `app.config.ts`
  (config plugin if needed).

**Alternative — app-level field/snapshot encryption (no native module):**
- Add `aes-js` (or `react-native-quick-crypto`) + a 256-bit key in SecureStore; AES-GCM encrypt the
  `payload_json` blob before `persistSnapshot()` writes it, decrypt on `restorePersistedSnapshot()`.
- Cheaper to ship, but encrypts only the snapshot column and adds CPU per write.

**Verify:** on a device, confirm the `.db` file contents are not readable plaintext; confirm
sign-out still clears the key; confirm offline collect → sync still works.

---

## 2. OS-level background sync (reliability)
`SyncEngine.syncInBackground()` exists but is only invoked on app open / foreground / manual tap —
there is no OS background task, so the app does not sync while closed.

**Steps:**
- `npx expo install expo-background-fetch expo-task-manager`
- Register a task (e.g. in a new `mobile/src/sync/backgroundTask.ts`) that calls
  `BackgroundSyncScheduler.run()` → `SyncEngine.syncInBackground()`; register it from the root layout.
- Add `UIBackgroundModes: ["fetch"]` (iOS) / background permissions; declare the task in `app.config.ts`.
- Respect battery/connectivity: only sync when online and queue is non-empty.

**Verify:** background the app with queued submissions; confirm they upload within the OS fetch
window (device-only; the simulator background fetch is unreliable).

---

## 3. Proactive offline detection (UX)
Connectivity is currently inferred from request outcomes (reactive). For instant detection:
- `npx expo install expo-network`
- In `mobile/src/sync/networkStatus.ts`, add a poll/subscription using
  `Network.getNetworkStateAsync()` (SDK 51) and call `setOnline()/setOffline()` accordingly; on SDK 52+
  use `Network.addNetworkStateListener`.
- Keep the existing request-outcome reporting as a fallback.

**Verify:** toggle airplane mode on a device and confirm the Online/Offline chip flips immediately.

---

## 4. PostGIS polygon-overlap detection (scale)
`backend/app/services/mobile.py::_check_polygon_overlaps` loads up to 500 candidate submissions and
compares geometries in Python (Shapely). To remove the cap and scale:

**Steps:**
- Enable PostGIS on the Railway Postgres: `CREATE EXTENSION IF NOT EXISTS postgis;` (run once; the
  Railway Postgres image must support it — confirm or switch to a PostGIS image).
- Add a `geometry(Polygon, 4326)` column to `submissions` (or a side table) populated from the polygon
  answer on upload; add a GiST index. New Alembic migration.
- Replace the Python loop with a spatial query: `ST_Intersects` + `ST_Area(ST_Intersection(...))` for the
  overlap ratio, scoped by form/project/org and excluding same-entity (mirror the current rules).

**Verify:** pytest can't use SQLite for PostGIS — verify against a local PostGIS container; confirm
overlap ratios match the current Shapely results on the existing fixtures.

---

## 5. Larger features (scope as separate efforts)
- **Async / scheduled exports**: a background worker (e.g. Redis queue + worker dyno) to generate
  large export artifacts off-request and recurring schedules; the synchronous `export-jobs` endpoint
  and `StoredFile` artifact storage are already in place to build on.
- **Media upload chunking**: chunk/resumable upload for large photo/video files over weak links
  (the base64 single-shot upload works for small files only).
- **Photo annotation / audio audit**: a drawing canvas on captured images, and background interview
  audio recording for data-quality auditing.

---

## Standing verification gap (not infra)
All web-builder and mobile-renderer features added recently are typecheck/test-verified but **not
visually run** (no simulator/browser in the build environment). A visual-QA pass on the new form
features (repeat children, count-driven repeat, lookup, searchable selects, Other-specify, units,
multi-language switch + translated options/matrix, nested repeats, relative date defaults) should
precede field use.
