import {
  BarChart3,
  Bell,
  BookOpenCheck,
  Boxes,
  Building2,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Database,
  Download,
  FileText,
  GitPullRequestArrow,
  HelpCircle,
  Map,
  MapPin,
  Navigation,
  RadioTower,
  RefreshCw,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UsersRound,
  Wifi,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getNavigationItemByView } from "@/config/navigation";
import { useWorkspaceStore, type WorkspaceView } from "@/stores/workspace";

type HelpAction = {
  label: string;
  view: WorkspaceView;
  route?: string;
};

type HelpTopic = {
  id: string;
  title: string;
  purpose: string;
  audience: string;
  /** Web topics open a workspace; mobile topics describe the Android app and have no web view. */
  platform?: "web" | "mobile";
  view?: WorkspaceView;
  icon: typeof HelpCircle;
  whenToUse: string;
  beforeYouStart: string[];
  steps: string[];
  dataLanguage: string[];
  goodPractice: string[];
  avoid: string[];
  result: string;
  nextActions: HelpAction[];
};

const onboardingPath = [
  {
    title: "Sign in and confirm your workspace",
    text: "Use your organization slug, email, and password. After signing in, confirm you are in the correct organization before creating records or approving work.",
  },
  {
    title: "Start from Dashboard",
    text: "Use Dashboard to review active form cards, response counts, synced records, review queues, role focus, setup health, data quality, and priority actions before opening detailed workspaces.",
  },
  {
    title: "Complete organization readiness",
    text: "Follow the readiness plan: create team access, projects, sector settings, forms, metrics where needed, imports, and the first collection form so every submission has project context.",
  },
  {
    title: "Collect, review, and report",
    text: "Field officers collect data, supervisors review submissions, and approved information flows into maps, dashboards, metrics, reports, and operational records.",
  },
];

const rolePaths = [
  [
    "Platform super admin",
    "Create organizations, manage tenant status, open support sessions, review platform health, audit logs, usage metrics, and safe runtime settings.",
  ],
  [
    "Organization admin",
    "Set up team access, roles, projects, approval workflows, and governance rules before field activity begins.",
  ],
  [
    "Operations / data manager",
    "Create projects, configure sector terminology, connect forms to entities and metrics where needed, monitor data quality, and prepare reports from approved submissions.",
  ],
  [
    "Field supervisor",
    "Assign officers, monitor sync health, review submissions, request corrections, and track field coverage.",
  ],
  [
    "Field officer",
    "Use assigned mobile-ready forms, capture required evidence, save work offline, and sync when connectivity returns.",
  ],
  [
    "Data manager",
    "Import datasets, map columns, clean validation issues, export approved records, and protect data lineage.",
  ],
];

const helpTopics: HelpTopic[] = [
  {
    id: "platform-navigation",
    title: "Understand the platform navigation",
    purpose:
      "Atlas FieldOps is organized into business domains so managers can move from projects, to forms, to fieldwork, to submissions, to analysis, to governance without hunting through duplicate pages.",
    audience:
      "All users, especially new organization admins, M&E managers, supervisors, and data managers",
    view: "dashboard",
    icon: Boxes,
    whenToUse:
      "Use this guide when you are not sure where a task belongs or when training a new team member on the platform structure.",
    beforeYouStart: [
      "Confirm your account role because the sidebar only shows modules your role can access.",
      "Use Search if you know the task name but not the correct module.",
      "Remember that detailed work belongs in the module, while Dashboard only summarizes what needs attention.",
    ],
    steps: [
      "Open Dashboard first for the high-level operating picture: active forms, submissions, quality, approvals, indicators, field activity, and maps.",
      "Use Projects for program setup, project teams, locations, assignments, indicators, reports, and project audit history.",
      "Use Forms for the builder, templates, reference data, permissions, workflow, data quality settings, governance, mapping settings, versions, and audit trail for each form.",
      "Use Field Operations for field officers, supervisors, assignments, work plans, targets, and monitoring.",
      "Use Submissions for collected records, review, approval, rejection, correction, and archive.",
      "Use Mapping, Indicators, Reports, and Data Quality for analysis, quality investigation, and formal outputs.",
      "Use Users & Teams for accounts, roles, teams, organizations, permissions, and activity logs.",
      "Use Governance for audit, policies, approvals, retention, consent, compliance, and data stewardship.",
      "Use Administration only for system-wide settings, reference data, location hierarchy, APIs, integrations, notifications, and backup or recovery controls.",
    ],
    dataLanguage: [
      "Business domain",
      "Project",
      "Form",
      "Submission",
      "Indicator",
      "Report",
      "Governance",
    ],
    goodPractice: [
      "Keep form-level controls inside Forms, not Administration.",
      "Keep system-wide settings inside Administration, not Governance.",
      "Use Data Quality to investigate issues before exporting reports.",
    ],
    avoid: [
      "Do not create duplicate pages for the same task in different modules.",
      "Do not treat Dashboard as a place for deep editing or report building.",
      "Do not put GIS tools inside Reports unless the output is a static report artifact.",
    ],
    result:
      "Users know where to go next and the platform stays clean, predictable, and easier to support.",
    nextActions: [
      { label: "Open Dashboard", view: "dashboard" },
      { label: "Build forms", view: "forms", route: "/forms/create" },
    ],
  },
  {
    id: "platform-console",
    title: "Manage the platform as a super admin",
    purpose:
      "The Platform console is for Atlas FieldOps operators who manage the whole platform. It is separate from tenant workspaces and should be used for organization setup, production support, usage review, audit checks, and safe configuration review.",
    audience: "Platform super admins and trusted support operators",
    view: "platform",
    icon: ShieldCheck,
    whenToUse:
      "Use the Platform console when onboarding a new organization, checking production readiness, opening a tenant support session, reviewing platform administrators, or investigating tenant-level issues.",
    beforeYouStart: [
      "Confirm you are signed in with the platform super admin account, not a tenant owner account.",
      "Verify the Railway backend has DATABASE_URL, JWT_SECRET, and BACKEND_CORS_ORIGINS configured.",
      "Prepare verified organization details before creating a new tenant: name, slug, owner name, owner email, and temporary password.",
    ],
    steps: [
      "Open `/platform` after signing in with the Super Admin account. Super Admin opens the Platform Console by default.",
      "Use Platform Overview to review tenant count, platform admin count, audit events, service health, feature flags, backups, and setup attention.",
      "Use Organizations to create a tenant, review first admin email, suspend or reactivate access, and start support access only with a real support reason.",
      "Use Global Users to search users across organizations, review roles, and support account status without editing project, form, or submission data.",
      "Use Global Roles to review protected platform role templates and keep Super Admin separate from organization System Admin.",
      "Use Feature Flags to review global defaults and future organization overrides.",
      "Use Audit Logs and Security to review immutable platform actions, sessions, MFA readiness, failed-login patterns, and high-risk account events.",
      "Use Integrations, Backups, and Platform Settings to review platform-wide providers, backup readiness, and safe runtime configuration.",
    ],
    dataLanguage: [
      "Organization count",
      "Platform admin",
      "Support mode",
      "Audit event",
      "Runtime setting",
      "Tenant usage",
    ],
    goodPractice: [
      "Keep platform work and tenant work separate so support actions are clear and auditable.",
      "Use support mode instead of asking tenant users for their passwords.",
      "Return to the platform console immediately after finishing tenant troubleshooting.",
      "Create organizations only from verified onboarding information.",
    ],
    avoid: [
      "Do not use the super admin account for routine tenant data entry.",
      "Do not deactivate an organization unless access must be paused for security, contract, or operational reasons.",
      "Do not enable editable global settings without an audited backend configuration endpoint.",
    ],
    result:
      "The platform operator can safely manage tenants, diagnose setup problems, and support organizations without confusing platform ownership with tenant operations.",
    nextActions: [
      { label: "Create organization", view: "platform" },
      { label: "Read governance guidance", view: "governance" },
    ],
  },
  {
    id: "administration",
    title: "Configure system administration",
    purpose:
      "Administration is the platform-wide configuration center. It controls global locations, reusable reference data, notification rules, API access, integrations, system defaults, feature flags, backups, and recovery requests.",
    audience: "System admins and platform operators",
    view: "administration",
    icon: Database,
    whenToUse:
      "Use Administration when a setting affects the whole platform or provides reusable master data for projects, forms, field operations, mapping, indicators, and reports.",
    beforeYouStart: [
      "Confirm you are signed in as a platform super admin or system admin.",
      "Decide whether the change is system-wide. If it belongs to one form, project, user group, or policy workflow, use the correct module instead.",
      "Prepare approved codes, owners, environments, retention periods, and change reasons before updating live configuration.",
    ],
    steps: [
      "Open Administration under System.",
      "Review the Administration Dashboard first to check platform health, failed jobs, integrations, backups, active feature flags, recent changes, and environment information.",
      "Use Location Hierarchy to create, import, archive, search, and export countries, regions, districts, communities, villages, and facilities.",
      "Use Reference Data to create reusable lists such as donors, facility types, intervention types, currencies, languages, beneficiary categories, and official location values.",
      "Use Notification Settings to configure email, in-app, SMS-ready, and push-ready rules for project, assignment, submission, approval, quality, governance, and system alerts.",
      "Use API Settings to create, rotate, revoke, and monitor API keys with the correct owner, scope, and rate limit.",
      "Use Integrations to register external services, test connections, and disconnect tools that are no longer approved.",
      "Use System Settings to update global defaults, localization, branding, security settings, session behavior, MFA requirements, allowed domains, and feature flags.",
      "Use Backup & Recovery to request database, file, or configuration backups and to request restores only with a documented reason.",
      "Review Governance Audit Trail when you need immutable evidence of system setting changes, API key events, integration changes, backups, restores, or feature flag updates.",
    ],
    dataLanguage: [
      "Location hierarchy",
      "Reference list",
      "Notification rule",
      "API key",
      "Integration",
      "Feature flag",
      "Backup job",
      "Recovery request",
      "System audit log",
    ],
    goodPractice: [
      "Keep Administration focused on global configuration and reusable platform data.",
      "Use clear codes and names so imported locations and reference values can be matched reliably.",
      "Rotate or revoke API keys immediately when ownership, vendor access, or security risk changes.",
      "Test integrations after configuration changes and before field teams depend on them.",
      "Treat recovery requests as elevated actions that require a clear operational reason.",
    ],
    avoid: [
      "Do not manage tenant users, roles, or teams here; use Users & Teams.",
      "Do not put consent, retention policy, compliance, or approval governance here; use Governance unless the setting is truly platform-wide infrastructure.",
      "Do not configure form-specific reference bindings, review rules, or data quality controls here; use Forms.",
      "Do not enable feature flags in production without confirming the related module is ready for users.",
    ],
    result:
      "The platform remains healthy, auditable, and consistently configured across organizations, projects, forms, maps, reports, and integrations.",
    nextActions: [
      { label: "Open Administration", view: "administration" },
      { label: "Review audit trail", view: "governance" },
    ],
  },
  {
    id: "users-teams",
    title: "Manage users, teams, roles, and access",
    purpose:
      "Users & Teams is the People workspace. It controls who can sign in, which role they have, which team they belong to, where they can work, and what actions they can perform.",
    audience:
      "System admins, organization owners, M&E managers, data managers, and supervisors with assigned team visibility",
    view: "organizations",
    icon: UsersRound,
    whenToUse:
      "Use Users & Teams when creating accounts, importing many users, assigning stacked roles, reviewing operational role profiles, organizing teams, checking organization structure, testing access, or reviewing identity activity.",
    beforeYouStart: [
      "Confirm the user belongs to the correct organization before creating or editing their account.",
      "Choose the least powerful role that still lets the person complete their work.",
      "Prepare team, location, project, and supervisor assignments before field work begins.",
    ],
    steps: [
      "Open Users & Teams under People.",
      "Review Overview first to check total users, active users, roles, teams, access alerts, active sessions, and permission readiness.",
      "Use Users to create one user, import many users from CSV, activate or deactivate access, assign roles, review generated operational profiles, and reset temporary passwords.",
      "Open a user's Profile action to review role-specific responsibilities, access scope, team and supervisor context, workload signals, quality controls, governance checks, and mobile readiness.",
      "Use Roles to review permission sets and create custom roles from the approved permission catalog.",
      "Use Teams to create operational teams, assign team leads, and organize field officers, supervisors, data quality officers, and analysts.",
      "Use Organizations to review the tenant organization hierarchy such as head office, regional office, and district office.",
      "Use Permissions to inspect the permission matrix and run access tests before assigning sensitive work.",
      "Use Activity Logs to monitor account, role, team, permission, and identity changes. Use Governance for the full immutable audit trail.",
    ],
    dataLanguage: [
      "User",
      "Role",
      "Operational profile",
      "Permission",
      "Team",
      "Organization unit",
      "Access scope",
      "Activity log",
    ],
    goodPractice: [
      "Keep user accounts active only while people are working for the organization.",
      "Assign supervisors by team and location so they only see the records they should review.",
      "Use stacked roles when one person has more than one job, then review their operational profiles to confirm each responsibility is understandable.",
      "Test access after changing sensitive roles or permissions.",
      "Use CSV import when onboarding many field officers or supervisors.",
    ],
    avoid: [
      "Do not manage global reference data here; use Administration.",
      "Do not create governance policies here; use Governance.",
      "Do not give field officers broad organization access when own-record or assigned-form access is enough.",
    ],
    result:
      "Managers understand who is using the platform, how people are organized, and whether access is controlled correctly.",
    nextActions: [
      { label: "Open Users & Teams", view: "organizations" },
      { label: "Review Governance", view: "governance" },
    ],
  },
  {
    id: "daily-work",
    title: "Use the dashboard",
    purpose:
      "Dashboard is the operational starting point. It starts with active form activity cards, then shows role-specific guidance, guided setup, management health, the data quality path, what needs attention now, review queues, sync health, and field team activity.",
    audience: "Program managers, supervisors, and operations leads",
    view: "dashboard",
    icon: BookOpenCheck,
    whenToUse:
      "Use this page at the beginning of each day, before a supervisor review meeting, or whenever you need a fast overview of field operations.",
    beforeYouStart: [
      "Confirm you are signed into the correct organization workspace.",
      "Check that your role allows access to reviews, data tools, or field team actions.",
      "Make sure the reporting period you are reviewing matches the current field activity window.",
    ],
    steps: [
      "Open Dashboard from the left navigation.",
      "Review Active forms and responses first to see which forms are live or already receiving submissions.",
      "Use each form card to check response count, synced records, pending review, approved responses, and last sync.",
      "Open a form card to see the form name, its purpose or use, number of responses, sync status, project and survey context, and edit or review actions.",
      "Use the small question-mark help buttons when you need a short explanation without crowding the dashboard.",
      "Read Your role focus to understand what your account is responsible for and which workspaces are most important for your role.",
      "Review Organization readiness plan to see whether team access, projects, indicators, imports, and the first form are complete.",
      "Use Management signals to check setup readiness, data quality, M&E reporting readiness, and offline sync readiness.",
      "Use Data quality path to move from form design, to quality detection, to correction, and finally to approved reporting.",
      "Read the summary cards for beneficiaries, active programs, indicators, open cases, clean submissions, and review wait time.",
      "Review Needs attention to identify duplicates, pending approvals, overdue corrections, or records that need manual checking.",
      "Use Manager questions to jump directly to the workspace that answers who can work, what will be measured, whether data is safe, or what needs action today.",
      "Use quick actions when you need to create a form, review submissions, invite an officer, or import data.",
      "Open the relevant workspace from the card or quick action, complete the task, then return to Dashboard to confirm the issue is reduced or resolved.",
    ],
    dataLanguage: [
      "Role focus",
      "Setup readiness",
      "Data quality",
      "Data quality path",
      "M&E reporting",
      "Offline ready",
      "Submissions saved",
      "Waiting to sync",
      "Open cases",
    ],
    goodPractice: [
      "Treat Dashboard as the operational control room, not the place to edit every record.",
      "Resolve high-risk items first, such as possible duplicates or submissions waiting for supervisor action.",
      "Use the review and sync indicators together; a low review queue can still hide offline submissions that have not synced yet.",
    ],
    avoid: [
      "Do not report final numbers from Dashboard until submissions have synced and passed review.",
      "Do not ignore repeated retry or sync warnings; they can indicate field officers need support.",
    ],
    result:
      "The team understands the current operating picture and knows which workspace to open next.",
    nextActions: [
      { label: "Review submissions", view: "submissions" },
      { label: "Check sync health", view: "connectivity" },
    ],
  },
  {
    id: "programs",
    title: "Manage projects",
    purpose:
      "Projects are the operational foundation of Atlas FieldOps. They organize funder or client context, locations, teams, forms, assignments, submissions, entities, metrics, reports, settings, and audit history without replacing the specialist modules that manage those records.",
    audience: "Organization administrators, operations managers, data managers, and M&E managers",
    view: "programs",
    icon: Building2,
    whenToUse:
      "Use Projects when launching a new program, inspection, inventory process, sales operation, research study, donor-funded activity, implementation geography, or reporting structure.",
    beforeYouStart: [
      "Prepare the project name, code, project type, funder/client/donor if any, implementing organization, owner, and location scope.",
      "Choose the sector pack that best matches the work, such as agriculture, health, education, retail, inventory, logistics, manufacturing, audits, inspections, asset management, or custom.",
      "Confirm which forms, entities, metrics, teams, assignments, submissions, reports, and governance controls will belong to the project.",
      "Agree on who can create, activate, suspend, close, archive, or only view the project.",
    ],
    steps: [
      "Open Projects under Operations.",
      "Review the Projects Dashboard to see total projects, active projects, draft projects, closed projects, entities, submissions, active forms, field officers, completion, metric achievement, health, risks, and deadlines.",
      "Use All Projects to search, filter, export, and open project workspaces.",
      "Create a project with the guided wizard. Start with the sector pack, then confirm basic information, locations, entity structure, metrics, forms, governance, and review.",
      "Review the sector recommendations for entity types, starter forms, metrics, validation rules, dashboard widgets, reports, mobile guidance, and data quality rules. Keep the recommendations that fit the project and edit anything that needs local adaptation.",
      "After the project is created, use the project setup checklist to install sector starter forms, metric templates, and report templates as editable drafts.",
      "Open a project workspace and use the tabs: Overview, Entities, Forms & Metrics, Locations & Teams, Submissions & Reports, Data Quality & Governance, and Settings.",
      "Use each tab as a contextual view. Open Forms, Metrics/Indicators, Users & Teams, Submissions, Reports, Mapping, or Governance when detailed work belongs in those modules.",
      "Review project health before activation or management meetings. Health combines progress, assignments, metrics where used, submissions, and data quality risk.",
    ],
    dataLanguage: [
      "Project name",
      "Project code",
      "Sector pack",
      "Funder / client / donor",
      "Geography",
      "Project health",
      "Assignments",
      "Entities",
      "Metrics",
      "Audit trail",
    ],
    goodPractice: [
      "Use clear project names that match funder, client, compliance, or internal reporting language.",
      "Use sector packs to start faster, but let the responsible manager adjust metrics, forms, validation rules, and governance to the actual project design.",
      "Review installed sector forms before publishing them to field officers; starter forms are a professional base, not a replacement for project-specific review.",
      "Keep geography consistent across projects, entities, maps, and reports.",
      "Use project templates for repeated assessment, inspection, inventory, registration, review, or multi-location structures.",
      "Review project setup before publishing forms or assigning field teams.",
    ],
    avoid: [
      "Do not create duplicate projects for the same operating activity.",
      "Do not manage form design, submission review, GIS analysis, user accounts, or system settings inside Projects.",
      "Do not activate a project until ownership, locations, teams, metrics where used, forms, and governance are clear.",
    ],
    result:
      "Submissions, entities, metrics, maps, and reports are linked to the right project structure.",
    nextActions: [
      { label: "Manage surveys", view: "surveys" },
      { label: "Track indicators", view: "indicators" },
    ],
  },
  {
    id: "surveys",
    title: "Manage surveys as M&E activities",
    purpose:
      "Surveys are the main operational object in Atlas FieldOps. A survey represents the actual M&E activity, such as a baseline, midline, endline, registration, monitoring, verification, assessment, evaluation, or follow-up exercise.",
    audience: "Project managers, M&E managers, survey managers, supervisors, data quality officers, analysts, and enumerator coordinators",
    view: "surveys",
    icon: ClipboardCheck,
    whenToUse:
      "Use Survey Management after a project exists and before creating any form. Every form, submission, indicator comparison, and survey report should belong to a survey.",
    beforeYouStart: [
      "Select the project that owns the survey.",
      "Prepare the survey title, survey code, survey type, manager, date range, geography, target population, and linked indicators.",
      "Confirm who will own the survey and which staff will supervise, collect, review, analyze, and approve data.",
    ],
    steps: [
      "Open Surveys under Plan & monitor.",
      "Select the project that contains the M&E activity.",
      "Create the survey with a clear title, unique code, type, dates, geography, and target population.",
      "Assign survey roles such as Survey Owner, Survey Manager, Survey Supervisor, Data Quality Officer, Enumerator, and Analyst.",
      "Open Governance to define who can see synchronized form data, review records, approve records, edit records, request corrections, upload Excel data, and export survey data.",
      "Open Forms only after the survey is created, then build or copy forms into the selected survey.",
      "Open Data upload when existing Excel data must be imported into a survey form. Download the template first, keep the column names unchanged, upload the completed file, then review issues before approval.",
      "Monitor survey progress, completion, coverage, submissions, data quality, enumerator performance, indicators, and reports from the survey workspace.",
    ],
    dataLanguage: [
      "Survey code",
      "Survey type",
      "Survey owner",
      "Survey team",
      "Survey governance",
      "Data upload template",
      "Target population",
      "Linked indicators",
    ],
    goodPractice: [
      "Use survey names that match donor and evaluation language, such as Baseline Survey or Farmer Registration Survey.",
      "Keep survey codes short and stable so exports and reports are easy to identify.",
      "Create separate surveys for baseline, midline, endline, registration, and routine monitoring so comparisons stay clean.",
      "Set data visibility and approval rules before field officers start syncing records.",
      "Use the survey form Excel template when uploading existing data so columns match the collection instrument.",
    ],
    avoid: [
      "Do not create standalone forms without selecting a survey.",
      "Do not upload spreadsheet data into a survey form without downloading and matching the survey form template first.",
      "Do not reuse one survey for unrelated activities that have different targets, geographies, or reporting requirements.",
    ],
    result:
      "Project work is organized by survey, and every form, submission, indicator, and report has a clear M&E activity behind it.",
    nextActions: [
      { label: "Build survey forms", view: "forms" },
      { label: "Track indicators", view: "indicators" },
    ],
  },
  {
    id: "forms",
    title: "Build mobile-ready forms",
    purpose:
      "Forms define what field officers collect on mobile devices. In Atlas FieldOps, every form must belong to one survey inside one project.",
    audience: "Data managers, M&E teams, and field supervisors",
    view: "forms",
    icon: ClipboardList,
    whenToUse:
      "Use Forms after selecting the project and survey that the form will serve.",
    beforeYouStart: [
      "Confirm the project, survey, target users, language, and field collection method.",
      "List the required questions, evidence types, validation rules, and consent requirements.",
      "Decide which answers are mandatory and which can be optional.",
    ],
    steps: [
      "Open Survey Management and confirm the target survey exists.",
      "Open Form builder, use the Templates tab to copy a recommended form into that survey, or create one manually.",
      "Add sections in the order a field officer should complete them in the field.",
      "Add question labels, helper text, field types, required rules, validation rules, repeat groups, GPS capture, photos, files, signatures, or calculated fields where needed.",
      "Open Form Controls for that form and configure reference data, permissions, review workflow, data quality checks, governance rules, audit trail requirements, and versioning behavior.",
      "Use mobile preview to confirm the form is clear on smaller screens and usable offline.",
      "Open the Form readiness checklist to confirm project, survey, questions, required rules, controls, workflow, quality checks, preview, pilot test, and deployment audience are complete.",
      "Publish the form only when labels, validation, mobile preview, project assignment, survey assignment, form controls, and readiness checks are ready.",
      "Use the Deployment center to select the field officer audience, choose the mobile sync mode, publish the correct version, and deploy the form to the Survey App.",
      "Open the Assignment workspace to confirm the collection team, supervisor, location scope, targets, briefing status, and pilot enumerator for that form.",
      "Use the Import workspace when existing Excel or CSV records need to be loaded into the form. Download or prepare the matching template first, validate rows, fix mapping issues, then import clean records.",
      "Use the Data quality workspace to monitor GPS, media, duplicate, missing value, review, and evidence flags before records are used in reports.",
      "Ask field officers to sync the Survey App and open Assigned forms after the form is deployed.",
      "Use the Submission review workspace to inspect synced records, add reviewer notes, approve clean submissions, reject invalid records, or return records for correction.",
    ],
    dataLanguage: [
      "Question label",
      "Field type",
      "Required rule",
      "Validation",
      "Repeat group",
      "Mobile preview",
      "Survey assignment",
      "Form Controls",
      "Reference Data",
      "Approval workflow",
      "Audit Trail",
      "Readiness checklist",
      "Deployment center",
      "Assignment workspace",
      "Import workspace",
      "Data quality workspace",
      "Submission review workspace",
      "Mobile deployment",
      "Assigned forms",
    ],
    goodPractice: [
      "Use plain question labels that a field officer can read aloud.",
      "Add helper text when a question needs a specific format, evidence type, or explanation.",
      "Keep published versions stable so mobile users do not lose trust in assigned forms.",
      "Bind official lists such as districts, facilities, schools, communities, enumerators, and donor codes before field officers start submitting records.",
      "Use form-level permissions so field officers only see assigned forms and supervisors only review the right teams or locations.",
      "Use readiness and deployment modals instead of relying on memory. They make publishing safer for beginners and faster for experienced managers.",
      "Import data only through a form-specific template so every uploaded record maps back to the survey, form version, and required questions.",
      "Resolve quality flags before using form data in indicators, analytics, donor reports, or project dashboards.",
    ],
    avoid: [
      "Do not publish forms with unclear required fields.",
      "Do not allow free text where an official reference list is required.",
      "Do not change a published form during active field collection unless the team understands the impact.",
    ],
    result:
      "Field officers receive clear, reliable, offline-ready survey forms that produce cleaner data.",
    nextActions: [
      { label: "Manage surveys", view: "surveys" },
      { label: "Open form builder", view: "forms" },
    ],
  },
  {
    id: "field-teams",
    title: "Invite and manage field teams",
    purpose:
      "Field team management controls who collects data, which forms they can use, where they work, and whether their mobile devices are ready.",
    audience: "Supervisors, admins, and field coordinators",
    view: "officers",
    icon: UsersRound,
    whenToUse:
      "Use Field teams before deployment, during field monitoring, or when an officer changes location, role, device, or assignment.",
    beforeYouStart: [
      "Prepare the officer name, email, phone number, assigned area, role, and supervisor.",
      "Confirm the forms and projects the officer should access.",
      "Check that mobile access and device trust rules are understood by the team.",
    ],
    steps: [
      "Open Field teams under Collect data.",
      "Invite the officer with their full name, email address, phone number, role, and assigned area.",
      "Assign mobile-ready credentials, projects, forms, beneficiaries, locations, and supervisor relationship.",
      "Open the officer profile to review assignments, projects, forms, beneficiaries, submissions, performance, data quality, devices, activity, permissions, security, and audit history.",
      "Use QR login only for authorized field officers. The QR code is visible in the officer profile for permitted managers and should be treated like temporary login access.",
      "Review visit requests and organization operational activity requests before the officer travels. Approved requests show in the mobile app and can be checked in and checked out with GPS evidence.",
      "Attach evidence to operational activities when required, such as photos, signatures, files, or incident documentation.",
      "Check last activity, device status, sync health, assignment coverage, GPS exceptions, and activity reports.",
      "Update or deactivate access when an officer leaves the field activity or changes responsibility.",
    ],
    dataLanguage: [
      "Full name",
      "Email",
      "Phone",
      "Assigned area",
      "Assigned forms",
      "Assigned beneficiaries",
      "Visit request",
      "Operational activity",
      "GPS check-in",
      "Evidence attachment",
      "Sync status",
    ],
    goodPractice: [
      "Give each officer only the forms and locations they need.",
      "Review sync status daily during active field collection.",
      "Require approved visit or activity requests when supervisors need to know where an officer is expected to work.",
      "Compare GPS check-ins with assigned geography before accepting sensitive field activity.",
      "Keep phone numbers current for operational follow-up.",
    ],
    avoid: [
      "Do not share one login across multiple officers.",
      "Do not leave inactive officers with access to active projects.",
    ],
    result:
      "Each field officer has the correct assignments, mobile access, and supervision path.",
    nextActions: [
      { label: "Monitor offline sync", view: "connectivity" },
      { label: "Review submissions", view: "submissions" },
    ],
  },
  {
    id: "beneficiaries",
    title: "Manage entities and beneficiaries",
    purpose:
      "Entity records connect people, households, farmers, schools, facilities, assets, cases, groups, or communities to projects, visits, consent, and field submissions.",
    audience: "Field teams, supervisors, and program staff",
    view: "beneficiaries",
    icon: UsersRound,
    whenToUse:
      "Use Beneficiaries/Entities when registering a tracked record, reviewing service history, checking consent, or linking a submission to an existing person, facility, asset, case, or household.",
    beforeYouStart: [
      "Confirm which project entity category is being recorded.",
      "In Project Settings, activate a sector preset or create a custom Entity Category before building entity-linked forms.",
      "Check the official entity code example so teams understand the stable ID that approved records will receive.",
      "Prepare consent information and required profile details.",
      "Search for an existing record before creating a new one.",
    ],
    steps: [
      "Open Beneficiaries under Collect data.",
      "Search by name, household, phone number, location, or program relationship.",
      "Filter by entity category when a project tracks more than one record type.",
      "Open the existing record when a match exists. New records should normally come from a project import or an approved project-linked registration form.",
      "Review the profile, forms and records, submissions, visits, trainings, distributions, indicators, map, timeline, and audit trail.",
      "Check profile lineage to see which form, question, submission, officer, and approval date created each important field.",
      "Review possible duplicate warnings, unlinked submissions, profile conflicts, and update proposals in the reconciliation queue before creating or merging records.",
      "Use approved submissions to create or update official entity records according to the form entity mapping and project rules.",
      "Use the entity record when reviewing submissions, cases, interventions, reports, and longitudinal progress.",
    ],
    dataLanguage: [
      "Entity category",
      "Entity code",
      "Display name",
      "Household",
      "Consent",
      "GPS point",
      "Program link",
      "Visit history",
      "Profile lineage",
      "Update proposal",
      "Reconciliation",
    ],
    goodPractice: [
      "Search before creating records to protect data quality.",
      "Use the entity code as the stable public identifier and keep legacy IDs separately.",
      "Approve or reject profile update proposals instead of silently overwriting phone, village, GPS, name, or other sensitive profile fields.",
      "Record consent clearly and keep it connected to the related program.",
      "Use consistent naming and location formats for easier reporting.",
    ],
    avoid: [
      "Do not create a new entity because spelling is slightly different.",
      "Do not create official records from draft, returned, rejected, or unapproved submissions unless a governance rule explicitly allows it.",
      "Do not collect sensitive details unless the program requires them and consent is recorded.",
    ],
    result:
      "Entity information remains traceable, consent-aware where required, and connected to field activity.",
    nextActions: [
      { label: "Open cases", view: "cases" },
      { label: "Use map", view: "map" },
    ],
  },
  {
    id: "submissions",
    title: "Review and approve submissions",
    purpose:
      "The Submissions workspace protects data quality before collected records enter reports, dashboards, maps, indicators, and program records.",
    audience: "Supervisors, data quality teams, and approvers",
    view: "submissions",
    icon: ShieldCheck,
    whenToUse:
      "Use Submissions after field officers sync data, when records are waiting for review, when quality flags appear, or before reporting data to leadership and donors.",
    beforeYouStart: [
      "Know the form, project, review criteria, and correction policy.",
      "Confirm whether your role can approve, reject, or request correction.",
      "Check the related project, form version, officer, location, GPS evidence, media attachments, quality score, SLA status, and audit details before making a decision.",
    ],
    steps: [
      "Open Operations, then Submissions. Start with Overview for submission volume, pending reviews, quality alerts, average review time, approval rate, and reviewer workload.",
      "Use All Submissions, Pending Review, Approved, Rejected, Returned, or Archived to focus the queue by review state.",
      "Filter records by project, form, officer, supervisor, location, status, reviewer, date, SLA, or quality score.",
      "Open a submission and review the required tabs: Overview, Responses, Workflow, Quality, Attachments, Location, History, and Audit Trail.",
      "Confirm the source label before review: Field Submitted, Mobile, Web Entry, Uploaded, or Imported. Uploaded historical records and live mobile records should remain traceable.",
      "Check whether the submission is linked to a beneficiary. If an entity-linked form is not linked, send it to reconciliation, link it to an existing beneficiary, or create the beneficiary only when the form rules allow it.",
      "Check responses in their original form sections, including validation messages, changed values, GPS evidence, media files, duplicates, and reviewer notes.",
      "Approve clean submissions that meet program rules, data quality checks, governance controls, and review workflow requirements.",
      "After approval, confirm the approved-data flow: official beneficiary updates, indicator inputs, maps, dashboards, reports, and audit history should use the reviewed record.",
      "Return a submission for correction when the field officer can fix it, and write a clear correction reason before sending it back.",
      "Reject a submission only when the record should not move forward, and document the rejection reason for audit review.",
    ],
    dataLanguage: [
      "Submission ID",
      "Project",
      "Form version",
      "Officer",
      "Review status",
      "Review stage",
      "Quality score",
      "SLA status",
      "Quality flag",
      "Correction reason",
      "Source",
      "Beneficiary link",
      "Profile update proposal",
      "Audit trail",
    ],
    goodPractice: [
      "Review overdue, critical, and high-risk submissions before routine clean records.",
      "Write correction notes that are specific enough for the field officer to act on.",
      "Use the Quality tab to resolve, override, or explain flags instead of approving around them silently.",
      "Use the Workflow and History tabs to understand who reviewed the record, how long each stage took, and what decision was made.",
      "Use audit history to understand what changed, who changed it, why it changed, and which form version was used.",
      "Approve field submissions manually. The platform can flag problems, but the responsible reviewer decides whether to approve, return, reject, or escalate.",
    ],
    avoid: [
      "Do not approve a record only because every required field is filled.",
      "Do not request correction or reject a submission without a practical written reason.",
      "Do not treat preview or test submissions as official program data.",
      "Do not edit approved records unless the form governance settings explicitly allow it.",
      "Do not count unapproved submissions in official beneficiary profiles, indicators, or donor reports.",
      "Do not reject without a clear reason that can be reviewed later.",
    ],
    result:
      "Only trusted, reviewed submissions become part of official analytics and reports.",
    nextActions: [
      { label: "Track reports", view: "analytics" },
      { label: "Configure approvals", view: "workflows" },
    ],
  },
  {
    id: "data-quality",
    title: "Investigate data quality",
    purpose:
      "Data Quality is the trust center for detecting, investigating, and resolving duplicate records, outliers, GPS issues, missing data, validation failures, risk alerts, and quality rule problems before data is used in reports or indicators.",
    audience: "Data managers, M&E managers, supervisors, and data quality officers",
    view: "dataQuality",
    icon: ShieldCheck,
    whenToUse:
      "Use Data Quality when you need to understand whether data can be trusted, where quality issues exist, which issues are critical, and what investigations must happen before reporting.",
    beforeYouStart: [
      "Know the project, form, location, enumerator, supervisor, severity, status, and period you want to investigate.",
      "Confirm whether the issue belongs in Data Quality, Submissions, Mapping, Governance, Forms, or Reports.",
      "Check that you have permission to view sensitive records, GPS evidence, and export quality issue lists.",
    ],
    steps: [
      "Open Analytics, then Data Quality. Start with Overview for the overall score, open issues, critical issues, duplicates, GPS problems, validation failures, missing data, high-risk submissions, and resolved issues.",
      "Use Quality Dashboard for executive quality scorecards, rankings by project, form, enumerator, supervisor, trend views, heatmaps, and resolution progress.",
      "Use Duplicates to compare matching records and decide whether to merge, mark valid, or assign investigation.",
      "Use Outliers to review unusual values, impossible durations, extreme numbers, and suspicious behavior.",
      "Use GPS Issues for missing coordinates, low accuracy, repeated coordinates, outside-boundary points, and suspicious locations, then open Mapping for spatial review.",
      "Use Missing Data and Validation Failures to identify incomplete submissions, failed rules, reference-data problems, and records that should be returned for correction.",
      "Use Risk Alerts for fraud signals, abnormal activity, suspicious enumerator behavior, and items that may require Governance Review.",
      "Use Reconciliation for unlinked submissions, duplicate beneficiaries, imported records that did not match a beneficiary, repeated baselines, profile conflicts, and invalid locations.",
      "Use Quality Rules to manage reusable checks, severity levels, scope, active status, and background rule testing.",
      "Open an issue detail page to review Overview, Related Submission, Investigation, Resolution, History, and Audit Trail before resolving or escalating it.",
    ],
    dataLanguage: [
      "Quality score",
      "Issue severity",
      "Duplicate group",
      "Outlier",
      "GPS issue",
      "Validation failure",
      "Risk alert",
      "Reconciliation queue",
      "Profile conflict",
      "Investigation status",
      "Resolution",
      "Quality rule",
      "Audit trail",
    ],
    goodPractice: [
      "Resolve critical and high-risk issues before approving data for reports or indicators.",
      "Use Mapping for spatial evidence instead of trying to analyze maps inside Data Quality.",
      "Send policy, consent, or fraud escalations to Governance Review when required.",
      "Record clear investigation notes, evidence, and resolution reasons.",
      "Use quality rules to prevent repeat issues instead of only fixing records after collection.",
      "Use GPS, duration, duplicate-answer, repeated-location, and outside-boundary signals to protect supervisors from misleading field activity.",
    ],
    avoid: [
      "Do not use Data Quality to redesign forms, approve submissions, define indicators, or create reports.",
      "Do not mark a high-risk issue resolved without evidence.",
      "Do not export sensitive quality issue data unless the user has export permission and the action is auditable.",
      "Do not treat a high score as proof that every individual record is safe to use.",
    ],
    result:
      "Managers know whether data is trustworthy, what must be investigated, and which records are safe for reporting and decision-making.",
    nextActions: [
      { label: "Review submissions", view: "submissions" },
      { label: "Open mapping", view: "map" },
    ],
  },
  {
    id: "approvals",
    title: "Configure approval workflows",
    purpose:
      "Approval workflows define who reviews work, when corrections happen, how escalations are triggered, and how accountability is recorded.",
    audience: "Administrators, operations leads, and governance teams",
    view: "workflows",
    icon: GitPullRequestArrow,
    whenToUse:
      "Use Approvals when a process needs controlled review, such as submissions, imports, reports, cases, or operational records.",
    beforeYouStart: [
      "Define the workflow type and the records it controls.",
      "Identify reviewer roles, review stages, SLA timing, and escalation rules.",
      "Confirm what should happen when work is approved, rejected, corrected, or overdue.",
    ],
    steps: [
      "Open Approvals under Admin.",
      "Create or review the workflow definition for the record type.",
      "Add review stages in the order work should move through the organization.",
      "Assign each stage to a responsible role, team, or scope.",
      "Set SLA timing, correction paths, escalation rules, and completion criteria.",
      "Test the workflow with a sample record before using it in live operations.",
    ],
    dataLanguage: [
      "Workflow type",
      "Review stage",
      "Responsible role",
      "SLA",
      "Escalation",
      "Correction path",
    ],
    goodPractice: [
      "Keep approval paths as simple as the risk level allows.",
      "Use escalation rules for overdue work that affects reporting or service delivery.",
      "Review workflows after major program or team structure changes.",
    ],
    avoid: [
      "Do not assign review stages to roles that do not have access to the underlying record.",
      "Do not create long approval chains for low-risk routine work.",
    ],
    result:
      "Operational work moves through consistent review paths with clear ownership and deadlines.",
    nextActions: [
      { label: "Manage team access", view: "organizations" },
      { label: "Review governance", view: "governance" },
    ],
  },
  {
    id: "data-tools",
    title: "Import, clean, and export data",
    purpose:
      "Data tools help teams bring external data into Atlas FieldOps, map columns, validate records, correct errors, and prepare trusted exports.",
    audience: "Data managers, analysts, and implementation teams",
    view: "data",
    icon: Database,
    whenToUse:
      "Use Data tools when migrating spreadsheets, updating beneficiary lists, cleaning imported records, preparing donor exports, or reconciling external datasets.",
    beforeYouStart: [
      "Prepare a clean source file with headers and consistent values.",
      "Know the target dataset or workflow where the data should be imported.",
      "Confirm who is allowed to approve imported data.",
    ],
    steps: [
      "Open the form that should receive the data, then use the form-specific import action.",
      "Download the Excel template for that form when available, keep the headers unchanged, and fill one row per record.",
      "Upload data into draft or published forms. Missing fields should be shown as row-level issues instead of causing the whole import to fail.",
      "Map each source column to the correct form question or beneficiary field when the file does not exactly match the template.",
      "Open the full-screen cleaning workspace to edit cells directly, review row issues, filter missing values, scroll horizontally and vertically, and correct records like a spreadsheet.",
      "Confirm clean rows when they are ready. Uploaded records remain marked as Uploaded or Imported so they are not confused with field-submitted mobile data.",
      "Submit cleaned imported data for review or approval according to the survey, form, and project governance rules.",
      "After approval, confirm that beneficiary-linked rows use entity IDs or beneficiary codes so analysis, reports, indicators, maps, and dashboards can use the data correctly.",
    ],
    dataLanguage: [
      "Source file",
      "Form template",
      "Mapped columns",
      "Cleaning workspace",
      "Row issue",
      "Validation issues",
      "Duplicates",
      "Import batch",
      "Uploaded source",
      "Export format",
    ],
    goodPractice: [
      "Keep a copy of the original source file for audit and reconciliation.",
      "Map fields using business meaning, not only matching column names.",
      "Clean data in the platform before confirming it for official use.",
      "Keep beneficiary identifiers, entity IDs, legacy IDs, and project context in the import wherever possible.",
      "Resolve validation issues before downstream reporting.",
    ],
    avoid: [
      "Do not import unknown columns without confirming their meaning.",
      "Do not let missing optional fields block a whole import; clean the row and document what remains unknown.",
      "Do not overwrite active records without checking duplicate and conflict warnings.",
    ],
    result:
      "Imported data becomes structured, validated, auditable, and available for connected workflows.",
    nextActions: [
      { label: "Review approvals", view: "workflows" },
      { label: "Open reports", view: "analytics" },
    ],
  },
  {
    id: "data-export",
    title: "Export data to other platforms",
    purpose:
      "Download a form's submissions in the format another platform needs — spreadsheets for analysis, or GIS formats for mapping tools — with all answers, locations, boundaries, and media references included.",
    audience: "Data manager",
    view: "forms",
    icon: Download,
    whenToUse:
      "Use this when you need to analyze data in Excel, hand it to a GIS team (QGIS, ArcGIS, Google Earth), or move it into a partner or donor system.",
    beforeYouStart: [
      "Open the form whose data you want to export, or pick the form in the Submissions data explorer.",
      "Make sure the submissions you need are approved or visible in your current view.",
    ],
    steps: [
      "Open the form and choose Export data, or in Submissions open the data explorer, select the form, and choose More formats.",
      "The dialog shows what the data contains — number of submissions, and whether it has GPS points, boundaries, or media.",
      "Pick a format. Table formats (CSV, Excel, JSON) are always available; map formats (GeoJSON, KML, Shapefile) and GPS formats (GPX) appear only when the data has locations or boundaries.",
      "Read the short hint under each format to choose the right one for your target tool.",
      "Select the format and choose Download; the file is prepared and saved to your device.",
    ],
    dataLanguage: [
      "CSV / Excel — spreadsheets",
      "JSON — structured records",
      "GeoJSON / KML — maps and GIS",
      "Shapefile (.zip) — classic GIS",
      "GPX — GPS devices",
      "Media references — photo/audio/file URLs",
    ],
    goodPractice: [
      "Use GeoJSON or KML when you need both the map shape and the answer attributes together.",
      "Use Shapefile when the receiving GIS team specifically asks for it; points and boundaries arrive as separate layers in the zip.",
      "Open CSV or Excel in a spreadsheet; the geometry travels in a geometry column so nothing is lost.",
    ],
    avoid: [
      "Do not expect map formats when the form collected no GPS or boundary data — they will be greyed out with the reason shown.",
      "Do not treat exported media URLs as permanent public links; access still follows your platform permissions.",
    ],
    result:
      "A clean, well-structured file in the chosen format, ready to open in the destination platform with attributes and geometry intact.",
    nextActions: [
      { label: "Open forms", view: "forms" },
      { label: "Review submissions", view: "submissions" },
    ],
  },
  {
    id: "indicators",
    title: "Track metrics and indicators",
    purpose:
      "Metrics and indicators help teams define what progress means, set baselines and targets, calculate actual values, and connect approved evidence to results.",
    audience: "M&E managers, program managers, analysts, and data managers",
    view: "indicators",
    icon: BookOpenCheck,
    whenToUse:
      "Use Metrics & Results when a project needs KPIs, donor indicators, operational targets, baselines, logframes, results frameworks, or progress reporting.",
    beforeYouStart: [
      "Confirm the project, result area, reporting frequency, unit, baseline, target, and responsible person.",
      "Know whether the metric uses approved submissions, imported records, manual updates, or another verified data source.",
      "Confirm any required breakdowns such as location, sex, age group, disability status, sector category, product type, facility type, or team.",
    ],
    steps: [
      "Open Analytics, then Metrics & Results. Use Overview to see metrics behind target, without baseline, or without data source.",
      "Use Metric Library to create or edit metric definitions, units, formulas, data sources, disaggregation fields, and ownership.",
      "Use Targets to set or update target values and compare actual values against targets.",
      "Use Baselines to set or update starting values before progress is calculated.",
      "Use Results Framework to review the live result structure derived from project metrics and result areas. In preview, Add result level creates a draft row so managers can understand the workflow.",
      "Use Logframes to review logframe-style rows generated from metrics, baselines, targets, verification sources, and assumptions. In preview, Create logframe adds a draft row for review.",
      "Use Metric Reports to hand off formal reporting outputs to Reports.",
    ],
    dataLanguage: [
      "Metric",
      "Indicator",
      "Baseline",
      "Target",
      "Actual value",
      "Result area",
      "Formula",
      "Data source",
      "Disaggregation",
      "Logframe",
    ],
    goodPractice: [
      "Define each metric once and reuse it across reports instead of creating duplicate definitions.",
      "Set baseline and target values before treating progress as report-ready.",
      "Use approved data sources for official reporting.",
      "Review live results frameworks and logframes before donor or management reporting.",
    ],
    avoid: [
      "Do not calculate official progress from draft, rejected, or unapproved submissions.",
      "Do not mix different units or reporting periods in one metric without clear rules.",
      "Do not leave a metric without a data source if it will appear in reports.",
    ],
    result:
      "Managers can see actual-vs-target progress and understand which metric definitions need data, baselines, or target cleanup.",
    nextActions: [
      { label: "Open reports", view: "analytics" },
      { label: "Review maps", view: "map" },
    ],
  },
  {
    id: "maps",
    title: "Use maps and GPS evidence",
    purpose:
      "Maps help teams understand where work is happening, where coverage is weak, and whether field activity matches the reported location.",
    audience: "Supervisors, M&E teams, and program managers",
    view: "map",
    icon: Map,
    whenToUse:
      "Use Mapping during coverage planning, GPS validation, facility monitoring, farm boundary review, indicator geography, or location-based reporting.",
    beforeYouStart: [
      "Select the project, geography, team, or activity you want to inspect.",
      "Know whether you are reviewing project maps, submission maps, beneficiary maps, facility maps, coverage maps, indicator maps, data quality maps, layers, or boundaries.",
      "Confirm GPS capture, coordinate visibility, and layer permissions for the relevant form, project, or workflow.",
    ],
    steps: [
      "Open Analytics, then Mapping. Start with Overview for active layers, project locations, submission points, beneficiary points, facilities, boundaries, GPS issues, and coverage gaps.",
      "Choose the correct section: Project Maps, Submission Maps, Beneficiary Maps, Facility Maps, Coverage Maps, Indicator Maps, Data Quality Maps, Map Layers, or Boundaries.",
      "Use the layer panel, basemap selector, search, filters, legend, and results summary to focus the map.",
      "Click overview cards or section routes to open the exact map workspace, such as Map Layers, Facility Maps, Coverage Maps, Indicator Maps, or Data Quality Maps.",
      "Use source-record tables in Project Maps, Coverage Maps, Map Layers, and Boundaries to inspect the GPS evidence behind each aggregate.",
      "Use Upload on Map Layers or Boundaries to register GeoJSON, KML, CSV, JSON, or zipped GIS files for processing and governance review.",
      "Use Inspect on source records or spatial quality issues to load the exact point in the Results Summary panel.",
      "Use Open source module from the Results Summary panel to jump to Submissions, Entities, Data Quality, or Indicators.",
      "Compare GPS points, villages, facilities, farm boundaries, weak areas, coverage clusters, and quality flags.",
      "Review mobile GPS integrity signals such as captured coordinates, accuracy, timestamp, source, repeated coordinates, manual coordinate warnings, and outside-area placeholders.",
      "Export the current filtered map view when you need a CSV of visible evidence, masked coordinates, GPS accuracy, quality score, and popup details.",
      "Use map findings to plan follow-up visits, resolve suspicious locations, update boundaries, or explain coverage in reports.",
    ],
    dataLanguage: [
      "GPS point",
      "GPS accuracy",
      "Coverage layer",
      "Map layer",
      "Source record",
      "Basemap",
      "Village",
      "Boundary",
      "Coordinate masking",
      "Weak area",
      "Location evidence",
      "GPS integrity",
      "Check-in",
      "Check-out",
    ],
    goodPractice: [
      "Use maps together with review status; unapproved records may not represent final results.",
      "Compare location evidence with officer assignment and project geography.",
      "Use source-record inspection before making decisions from aggregate coverage or boundary cards.",
      "Use aggregated or masked coordinates for donor, viewer, and sensitive beneficiary access.",
      "Compare operational activity check-ins and check-outs with approved visit requests before accepting movement evidence.",
      "Validate boundary versions before using a map in reporting or operational planning.",
      "Document follow-up decisions when location issues affect reporting.",
    ],
    avoid: [
      "Do not treat a GPS point as proof of complete service delivery by itself.",
      "Do not ignore location records outside expected project geography.",
      "Do not export sensitive coordinates unless the user has the correct permission and the export is auditable.",
    ],
    result:
      "Teams can validate field coverage, identify gaps, and act on location-based evidence.",
    nextActions: [
      { label: "Review submissions", view: "submissions" },
      { label: "Track indicators", view: "indicators" },
    ],
  },
  {
    id: "reports",
    title: "Build reports and analytics",
    purpose:
      "Reports turn approved operational data into standard reports, custom analysis, dashboards, scheduled deliveries, donor packages, executive KPIs, and governed exports.",
    audience: "M&E managers, analysts, and leadership teams",
    view: "analytics",
    icon: BarChart3,
    whenToUse:
      "Use Reports when decision makers need formal outputs, scheduled report delivery, export history, donor packages, dashboard views, or custom analysis across projects, forms, submissions, indicators, maps, field operations, beneficiaries, and data quality.",
    beforeYouStart: [
      "Confirm the reporting question, audience, project, period, donor, and required export format.",
      "Check that relevant submissions have been synced, reviewed, approved, and cleared for reporting.",
      "Confirm indicators, baselines, targets, maps, and data quality checks are already managed in their owning modules.",
      "Check governance rules before exporting sensitive, restricted, or donor-facing data.",
    ],
    steps: [
      "Open Analytics, then Reports. Start with Overview for total reports, scheduled reports, generated reports, export jobs, active dashboards, failed jobs, recent reports, popular reports, and executive KPIs.",
      "Use Standard Reports for prebuilt program, project, submission, indicator, data quality, coverage, field operations, beneficiary, and donor reports.",
      "Use Custom Reports to select a data source, choose fields, add filters, preview matching live reports, then share a setup package or export the setup/preview when useful.",
      "Use Dashboards to create draft dashboard rows, see dashboard source reports, and open the reports that power each visual view.",
      "Use Scheduled Reports to create draft schedules, review active schedules, and see which reports are ready to schedule or need governance review first.",
      "Use Exports to create draft export jobs, track CSV, Excel, PDF, and JSON jobs, open the source report, and export computed CSV data when governance permits.",
      "Open a report detail page to review Overview, Data Sources, Filters, Visualizations, Schedules, Exports, History, and Audit Trail.",
    ],
    dataLanguage: [
      "Standard report",
      "Custom report",
      "Dashboard",
      "Scheduled report",
      "Export job",
      "Data source",
      "Filter set",
      "Visualization",
      "KPI",
      "Reporting period",
      "Governance approval",
      "Donor package",
      "Export",
    ],
    goodPractice: [
      "Use approved data for formal reports and donor packages.",
      "Save common filter sets so teams produce the same report consistently.",
      "Use Standard Reports for repeatable management needs and Custom Reports for new questions.",
      "Use the source report link in exports before downloading sensitive or restricted data.",
      "Schedule recurring reports only after recipients, formats, and governance approvals are clear.",
      "Explain major results with operational context from submissions, indicators, maps, projects, field operations, and data quality.",
    ],
    avoid: [
      "Do not combine reporting periods without labeling them clearly.",
      "Do not present draft or unapproved records as final impact numbers.",
      "Do not use Reports to define indicators, review submissions, resolve data quality issues, or manage GIS layers.",
      "Do not export sensitive or restricted data without permission and an audit trail.",
    ],
    result:
      "Decision makers receive timely, traceable, governed reports from approved platform data.",
    nextActions: [
      { label: "Open projects", view: "programs" },
      { label: "Track indicators", view: "indicators" },
    ],
  },
  {
    id: "connectivity",
    title: "Monitor offline sync",
    purpose:
      "Sync health shows whether mobile work is safely moving from field devices into the platform for review, analytics, and reporting.",
    audience: "Field supervisors, support teams, and operations leads",
    view: "connectivity",
    icon: Wifi,
    whenToUse:
      "Use Sync health during active field collection, after network outages, before closing a data collection window, or when expected submissions are missing.",
    beforeYouStart: [
      "Know which teams and devices are expected to sync.",
      "Confirm the date range and forms being collected.",
      "Prepare to contact officers if repeated retries or missing check-ins appear.",
    ],
    steps: [
      "Open Sync health under Daily work.",
      "Review batches waiting to sync, failed retries, recovered submissions, and devices that have not checked in.",
      "Filter by officer, region, device, form, or retry status when investigating a specific issue.",
      "Prioritize officers or regions with repeated failures or missing check-ins.",
      "Confirm recovered submissions appear in Review queue after sync completes.",
    ],
    dataLanguage: [
      "Device",
      "Sync batch",
      "Retry count",
      "Last check-in",
      "Recovered submission",
      "Offline queue",
    ],
    goodPractice: [
      "Check sync health before reporting that field collection is complete.",
      "Investigate repeated retries early so field officers do not lose time.",
      "Use sync status to separate missing data from unsynced data.",
    ],
    avoid: [
      "Do not assume a field officer did not collect data until sync health is checked.",
      "Do not close a collection window while large offline queues remain unresolved.",
    ],
    result:
      "Offline work remains visible, recoverable, and ready for review once connectivity returns.",
    nextActions: [
      { label: "Review queue", view: "submissions" },
      { label: "Manage field teams", view: "officers" },
    ],
  },
  {
    id: "governance",
    title: "Manage governance and access",
    purpose:
      "Governance controls who can access data, what actions are audited, how permissions are scoped, and how sensitive operational records are protected.",
    audience: "Administrators, security teams, and compliance owners",
    view: "governance",
    icon: Boxes,
    whenToUse:
      "Use Governance and Users & Teams when managing users, permissions, data quality rules, audit history, trusted devices, retention, and compliance processes.",
    beforeYouStart: [
      "Know the user role, department, geography, and data scope required.",
      "Confirm which actions should be allowed, reviewed, or blocked.",
      "Prepare a reason for access changes that affect sensitive data.",
    ],
    steps: [
      "Open Governance for audit, data quality, consent, retention, lineage, and export controls.",
      "Open Team & access to manage users, roles, regions, and organizational permissions.",
      "Open Workforce to review departments, teams, delegations, trusted devices, and access requests.",
      "Use role previews or permission tests to confirm what the user can see and do.",
      "Review audit events after major permission, workflow, or data changes.",
    ],
    dataLanguage: [
      "Role",
      "Permission",
      "Scope",
      "Audit event",
      "Trusted device",
      "Retention rule",
    ],
    goodPractice: [
      "Apply least-privilege access so users only see what they need.",
      "Review permissions after staffing, partner, or geography changes.",
      "Keep export and sensitive-data access limited to accountable roles.",
    ],
    avoid: [
      "Do not give broad admin access only to solve a temporary task.",
      "Do not leave old devices, inactive users, or outdated delegations trusted.",
    ],
    result:
      "The organization keeps data access controlled, auditable, and aligned with responsibility.",
    nextActions: [
      { label: "Team & access", view: "organizations" },
      { label: "Workforce", view: "workforce" },
    ],
  },
  {
    id: "mobile-setup",
    title: "Install the mobile app and sign in",
    purpose:
      "The Atlas FieldOps Android app is what field officers use to collect data in the field, including in places with no internet. This guide explains how to install it and sign in for the first time.",
    audience: "Field officer",
    platform: "mobile",
    icon: Smartphone,
    whenToUse:
      "Use this once on each device before going to the field. The first sign-in needs internet because it downloads your assigned work; after that the app works offline.",
    beforeYouStart: [
      "Ask your supervisor for your organization code, email, and password — or for your personal login QR code.",
      "Make sure the phone has internet (Wi-Fi or mobile data) for this first sign-in only.",
      "Install the Atlas FieldOps app file (.apk) your organization shared, allowing installs from your file manager if prompted.",
    ],
    steps: [
      "Open the Atlas FieldOps app. You will see the sign-in screen.",
      "Choose Password and enter your organization code, email, and password; or choose Scan QR code and point the camera at the login code from your field officer profile.",
      "Wait while the app signs you in and downloads your assigned projects, forms, entities, and reference lists. This is the only step that requires internet.",
      "On the Home screen, check the green 'Ready for offline use' card — it confirms how many forms, assignments, and records are saved on the device.",
      "You can now travel to areas with no connection and keep working; the app stays signed in offline.",
    ],
    dataLanguage: [
      "Organization code",
      "Login QR code",
      "Assignments",
      "Ready for offline use",
    ],
    goodPractice: [
      "Sign in once while still in coverage (office Wi-Fi, town, or mobile data) before heading to a remote site.",
      "Confirm the 'Ready for offline use' card shows your forms and assignments before you leave.",
      "Keep the app installed and signed in between visits so cached work is preserved.",
    ],
    avoid: [
      "Do not expect the first sign-in to work with no connection — it must download your work once.",
      "Do not uninstall the app or clear its storage while you have unsynced submissions.",
    ],
    result:
      "The field officer is signed in, their assigned work is downloaded, and the device is ready to collect data offline.",
    nextActions: [{ label: "Set up field officers and QR codes", view: "workforce" }],
  },
  {
    id: "mobile-home",
    title: "Find your way around the mobile app",
    purpose:
      "Understand the mobile home screen and the bottom tabs so you always know where your work, drafts, and sync status are.",
    audience: "Field officer",
    platform: "mobile",
    icon: Navigation,
    whenToUse: "Use this whenever you open the app and want to know what to do next.",
    beforeYouStart: [
      "Sign in at least once so your assignments and forms are downloaded.",
    ],
    steps: [
      "Home shows a greeting, the 'Ready for offline use' status, an Online/Offline chip, and quick counts for assignments, ready forms, entities, drafts, sync queue, and visit requests.",
      "Tap the Work tab to see assignments given to you by your supervisor.",
      "Tap the Forms tab to see the blank forms you are allowed to fill.",
      "Tap the Drafts tab to continue saved or returned-for-correction submissions.",
      "Tap the Sync tab to upload queued work and refresh your assignments.",
      "Tap the bell icon at the top to read notifications; a red badge shows unread items such as returned submissions.",
    ],
    dataLanguage: [
      "Online / Offline chip",
      "Sync queue",
      "Drafts",
      "Last synced",
      "Unread badge",
    ],
    goodPractice: [
      "Glance at the Online/Offline chip and 'Last synced' time so you know how fresh your data is.",
      "Clear the sync queue whenever you regain connection.",
    ],
    avoid: [
      "Do not assume work is uploaded just because you saved it — check the Sync tab and queue count.",
    ],
    result: "You can navigate the mobile app confidently and always find your work and its status.",
    nextActions: [],
  },
  {
    id: "mobile-collect",
    title: "Fill in and submit a form offline",
    purpose:
      "The core field task: open an assignment, select or register the right record, answer the questions, and submit. Everything works without internet and uploads later.",
    audience: "Field officer",
    platform: "mobile",
    icon: ClipboardList,
    whenToUse:
      "Use this every time you collect data from a person, household, facility, site, or asset in the field.",
    beforeYouStart: [
      "Confirm the form you need appears under Work or Forms (it was downloaded at sign-in).",
      "Move to the correct location if the form requires GPS so the captured point is accurate.",
    ],
    steps: [
      "Open the Work or Forms tab and tap the form for your assignment.",
      "If the form tracks a record, search for the existing entity first; if it is a registration form, create the new record when prompted.",
      "Answer each question. The app shows required questions and only enables submit when they are complete.",
      "Capture any required evidence — GPS point, boundary, photo, audio, or signature — when the question asks for it.",
      "Tap Save draft at any time; your answers are kept safely on the device even if the app closes or the battery dies.",
      "When finished, tap Submit. With no connection the submission is queued; it uploads automatically the next time you sync.",
    ],
    dataLanguage: [
      "Assignment",
      "Entity / record",
      "Draft",
      "Required question",
      "Queued submission",
    ],
    goodPractice: [
      "Search for an existing record before creating a new one to avoid duplicates.",
      "Save a draft early and often during long interviews.",
      "Review the answers before submitting; corrections are easier before upload.",
    ],
    avoid: [
      "Do not create a new record when the person or place is already registered.",
      "Do not skip required evidence — submissions can be returned for missing GPS or photos.",
    ],
    result:
      "A complete submission is saved on the device and queued to upload, ready for supervisor review after sync.",
    nextActions: [],
  },
  {
    id: "mobile-mapping",
    title: "Capture GPS points and map boundaries",
    purpose:
      "Some forms ask for a GPS location or a mapped area (polygon). This guide explains how to capture an accurate point and how to draw a boundary by walking it or tapping the map.",
    audience: "Field officer",
    platform: "mobile",
    icon: MapPin,
    whenToUse:
      "Use this for questions that capture a location, a farm or facility boundary, or any mapped area.",
    beforeYouStart: [
      "Allow location permission when the app first asks.",
      "Stand in an open area for a stronger GPS signal before capturing.",
    ],
    steps: [
      "For a GPS point question, tap Capture GPS and wait for the accuracy reading; recapture if accuracy is poor.",
      "For a boundary (polygon) question, tap the question to open the full-screen map with your live location shown.",
      "To map automatically, start Walk mode and walk the perimeter — the app drops a point every few seconds as you move.",
      "To map manually, tap the map to place each corner point, or tap Add point at your current location.",
      "Use Undo to remove the last point and Clear to start over; the shape and point count update as you go.",
      "When the boundary is complete (at least three points), finish the shape to save it to the form.",
    ],
    dataLanguage: [
      "GPS accuracy",
      "Polygon / boundary",
      "Walk mode (auto-trace)",
      "Manual point",
      "Vertex / corner point",
    ],
    goodPractice: [
      "Check the GPS accuracy value before accepting a point.",
      "Walk steadily along the true edge when using Walk mode for an accurate boundary.",
      "Close the shape only after you have walked or tapped the full perimeter.",
    ],
    avoid: [
      "Do not capture GPS indoors or under heavy cover if accuracy matters.",
      "Do not finish a boundary with too few points — it must form a closed area.",
    ],
    result:
      "The form holds an accurate location or boundary that appears on the web map and is checked for overlaps after approval.",
    nextActions: [{ label: "See boundaries on the web map", view: "map" }],
  },
  {
    id: "mobile-evidence",
    title: "Capture photos, audio, and signatures",
    purpose:
      "Forms can require supporting evidence. This guide explains how to attach photos, audio recordings, and signatures, and how they sync.",
    audience: "Field officer",
    platform: "mobile",
    icon: Camera,
    whenToUse: "Use this for questions that ask for a photo, audio clip, signature, or file.",
    beforeYouStart: [
      "Allow camera and microphone permission when the app first asks.",
      "Make sure the device has enough free storage for media files.",
    ],
    steps: [
      "Tap the evidence question and choose to take a photo, record audio, or capture a signature.",
      "Review the captured media; retake it if it is unclear.",
      "The media is saved on the device and attached to the submission.",
      "When you sync, media uploads alongside the submission; large files may take longer on weak connections.",
    ],
    dataLanguage: ["Attachment", "Photo / audio / signature", "Evidence", "Upload"],
    goodPractice: [
      "Capture clear, well-lit photos that show what the question asks for.",
      "Sync media when you have a stronger connection to upload faster.",
    ],
    avoid: ["Do not delete the app's storage before media has finished uploading."],
    result: "Required evidence is attached to the submission and uploads with it during sync.",
    nextActions: [],
  },
  {
    id: "mobile-sync",
    title: "Sync your work and manage the queue",
    purpose:
      "Submissions you make offline are held safely on the device and uploaded when you reconnect. This guide explains how syncing works and how to clear the queue.",
    audience: "Field officer",
    platform: "mobile",
    icon: RefreshCw,
    whenToUse:
      "Use this whenever you regain connectivity, at the end of a collection day, or if the queue count is not zero.",
    beforeYouStart: [
      "Reconnect to Wi-Fi or mobile data.",
    ],
    steps: [
      "Open the Sync tab and check the Online/Offline status and the number of queued and failed items.",
      "Tap Full sync to upload queued submissions and download any new assignments and returned submissions.",
      "Tap Retry queue to re-attempt items that failed earlier.",
      "Watch the result message; a successful sync reduces the queue count and updates 'Last synced'.",
      "The app also tries to sync automatically when you reopen it with a connection.",
    ],
    dataLanguage: ["Queued", "Failed", "Synced", "Full sync", "Last synced"],
    goodPractice: [
      "Sync at least once at the end of each field day.",
      "If items keep failing, check your connection and retry; the data stays safe on the device until it uploads.",
    ],
    avoid: [
      "Do not assume a weak signal synced everything — confirm the queue reaches zero.",
      "Do not sign out or reinstall while items are still queued.",
    ],
    result: "All offline work is uploaded to the server and your assignments are refreshed.",
    nextActions: [{ label: "Monitor sync health on web", view: "connectivity" }],
  },
  {
    id: "mobile-corrections",
    title: "Fix a submission returned for correction",
    purpose:
      "When a supervisor returns a submission, it comes back to your device with their reason. This guide explains how to correct and resubmit it.",
    audience: "Field officer",
    platform: "mobile",
    icon: GitPullRequestArrow,
    whenToUse: "Use this when you see a returned-for-correction item or an unread notification about a returned submission.",
    beforeYouStart: [
      "Sync so the returned submission and the supervisor's reason are on your device.",
    ],
    steps: [
      "Open the bell icon or the Drafts tab to find the returned submission (the unread badge highlights new ones).",
      "Read the supervisor's reason for the return.",
      "Tap the submission to reopen the form with your previous answers preserved.",
      "Update the answers or evidence the supervisor asked about.",
      "Submit again; the corrected submission is queued and uploads on the next sync.",
    ],
    dataLanguage: ["Returned for correction", "Reviewer note", "Resubmission", "Notification"],
    goodPractice: [
      "Read the full reviewer note before changing answers so you fix the right thing.",
      "Resync after resubmitting so the supervisor sees your correction.",
    ],
    avoid: [
      "Do not create a brand-new submission to fix a returned one — reopen the returned record.",
    ],
    result: "The corrected submission returns to the supervisor's review queue after sync.",
    nextActions: [],
  },
  {
    id: "mobile-visits",
    title: "Plan and check in to field visits",
    purpose:
      "Field visits let officers record planned movement and capture GPS check-in and check-out evidence, even offline.",
    audience: "Field officer",
    platform: "mobile",
    icon: MapPin,
    whenToUse: "Use this when your organization plans and verifies field movement or site visits.",
    beforeYouStart: [
      "Confirm with your supervisor whether visits require approval before evidence can be captured.",
    ],
    steps: [
      "Open Visit requests from Home and create a visit with its purpose, location, and planned time.",
      "If you are offline, the visit is saved and queued; it uploads on the next sync.",
      "Once a visit is approved, capture GPS check-in when you arrive and check-out when you leave.",
      "Attach any required photos or evidence to the visit.",
      "Sync so your supervisor can see the visit and its GPS evidence.",
    ],
    dataLanguage: ["Visit request", "Check-in / check-out", "Approval", "GPS evidence"],
    goodPractice: [
      "Capture check-in at the actual site for accurate location evidence.",
      "Sync visits promptly so supervisors can verify movement.",
    ],
    avoid: ["Do not check in away from the planned location if accuracy is required."],
    result: "Planned visits and their GPS evidence are recorded and shared with supervisors after sync.",
    nextActions: [],
  },
];

const guideStandards = [
  "Use the current UI labels, menu names, button text, field names, and workflow status names.",
  "Explain the user goal first, then provide ordered steps and expected results.",
  "Write in professional corporate language that beginners can understand without training.",
  "Use data language carefully: define what each metric, status, field, and validation result means.",
  "Update this guide whenever a new feature, field, permission, workflow, or page is added.",
];


export function helpRouteForAction(
  action: Pick<HelpAction, "route" | "view">,
): string | null {
  return action.route ?? getNavigationItemByView(action.view)?.route ?? null;
}

function TopicActionButtons({
  actions,
}: {
  actions: HelpTopic["nextActions"];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const setActiveView = useWorkspaceStore((state) => state.setActiveView);

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {actions.map((action) => (
        <Button
          key={action.label}
          size="sm"
          variant="secondary"
          onClick={() => {
            setActiveView(action.view);
            const route = helpRouteForAction(action);
            if (route && route !== pathname) {
              router.push(route);
            }
          }}
          type="button"
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}

export function ProductHelpCenter() {
  const pathname = usePathname();
  const router = useRouter();
  const setActiveView = useWorkspaceStore((state) => state.setActiveView);

  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState<"all" | "web" | "mobile">("all");

  const webCount = helpTopics.filter((topic) => (topic.platform ?? "web") === "web").length;
  const mobileCount = helpTopics.filter((topic) => topic.platform === "mobile").length;

  const filteredTopics = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return helpTopics.filter((topic) => {
      const topicPlatform = topic.platform ?? "web";
      if (platformFilter !== "all" && topicPlatform !== platformFilter) return false;
      if (!query) return true;
      const haystack = [
        topic.title,
        topic.purpose,
        topic.audience,
        topic.whenToUse,
        topicPlatform === "mobile" ? "mobile app android" : "web app",
        ...topic.beforeYouStart,
        ...topic.steps,
        ...topic.dataLanguage,
        ...topic.goodPractice,
        ...topic.avoid,
        topic.result,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [searchQuery, platformFilter]);

  function openHelpAction(action: Pick<HelpAction, "route" | "view">): void {
    if (action.view) setActiveView(action.view);
    const route = helpRouteForAction(action);
    if (route && route !== pathname) {
      router.push(route);
    }
  }

  return (
    <section aria-labelledby="help-title" className="space-y-6">
      <div className="surface-premium rounded-2xl p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Documentation
            </p>
            <h1
              id="help-title"
              className="mt-2 text-3xl font-semibold tracking-tight"
            >
              How to use Atlas FieldOps
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              A complete, beginner-friendly guide to both the web app and the
              Android mobile app — no prior experience needed. Search below, or
              filter by app, to learn how to set up and use every module:
              projects, forms, field teams, offline data collection, GPS and
              boundary mapping, submissions, approvals, maps, indicators,
              reports, data tools, and governance.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => openHelpAction({ view: "dashboard" })}
              type="button"
            >
              Open Dashboard
              <BookOpenCheck aria-hidden="true" />
            </Button>
            <Button
              variant="primary"
              onClick={() =>
                openHelpAction({ route: "/forms/create", view: "forms" })
              }
              type="button"
            >
              Open form builder
              <ClipboardList aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>

      <section
        aria-label="Help center summary"
        className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
      >
        {[
          ["Web app guides", `${webCount}`, FileText],
          ["Mobile app guides", `${mobileCount}`, Smartphone],
          ["Role-based guidance", `${rolePaths.length} roles`, UsersRound],
          ["Written for beginners", "No training needed", Sparkles],
        ].map(([label, value, Icon]) => (
          <article
            className="surface-premium rounded-2xl p-4"
            key={label as string}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">{label as string}</p>
              <Icon aria-hidden="true" className="text-primary" size={18} />
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight">
              {value as string}
            </p>
          </article>
        ))}
      </section>

      <section
        aria-label="Search the documentation"
        className="rounded-2xl border bg-panel p-4 shadow-line md:p-5"
      >
        <label className="relative block" htmlFor="help-search">
          <span className="sr-only">Search the documentation</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={18}
          />
          <input
            autoComplete="off"
            className="w-full rounded-xl border bg-background py-2.5 pl-10 pr-10 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
            id="help-search"
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search guides, steps, and terms — e.g. 'offline login', 'map boundary', 'approve submission'"
            type="search"
            value={searchQuery}
          />
          {searchQuery ? (
            <button
              aria-label="Clear search"
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
              onClick={() => setSearchQuery("")}
              type="button"
            >
              <X aria-hidden="true" size={15} />
            </button>
          ) : null}
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {([
            ["all", "All guides"],
            ["web", "Web app"],
            ["mobile", "Mobile app"],
          ] as const).map(([value, label]) => (
            <button
              className={
                platformFilter === value
                  ? "rounded-full border border-primary bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                  : "rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted"
              }
              key={value}
              onClick={() => setPlatformFilter(value)}
              type="button"
            >
              {label}
            </button>
          ))}
          <span className="ml-auto text-xs text-muted-foreground">
            {filteredTopics.length} guide{filteredTopics.length === 1 ? "" : "s"}
            {searchQuery ? ` matching “${searchQuery}”` : ""}
          </span>
        </div>
      </section>

      <section
        aria-labelledby="getting-started-title"
        className="rounded-2xl border bg-panel p-4 shadow-line md:p-5"
      >
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Getting started
            </p>
            <h2
              id="getting-started-title"
              className="mt-2 text-xl font-semibold tracking-tight"
            >
              Recommended first path
            </h2>
          </div>
          <Badge tone="accent">Beginner sequence</Badge>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {onboardingPath.map((item, index) => (
            <article
              className="rounded-xl border bg-background p-4"
              key={item.title}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full border bg-panel text-xs font-semibold">
                {index + 1}
              </span>
              <h3 className="mt-4 text-sm font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {item.text}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="manual-sections-title"
        className="rounded-2xl border bg-panel p-4 shadow-line md:p-5"
      >
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Manual sections
            </p>
            <h2
              id="manual-sections-title"
              className="mt-2 text-xl font-semibold tracking-tight"
            >
              Choose what you want to learn
            </h2>
          </div>
          <Badge tone="accent">Jump to workflow</Badge>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {filteredTopics.map((topic, index) => (
            <a
              className="flex items-center gap-3 rounded-xl border bg-background p-3 text-sm font-medium transition hover:border-primary/30 hover:bg-primary/5"
              href={`#${topic.id}`}
              key={topic.id}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-panel text-xs font-semibold">
                {index + 1}
              </span>
              <span>{topic.title}</span>
              {topic.platform === "mobile" ? (
                <Smartphone aria-hidden="true" className="ml-auto shrink-0 text-muted-foreground" size={14} />
              ) : null}
            </a>
          ))}
          {filteredTopics.length === 0 ? (
            <p className="text-sm text-muted-foreground sm:col-span-2 xl:col-span-3">
              No guides match your search. Try a different word, or switch the filter back to “All guides”.
            </p>
          ) : null}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {filteredTopics.length === 0 ? (
            <article className="rounded-2xl border bg-panel p-6 text-center shadow-line">
              <p className="text-sm font-semibold">No guides match your search</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Try a simpler word, or clear the search and filter to browse every guide.
              </p>
            </article>
          ) : null}
          {filteredTopics.map((topic, index) => {
            const Icon = topic.icon;
            const isMobile = topic.platform === "mobile";
            const topicView = topic.view;
            return (
              <article
                className="rounded-2xl border bg-panel p-4 shadow-line md:p-5"
                id={topic.id}
                key={topic.id}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-background text-primary shadow-sm">
                      <Icon aria-hidden="true" size={18} />
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="accent">Guide {index + 1}</Badge>
                        <Badge tone={isMobile ? "collect" : "neutral"}>
                          {isMobile ? "Mobile app" : "Web app"}
                        </Badge>
                        <Badge>{topic.audience}</Badge>
                      </div>
                      <h2 className="mt-3 text-lg font-semibold tracking-tight">
                        {topic.title}
                      </h2>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                        {topic.purpose}
                      </p>
                    </div>
                  </div>
                  {topicView ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => openHelpAction({ view: topicView })}
                      type="button"
                    >
                      Open workspace
                    </Button>
                  ) : null}
                </div>

                <details
                  className="group mt-5 rounded-xl border bg-background p-4"
                  open={index < 2}
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold">
                    <span>Read detailed instructions</span>
                    <span className="rounded-full border bg-panel px-2 py-1 text-xs font-medium text-muted-foreground">
                      {index < 2 ? "Open" : "Expand"}
                    </span>
                  </summary>

                  <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                    <section aria-labelledby={`${topic.id}-steps`}>
                      <h3
                        id={`${topic.id}-steps`}
                        className="text-sm font-semibold"
                      >
                        How to use this workspace
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {topic.whenToUse}
                      </p>

                      <h4 className="mt-5 text-sm font-semibold">
                        Before you start
                      </h4>
                      <ul className="mt-3 space-y-2">
                        {topic.beforeYouStart.map((item) => (
                          <li
                            className="flex gap-2 text-sm leading-6 text-muted-foreground"
                            key={item}
                          >
                            <CheckCircle2
                              aria-hidden="true"
                              className="mt-1 shrink-0 text-success"
                              size={14}
                            />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>

                      <h4 className="mt-5 text-sm font-semibold">
                        Step-by-step
                      </h4>
                      <ol className="mt-3 space-y-3">
                        {topic.steps.map((step, stepIndex) => (
                          <li
                            className="flex gap-3 text-sm leading-6 text-muted-foreground"
                            key={step}
                          >
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border bg-panel text-xs font-semibold text-foreground">
                              {stepIndex + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </section>

                    <section
                      aria-labelledby={`${topic.id}-details`}
                      className="space-y-4"
                    >
                      <div>
                        <h3
                          id={`${topic.id}-details`}
                          className="text-sm font-semibold"
                        >
                          Data language to understand
                        </h3>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {topic.dataLanguage.map((field) => (
                            <Badge key={field}>{field}</Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold">Good practice</h3>
                        <ul className="mt-3 space-y-2">
                          {topic.goodPractice.map((item) => (
                            <li
                              className="flex gap-2 text-sm leading-6 text-muted-foreground"
                              key={item}
                            >
                              <CheckCircle2
                                aria-hidden="true"
                                className="mt-1 shrink-0 text-success"
                                size={14}
                              />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold">
                          Common mistakes to avoid
                        </h3>
                        <ul className="mt-3 space-y-2">
                          {topic.avoid.map((item) => (
                            <li
                              className="flex gap-2 text-sm leading-6 text-muted-foreground"
                              key={item}
                            >
                              <ShieldCheck
                                aria-hidden="true"
                                className="mt-1 shrink-0 text-warning"
                                size={14}
                              />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="rounded-xl border border-success/20 bg-success/10 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-success">
                          Expected result
                        </p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {topic.result}
                        </p>
                        <TopicActionButtons actions={topic.nextActions} />
                      </div>
                    </section>
                  </div>
                </details>
              </article>
            );
          })}
        </div>

        <aside
          className="space-y-4 xl:sticky xl:top-20 xl:self-start"
          aria-label="Guide standards"
        >
          <section className="rounded-2xl border bg-panel p-4 shadow-line">
            <h2 className="text-sm font-semibold">
              Content agent starting point
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              The Product Content Agent maintains this guide from existing
              product behavior, not assumptions. Updates should reflect real
              workspace labels, user actions, data fields, permissions, and
              workflow outcomes.
            </p>
          </section>

          <section className="rounded-2xl border bg-panel p-4 shadow-line">
            <h2 className="text-sm font-semibold">Who should read what</h2>
            <div className="mt-3 space-y-3">
              {rolePaths.map(([role, description]) => (
                <div className="rounded-xl border bg-background p-3" key={role}>
                  <p className="text-sm font-semibold">{role}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border bg-panel p-4 shadow-line">
            <h2 className="text-sm font-semibold">Writing standard</h2>
            <div className="mt-3 space-y-3">
              {guideStandards.map((standard) => (
                <div className="flex gap-3" key={standard}>
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <CheckCircle2 aria-hidden="true" size={13} />
                  </span>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {standard}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
