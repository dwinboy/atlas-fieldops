import {
  BarChart3,
  BookOpenCheck,
  Boxes,
  Building2,
  CheckCircle2,
  ClipboardList,
  Database,
  FileText,
  GitPullRequestArrow,
  HelpCircle,
  Map,
  RadioTower,
  Search,
  ShieldCheck,
  UsersRound,
  Wifi
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
    text: "Use your organization slug, email, and password. After signing in, confirm you are in the correct organization before creating records or approving work."
  },
  {
    title: "Start from Today",
    text: "Use Today to understand current submissions, pending reviews, sync issues, and priority actions before opening detailed workspaces."
  },
  {
    title: "Create the operating structure",
    text: "Set up projects, indicators, field teams, beneficiaries, and forms so every submission has a clear program context."
  },
  {
    title: "Collect, review, and report",
    text: "Field officers collect data, supervisors review submissions, and approved information flows into maps, dashboards, indicators, and reports."
  }
];

const rolePaths = [
  ["Platform super admin", "Create organizations, manage tenant status, open support sessions, review platform health, audit logs, usage metrics, and safe runtime settings."],
  ["Organization admin", "Set up team access, roles, projects, approval workflows, and governance rules before field activity begins."],
  ["M&E manager", "Create indicators, connect forms to projects, monitor data quality, and prepare reports from approved submissions."],
  ["Field supervisor", "Assign officers, monitor sync health, review submissions, request corrections, and track field coverage."],
  ["Field officer", "Use assigned mobile-ready forms, capture required evidence, save work offline, and sync when connectivity returns."],
  ["Data manager", "Import datasets, map columns, clean validation issues, export approved records, and protect data lineage."]
];

const helpTopics: HelpTopic[] = [
  {
    id: "platform-console",
    title: "Manage the platform as a super admin",
    purpose: "The Platform console is for Atlas FieldOps operators who manage the whole platform. It is separate from tenant workspaces and should be used for organization setup, production support, usage review, audit checks, and safe configuration review.",
    audience: "Platform super admins and trusted support operators",
    view: "platform",
    icon: ShieldCheck,
    whenToUse: "Use the Platform console when onboarding a new organization, checking production readiness, opening a tenant support session, reviewing platform administrators, or investigating tenant-level issues.",
    beforeYouStart: [
      "Confirm you are signed in with the platform super admin account, not a tenant owner account.",
      "Verify the Railway backend has DATABASE_URL, JWT_SECRET, and BACKEND_CORS_ORIGINS configured.",
      "Prepare verified organization details before creating a new tenant: name, slug, owner name, owner email, and temporary password."
    ],
    steps: [
      "Open Platform console from the navigation.",
      "Use Dashboard to review tenant count, platform admin count, audit events, API health, JWT readiness, and setup attention.",
      "Use Organizations to create a tenant, activate or deactivate access, and confirm every organization has an owner email.",
      "Use Support sessions to enter a tenant only when troubleshooting a real issue. The support banner will show that you are not acting as a normal tenant user.",
      "Use Platform users to review super admin accounts and confirm they belong to the correct platform organization.",
      "Use Audit logs to review organization creation, status changes, support sessions, and tenant workflow events.",
      "Use Usage and plans to compare organization users, forms, submissions, beneficiaries, imports, exports, and audit event volumes.",
      "Use Settings to review safe runtime configuration such as CORS origins, token expiry, database readiness, JWT readiness, Redis, and Kafka status."
    ],
    dataLanguage: ["Organization count", "Platform admin", "Support mode", "Audit event", "Runtime setting", "Tenant usage"],
    goodPractice: [
      "Keep platform work and tenant work separate so support actions are clear and auditable.",
      "Use support mode instead of asking tenant users for their passwords.",
      "Return to the platform console immediately after finishing tenant troubleshooting.",
      "Create organizations only from verified onboarding information."
    ],
    avoid: [
      "Do not use the super admin account for routine tenant data entry.",
      "Do not deactivate an organization unless access must be paused for security, contract, or operational reasons.",
      "Do not enable editable global settings without an audited backend configuration endpoint."
    ],
    result: "The platform operator can safely manage tenants, diagnose setup problems, and support organizations without confusing platform ownership with tenant operations.",
    nextActions: [
      { label: "Create organization", view: "platform" },
      { label: "Read governance guidance", view: "governance" }
    ]
  },
  {
    id: "daily-work",
    title: "Use the daily workspace",
    purpose: "Today is the operational starting point. It shows what needs attention now, including submissions, review queues, sync health, data quality, and field team activity.",
    audience: "Program managers, supervisors, and operations leads",
    view: "dashboard",
    icon: BookOpenCheck,
    whenToUse: "Use this page at the beginning of each day, before a supervisor review meeting, or whenever you need a fast overview of field operations.",
    beforeYouStart: [
      "Confirm you are signed into the correct organization workspace.",
      "Check that your role allows access to reviews, data tools, or field team actions.",
      "Make sure the reporting period you are reviewing matches the current field activity window."
    ],
    steps: [
      "Open Today from the left navigation.",
      "Read the summary cards for beneficiaries, active programs, indicators, open cases, clean submissions, and review wait time.",
      "Review Needs attention to identify duplicates, pending approvals, overdue corrections, or records that need manual checking.",
      "Use quick actions when you need to create a form, review submissions, invite an officer, or import data.",
      "Open the relevant workspace from the card or quick action, complete the task, then return to Today to confirm the issue is reduced or resolved."
    ],
    dataLanguage: ["Submissions saved", "Waiting to sync", "Clean submissions", "Review wait", "Open cases"],
    goodPractice: [
      "Treat Today as the operational control room, not the place to edit every record.",
      "Resolve high-risk items first, such as possible duplicates or submissions waiting for supervisor action.",
      "Use the review and sync indicators together; a low review queue can still hide offline submissions that have not synced yet."
    ],
    avoid: [
      "Do not report final numbers from Today until submissions have synced and passed review.",
      "Do not ignore repeated retry or sync warnings; they can indicate field officers need support."
    ],
    result: "The team understands the current operating picture and knows which workspace to open next.",
    nextActions: [
      { label: "Review submissions", view: "submissions" },
      { label: "Check sync health", view: "connectivity" }
    ]
  },
  {
    id: "programs",
    title: "Set up programs and projects",
    purpose: "Projects organize donors, geographies, milestones, indicators, assigned teams, forms, and reports. They give field data its business and M&E context.",
    audience: "Organization administrators and M&E managers",
    view: "programs",
    icon: Building2,
    whenToUse: "Use Projects when launching a new program, adding a donor-funded activity, defining implementation geography, or preparing a reporting structure.",
    beforeYouStart: [
      "Prepare the program name, donor, implementation period, geography, reporting requirements, and responsible team.",
      "Confirm which indicators and forms will belong to the project.",
      "Agree on who can edit the project and who can only view or report on it."
    ],
    steps: [
      "Open Projects under Plan & monitor.",
      "Create a new project or select an existing project to update.",
      "Enter the project name, donor, geography, start date, end date, milestones, and implementation status.",
      "Connect the project to indicators, forms, field officers, beneficiary groups, and expected reports.",
      "Review the project summary to confirm that field activity, approvals, and reporting outputs will be tied to the correct program."
    ],
    dataLanguage: ["Program name", "Donor", "Geography", "Milestones", "Assigned forms", "Reporting period"],
    goodPractice: [
      "Use clear project names that match donor or internal reporting language.",
      "Keep geography consistent across projects, beneficiaries, maps, and reports.",
      "Review project setup before assigning forms to avoid collecting data under the wrong program."
    ],
    avoid: [
      "Do not create duplicate projects for the same donor activity.",
      "Do not attach forms or indicators until the project geography and reporting period are correct."
    ],
    result: "Submissions, beneficiaries, indicators, maps, and reports are linked to the right program structure.",
    nextActions: [
      { label: "Track indicators", view: "indicators" },
      { label: "Build forms", view: "forms" }
    ]
  },
  {
    id: "forms",
    title: "Build mobile-ready forms",
    purpose: "Forms define what field officers collect on mobile devices. They support surveys, beneficiary registrations, inspections, assessments, complaints, referrals, and operational records.",
    audience: "Data managers, M&E teams, and field supervisors",
    view: "forms",
    icon: ClipboardList,
    whenToUse: "Use Forms when creating a new data collection tool, adapting a template, improving validation, or preparing offline mobile collection.",
    beforeYouStart: [
      "Confirm the project, target users, language, and field collection method.",
      "List the required questions, evidence types, validation rules, and consent requirements.",
      "Decide which answers are mandatory and which can be optional."
    ],
    steps: [
      "Open Templates to start from a recommended form, or open Form builder to create one manually.",
      "Add sections in the order a field officer should complete them in the field.",
      "Add question labels, helper text, field types, required rules, validation rules, repeat groups, GPS capture, photos, files, signatures, or calculated fields where needed.",
      "Use mobile preview to confirm the form is clear on smaller screens and usable offline.",
      "Publish the form only when labels, validation, mobile preview, and program assignment are ready.",
      "Assign the published form to the right field officers or project teams."
    ],
    dataLanguage: ["Question label", "Field type", "Required rule", "Validation", "Repeat group", "Mobile preview"],
    goodPractice: [
      "Use plain question labels that a field officer can read aloud.",
      "Add helper text when a question needs a specific format, evidence type, or explanation.",
      "Keep published versions stable so mobile users do not lose trust in assigned forms."
    ],
    avoid: [
      "Do not publish forms with unclear required fields.",
      "Do not change a published form during active field collection unless the team understands the impact."
    ],
    result: "Field officers receive clear, reliable, offline-ready forms that produce cleaner data.",
    nextActions: [
      { label: "Browse templates", view: "templates" },
      { label: "Invite field teams", view: "officers" }
    ]
  },
  {
    id: "field-teams",
    title: "Invite and manage field teams",
    purpose: "Field team management controls who collects data, which forms they can use, where they work, and whether their mobile devices are ready.",
    audience: "Supervisors, admins, and field coordinators",
    view: "officers",
    icon: UsersRound,
    whenToUse: "Use Field teams before deployment, during field monitoring, or when an officer changes location, role, device, or assignment.",
    beforeYouStart: [
      "Prepare the officer name, email, phone number, assigned area, role, and supervisor.",
      "Confirm the forms and projects the officer should access.",
      "Check that mobile access and device trust rules are understood by the team."
    ],
    steps: [
      "Open Field teams under Collect data.",
      "Invite the officer with their full name, email address, phone number, role, and assigned area.",
      "Assign mobile-ready credentials, forms, projects, and supervisor relationship.",
      "Check last activity, device status, sync health, and assignment coverage.",
      "Update or deactivate access when an officer leaves the field activity or changes responsibility."
    ],
    dataLanguage: ["Full name", "Email", "Phone", "Assigned area", "Assigned forms", "Sync status"],
    goodPractice: [
      "Give each officer only the forms and locations they need.",
      "Review sync status daily during active field collection.",
      "Keep phone numbers current for operational follow-up."
    ],
    avoid: [
      "Do not share one login across multiple officers.",
      "Do not leave inactive officers with access to active projects."
    ],
    result: "Each field officer has the correct assignments, mobile access, and supervision path.",
    nextActions: [
      { label: "Monitor offline sync", view: "connectivity" },
      { label: "Review submissions", view: "submissions" }
    ]
  },
  {
    id: "beneficiaries",
    title: "Manage beneficiaries",
    purpose: "Beneficiary records connect people, households, farmers, groups, facilities, or communities to programs, visits, consent, and field submissions.",
    audience: "Field teams, supervisors, and program staff",
    view: "beneficiaries",
    icon: UsersRound,
    whenToUse: "Use Beneficiaries when registering a participant, reviewing service history, checking consent, or linking a submission to an existing person or household.",
    beforeYouStart: [
      "Confirm what type of beneficiary is being recorded.",
      "Prepare consent information and required profile details.",
      "Search for an existing record before creating a new one."
    ],
    steps: [
      "Open Beneficiaries under Collect data.",
      "Search by name, household, phone number, location, or program relationship.",
      "Open the existing record or create a new beneficiary when no match exists.",
      "Capture profile details, consent status, GPS point, program connection, and visit history.",
      "Review possible duplicate warnings before saving or approving the record.",
      "Use the beneficiary record when reviewing submissions, cases, interventions, and reports."
    ],
    dataLanguage: ["Beneficiary name", "Household", "Consent", "GPS point", "Program link", "Visit history"],
    goodPractice: [
      "Search before creating records to protect data quality.",
      "Record consent clearly and keep it connected to the related program.",
      "Use consistent naming and location formats for easier reporting."
    ],
    avoid: [
      "Do not create a new beneficiary because spelling is slightly different.",
      "Do not collect sensitive details unless the program requires them and consent is recorded."
    ],
    result: "Beneficiary information remains traceable, consent-aware, and connected to field activity.",
    nextActions: [
      { label: "Open cases", view: "cases" },
      { label: "Use map", view: "map" }
    ]
  },
  {
    id: "submissions",
    title: "Review and approve submissions",
    purpose: "Submission review protects data quality before information enters reports, dashboards, maps, and program records.",
    audience: "Supervisors, data quality teams, and approvers",
    view: "submissions",
    icon: ShieldCheck,
    whenToUse: "Use Review queue after field officers sync submissions, when validation flags appear, or before reporting data to leadership or donors.",
    beforeYouStart: [
      "Know the form, project, review criteria, and correction policy.",
      "Confirm whether your role can approve, reject, or request correction.",
      "Check related beneficiary, GPS, media, and audit details before making a decision."
    ],
    steps: [
      "Open Review queue under Daily work.",
      "Filter or select submissions by project, form, officer, status, risk, or date.",
      "Open a submission and review required answers, validation messages, GPS evidence, media attachments, duplicates, and beneficiary links.",
      "Approve clean submissions that meet program and data quality requirements.",
      "Request correction when the officer can fix the record, and write a clear correction reason.",
      "Reject submissions only when the record should not move forward and the reason is documented."
    ],
    dataLanguage: ["Submission ID", "Officer", "Review status", "Validation score", "Correction reason", "Audit trail"],
    goodPractice: [
      "Review high-risk submissions before routine clean records.",
      "Write correction notes that are specific enough for the field officer to act on.",
      "Use audit history to understand what changed and who changed it."
    ],
    avoid: [
      "Do not approve a record only because every required field is filled.",
      "Do not reject without a clear reason that can be reviewed later."
    ],
    result: "Only trusted, reviewed submissions become part of official analytics and reports.",
    nextActions: [
      { label: "Track reports", view: "analytics" },
      { label: "Configure approvals", view: "workflows" }
    ]
  },
  {
    id: "approvals",
    title: "Configure approval workflows",
    purpose: "Approval workflows define who reviews work, when corrections happen, how escalations are triggered, and how accountability is recorded.",
    audience: "Administrators, operations leads, and governance teams",
    view: "workflows",
    icon: GitPullRequestArrow,
    whenToUse: "Use Approvals when a process needs controlled review, such as submissions, imports, reports, cases, or operational records.",
    beforeYouStart: [
      "Define the workflow type and the records it controls.",
      "Identify reviewer roles, review stages, SLA timing, and escalation rules.",
      "Confirm what should happen when work is approved, rejected, corrected, or overdue."
    ],
    steps: [
      "Open Approvals under Admin.",
      "Create or review the workflow definition for the record type.",
      "Add review stages in the order work should move through the organization.",
      "Assign each stage to a responsible role, team, or scope.",
      "Set SLA timing, correction paths, escalation rules, and completion criteria.",
      "Test the workflow with a sample record before using it in live operations."
    ],
    dataLanguage: ["Workflow type", "Review stage", "Responsible role", "SLA", "Escalation", "Correction path"],
    goodPractice: [
      "Keep approval paths as simple as the risk level allows.",
      "Use escalation rules for overdue work that affects reporting or service delivery.",
      "Review workflows after major program or team structure changes."
    ],
    avoid: [
      "Do not assign review stages to roles that do not have access to the underlying record.",
      "Do not create long approval chains for low-risk routine work."
    ],
    result: "Operational work moves through consistent review paths with clear ownership and deadlines.",
    nextActions: [
      { label: "Manage team access", view: "organizations" },
      { label: "Review governance", view: "governance" }
    ]
  },
  {
    id: "data-tools",
    title: "Import, clean, and export data",
    purpose: "Data tools help teams bring external data into Atlas FieldOps, map columns, validate records, correct errors, and prepare trusted exports.",
    audience: "Data managers, analysts, and implementation teams",
    view: "data",
    icon: Database,
    whenToUse: "Use Data tools when migrating spreadsheets, updating beneficiary lists, cleaning imported records, preparing donor exports, or reconciling external datasets.",
    beforeYouStart: [
      "Prepare a clean source file with headers and consistent values.",
      "Know the target dataset or workflow where the data should be imported.",
      "Confirm who is allowed to approve imported data."
    ],
    steps: [
      "Open Data tools under Operate.",
      "Upload the source file and select the target dataset or workflow.",
      "Map each source column to the correct Atlas FieldOps field.",
      "Review validation issues, missing required values, duplicates, and format problems.",
      "Correct issues directly or update the source file and upload again.",
      "Submit the clean import for approval or export the approved dataset in the required format."
    ],
    dataLanguage: ["Source file", "Target dataset", "Mapped columns", "Validation issues", "Duplicates", "Export format"],
    goodPractice: [
      "Keep a copy of the original source file for audit and reconciliation.",
      "Map fields using business meaning, not only matching column names.",
      "Resolve validation issues before downstream reporting."
    ],
    avoid: [
      "Do not import unknown columns without confirming their meaning.",
      "Do not overwrite active records without checking duplicate and conflict warnings."
    ],
    result: "Imported data becomes structured, validated, auditable, and available for connected workflows.",
    nextActions: [
      { label: "Review approvals", view: "workflows" },
      { label: "Open reports", view: "analytics" }
    ]
  },
  {
    id: "maps",
    title: "Use maps and GPS evidence",
    purpose: "Maps help teams understand where work is happening, where coverage is weak, and whether field activity matches the reported location.",
    audience: "Supervisors, M&E teams, and program managers",
    view: "map",
    icon: Map,
    whenToUse: "Use Map during coverage planning, field validation, route review, facility monitoring, farm boundary review, or location-based reporting.",
    beforeYouStart: [
      "Select the project, geography, team, or activity you want to inspect.",
      "Know whether you are reviewing point locations, boundaries, routes, or coverage gaps.",
      "Confirm GPS capture is required for the relevant form or workflow."
    ],
    steps: [
      "Open Map under Plan & monitor.",
      "Select the relevant project, date range, officer, beneficiary group, or activity layer.",
      "Compare GPS points, villages, facilities, farm boundaries, weak areas, and coverage clusters.",
      "Open records from the map when you need to inspect the related submission, beneficiary, or case.",
      "Use map findings to plan follow-up visits, resolve suspicious locations, or explain coverage in reports."
    ],
    dataLanguage: ["GPS point", "Coverage layer", "Village", "Boundary", "Weak area", "Location evidence"],
    goodPractice: [
      "Use maps together with review status; unapproved records may not represent final results.",
      "Compare location evidence with officer assignment and project geography.",
      "Document follow-up decisions when location issues affect reporting."
    ],
    avoid: [
      "Do not treat a GPS point as proof of complete service delivery by itself.",
      "Do not ignore location records outside expected project geography."
    ],
    result: "Teams can validate field coverage, identify gaps, and act on location-based evidence.",
    nextActions: [
      { label: "Review submissions", view: "submissions" },
      { label: "Track indicators", view: "indicators" }
    ]
  },
  {
    id: "reports",
    title: "Track indicators and reports",
    purpose: "Indicators and reports convert approved field data into progress tracking, operational summaries, logframes, donor outputs, and leadership dashboards.",
    audience: "M&E managers, analysts, and leadership teams",
    view: "analytics",
    icon: BarChart3,
    whenToUse: "Use Indicators and Reports during program reviews, donor reporting, management meetings, and performance analysis.",
    beforeYouStart: [
      "Confirm which project, reporting period, and indicator set you are reviewing.",
      "Check that relevant submissions have been synced and approved.",
      "Know whether the report is for internal management, donor reporting, or field follow-up."
    ],
    steps: [
      "Open Indicators to review baselines, targets, actuals, formulas, and progress.",
      "Open Reports to view summaries, exports, logframes, and donor-ready outputs.",
      "Filter by project, geography, period, team, or beneficiary segment.",
      "Check whether the numbers come from approved submissions, imports, or connected operational records.",
      "Export or share the report after review and approval."
    ],
    dataLanguage: ["Indicator", "Baseline", "Target", "Actual", "Reporting period", "Export"],
    goodPractice: [
      "Use approved data for formal reporting.",
      "Keep indicator definitions stable during a reporting period.",
      "Explain major changes in results with operational context from submissions, maps, and cases."
    ],
    avoid: [
      "Do not combine reporting periods without labeling them clearly.",
      "Do not present draft or unapproved records as final impact numbers."
    ],
    result: "Decision makers receive current, traceable information from approved field data.",
    nextActions: [
      { label: "Open projects", view: "programs" },
      { label: "Use map", view: "map" }
    ]
  },
  {
    id: "connectivity",
    title: "Monitor offline sync",
    purpose: "Sync health shows whether mobile work is safely moving from field devices into the platform for review, analytics, and reporting.",
    audience: "Field supervisors, support teams, and operations leads",
    view: "connectivity",
    icon: Wifi,
    whenToUse: "Use Sync health during active field collection, after network outages, before closing a data collection window, or when expected submissions are missing.",
    beforeYouStart: [
      "Know which teams and devices are expected to sync.",
      "Confirm the date range and forms being collected.",
      "Prepare to contact officers if repeated retries or missing check-ins appear."
    ],
    steps: [
      "Open Sync health under Daily work.",
      "Review batches waiting to sync, failed retries, recovered submissions, and devices that have not checked in.",
      "Filter by officer, region, device, form, or retry status when investigating a specific issue.",
      "Prioritize officers or regions with repeated failures or missing check-ins.",
      "Confirm recovered submissions appear in Review queue after sync completes."
    ],
    dataLanguage: ["Device", "Sync batch", "Retry count", "Last check-in", "Recovered submission", "Offline queue"],
    goodPractice: [
      "Check sync health before reporting that field collection is complete.",
      "Investigate repeated retries early so field officers do not lose time.",
      "Use sync status to separate missing data from unsynced data."
    ],
    avoid: [
      "Do not assume a field officer did not collect data until sync health is checked.",
      "Do not close a collection window while large offline queues remain unresolved."
    ],
    result: "Offline work remains visible, recoverable, and ready for review once connectivity returns.",
    nextActions: [
      { label: "Review queue", view: "submissions" },
      { label: "Manage field teams", view: "officers" }
    ]
  },
  {
    id: "governance",
    title: "Manage governance and access",
    purpose: "Governance controls who can access data, what actions are audited, how permissions are scoped, and how sensitive operational records are protected.",
    audience: "Administrators, security teams, and compliance owners",
    view: "governance",
    icon: Boxes,
    whenToUse: "Use Governance, Team & access, and Workforce when managing users, permissions, data quality rules, audit history, trusted devices, retention, and compliance processes.",
    beforeYouStart: [
      "Know the user role, department, geography, and data scope required.",
      "Confirm which actions should be allowed, reviewed, or blocked.",
      "Prepare a reason for access changes that affect sensitive data."
    ],
    steps: [
      "Open Governance for audit, data quality, consent, retention, lineage, and export controls.",
      "Open Team & access to manage users, roles, regions, and organizational permissions.",
      "Open Workforce to review departments, teams, delegations, trusted devices, and access requests.",
      "Use role previews or permission tests to confirm what the user can see and do.",
      "Review audit events after major permission, workflow, or data changes."
    ],
    dataLanguage: ["Role", "Permission", "Scope", "Audit event", "Trusted device", "Retention rule"],
    goodPractice: [
      "Apply least-privilege access so users only see what they need.",
      "Review permissions after staffing, partner, or geography changes.",
      "Keep export and sensitive-data access limited to accountable roles."
    ],
    avoid: [
      "Do not give broad admin access only to solve a temporary task.",
      "Do not leave old devices, inactive users, or outdated delegations trusted."
    ],
    result: "The organization keeps data access controlled, auditable, and aligned with responsibility.",
    nextActions: [
      { label: "Team & access", view: "organizations" },
      { label: "Workforce", view: "workforce" }
    ]
  }
];

const guideStandards = [
  "Use the current UI labels, menu names, button text, field names, and workflow status names.",
  "Explain the user goal first, then provide ordered steps and expected results.",
  "Write in professional corporate language that beginners can understand without training.",
  "Use data language carefully: define what each metric, status, field, and validation result means.",
  "Update this guide whenever a new feature, field, permission, workflow, or page is added."
];

const topicLinks = helpTopics.map((topic, index) => ({
  id: topic.id,
  label: topic.title,
  number: index + 1
}));

function TopicActionButtons({ actions }: { actions: HelpTopic["nextActions"] }) {
  const setActiveView = useWorkspaceStore((state) => state.setActiveView);

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {actions.map((action) => (
        <Button key={action.label} size="sm" variant="secondary" onClick={() => setActiveView(action.view)} type="button">
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
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Help center</p>
            <h1 id="help-title" className="mt-2 text-3xl font-semibold tracking-tight">
              How to use Atlas FieldOps
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              A beginner-friendly operating guide for using Atlas FieldOps across projects, mobile forms, field teams, submissions, approvals, maps, reports, data tools, and governance.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setActiveView("dashboard")} type="button">
              Open Today
              <BookOpenCheck aria-hidden="true" />
            </Button>
            <Button variant="primary" onClick={() => setActiveView("templates")} type="button">
              Start with templates
              <ClipboardList aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>

      <section aria-label="Help center summary" className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Core workflows", `${helpTopics.length}`, FileText],
          ["Role-based guidance", `${rolePaths.length} roles`, UsersRound],
          ["Product language", "Corporate", RadioTower],
          ["Content source", "Live platform", Search]
        ].map(([label, value, Icon]) => (
          <article className="surface-premium rounded-2xl p-4" key={label as string}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">{label as string}</p>
              <Icon aria-hidden="true" className="text-primary" size={18} />
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight">{value as string}</p>
          </article>
        ))}
      </section>

      <section aria-labelledby="getting-started-title" className="rounded-2xl border bg-panel p-4 shadow-line md:p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Getting started</p>
            <h2 id="getting-started-title" className="mt-2 text-xl font-semibold tracking-tight">
              Recommended first path
            </h2>
          </div>
          <Badge tone="accent">Beginner sequence</Badge>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {onboardingPath.map((item, index) => (
            <article className="rounded-xl border bg-background p-4" key={item.title}>
              <span className="flex h-7 w-7 items-center justify-center rounded-full border bg-panel text-xs font-semibold">
                {index + 1}
              </span>
              <h3 className="mt-4 text-sm font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="manual-sections-title" className="rounded-2xl border bg-panel p-4 shadow-line md:p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Manual sections</p>
            <h2 id="manual-sections-title" className="mt-2 text-xl font-semibold tracking-tight">
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
              <article className="rounded-2xl border bg-panel p-4 shadow-line md:p-5" id={topic.id} key={topic.id}>
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
                      <h2 className="mt-3 text-lg font-semibold tracking-tight">{topic.title}</h2>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{topic.purpose}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => setActiveView(topic.view)} type="button">
                    Open workspace
                  </Button>
                </div>

                <details className="group mt-5 rounded-xl border bg-background p-4" open={index < 2}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold">
                    <span>Read detailed instructions</span>
                    <span className="rounded-full border bg-panel px-2 py-1 text-xs font-medium text-muted-foreground">
                      {index < 2 ? "Open" : "Expand"}
                    </span>
                  </summary>

                  <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                    <section aria-labelledby={`${topic.id}-steps`}>
                      <h3 id={`${topic.id}-steps`} className="text-sm font-semibold">
                        How to use this workspace
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{topic.whenToUse}</p>

                      <h4 className="mt-5 text-sm font-semibold">Before you start</h4>
                      <ul className="mt-3 space-y-2">
                        {topic.beforeYouStart.map((item) => (
                          <li className="flex gap-2 text-sm leading-6 text-muted-foreground" key={item}>
                            <CheckCircle2 aria-hidden="true" className="mt-1 shrink-0 text-success" size={14} />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>

                      <h4 className="mt-5 text-sm font-semibold">Step-by-step</h4>
                      <ol className="mt-3 space-y-3">
                        {topic.steps.map((step, stepIndex) => (
                          <li className="flex gap-3 text-sm leading-6 text-muted-foreground" key={step}>
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border bg-panel text-xs font-semibold text-foreground">
                              {stepIndex + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </section>

                    <section aria-labelledby={`${topic.id}-details`} className="space-y-4">
                      <div>
                        <h3 id={`${topic.id}-details`} className="text-sm font-semibold">
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
                            <li className="flex gap-2 text-sm leading-6 text-muted-foreground" key={item}>
                              <CheckCircle2 aria-hidden="true" className="mt-1 shrink-0 text-success" size={14} />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold">Common mistakes to avoid</h3>
                        <ul className="mt-3 space-y-2">
                          {topic.avoid.map((item) => (
                            <li className="flex gap-2 text-sm leading-6 text-muted-foreground" key={item}>
                              <ShieldCheck aria-hidden="true" className="mt-1 shrink-0 text-warning" size={14} />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="rounded-xl border border-success/20 bg-success/10 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-success">Expected result</p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{topic.result}</p>
                        <TopicActionButtons actions={topic.nextActions} />
                      </div>
                    </section>
                  </div>
                </details>
              </article>
            );
          })}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start" aria-label="Guide standards">
          <section className="rounded-2xl border bg-panel p-4 shadow-line">
            <h2 className="text-sm font-semibold">Content agent starting point</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              The Product Content Agent maintains this guide from existing product behavior, not assumptions. Updates should reflect real workspace labels, user actions, data fields, permissions, and workflow outcomes.
            </p>
          </section>

          <section className="rounded-2xl border bg-panel p-4 shadow-line">
            <h2 className="text-sm font-semibold">Who should read what</h2>
            <div className="mt-3 space-y-3">
              {rolePaths.map(([role, description]) => (
                <div className="rounded-xl border bg-background p-3" key={role}>
                  <p className="text-sm font-semibold">{role}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
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
                  <p className="text-sm leading-6 text-muted-foreground">{standard}</p>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
