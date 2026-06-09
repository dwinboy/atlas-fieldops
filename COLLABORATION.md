# GitHub Copilot + Codex Collaboration Guide

This document defines how **GitHub Copilot** (interactive, VS Code) and **Codex** (headless, task-based) build Atlas FieldOps together without conflicts.

Both agents follow the same engineering rules in `AGENTS.md`. This file adds the coordination layer on top.

---

## 1. Ground Rules

1. **Both agents read `BUILD_STATUS.md` before starting any work.** It tracks what is done, in-progress, and next.
2. **Update `BUILD_STATUS.md` immediately after completing any feature.** Mark in-progress items before starting.
3. **Never edit a file that is marked `IN PROGRESS` by the other agent** in `BUILD_STATUS.md`.
4. **Never create a new Alembic migration while one is listed as `IN PROGRESS`** in `BUILD_STATUS.md`. Migrations must be serialized.
5. **Stick to your ownership area** (Section 2). Cross-boundary edits require explicit coordination in `BUILD_STATUS.md`.
6. **Follow all existing patterns** — no new architectural patterns without a note in `BUILD_STATUS.md`.
7. **Every feature ships with tests.** No merging code without tests.

---

## 2. Ownership Table

### GitHub Copilot Owns
Copilot works interactively with the user in VS Code. Copilot handles exploratory, UI-heavy, and discussion-driven work.

| Area | Paths |
|------|-------|
| Frontend — Public website pages | `frontend/app/(public)/` |
| Frontend — Auth pages | `frontend/app/(auth)/` |
| Frontend — Dashboard module | `frontend/src/modules/dashboard/` |
| Frontend — Forms module (UI only) | `frontend/src/modules/forms/` |
| Frontend — Beneficiaries module | `frontend/src/modules/beneficiaries/` |
| Frontend — Mapping module | `frontend/src/modules/mapping/` |
| Frontend — Reports module | `frontend/src/modules/reports/` |
| Frontend — Shared UI components | `frontend/src/components/` |
| Frontend — Zustand stores | `frontend/src/stores/` |
| Mobile — Home, Settings screens | `mobile/app/(tabs)/index.tsx`, `mobile/app/(tabs)/settings.tsx` |
| Mobile — Login, Notifications | `mobile/app/login.tsx`, `mobile/app/notifications.tsx` |
| Documentation — User-facing docs | `docs/*.md` |
| AI Services | `ai-services/` (all files) |

### Codex Owns
Codex works headlessly on well-defined tasks. Codex handles backend, data, infrastructure, and test work.

| Area | Paths |
|------|-------|
| Backend — Auth & identity | `backend/app/api/v1/routes/auth.py`, `backend/app/services/auth_service.py` |
| Backend — Organizations & users | `backend/app/api/v1/routes/organizations.py`, `backend/app/api/v1/routes/users.py` |
| Backend — Projects & forms | `backend/app/api/v1/routes/projects.py`, `backend/app/api/v1/routes/forms.py` |
| Backend — Submissions | `backend/app/api/v1/routes/submissions.py`, `backend/app/services/collection_service.py` |
| Backend — Field officers | `backend/app/api/v1/routes/field_officers.py` |
| Backend — Mobile API | `backend/app/api/v1/routes/mobile.py`, `backend/app/services/mobile_service.py` |
| Backend — Governance & workflows | `backend/app/api/v1/routes/governance.py`, `backend/app/services/governance_service.py` |
| Backend — Indicators & surveys | `backend/app/api/v1/routes/indicators.py`, `backend/app/api/v1/routes/surveys.py` |
| Backend — Beneficiaries API | `backend/app/api/v1/routes/beneficiaries.py` |
| Backend — Administration | `backend/app/api/v1/routes/administration.py` |
| Backend — Platform (super admin) | `backend/app/api/v1/routes/platform.py` |
| Backend — All models | `backend/app/models/` |
| Backend — All repositories | `backend/app/repositories/` |
| Backend — All services | `backend/app/services/` |
| Backend — Core (auth, permissions, deps) | `backend/app/core/` |
| Database migrations | `backend/alembic/versions/` |
| Backend tests | `backend/tests/` |
| Frontend — Submissions module | `frontend/src/modules/submissions/` |
| Frontend — Field operations module | `frontend/src/modules/field_operations/` |
| Frontend — Indicators module | `frontend/src/modules/indicators/` |
| Frontend — Governance module | `frontend/src/modules/governance/` |
| Frontend — Administration module | `frontend/src/modules/administration/` |
| Frontend — Data quality module | `frontend/src/modules/data_quality/` |
| Frontend — API client layer | `frontend/src/lib/` |
| Frontend tests | `frontend/tests/` |
| Mobile — Form fill, Entity select | `mobile/app/(tabs)/form-fill/`, `mobile/app/(tabs)/entity-select/` |
| Mobile — Local DB & sync | `mobile/src/` |
| Mobile tests | `mobile/tests/` (if exists) |
| Data pipelines | `data-pipelines/` |
| Infrastructure | `infrastructure/`, `docker-compose.yml`, `Makefile` |
| Shared types | `shared/` |
| E2E & load tests | `tests/` |

### Shared Files (Both Agents Can Edit — With Care)
Both agents can edit these files. **Always read the current content before editing. Never overwrite the other agent's additions.**

| File | Protocol |
|------|----------|
| `BUILD_STATUS.md` | Append-only for status updates. Never delete another agent's entries. |
| `AGENTS.md` | Only structural changes after mutual coordination. |
| `frontend/app/layout.tsx`, `frontend/app/(app)/layout.tsx` | Check existing imports. Add imports, don't remove others. |
| `backend/app/main.py` | Router registration only. Add routers, never remove. |
| `backend/app/core/permissions.py` | Add new permissions. Never rename or remove existing ones. |
| `docker-compose.yml` | Add new services only. Don't modify existing service config. |

---

## 3. Database Migration Protocol

Migrations are the highest-risk shared resource. Only one migration can be in progress at a time.

1. Check `BUILD_STATUS.md` → "Migrations In Progress" section.
2. If empty, add your migration as `IN PROGRESS` before running `alembic revision`.
3. Run the migration, apply it, test it.
4. Move it to `BUILD_STATUS.md` → "Completed Migrations" with the migration ID.
5. If `IN PROGRESS` is already occupied, wait until the other agent marks it complete.

Migration naming: `YYYYMMDD_XXXX_short_description` (e.g., `20260608_0022_form_specific_officer_assignments`).

---

## 4. Branch & Commit Convention

Both agents commit directly to `main` for now (small team, serial development). When parallel work requires it, use:
- Copilot branches: `copilot/<short-description>`
- Codex branches: `codex/<short-description>`

Commit message format:
```
[area] short description (agent: Copilot|Codex)

Optional body with more details.
```

Examples:
```
[frontend] add beneficiary profile card component (agent: Copilot)
[backend] add indicator aggregation endpoint (agent: Codex)
[migration] add beneficiary soft-delete index (agent: Codex)
```

---

## 5. "Next Priority" Queue

When you finish work and `BUILD_STATUS.md` has open items in the queue, pick from the top of the list for your ownership area. Do not skip items without a reason noted in `BUILD_STATUS.md`.

---

## 6. Quality Gate (Both Agents Must Pass Before Committing)

### Backend
```bash
cd backend && ruff check app tests alembic
cd backend && mypy app --strict
cd backend && pytest tests/
```

### Frontend
```bash
cd frontend && npm run lint
cd frontend && npm run build
cd frontend && npm test -- --run
```

### AI Services
```bash
cd ai-services && ruff check app tests
cd ai-services && mypy app
cd ai-services && pytest tests/
```

---

## 7. Communication Pattern

Since both agents work asynchronously:

- **Copilot → Codex**: Leave a note in `BUILD_STATUS.md` under "Copilot Notes for Codex".
- **Codex → Copilot**: Leave a note in `BUILD_STATUS.md` under "Codex Notes for Copilot".
- **Blocking issues**: Prefix the note with `BLOCKED:` so the other agent can unblock it.

This file and `BUILD_STATUS.md` are the shared coordination layer. Neither agent needs to know the other is present — just read both files before starting any work.
