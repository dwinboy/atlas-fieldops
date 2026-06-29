import type { FeatureDetailContent } from "@/components/marketing/MarketingBlocks";

export const formBuilderContent: FeatureDetailContent = {
  eyebrow: "Features",
  title: "Build mobile-ready forms for any field workflow",
  lede: "Create surveys, inspections, audits, stock counts, registrations, follow-ups, delivery proof, training records, and custom forms with logic, validation, entity links, versioning, and governance.",
  capabilities: [
    { title: "40+ field types", description: "Text, numbers, choices, dates, GPS and geofence, photo and signature, barcode, ratings, matrices, and repeat groups — grouped so the common ones are one tap away." },
    { title: "Logic and validation", description: "Skip logic, required fields, ranges, and consent checks keep bad data out at the point of capture, before it ever reaches review." },
    { title: "Reference data and bindings", description: "Bind questions to controlled lists so enumerators choose from approved values instead of free text." },
    { title: "Versioning that's safe", description: "Edit a published form into a new draft version while the live version keeps collecting — publish only when the new version is ready." },
    { title: "Entity and duplicate controls", description: "Link forms to people, households, stores, facilities, products, assets, routes, cases, or custom records, then configure duplicate checks and submission frequency." },
    { title: "Templates and duplication", description: "Start from sector templates or duplicate a previous form in one click for recurring surveys, inspections, stock counts, audits, or follow-up visits." },
  ],
  workflow: [
    { title: "Pick a starting point", description: "Blank canvas, a sector template, a duplicate of an existing form, or an XLSForm import." },
    { title: "Build and configure", description: "Add questions, set skip logic and validation, then configure controls — workflow, governance, GPS, and duplicate rules — per question." },
    { title: "Test before you publish", description: "Preview the mobile experience and pass the publish-readiness checklist: project linked, no duplicate variables, valid logic, controls reviewed." },
    { title: "Publish and assign", description: "Publish the form and assign it to field officers — it reaches their devices on the next sync, online or offline." },
  ],
  outcomes: [
    "Every question can trace to the project, entity, workflow, KPI, dashboard, or report that needs it",
    "Clean data at source means less rework downstream",
    "Field teams see a simple form; managers keep full governance",
    "New survey rounds reuse proven instruments instead of starting over",
  ],
  related: [
    { title: "Offline Data Collection", href: "/features/offline-data-collection" },
    { title: "Indicator Frameworks", href: "/features/indicator-frameworks" },
    { title: "Data Quality Tools", href: "/features/data-quality" },
  ],
};

export const offlineDataCollectionContent: FeatureDetailContent = {
  eyebrow: "Features",
  title: "Collect anywhere, sync when connected",
  lede: "Field teams capture data fully offline on Android — forms, GPS, photos, and consent — and everything syncs safely the moment a connection returns, with no lost work.",
  capabilities: [
    { title: "True offline capture", description: "Download assigned forms and entity lists, then collect for days without signal. Drafts are saved locally before anything is sent." },
    { title: "Resilient sync queue", description: "Every offline change becomes a queued item. Failed uploads retry; nothing is silently dropped, and officers see exactly what's pending." },
    { title: "GPS and media evidence", description: "Capture coordinates with accuracy thresholds, photos, and signatures — attached to the submission and available for supervisor review." },
    { title: "Continue where you left off", description: "The collector app surfaces the most recent draft so an interrupted interview resumes in one tap." },
    { title: "On-device duplicate checks", description: "Advisory duplicate and frequency checks run on the device; the server remains the final authority on every record." },
    { title: "Device and version control", description: "Register devices, enforce a minimum app version, and remotely log out a lost device from the admin console." },
  ],
  workflow: [
    { title: "Assign work", description: "Supervisors assign published forms, projects, and locations to field officers from the workspace." },
    { title: "Sync down", description: "Officers open the app online once to pull assignments, forms, and the entities they need — then go offline." },
    { title: "Collect in the field", description: "Capture submissions, GPS, and media with validation enforced locally. Drafts persist across reboots." },
    { title: "Sync up and review", description: "On reconnection, queued submissions upload with their evidence and enter the review workflow automatically." },
  ],
  outcomes: [
    "No connectivity, no problem — work never blocks on signal",
    "Zero lost submissions, with a visible queue and retries",
    "GPS and photo evidence travel with every record",
    "Supervisors see synced field activity as soon as it lands",
  ],
  related: [
    { title: "Mobile Collector App", href: "/features/mobile-app" },
    { title: "Form Builder", href: "/features/form-builder" },
    { title: "Data Quality Tools", href: "/features/data-quality" },
  ],
};

export const indicatorFrameworksContent: FeatureDetailContent = {
  eyebrow: "Features",
  title: "Link every submission to your results framework",
  lede: "Define indicators with baselines, targets, and formulas, then let approved field data compute achievement automatically — from registration form to donor-ready progress.",
  capabilities: [
    { title: "Indicator library", description: "Maintain reusable indicators with code, definition, unit, baseline, target, reporting frequency, and responsible owner." },
    { title: "Formula-driven calculation", description: "Aggregate approved submissions with sum, count, average, and percentage formulas tied to specific form questions." },
    { title: "Disaggregation", description: "Break results down by sex, age, location, disability, and other dimensions captured in the field." },
    { title: "Targets that auto-track", description: "Link operational targets to an indicator and achievement updates itself from approved data — no manual tallying." },
    { title: "Baselines and revisions", description: "Record baselines and revise targets at midline with a full audit trail of what changed and why." },
    { title: "Report-ready output", description: "Indicator progress flows straight into dashboards and donor report packages." },
  ],
  workflow: [
    { title: "Define the indicator", description: "Set its definition, unit, baseline, and target, and choose the reporting frequency." },
    { title: "Connect the data source", description: "Point the indicator's formula at the form question that feeds it." },
    { title: "Collect and approve", description: "Field submissions are reviewed; only approved records contribute to the calculation." },
    { title: "Track and report", description: "Achievement recalculates from approved data and appears in dashboards, maps, and reports." },
  ],
  outcomes: [
    "One number, traceable from a field submission to a donor report",
    "Less spreadsheet tallying and fewer reconciliation errors",
    "Midline target changes are explainable and audited",
    "Disaggregated results without re-querying the field",
  ],
  related: [
    { title: "Dashboards & Reporting", href: "/features/dashboards-reporting" },
    { title: "Form Builder", href: "/features/form-builder" },
    { title: "Data Quality Tools", href: "/features/data-quality" },
  ],
};

export const dataQualityContent: FeatureDetailContent = {
  eyebrow: "Features",
  title: "Validation, versioning, and audit trails",
  lede: "Catch issues before they reach reports. Atlas FieldOps flags duplicates, outliers, GPS problems, and missing data, and keeps an immutable record of every review and correction.",
  capabilities: [
    { title: "Quality signals", description: "Duplicates, outliers, GPS-outside-boundary, missing required data, and validation failures surface automatically as resolvable issues." },
    { title: "Review workflow", description: "Approve clean records, return them for correction with a note, or reject — every decision carries a reviewer comment." },
    { title: "Bulk resolution", description: "Clear a queue of similar issues together with one shared comment, while each record keeps its own audit entry." },
    { title: "Duplicate detection", description: "Configurable matching on phone, national ID, household ID, name plus village, and GPS, with block, warn, or review actions." },
    { title: "Correction logging", description: "Edits to approved submissions create change requests and a correction log instead of silent overwrites." },
    { title: "Immutable audit trail", description: "Who changed what, when, and why — recorded for submissions, entities, indicators, and governance actions." },
  ],
  workflow: [
    { title: "Prevent at source", description: "Form validation, required evidence, and consent checks stop bad data before it syncs." },
    { title: "Detect automatically", description: "Synced submissions are scanned for duplicates, outliers, GPS issues, and gaps." },
    { title: "Resolve with evidence", description: "Reviewers approve, return, or reject — individually or in bulk — with comments captured each time." },
    { title: "Report only approved data", description: "Indicators and reports draw exclusively from records that passed the agreed review path." },
  ],
  outcomes: [
    "Reports built only on data you can defend",
    "Issues triaged in batches instead of one slow record at a time",
    "Every correction explainable to an auditor or donor",
    "Duplicates caught by rules, not by luck",
  ],
  related: [
    { title: "Indicator Frameworks", href: "/features/indicator-frameworks" },
    { title: "Form Builder", href: "/features/form-builder" },
    { title: "Data Security", href: "/security" },
  ],
};

export const dashboardsReportingContent: FeatureDetailContent = {
  eyebrow: "Features",
  title: "Real-time visibility into program performance",
  lede: "From a manager's morning action queue to a donor-ready report package, Atlas FieldOps turns approved field data into decisions, dashboards, and exports.",
  capabilities: [
    { title: "Action-first dashboard", description: "The workspace opens on what needs you today — submissions to review, quality flags, overdue assignments, and stale sync." },
    { title: "Donor report packages", description: "Create a report scoped to a project and period; it computes KPIs from approved submissions and indicators and exports cleanly." },
    { title: "Coverage and maps", description: "See where data is and isn't coming from, with GPS-tagged submissions and per-project data coverage." },
    { title: "Indicator progress", description: "Baseline-to-target achievement, disaggregated, drawn live from approved data." },
    { title: "Governed exports", description: "Exports require permission and are logged, so sensitive data leaves the system only with an audit trail." },
    { title: "Standard and custom reports", description: "Reusable program, submission, and indicator reports plus ad-hoc views for specific questions." },
  ],
  workflow: [
    { title: "Approve the data", description: "Reviewed, approved submissions become the single source of truth for every output." },
    { title: "Compute indicators", description: "Formulas aggregate approved data into indicator achievement and disaggregations." },
    { title: "Assemble a report", description: "Scope a report to a project and reporting period and generate its KPIs in one step." },
    { title: "Share and export", description: "Distribute dashboards or export governed files for donors and leadership." },
  ],
  outcomes: [
    "Managers act on today's priorities, not last month's spreadsheet",
    "Donor reports assembled from approved evidence in minutes",
    "Geographic gaps visible before they become coverage problems",
    "Every export accountable and logged",
  ],
  related: [
    { title: "Indicator Frameworks", href: "/features/indicator-frameworks" },
    { title: "Data Quality Tools", href: "/features/data-quality" },
    { title: "Solutions for Donors", href: "/solutions" },
  ],
};

export const mobileAppContent: FeatureDetailContent = {
  eyebrow: "Features",
  title: "Built for fieldwork on any device",
  lede: "The Atlas FieldOps mobile collector is an offline-first Android app designed for real field conditions — low-end devices, weak networks, and long days away from the office.",
  capabilities: [
    { title: "Offline-first by design", description: "Assignments, forms, and entity lists live on the device; collection never depends on a live connection." },
    { title: "Today's work, front and center", description: "The home screen shows assignments, ready forms, drafts, sync queue, and a one-tap card to continue the latest draft." },
    { title: "GPS, photos, and consent", description: "Capture location with accuracy thresholds, attach media, and record consent before collecting personal data." },
    { title: "Sync center", description: "A clear queue shows what's pending, synced, or failed, with retry — so officers always know their upload status." },
    { title: "Field visit requests", description: "Officers request and log field movements with GPS check-in evidence for supervisor approval." },
    { title: "Secure device access", description: "QR-based field officer login, registered devices, and remote logout keep workspace data protected." },
  ],
  workflow: [
    { title: "Sign in securely", description: "Field officers authenticate, including QR-based login, and pull their assigned work." },
    { title: "Work offline", description: "Collect submissions, GPS, and media for as long as needed with validation enforced on device." },
    { title: "Resume and finish", description: "Interrupted interviews continue from the latest draft; nothing has to be redone." },
    { title: "Sync and hand off", description: "When signal returns, the queue uploads and records enter review automatically." },
  ],
  outcomes: [
    "Works on the low-end Android devices field teams actually carry",
    "A day in the field never blocks on connectivity",
    "Officers always know what's collected and what's pending",
    "Lost or stolen devices can be locked out remotely",
  ],
  related: [
    { title: "Offline Data Collection", href: "/features/offline-data-collection" },
    { title: "Form Builder", href: "/features/form-builder" },
    { title: "Data Security", href: "/security" },
  ],
};
