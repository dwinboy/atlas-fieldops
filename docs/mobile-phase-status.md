# Mobile App Phase Status

## Completed (as of 2026-06-07)

### Navigation & Architecture
- Replaced single-file `app/index.tsx` monolith with full Expo Router file-based navigation
- `app/_layout.tsx` — root Stack with AppProvider, SafeAreaProvider, GestureHandler
- `app/index.tsx` — auth-aware redirect (checks SecureStore → tabs or login)
- `app/login.tsx` — login screen (email, password, org code)
- `app/(tabs)/_layout.tsx` — 5-tab bottom bar: Home, Assignments, Submissions, Sync, Forms

### Tab Screens
- `app/(tabs)/home.tsx` — dashboard with live stats, pull-to-sync, quick actions
- `app/(tabs)/assignments.tsx` — assignment list with ready/waiting state, tap to collect
- `app/(tabs)/submissions.tsx` — draft/queued/failed/synced filter tabs, tap to continue
- `app/(tabs)/sync.tsx` — network status, queue summary, sync history, manual sync
- `app/(tabs)/forms.tsx` — downloaded forms list with version and question counts

### Workflow Screens
- `app/entity-select/[assignmentId].tsx` — searchable beneficiary picker
- `app/form-fill/[draftId].tsx` — multi-section form with progress bar, skip logic, validation
- `app/notifications.tsx` — notification list with read/unread state
- `app/settings.tsx` — account info, device stats, logout, clear synced data

### Native Integrations
- `src/hooks/useGPS.ts` — expo-location with permission request, High accuracy, quality display
- `src/components/GPSCapture.tsx` — GPS button, accuracy badge, re-capture
- `src/hooks/usePhotoCapture.ts` — expo-image-picker for camera and gallery
- `src/components/PhotoCapture.tsx` — preview, retake, gallery fallback
- `src/components/BarcodeCapture.tsx` — expo-camera modal scanner for barcodes and QR codes

### Question Renderer
- `src/components/QuestionRenderer.tsx` — handles all 15+ question types:
  Text, LongText, Number, Decimal, Currency, Date, DateTime, GPS (native),
  Photo (native), Barcode/QR (native), SingleSelect, MultiSelect,
  Consent, Signature, Audio, FileUpload, Calculated

### State & Sync
- `src/context/AppContext.tsx` — session state, syncWork/syncQueue, background sync via AppState
- Background sync fires automatically when app returns to foreground

### New npm Packages Added
- `expo-location` ~17.0.1
- `expo-image-picker` ~15.0.7
- `expo-camera` ~15.0.16
- `expo-local-authentication` ~13.8.0

## Production Config

- API URL: `https://atlasfieldops.com/api/v1`
- Vercel frontend proxies `/api/v1/*` → Railway backend (`backend-production-13c9.up.railway.app`)
- Backend CORS updated: `atlasfieldops.com`, `www.atlasfieldops.com`, Vercel preview URLs

## Build Instructions

### EAS Cloud Build (recommended, no local Android SDK needed)
```bash
cd mobile
npm install
EXPO_TOKEN=<your-token> npx eas build --platform android --profile production-apk --non-interactive
```
Download the APK from the link in the output.

### Local Mac Build
```bash
cd mobile
bash build-apk.sh
```
Requires Android SDK at `~/Library/Android/sdk`.

### One-line for Codex
```bash
cd mobile && npm install && npx expo prebuild --platform android --clean && echo "sdk.dir=$HOME/Library/Android/sdk" > android/local.properties && cd android && ./gradlew assembleRelease && cp app/build/outputs/apk/release/app-release.apk ../dist/android/atlas-fieldops-$(date +%Y%m%d).apk
```

## Next Mobile Tasks

- [ ] Implement PIN lock / biometric auth UI (securityPolicyService.ts already written)
- [ ] Wire push notifications via expo-notifications
- [ ] Wire backgroundSyncScheduler into AppState lifecycle properly
- [ ] Supervisor mode screen (supervisorModeService.ts already written)
- [ ] Returned submission correction flow
- [ ] Offline maps integration
- [ ] Signature pad (canvas-based)
- [ ] Audio recording (expo-av)
- [ ] Multi-language support
- [ ] EAS OTA updates for JS-only changes

## Compatibility Notes for Codex

- All new files follow the existing project conventions (TypeScript strict, functional components)
- `@/` paths map to `mobile/src/` (defined in `tsconfig.json`)
- Colors: primary `#12332b`, bg `#f6faf8`, border `#dbe7e2`, secondary text `#49635a`
- No external UI library — all components use React Native primitives
- Service layer (`src/auth/`, `src/sync/`, `src/forms/`, etc.) unchanged — only screens added
- `app/index.tsx` is now a redirect component (do not restore old content)
- `AGENTS.md` agent roster covers all roles; Mobile Agent owns the `mobile/` directory
