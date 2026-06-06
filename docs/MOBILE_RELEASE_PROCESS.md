# Atlas FieldOps Mobile Release Process

## Release Channels

- Development: local and internal engineering builds.
- Staging: pilot validation builds connected to staging services.
- Production: approved field deployment builds.

Configuration lives in `mobile/src/config/releaseConfig.ts`.

## Versioning

Use semantic versioning:

- Major: breaking changes or major platform compatibility changes.
- Minor: new field features or workflow additions.
- Patch: bug fixes and reliability improvements.

Examples: `1.0.0`, `1.1.0`, `1.1.1`.

## Release Checklist

1. Confirm backend `/api/v1/mobile/*` contracts are compatible.
2. Run mobile TypeScript checks.
3. Run backend linting and compile checks for mobile routes.
4. Confirm Administration -> Mobile Versions policy.
5. Confirm no sensitive answers are logged in analytics, feedback, crash reports, or diagnostics.
6. Run offline, sync, GPS, attachment, returned submission, and app restart tests.
7. Generate APK for testing and AAB for Play Store release when native build credentials are configured.
8. Upload staging build for pilot users.
9. Review pilot monitoring before production promotion.

## Mandatory Update Policy

Set a mandatory update when:

- The current app has a security issue.
- Sync contracts changed incompatibly.
- A data loss risk was fixed.
- The backend no longer accepts the old app version.

Users below the minimum supported version must be blocked from field collection until they update.

## Rollback

Rollback should prefer backend feature flags and version policy first. If a native release must be rolled back, publish a fixed patch build and update the minimum supported version only after pilot validation.

