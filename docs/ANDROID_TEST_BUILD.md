# Atlas FieldOps Android Production Test Build

## Build Goal

Generate an Android build connected to:

`https://atlasfieldops.com/api/v1`

The APK is for direct phone testing. The AAB is for future Play Store release.

## Current Mobile Stack

- Framework: Expo + React Native + TypeScript
- Router: Expo Router
- Android package: `com.atlasfieldops.mobile`
- App name: Atlas FieldOps
- Version name: `1.0.0-test`
- Version code: `1`
- Runtime production API URL: `https://atlasfieldops.com/api/v1`

## Environment Files

Production config lives in:

- `mobile/.env.production`
- `mobile/.env.production.example`
- `mobile/app.config.ts`
- `mobile/eas.json`

Production values:

```bash
APP_ENV=production
EXPO_PUBLIC_APP_ENV=production
API_BASE_URL=https://atlasfieldops.com/api/v1
EXPO_PUBLIC_API_BASE_URL=https://atlasfieldops.com/api/v1
EXPO_PUBLIC_APP_VERSION=1.0.0-test
```

Development values are kept in `mobile/.env.development` and must not be used for production APKs.

## Android Permissions

The Expo Android config requests:

- Internet
- Network state
- Camera
- Fine location
- Coarse location
- Audio recording
- Image media access
- Notifications

Only use camera, GPS, audio, or media features when the assigned form asks for that evidence.

## Option A: Local APK/AAB Build

Use this path on a machine with Node.js, Java, Android SDK, and Gradle available.

```bash
cd mobile
npm install
npm run typecheck
npm run prebuild:android:production
npm run android:apk:release
npm run android:aab:release
```

Expected outputs after native prebuild:

```text
mobile/android/app/build/outputs/apk/release/app-release.apk
mobile/android/app/build/outputs/bundle/release/app-release.aab
```

Copy outputs to:

```bash
mkdir -p ../dist/android
cp android/app/build/outputs/apk/release/app-release.apk ../dist/android/atlas-fieldops-production-test.apk
cp android/app/build/outputs/bundle/release/app-release.aab ../dist/android/atlas-fieldops-production-release.aab
```

## Option B: EAS Cloud Build

Use this path when local Android SDK/Gradle is not available.

```bash
cd mobile
npm install
npx eas login
npm run eas:apk:production
npm run eas:aab:production
```

Profiles:

- `production-apk`: internal distribution APK for phone testing.
- `production`: Play Store-ready AAB.

Download the build artifacts from the EAS build URL and place them in `dist/android/` if you want local copies.

## Release Keystore

Do not commit signing credentials.

Ignored signing files include:

- `*.keystore`
- `*.jks`
- `key.properties`
- `mobile/android/key.properties`
- `mobile/android/app/*.keystore`
- `mobile/android/app/*.jks`

To create a local release keystore manually:

```bash
keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore mobile/android/app/release-key.keystore \
  -alias atlas-fieldops \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

Store passwords in local environment variables or ignored Gradle properties only.

## Install APK On Android Phone

1. Transfer `dist/android/atlas-fieldops-production-test.apk` to the phone.
2. On Android, open Settings.
3. Search for Install unknown apps.
4. Allow the file manager or browser you use to install APKs.
5. Open the APK file.
6. Tap Install.
7. Open Atlas FieldOps.
8. Log in using production credentials from `https://atlasfieldops.com`.

## Production Smoke Test

After installing:

1. App opens.
2. Login screen loads.
3. Production credentials can log in.
4. Bootstrap sync completes.
5. Assignments download.
6. Forms download.
7. Entities/beneficiaries download.
8. Reference data downloads.
9. Draft can be created.
10. Submission can be queued.
11. Sync uploads submission to production.
12. Submission appears in the web Submissions module.
13. Offline mode does not crash.
14. Failed sync remains safely stored and retryable.

## Collect Logs If Something Fails

Ask the field officer to open Settings -> Diagnostics and send diagnostics.

For local Android debugging:

```bash
adb logcat | grep -i "Atlas FieldOps"
```

Never share passwords, tokens, or sensitive form answers in support messages.

