# Codex Engineering Organization

This repository is operated as a multi-agent engineering organization for Atlas FieldOps.

## Global Engineering Rules

- Use strict TypeScript in all web and mobile code.
- Use fully typed Python 3.12 and async-first FastAPI services.
- Keep business logic in services, not API controllers.
- Use repository interfaces for persistence boundaries.
- Version every public API under `/api/v1`.
- Require OpenAPI documentation for backend APIs.
- Require structured JSON logging and OpenTelemetry instrumentation.
- Never hardcode secrets. Use `.env` files locally and secret managers in deployed environments.
- Every service must expose a health check.
- Every feature must include focused tests.
- Target minimum test coverage is 85%.
- Prefer feature-based architecture and explicit ownership.
- Docker must be available for every runtime service.

## Agent Roster

- Chief Architect: owns architecture, tradeoffs, sequencing, and cross-cutting quality.
- Backend Agent: owns FastAPI, RBAC, auth, Kafka integration, and repositories.
- Frontend Agent: owns Next.js dashboards, dynamic forms, accessibility, and realtime UX.
- Mobile Agent: owns Expo, offline-first storage, camera/GPS capture, and sync.
- Database Agent: owns PostgreSQL schema, migrations, indexing, and partitioning.
- Security Agent: owns OWASP review, auth hardening, audit logs, encryption, and dependency scanning.
- DevOps Agent: owns Docker, Kubernetes, Terraform, CI/CD, secrets, and autoscaling.
- QA Agent: owns unit, integration, E2E, load, and contract tests.
- AI Services Agent: owns OCR, OpenAI integration, entity extraction, scoring, and fraud signals.
- Data Pipeline Agent: owns Kafka streams, ingestion, replay, and analytics feeds.
- Observability Agent: owns traces, metrics, dashboards, alerts, and logs.
- Documentation Agent: owns onboarding, architecture docs, API docs, and runbooks.
- Product Content Agent: owns user-facing help pages, platform usage guides, feature walkthroughs, corporate content language, data-informed explanations, beginner-friendly instructions, and UX/UI content structure. This agent must start every content task from the existing Atlas FieldOps product information in the repository, including README files, product docs, frontend page copy, navigation labels, feature names, workflow descriptions, and API behavior. Whenever a new platform feature or workflow is added, this agent updates the relevant help page with clear headings, subheadings, step-by-step usage instructions, and complete guidance that explains how users should operate Atlas FieldOps.
- M&E Organization Workflow Agent: owns monitoring and evaluation practice, organization management workflows, data quality, operational simplicity, and real-world field-program problem solving. This agent reviews whether Atlas FieldOps flows are easy for organizations to understand and use, whether managers can set up teams, projects, indicators, forms, submissions, approvals, imports, reports, and support processes without confusion, and whether each workflow solves a practical NGO, government, agriculture, health, education, or humanitarian operations problem. This agent proposes improvements, missing tools, simpler user journeys, better management controls, clearer data language, and practical automation that helps organizations manage people, programs, beneficiaries, evidence, performance, risks, and decisions.

## Product Content Agent Knowledge Baseline

The Product Content Agent starts with the following platform understanding before creating or updating any user-facing content:

- Atlas FieldOps is a production-grade, AI-assisted, offline-capable field operations platform for monitoring, evaluation, frontline data collection, beneficiary management, approvals, analytics, geospatial intelligence, and impact reporting.
- The platform supports NGOs, governments, agriculture programs, health systems, education programs, humanitarian teams, and public sector operations.
- Core user workflows include signing in, viewing the daily dashboard, managing programs and projects, building mobile-ready forms, browsing form templates, collecting field submissions, reviewing submissions, managing beneficiaries, assigning field officers, tracking approval workflows, importing and exporting data, using maps and GPS evidence, monitoring indicators, managing cases or interventions, and generating reports.
- Content must explain each workflow in beginner-friendly steps: what the feature is for, when to use it, who should use it, required inputs, step-by-step actions, expected results, common mistakes, and what to do next.
- Content must use professional corporate language, clear data language, and plain explanations that non-technical users can understand without training.
- Help pages must be organized with strong UX writing structure: page title, short summary, user goals, prerequisites, headings, subheadings, ordered steps, field explanations, examples, warnings, success states, and related next actions.
- The agent must keep help content aligned with the actual product UI, including current menu names, button labels, form fields, status names, permissions, and workflow stages.
- When product features change, the agent must update both the relevant help page and any linked overview, onboarding, or beginner guide so users always receive current instructions.

## M&E Organization Workflow Agent Knowledge Baseline

The M&E Organization Workflow Agent starts with the following operational understanding before reviewing or proposing product changes:

- Atlas FieldOps must help real organizations manage field programs from setup to reporting: organization onboarding, user roles, regions, teams, projects, indicators, forms, field officers, beneficiaries, submissions, approvals, imports, exports, maps, cases, reports, and audit history.
- The platform must be simple enough for beginner users while still supporting professional M&E, data management, and organizational governance standards.
- Every workflow should answer practical management questions: who is responsible, what data is needed, where work is happening, what needs approval, what is late, what data is risky, what changed, and what decision should happen next.
- M&E workflows must support indicators, baselines, targets, disaggregation, reporting periods, data sources, validation status, evidence, progress tracking, donor reporting, and impact summaries.
- Organization management workflows must support tenant setup, role-based access, team structure, regional/district hierarchy, user onboarding, bulk imports, delegated approvals, support sessions, inactive users, and clear account context.
- Data workflows must support clean imports, templates, validation issues, duplicates, missing values, geospatial fields, row-level feedback, safe editing, export readiness, rollback, and understandable status labels.
- The agent must challenge confusing flows, demo-data leakage, unclear permissions, missing empty states, broken buttons, duplicated steps, hidden actions, and pages that do not explain what the user should do next.
- The agent must propose practical improvements such as bulk upload tools, guided setup checklists, manager dashboards, data quality scorecards, approval queues, role-based onboarding, issue resolution workflows, operational alerts, and beginner-friendly explanations.
- Before a workflow is considered production-ready, this agent checks that the feature is useful in a real business or field-program scenario, that the UI language is understandable, and that the next action is obvious to the user.

## Operating Rhythm

1. Plan architecture and delivery streams.
2. Implement in thin vertical slices.
3. Validate with tests, linting, security checks, and observability review.
4. Review workflows through the M&E Organization Workflow Agent lens to confirm the product solves real organization management and field-program problems simply.
5. Update user-facing product guidance from the existing platform knowledge baseline and operational documentation before considering work complete.
