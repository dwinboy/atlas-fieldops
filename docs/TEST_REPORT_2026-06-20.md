# Atlas FieldOps Test Report - 2026-06-20

This is the first execution pass using the Whole Platform Test Agent.

## Scope

This pass covered:

- automated backend checks
- automated frontend checks
- mobile type safety
- local workspace route smoke on the frontend dev server
- authenticated tenant browser smoke with real local data
- project creation wizard progression and readiness behavior
- backend readiness typing fix found during the sweep
- local auth and seed reliability fixes found during the sweep

This pass did not yet complete:

- full authenticated live-data workflows from create to submission approval
- full role-by-role browser interaction
- real submission approval and entity-linking walkthrough in a live tenant
- mobile device end-to-end sync against a real environment

## Result Summary

| Area | Result | Evidence |
| --- | --- | --- |
| Backend ruff | PASS | `.venv312/bin/python -m ruff check app tests alembic` |
| Backend mypy | PASS after fix | `app/api/v1/routes/health.py` typing fix |
| Backend pytest | PASS | `141 passed in 24.07s` |
| Frontend lint | PASS | `next lint` clean |
| Frontend tests | PASS | `18 files, 163 tests passed` |
| Frontend production build | PASS | `next build` completed successfully |
| Mobile typecheck | PASS | `npm run typecheck` clean |
| Core route HTTP smoke | PASS | `200` on workspace and platform routes listed below |
| Browser UI smoke | PASS on signed-in tenant routes | live login, tenant route sweep, and project wizard walkthrough completed |

## Issues Found And Fixed

### 1. Backend readiness route type error

- Severity: `High`
- Area: `Backend readiness typing`
- File: `/Users/edwin/Documents/Codex/Projects/Atlas-FieldOps/backend/app/api/v1/routes/health.py`
- Problem:
  mypy flagged `await redis.ping()` because the stub exposed `Awaitable[bool] | bool`.
- Fix:
  cast the call to `Awaitable[bool]` before awaiting.
- Retest:
  `mypy app` passed and `tests/test_health.py` passed.

### 2. Local seeded super admin credentials could drift from the printed password

- Severity: `High`
- Area: `Local test environment / seeded auth`
- File: `/Users/edwin/Documents/Codex/Projects/Atlas-FieldOps/scripts/seed.py`
- Problem:
  rerunning the seed script kept printing `ChangeMe12345!` even when an older stored password hash no longer matched it, which caused false login failures during local live testing.
- Fix:
  when the seeded demo super admin already exists, the seed now resets the stored hash to the configured seed password if it no longer matches.
- Retest:
  reseeding completed successfully and API login with `superadmin@example.com` / `ChangeMe12345!` returned `200`.

### 3. Local frontend auth could fail when the app used `127.0.0.1` and the API env used `localhost`

- Severity: `High`
- Area: `Frontend local auth / developer workflow`
- Files:
  - `/Users/edwin/Documents/Codex/Projects/Atlas-FieldOps/frontend/src/lib/api.ts`
  - `/Users/edwin/Documents/Codex/Projects/Atlas-FieldOps/frontend/tests/api.test.ts`
- Problem:
  signed-in browser testing showed the login form was not reaching the backend when the frontend was opened at `http://127.0.0.1:3001` but `NEXT_PUBLIC_API_URL` pointed to `http://localhost:8000`. In this environment the hostname mismatch blocked the real sign-in flow.
- Fix:
  the API base URL resolver now normalizes `localhost` and `127.0.0.1` to the active browser hostname during local development.
- Retest:
  the new Vitest case passed and browser sign-in to the live local workspace succeeded.

## Automated Check Evidence

### Backend

- `All checks passed!` from ruff
- `Success: no issues found in 78 source files` from mypy after fix
- `141 passed in 24.07s` from pytest

### Frontend

- `✔ No ESLint warnings or errors`
- `18 passed (18)` / `163 passed (163)` in vitest
- production build completed with static and dynamic routes generated successfully
- targeted API tests passed, including the new localhost/127.0.0.1 normalization case (`9 passed`)

### Mobile

- `npm run typecheck` completed successfully

## Local Route Smoke

The local frontend dev server was started on:

- `http://127.0.0.1:3001`

The following routes returned `200` in the direct local smoke test:

- `/`
- `/app`
- `/projects`
- `/projects/create`
- `/forms`
- `/forms/create`
- `/submissions`
- `/submissions/all`
- `/beneficiaries`
- `/mapping`
- `/mapping/boundaries`
- `/indicators`
- `/reports`
- `/data-quality`
- `/users-teams`
- `/governance`
- `/administration`
- `/platform`
- `/platform/overview`

## UI / UX Evidence

### Confirmed

- Preview workspace opens from the sign-in screen.
- Workspace shell renders navigation for major modules.
- Preview notice is visible and clearly warns that live actions are disabled.
- Contact email is present in the preview header.
- Real local sign-in works after the API hostname normalization fix.
- A tenant M&E manager can enter the organization workspace from a live account.
- Signed-in tenant route sweep succeeded for Projects, Forms, Forms Create, Submissions, Mapping, Indicators, Reports, Data Quality, Users & Teams, and Administration.
- The project creation wizard advanced from Basic Information through Activate without route crashes.
- Readiness blockers on the Activate step are clickable and return the user to the exact setup section that needs attention.

### Partially Confirmed

- Core module routes load and compile successfully in the local app.
- Module titles resolve correctly at the route level.
- Beneficiaries, Users & Teams, and Administration loaded successfully in the signed-in sweep, but some pages did not expose a clean page-level `h1` in the quick DOM probe and still need a deeper UI copy/layout review.

### Blocked In This Pass

- Full create/save of a project, full form publish flow, submission approval flow, and beneficiary update flow are still pending in this report.
- Mobile sync against a real device remains out of scope for this pass.

## Remaining Required Testing

The next pass should cover live authenticated workflows:

1. create a project fully and verify the saved record appears in lists and health cards
2. create and publish a real form inside that project
3. submit and review a real submission
4. approve and verify entity creation/linking
5. verify reports, mapping, indicators, and audit trail from approved data
6. run role isolation checks for Super Admin, Organization Admin, Supervisor, Field Officer, and Viewer

## Current Readiness Assessment

- `Code health baseline`: strong
- `Route health baseline`: strong
- `Local preview/workspace shell`: strong
- `Live workflow readiness`: improving, but not yet signed off

## Conclusion

Atlas FieldOps passed the automated engineering baseline, local auth recovery, signed-in tenant route smoke, and the project wizard progression checks in this pass.

The platform is not yet ready for a final production-readiness sign-off from this report alone because the full create → publish → submit → approve → entity/report update chain and the role-isolation matrix still need to be executed and evidenced.
