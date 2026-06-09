import {
  BarChart3,
  BookOpenCheck,
  Boxes,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Database,
  FileText,
  GitPullRequestArrow,
  HelpCircle,
  Map,
  RadioTower,
  Search,
  ShieldCheck,
  UploadCloud,
  UsersRound,
  Wifi,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWorkspaceStore, type WorkspaceView } from "@/stores/workspace";

type HelpTopic = {
  id: string;
  title: string;
  purpose: string;
  audience: string;
  view: WorkspaceView;
  icon: typeof HelpCircle;
  whenToUse: string;
  beforeYouStart: string[];
  steps: string[];
  dataLanguage: string[];
  goodPractice: string[];
  avoid: string[];
  result: string;
  nextActions: { label: string; view: WorkspaceView }[];
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
    text: "Follow the readiness plan: create team access, projects, surveys, indicators, imports, and the first survey form so every submission has project and survey context.",
  },
  {
    title: "Collect, review, and report",
    text: "Field officers collect data, supervisors review submissions, and approved information flows into maps, dashboards, indicators, and reports.",
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
    "M&E manager",
    "Create surveys inside projects, link indicators, connect forms to surveys, monitor data quality, and prepare reports from approved submissions.",
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
      { label: "Build forms", view: "forms" },
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
      "Use Users & Teams when creating accounts, importing many users, assigning roles, organizing teams, checking organization structure, testing access, or reviewing identity activity.",
    beforeYouStart: [
      "Confirm the user belongs to the correct organization before creating or editing their account.",
      "Choose the least powerful role that still lets the person complete their work.",
      "Prepare team, location, project, and supervisor assignments before field work begins.",
    ],
    steps: [
      "Open Users & Teams under People.",
      "Review Overview first to check total users, active users, roles, teams, access alerts, active sessions, and permission readiness.",
      "Use Users to create one user, import many users from CSV, activate or deactivate access, assign roles, and reset temporary passwords.",
      "Use Roles to review permission sets and create custom roles from the approved permission catalog.",
      "Use Teams to create operational teams, assign team leads, and organize field officers, supervisors, data quality officers, and analysts.",
      "Use Organizations to review the tenant organization hierarchy such as head office, regional office, and district office.",
      "Use Permissions to inspect the permission matrix and run access tests before assigning sensitive work.",
      "Use Activity Logs to monitor account, role, team, permission, and identity changes. Use Governance for the full immutable audit trail.",
    ],
    dataLanguage: [
      "User",
      "Role",
      "Permission",
      "Team",
      "Organization unit",
      "Access scope",
      "Activity log",
    ],
    goodPractice: [
      "Keep user accounts active only while people are working for the organization.",
      "Assign supervisors by team and location so they only see the records they should review.",
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
      "Projects are the operational foundation of Atlas FieldOps. They organize donor context, locations, teams, forms, assignments, submissions, indicators, reports, settings, and audit history without replacing the specialist modules that manage those records.",
    audience: "Organization administrators and M&E managers",
    view: "programs",
    icon: Building2,
    whenToUse:
      "Use Projects when launching a new program, adding a donor-funded activity, defining implementation geography, or preparing a reporting structure.",
    beforeYouStart: [
      "Prepare the project name, code, program type, donor, implementing organization, owner, and location scope.",
      "Confirm which forms, indicators, teams, assignments, submissions, reports, and governance controls will belong to the project.",
      "Agree on who can create, activate, suspend, close, archive, or only view the project.",
    ],
    steps: [
      "Open Projects under Operations.",
      "Review the Projects Dashboard to see total projects, active projects, draft projects, closed projects, beneficiaries, submissions, active forms, field officers, completion, indicator achievement, health, risks, and deadlines.",
      "Use All Projects to search, filter, export, and open project workspaces.",
      "Create a project with the guided wizard: basic information, locations, project structure, indicators, forms, governance, and review.",
      "Open a project workspace and use the mandatory tabs: Overview, Forms, Indicators, Locations, Teams, Assignments, Submissions, Reports, Settings, and Audit Trail.",
      "Use each tab as a contextual view. Open Forms, Indicators, Users & Teams, Submissions, Reports, Mapping, or Governance when detailed work belongs in those modules.",
      "Review project health before activation or management meetings. Health combines progress, assignments, indicators, submissions, and data quality risk.",
    ],
    dataLanguage: [
      "Project name",
      "Project code",
      "Donor",
      "Geography",
      "Project health",
      "Assignments",
      "Indicators",
      "Audit trail",
    ],
    goodPractice: [
      "Use clear project names that match donor or internal reporting language.",
      "Keep geography consistent across projects, beneficiaries, maps, and reports.",
      "Use project templates for repeated baseline, monitoring, evaluation, registration, or multi-country structures.",
      "Review project setup before publishing forms or assigning field teams.",
    ],
    avoid: [
      "Do not create duplicate projects for the same donor activity.",
      "Do not manage form design, submission review, GIS analysis, user accounts, or system settings inside Projects.",
      "Do not activate a project until ownership, locations, teams, indicators, forms, and governance are clear.",
    ],
    result:
      "Submissions, beneficiaries, indicators, maps, and reports are linked to the right program structure.",
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
      "Assign mobile-ready credentials, forms, projects, and supervisor relationship.",
      "Check last activity, device status, sync health, and assignment coverage.",
      "Update or deactivate access when an officer leaves the field activity or changes responsibility.",
    ],
    dataLanguage: [
      "Full name",
      "Email",
      "Phone",
      "Assigned area",
      "Assigned forms",
      "Sync status",
    ],
    goodPractice: [
      "Give each officer only the forms and locations they need.",
      "Review sync status daily during active field collection.",
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
    title: "Manage beneficiaries",
    purpose:
      "Beneficiary records connect people, households, farmers, groups, facilities, or communities to programs, visits, consent, and field submissions.",
    audience: "Field teams, supervisors, and program staff",
    view: "beneficiaries",
    icon: UsersRound,
    whenToUse:
      "Use Beneficiaries when registering a participant, reviewing service history, checking consent, or linking a submission to an existing person or household.",
    beforeYouStart: [
      "Confirm what type of beneficiary is being recorded.",
      "Prepare consent information and required profile details.",
      "Search for an existing record before creating a new one.",
    ],
    steps: [
      "Open Beneficiaries under Collect data.",
      "Search by name, household, phone number, location, or program relationship.",
      "Open the existing record or create a new beneficiary when no match exists.",
      "Capture profile details, consent status, GPS point, program connection, and visit history.",
      "Review possible duplicate warnings before saving or approving the record.",
      "Use the beneficiary record when reviewing submissions, cases, interventions, and reports.",
    ],
    dataLanguage: [
      "Beneficiary name",
      "Household",
      "Consent",
      "GPS point",
      "Program link",
      "Visit history",
    ],
    goodPractice: [
      "Search before creating records to protect data quality.",
      "Record consent clearly and keep it connected to the related program.",
      "Use consistent naming and location formats for easier reporting.",
    ],
    avoid: [
      "Do not create a new beneficiary because spelling is slightly different.",
      "Do not collect sensitive details unless the program requires them and consent is recorded.",
    ],
    result:
      "Beneficiary information remains traceable, consent-aware, and connected to field activity.",
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
      "Check responses in their original form sections, including validation messages, changed values, GPS evidence, media files, duplicates, and reviewer notes.",
      "Approve clean submissions that meet program rules, data quality checks, governance controls, and review workflow requirements.",
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
      "Audit trail",
    ],
    goodPractice: [
      "Review overdue, critical, and high-risk submissions before routine clean records.",
      "Write correction notes that are specific enough for the field officer to act on.",
      "Use the Quality tab to resolve, override, or explain flags instead of approving around them silently.",
      "Use the Workflow and History tabs to understand who reviewed the record, how long each stage took, and what decision was made.",
      "Use audit history to understand what changed, who changed it, why it changed, and which form version was used.",
    ],
    avoid: [
      "Do not approve a record only because every required field is filled.",
      "Do not request correction or reject a submission without a practical written reason.",
      "Do not treat preview or test submissions as official program data.",
      "Do not edit approved records unless the form governance settings explicitly allow it.",
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
      "Open Data tools under Operate.",
      "Upload the source file and select the target dataset or workflow.",
      "Map each source column to the correct Atlas FieldOps field.",
      "Review validation issues, missing required values, duplicates, and format problems.",
      "Correct issues directly or update the source file and upload again.",
      "Submit the clean import for approval or export the approved dataset in the required format.",
    ],
    dataLanguage: [
      "Source file",
      "Target dataset",
      "Mapped columns",
      "Validation issues",
      "Duplicates",
      "Export format",
    ],
    goodPractice: [
      "Keep a copy of the original source file for audit and reconciliation.",
      "Map fields using business meaning, not only matching column names.",
      "Resolve validation issues before downstream reporting.",
    ],
    avoid: [
      "Do not import unknown columns without confirming their meaning.",
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
      "Compare GPS points, villages, facilities, farm boundaries, weak areas, coverage clusters, and quality flags.",
      "Open the companion table when you need searchable rows, exports, metadata, or boundary validation status.",
      "Use map findings to plan follow-up visits, resolve suspicious locations, update boundaries, or explain coverage in reports.",
    ],
    dataLanguage: [
      "GPS point",
      "GPS accuracy",
      "Coverage layer",
      "Map layer",
      "Basemap",
      "Village",
      "Boundary",
      "Coordinate masking",
      "Weak area",
      "Location evidence",
    ],
    goodPractice: [
      "Use maps together with review status; unapproved records may not represent final results.",
      "Compare location evidence with officer assignment and project geography.",
      "Use aggregated or masked coordinates for donor, viewer, and sensitive beneficiary access.",
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
      "Use Custom Reports to select a data source, choose fields, add filters, group data, configure visualizations, preview the result, then save or export.",
      "Use Dashboards to manage saved executive, project, donor, field operations, indicator, and data quality dashboards with role-based visibility.",
      "Use Scheduled Reports to automate daily, weekly, monthly, quarterly, or custom delivery to approved recipients.",
      "Use Exports to track CSV, Excel, PDF, and JSON jobs and confirm governance approval before downloading sensitive information.",
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
    id: "indicators",
    title: "Track indicators and results frameworks",
    purpose:
      "Indicators are the measurement layer of Atlas FieldOps. They connect program targets, baselines, approved submissions, and results frameworks so managers can answer whether the program is achieving its goals.",
    audience:
      "M&E managers, data managers, program leads, and donor-facing analysts",
    view: "indicators",
    icon: BarChart3,
    whenToUse:
      "Use Indicators when setting up a logframe, defining a results framework, linking data sources to targets, or preparing indicator progress for donor reports.",
    beforeYouStart: [
      "Confirm the project and program the indicators belong to.",
      "Prepare indicator codes, names, unit of measure, type (output, outcome, or impact), baseline value, target value, reporting frequency, and data source.",
      "Decide whether each indicator needs disaggregation by sex, age, location, or other dimension.",
    ],
    steps: [
      "Open Analytics, then Indicators.",
      "Review the Indicators Overview for total indicators, output indicators, outcome indicators, impact indicators, behind-target count, and indicators without a baseline or data source.",
      "Use Indicator Library to create, search, filter, and manage indicators. Each indicator needs a code, name, definition, unit, type, frequency, and linked data source.",
      "Open a specific indicator to review the definition, current value, target, baseline, data source, calculation formula, disaggregation plan, and SDG mapping.",
      "Use Results Framework to organize indicators by outcome, output, and activity levels so donors and managers can see the program logic.",
      "Use Logframes to create logical framework tables linking objectives, indicators, baselines, targets, means of verification, and assumptions.",
      "Use Targets to set annual, quarterly, monthly, or location-specific target values per indicator and project.",
      "Use Baselines to record starting values per indicator, project, location, and reporting period.",
      "Link each indicator to a data source by connecting it to a form question, uploaded dataset, or calculation formula so the current value can be automatically computed.",
      "Use Indicator Reports to view progress summaries, trend charts, and comparison tables by project and period.",
    ],
    dataLanguage: [
      "Indicator code",
      "Indicator type",
      "Unit of measure",
      "Baseline value",
      "Target value",
      "Current value",
      "Reporting frequency",
      "Disaggregation",
      "SDG mapping",
      "Results framework",
      "Logframe",
      "Data source",
      "Calculation formula",
    ],
    goodPractice: [
      "Keep indicator codes stable so exports, comparisons, and donor references stay consistent.",
      "Link each indicator to one clear data source before collection begins.",
      "Use disaggregation for indicators that need breakdown by sex, age, location, or vulnerability category.",
      "Review indicator progress monthly during active collection and quarterly for donor reporting.",
      "Use Logframes when donors require formal logical framework evidence alongside results.",
    ],
    avoid: [
      "Do not create duplicate indicators for the same measurement.",
      "Do not change baseline values after field collection begins.",
      "Do not report current values from unapproved or unreviewed submissions.",
      "Do not configure indicator data sources inside Administration or Reports.",
    ],
    result:
      "Managers and donors can see whether the program is on track and where results need attention.",
    nextActions: [
      { label: "Open indicators", view: "indicators" },
      { label: "Build reports", view: "analytics" },
    ],
  },
  {
    id: "imports-migration",
    title: "Import and migrate data from external tools",
    purpose:
      "Imports & Migration is the smart data onboarding assistant. It brings existing beneficiary registries, form definitions, submissions, indicators, targets, baselines, locations, boundaries, and user lists from KoboToolbox, ODK Central, DHIS2, Excel, CSV, GeoJSON, and other formats into Atlas FieldOps with validation, duplicate review, field mapping, and rollback readiness.",
    audience: "Data managers, system administrators, and implementation teams",
    view: "administration",
    icon: UploadCloud,
    whenToUse:
      "Use Imports & Migration when starting a new program that has existing data, migrating from another tool, importing a beneficiary registry, uploading historical submissions, or onboarding a location hierarchy from an external source.",
    beforeYouStart: [
      "Identify the dataset type: beneficiary registry, form definition, submissions, indicators, baselines, targets, locations, boundaries, or users and teams.",
      "Prepare the source file in CSV, Excel, JSON, XLSForm, GeoJSON, or KML format with clean column headers.",
      "Confirm the target project if the dataset type requires a project context such as beneficiaries, form definitions, or submissions.",
      "Set aside time to review the Smart Analysis results before confirming the import, especially for large or complex files.",
    ],
    steps: [
      "Open Administration under System, then select Imports & Migration.",
      "Review the Import History tab to check recent batches, their status, record counts, and rollback availability.",
      "Start a new import by selecting the dataset type that matches your source data.",
      "Choose the data source: Upload File for Excel, CSV, JSON, XLSForm, GeoJSON, or KML. KoboToolbox, ODK Central, and DHIS2 connectors are ready for Phase 2.",
      "Upload the file and wait for the column preview and row sample to appear.",
      "Run Analyze Data to generate a Smart Analysis. The assistant detects field mapping suggestions, location matches, entity matches, duplicate groups, date format normalization, GPS warnings, indicator matches, and generated IDs.",
      "Review the Readiness Score. Scores above 90 are import-ready. Scores between 70 and 89 need review. Scores below 70 need fixes before import is safe.",
      "Review the Field Mapping step to confirm each source column is mapped to the correct Atlas FieldOps target field. Adjust mappings manually when needed.",
      "Review Location Matching and confirm or override each suggested location match. Create unknown locations in Administration if needed.",
      "Review Entity Matching to link import rows to existing beneficiary profiles instead of creating duplicates.",
      "Review Duplicate Groups and choose an action for each group: merge, use existing, keep separate, or review later.",
      "Review Validation Issues and fix critical errors in the source file or accept warnings before continuing.",
      "Review the Preview Import summary to confirm total rows, records to create, records to update, rows to skip, warnings, and errors.",
      "Confirm Import to run the final batch. Atlas FieldOps will write records and produce an Import Results page with created, updated, skipped, and failed row counts.",
      "Review the Quality Report for the final data quality score, duplicate candidates, location issues, unlinked submissions, and recommendations.",
      "Use Rollback to undo a completed import batch if serious issues are found after the import is applied.",
    ],
    dataLanguage: [
      "Dataset type",
      "Source file",
      "Source system",
      "Source format",
      "Import batch",
      "Field mapping",
      "Target field",
      "Location match",
      "Entity match",
      "Duplicate group",
      "Readiness score",
      "Validation issue",
      "Error row",
      "Duplicate row",
      "Rollback",
      "Quality report",
    ],
    goodPractice: [
      "Always run Analyze Data before confirming an import so the Smart Analysis can flag issues before data is written.",
      "Fix critical validation errors in the source file before importing rather than skipping rows.",
      "Keep the original source file as an audit reference after import.",
      "Use the project-level Data Import tab when importing data into a specific project context.",
      "Review duplicate groups carefully for beneficiary and entity registries to protect data quality.",
      "Test a small pilot file first on large datasets to verify field mapping and location matching.",
    ],
    avoid: [
      "Do not import an uncleaned file directly into production without running the Smart Analysis review.",
      "Do not skip the Duplicate Review step for beneficiary registries.",
      "Do not create new location values mid-import without first checking the Administration location hierarchy.",
      "Do not use Import for routine data entry. Import is for migration and onboarding, not ongoing data collection.",
      "Do not rollback an import without understanding what records will be removed and who depends on them.",
    ],
    result:
      "Existing program data is safely onboarded into Atlas FieldOps with field mapping, quality validation, duplicate review, and rollback protection.",
    nextActions: [
      { label: "Open Administration", view: "administration" },
      { label: "Check data quality", view: "dataQuality" },
    ],
  },
];

const guideStandards = [
  "Use the current UI labels, menu names, button text, field names, and workflow status names.",
  "Explain the user goal first, then provide ordered steps and expected results.",
  "Write in professional corporate language that beginners can understand without training.",
  "Use data language carefully: define what each metric, status, field, and validation result means.",
  "Update this guide whenever a new feature, field, permission, workflow, or page is added.",
];

const topicLinks = helpTopics.map((topic, index) => ({
  id: topic.id,
  label: topic.title,
  number: index + 1,
}));

function TopicActionButtons({
  actions,
}: {
  actions: HelpTopic["nextActions"];
}) {
  const setActiveView = useWorkspaceStore((state) => state.setActiveView);

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {actions.map((action) => (
        <Button
          key={action.label}
          size="sm"
          variant="secondary"
          onClick={() => setActiveView(action.view)}
          type="button"
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}

export function ProductHelpCenter() {
  const setActiveView = useWorkspaceStore((state) => state.setActiveView);

  return (
    <section aria-labelledby="help-title" className="space-y-6">
      <div className="surface-premium rounded-2xl p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Help center
            </p>
            <h1
              id="help-title"
              className="mt-2 text-3xl font-semibold tracking-tight"
            >
              How to use Atlas FieldOps
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              A beginner-friendly operating guide for using Atlas FieldOps
              across projects, mobile forms, field teams, submissions,
              approvals, maps, reports, data tools, and governance.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => setActiveView("dashboard")}
              type="button"
            >
              Open Dashboard
              <BookOpenCheck aria-hidden="true" />
            </Button>
            <Button
              variant="primary"
              onClick={() => setActiveView("forms")}
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
          ["Core workflows", `${helpTopics.length}`, FileText],
          ["Role-based guidance", `${rolePaths.length} roles`, UsersRound],
          ["Product language", "Corporate", RadioTower],
          ["Content source", "Live platform", Search],
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
          {topicLinks.map((topic) => (
            <a
              className="flex items-center gap-3 rounded-xl border bg-background p-3 text-sm font-medium transition hover:border-primary/30 hover:bg-primary/5"
              href={`#${topic.id}`}
              key={topic.id}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-panel text-xs font-semibold">
                {topic.number}
              </span>
              <span>{topic.label}</span>
            </a>
          ))}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {helpTopics.map((topic, index) => {
            const Icon = topic.icon;
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
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setActiveView(topic.view)}
                    type="button"
                  >
                    Open workspace
                  </Button>
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
