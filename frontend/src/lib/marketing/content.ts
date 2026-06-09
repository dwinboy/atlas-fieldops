import {
  BadgeCheck,
  BarChart3,
  Brain,
  Building2,
  ClipboardCheck,
  ClipboardList,
  Database,
  FileText,
  Flag,
  Globe2,
  GraduationCap,
  HeartPulse,
  Landmark,
  Map,
  RadioTower,
  ShieldCheck,
  Smartphone,
  UsersRound,
  Workflow,
} from "lucide-react";

export const site = {
  name: "Atlas FieldOps",
  url: "https://atlasfieldops.com",
  description:
    "Enterprise monitoring and evaluation software for offline data collection, survey management, GIS mapping, indicator tracking, program management, data quality, and donor reporting.",
};

export const navItems = [
  { label: "Features", href: "/features" },
  { label: "Solutions", href: "/solutions" },
  { label: "Demo", href: "/demo" },
  { label: "Use Cases", href: "/use-cases" },
  { label: "Pricing", href: "/pricing" },
  { label: "Resources", href: "/resources" },
  { label: "Blog", href: "/blog" },
];

export const platformModules = [
  ["Projects", "Program setup, locations, teams, indicators, reports, and project health."],
  ["Forms", "Enterprise form builder, survey governance, versioning, templates, validation, and publishing."],
  ["Field Operations", "Assignments, field officers, supervisors, targets, work plans, and monitoring."],
  ["Submissions", "Review queues, approval workflows, corrections, attachments, quality flags, and audit history."],
  ["Mapping", "GIS maps, boundaries, coverage, GPS validation, and spatial issue discovery."],
  ["Indicators", "Indicator library, logframes, targets, baselines, calculations, and disaggregation."],
  ["Reports", "Standard reports, custom dashboards, donor outputs, scheduled delivery, and exports."],
  ["Data Quality", "Duplicates, outliers, missing data, GPS issues, validation failures, and risk alerts."],
  ["Governance", "Audit trails, policies, approvals, retention, consent, compliance, and data stewardship."],
  ["Administration", "Reference data, integrations, notifications, API settings, backups, and system defaults."],
];

export const platformFeatures = [
  {
    title: "Project management",
    text: "Coordinate programs, teams, locations, surveys, indicators, targets, assignments, and project health in one workspace.",
    icon: Building2,
  },
  {
    title: "Enterprise form builder",
    text: "Build mobile-ready survey forms with sections, repeat groups, logic, validation, reference data, GPS, media, versioning, and governance.",
    icon: ClipboardList,
  },
  {
    title: "Offline data collection",
    text: "Support field officers working with limited connectivity while preserving GPS, timestamps, media evidence, and sync history.",
    icon: Smartphone,
  },
  {
    title: "Field operations",
    text: "Assign work to supervisors and field officers, track targets, monitor daily activity, and keep coverage moving.",
    icon: RadioTower,
  },
  {
    title: "Submission review",
    text: "Review, approve, reject, return, archive, and audit collected data before it enters analytics and reports.",
    icon: ClipboardCheck,
  },
  {
    title: "GIS mapping",
    text: "Visualize project boundaries, submission points, beneficiaries, facilities, coverage gaps, and spatial data quality issues.",
    icon: Map,
  },
  {
    title: "Indicator tracking",
    text: "Manage results frameworks, logframes, baselines, targets, calculations, disaggregation, and indicator reports.",
    icon: BarChart3,
  },
  {
    title: "Data quality controls",
    text: "Detect duplicates, outliers, missing data, GPS issues, validation failures, and high-risk patterns before reporting.",
    icon: Brain,
  },
  {
    title: "Governance and audit",
    text: "Protect sensitive data with permissions, approval rules, retention, consent, export governance, and immutable audit trails.",
    icon: ShieldCheck,
  },
  {
    title: "Donor reporting",
    text: "Create executive reports, donor dashboards, indicator exports, map outputs, scheduled reports, and governed downloads.",
    icon: FileText,
  },
];

export const workflowSteps = [
  "Projects",
  "Surveys",
  "Forms",
  "Field teams",
  "Assignments",
  "Submissions",
  "Reviews",
  "Data quality",
  "Indicators",
  "Reports",
];

export const industries = [
  {
    title: "NGO monitoring platform",
    text: "Manage programs, beneficiaries, field officers, surveys, approvals, maps, indicators, donor reports, and audit requirements.",
    image: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Government monitoring platform",
    text: "Monitor public services, inspections, regional delivery, citizen feedback, infrastructure, and executive reporting.",
    image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Health monitoring",
    text: "Coordinate outreach, surveillance, facility assessments, referrals, vaccination follow-up, and data quality review.",
    image: "https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Education monitoring",
    text: "Track school inspections, attendance, training, learning environments, feeding programs, and infrastructure gaps.",
    image: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1200&q=80",
  },
];

export const solutionPages = [
  {
    slug: "ngos",
    title: "Monitoring and evaluation software for NGOs",
    audience: "NGOs and implementing partners",
    icon: UsersRound,
    description: "Run beneficiary programs, field surveys, approvals, data quality checks, GIS coverage, indicator tracking, and donor reports without scattered spreadsheets.",
    challenges: ["Disconnected survey tools and reporting files", "Slow field supervision and approval queues", "Weak beneficiary visibility across projects", "Donor reporting pressure with limited data trust"],
    modules: ["Projects", "Forms", "Field Operations", "Submissions", "Data Quality", "Reports"],
    outcomes: ["Cleaner monitoring data", "Faster review cycles", "Better donor reporting", "Clearer beneficiary reach"],
  },
  {
    slug: "government",
    title: "Government monitoring platform for program delivery",
    audience: "Public sector programs",
    icon: Landmark,
    description: "Monitor services, inspections, regional teams, facilities, public programs, and outcomes with auditable workflows and geographic visibility.",
    challenges: ["Multi-region reporting delays", "Hard-to-verify field evidence", "Fragmented citizen and facility monitoring", "Limited executive visibility"],
    modules: ["Projects", "Mapping", "Field Operations", "Indicators", "Reports", "Governance"],
    outcomes: ["Transparent regional performance", "Stronger auditability", "Coverage maps for service gaps", "Executive dashboards"],
  },
  {
    slug: "donors",
    title: "Impact measurement and donor reporting software",
    audience: "Donors, foundations, and portfolio teams",
    icon: Flag,
    description: "Track portfolio indicators, project results, approved data, geographic coverage, and governed exports for transparent impact reporting.",
    challenges: ["Inconsistent grantee reporting", "Weak evidence behind results", "Slow portfolio aggregation", "Limited data governance"],
    modules: ["Indicators", "Reports", "Governance", "Mapping", "Data Quality"],
    outcomes: ["Comparable results", "Approved data pipelines", "Portfolio dashboards", "Auditable exports"],
  },
  {
    slug: "research",
    title: "Survey management platform for research teams",
    audience: "Research programs and evaluation teams",
    icon: Database,
    description: "Design complex surveys, collect offline data, control reference lists, validate responses, monitor enumerators, and preserve versioned datasets.",
    challenges: ["Complex questionnaires are hard to manage", "Enumerator performance is difficult to track", "Version changes can break datasets", "Data cleaning happens too late"],
    modules: ["Forms", "Submissions", "Field Operations", "Data Quality", "Reports"],
    outcomes: ["Cleaner datasets", "Version-safe surveys", "Better enumerator oversight", "Faster analysis readiness"],
  },
  {
    slug: "health",
    title: "Health monitoring and facility assessment software",
    audience: "Health systems and public health programs",
    icon: HeartPulse,
    description: "Manage facility assessments, outreach visits, patient follow-up, referrals, GPS evidence, and health program reporting.",
    challenges: ["Facility data is inconsistent", "Community outreach is hard to monitor", "Referral and follow-up gaps are missed", "Sensitive data needs strong controls"],
    modules: ["Forms", "Field Operations", "Submissions", "Mapping", "Governance"],
    outcomes: ["Better facility visibility", "Reliable outreach evidence", "Improved follow-up tracking", "Sensitive data controls"],
  },
  {
    slug: "education",
    title: "Education monitoring software for schools and programs",
    audience: "Education programs",
    icon: GraduationCap,
    description: "Track school inspections, attendance, training, infrastructure, learning environments, and project indicators with offline forms and maps.",
    challenges: ["School inspection evidence is scattered", "Attendance and training data is delayed", "Infrastructure gaps are hard to prioritize", "Reports lack field context"],
    modules: ["Projects", "Forms", "Mapping", "Indicators", "Reports"],
    outcomes: ["Clear school coverage", "Faster inspection reporting", "Better indicator progress", "Evidence-based decisions"],
  },
];

export const useCasePages = [
  {
    slug: "baseline-surveys",
    title: "Baseline Surveys",
    description: "Collect baseline values, demographics, GPS evidence, and indicator starting points before implementation begins.",
    steps: [
      "Design a baseline questionnaire with sections for demographics, GPS, consent, and starting indicator values.",
      "Publish a versioned form and assign field teams to target locations.",
      "Collect offline data with GPS and media evidence; sync to the platform.",
      "Review submissions for quality flags and approve the baseline dataset.",
      "Use approved baseline records to set indicator starting points and generate the baseline report.",
    ],
    modules: ["Forms", "Field Operations", "Submissions", "Indicators", "Data Quality"],
    outcomes: ["Clean baseline dataset", "GPS-stamped evidence", "Indicator starting points", "Donor-ready baseline report"],
    faqs: [
      { question: "Can baseline forms include repeat groups and GPS?", answer: "Yes. The form builder supports repeat groups, GPS coordinates, media attachments, consent fields, and validation rules." },
      { question: "How do I set indicator baselines after collection?", answer: "Once baseline submissions are approved, the Indicators module lets you record or calculate the baseline value for each indicator." },
    ],
  },
  {
    slug: "endline-surveys",
    title: "Endline Surveys",
    description: "Compare final results against baselines, targets, locations, and approved submissions.",
    steps: [
      "Clone or version the original baseline form to maintain comparability.",
      "Assign field teams to the same locations with updated targets and timelines.",
      "Collect endline data offline and sync submissions for review.",
      "Approve endline records and run data quality checks against baseline controls.",
      "Generate indicator comparison reports showing baseline to endline change.",
    ],
    modules: ["Forms", "Submissions", "Indicators", "Reports", "Data Quality"],
    outcomes: ["Comparable measurement dataset", "Indicator change analysis", "Variance and achievement reports", "Evidence for donors"],
    faqs: [
      { question: "Can I reuse the baseline form for the endline?", answer: "Yes. Forms are versioned so you can clone, update, and publish a new version without losing the original baseline structure." },
      { question: "How are baseline and endline compared in reports?", answer: "The Indicators module stores baselines, current values, and targets so reports can show progress and achievement against plan." },
    ],
  },
  {
    slug: "monitoring-visits",
    title: "Monitoring Visits",
    description: "Plan visits, assign field officers, collect evidence, review findings, and resolve issues.",
    steps: [
      "Create a monitoring visit form with observation, GPS, photo evidence, and issue fields.",
      "Build a work plan with visit targets, assigned supervisors, and locations.",
      "Assign visits to field officers with deadlines and required beneficiary lists.",
      "Collect findings offline, attach photos, and sync visit records.",
      "Supervisors review flagged findings, raise issues, and track resolution.",
    ],
    modules: ["Field Operations", "Forms", "Submissions", "Mapping", "Data Quality"],
    outcomes: ["Structured visit evidence", "Issue tracking", "Coverage visibility on maps", "Supervisor review records"],
    faqs: [
      { question: "Can monitoring visits be linked to specific beneficiaries?", answer: "Yes. Assignments can include an entity list so each visit is attributed to a specific household, facility, or farmer." },
      { question: "What happens when a visit finds a problem?", answer: "Field officers can flag issues in the submission, and supervisors can raise cases or operational tasks for follow-up from the review queue." },
    ],
  },
  {
    slug: "registration-programs",
    title: "Registration Programs",
    description: "Register beneficiaries, households, facilities, farmers, students, or participants with governed reference data.",
    steps: [
      "Define the entity type and required fields: name, ID, location, GPS, consent, and custom attributes.",
      "Build a registration form linked to the entity type with duplicate prevention rules.",
      "Assign registration targets to field teams by zone or district.",
      "Collect registrations offline with GPS and photo ID evidence.",
      "Review and approve records; resolve duplicates flagged by the data quality engine.",
    ],
    modules: ["Beneficiaries", "Forms", "Field Operations", "Data Quality", "Submissions"],
    outcomes: ["Clean beneficiary registry", "Duplicate-free records", "GPS-located entities", "Governed reference data"],
    faqs: [
      { question: "How does the platform prevent duplicate registrations?", answer: "Data quality rules check name, ID, GPS location, and date patterns automatically. Suspected duplicates are flagged for supervisor review before approval." },
      { question: "Can registration forms include photo ID capture?", answer: "Yes. Forms support media attachments, so field officers can photograph an ID or participant and attach it to the registration record." },
    ],
  },
  {
    slug: "beneficiary-tracking",
    title: "Beneficiary Tracking",
    description: "Maintain longitudinal beneficiary records, interventions, consent, locations, and status changes.",
    steps: [
      "Register or import the initial beneficiary list with profiles and consent records.",
      "Link interventions, visits, distributions, and training events to each beneficiary.",
      "Track status changes such as enrollment, active, graduated, or withdrawn.",
      "Review beneficiary history and submission records from the entity detail view.",
      "Run data quality checks to identify inactive, missing, or high-risk records.",
    ],
    modules: ["Beneficiaries", "Submissions", "Field Operations", "Data Quality", "Reports"],
    outcomes: ["Longitudinal beneficiary records", "Intervention history", "Status tracking", "Consent and audit trail"],
    faqs: [
      { question: "Can I track the same beneficiary across multiple projects?", answer: "Yes. Beneficiary records are organization-level, so the same entity can be linked to multiple projects and have separate intervention histories." },
      { question: "What does a beneficiary profile show?", answer: "The profile shows demographic details, GPS location, consent status, linked submissions, interventions, visit history, data quality flags, and audit events." },
    ],
  },
  {
    slug: "needs-assessments",
    title: "Needs Assessments",
    description: "Collect household, community, facility, and market needs data with offline forms and quality controls.",
    steps: [
      "Design a needs assessment form with household, community, or market sections.",
      "Define geographic scope and assign teams to villages, clusters, or districts.",
      "Collect data offline; use GPS for household location and media for evidence.",
      "Review submissions, resolve quality flags, and approve the clean dataset.",
      "Use the approved dataset to generate vulnerability rankings and planning reports.",
    ],
    modules: ["Forms", "Field Operations", "Submissions", "Mapping", "Data Quality"],
    outcomes: ["Structured needs dataset", "Geographic vulnerability map", "Approved evidence base", "Planning reports"],
    faqs: [
      { question: "Can assessments capture GPS coordinates for each household?", answer: "Yes. GPS question types capture the coordinates at the time of collection, which appear on coverage maps after sync." },
      { question: "How do I identify the highest-need areas?", answer: "The Mapping module shows submission density and indicator values on a geographic layer so planners can see priority areas visually." },
    ],
  },
  {
    slug: "health-monitoring",
    title: "Health Monitoring",
    description: "Track outreach, facility performance, referrals, symptoms, and public health program indicators.",
    steps: [
      "Build facility assessment and outreach visit forms with clinical fields and referral sections.",
      "Assign community health workers to households and facilities with visit schedules.",
      "Collect health data offline, including GPS, media, and referral records.",
      "Review submissions for completeness, flag anomalies, and approve health records.",
      "Track health indicators and generate outreach coverage and referral completion reports.",
    ],
    modules: ["Forms", "Field Operations", "Submissions", "Indicators", "Governance"],
    outcomes: ["Facility performance records", "Outreach coverage visibility", "Referral completion tracking", "Health indicator reports"],
    faqs: [
      { question: "Can sensitive health data be protected?", answer: "Yes. Governance controls include consent fields, role-based field visibility, access restrictions, and audit logs for every data access or export." },
      { question: "How are referrals tracked through the system?", answer: "Referral records are linked to the originating visit submission and can be tracked as cases with status updates from intake to resolution." },
    ],
  },
  {
    slug: "education-monitoring",
    title: "Education Monitoring",
    description: "Monitor schools, attendance, training, infrastructure, and learning program outcomes.",
    steps: [
      "Create school inspection, attendance, and training forms with facility and student sections.",
      "Assign inspectors to schools with visit dates, targets, and required evidence.",
      "Collect observations offline with GPS and photo evidence of infrastructure.",
      "Review inspection records and flag schools with compliance or maintenance gaps.",
      "Report on school-level indicator progress and district-wide infrastructure status.",
    ],
    modules: ["Projects", "Forms", "Mapping", "Indicators", "Reports"],
    outcomes: ["School inspection records", "Attendance and training evidence", "Infrastructure gap map", "District progress reports"],
    faqs: [
      { question: "Can the platform track multiple schools across a district?", answer: "Yes. Each school is registered as an entity and inspections are linked to that entity so supervisors can see the full history per school." },
      { question: "How are inspection findings shared with district managers?", answer: "Reports can be exported or scheduled to distribute approved inspection summaries to managers with the appropriate read-only role." },
    ],
  },
  {
    slug: "agriculture-programs",
    title: "Agriculture Programs",
    description: "Register farmers, map farms, monitor yields, verify inputs, and report agriculture indicators.",
    steps: [
      "Register farmers and farm plots with GPS boundaries, crops, and household details.",
      "Assign input verification visits to agricultural extension officers.",
      "Collect yield monitoring, input verification, and farm visit data offline.",
      "Review submissions and resolve anomalies before approving the harvest dataset.",
      "Report on input coverage, yield indicators, and farmer program participation.",
    ],
    modules: ["Beneficiaries", "Mapping", "Forms", "Field Operations", "Indicators"],
    outcomes: ["Farmer registry with GPS farms", "Input verification records", "Yield indicator tracking", "Donor agriculture reports"],
    faqs: [
      { question: "Can farm boundaries be captured in the field?", answer: "Yes. GPS and polygon capture tools let field officers trace farm boundaries which appear on the project map after sync." },
      { question: "How are input distributions verified?", answer: "Distribution verification forms link inputs to registered farmers, with quantity, date, GPS, and officer signature captured as evidence." },
    ],
  },
  {
    slug: "humanitarian-programs",
    title: "Humanitarian Programs",
    description: "Manage vulnerability assessments, distributions, complaints, protection cases, and donor evidence.",
    steps: [
      "Conduct vulnerability assessments to register and score affected households.",
      "Build distribution forms with beneficiary lists, quantities, GPS, and consent.",
      "Manage a complaints and feedback mechanism with case routing and resolution.",
      "Track protection cases with sensitivity controls and restricted data access.",
      "Generate donor evidence packages from approved distributions and assessments.",
    ],
    modules: ["Beneficiaries", "Forms", "Submissions", "Governance", "Reports"],
    outcomes: ["Vulnerability scoring dataset", "Distribution evidence trail", "Complaints case records", "Donor-auditable evidence packages"],
    faqs: [
      { question: "How are protection cases kept confidential?", answer: "Governance controls allow field-level data restrictions, case-specific access rules, and audit logs so sensitive protection records are only visible to authorised users." },
      { question: "Can beneficiaries submit complaints anonymously?", answer: "Yes. Public collection links can be configured to allow anonymous responses that route into the case management queue." },
    ],
  },
];

export const trustLogos = ["NGOs", "Governments", "Donors", "Research Teams", "Health Programs", "Education Programs"];

export const metrics = [
  { label: "Records processed daily", value: "10M+" },
  { label: "Offline sync reliability", value: "99.9%" },
  { label: "Approval workflow coverage", value: "100%" },
  { label: "Deployment regions", value: "40+" },
];

export const pricingTiers = [
  {
    name: "Starter",
    price: "Contact sales",
    description: "For one program launching reliable surveys, mobile collection, review queues, and basic reports.",
    features: ["Projects and forms", "Offline mobile collection", "Submission review", "Basic dashboards", "Email support"],
  },
  {
    name: "Professional",
    price: "Contact sales",
    description: "For growing teams managing multiple projects, locations, field officers, data quality, and donor reporting.",
    features: ["Everything in Starter", "GIS mapping", "Indicator tracking", "Data quality rules", "Advanced exports", "Implementation support"],
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For organizations needing multi-tenant controls, integrations, security review, governance, and dedicated support.",
    features: ["Everything in Professional", "Advanced RBAC", "Audit and governance", "API access", "SSO readiness", "Dedicated success plan"],
  },
];

export const resourceCards = [
  { title: "M&E implementation guide", type: "Guide", text: "Design indicators, workflows, field roles, and reporting cycles.", category: "Guides" },
  { title: "Offline field operations checklist", type: "Checklist", text: "Prepare forms, maps, media queues, sync retries, and training.", category: "Best Practices" },
  { title: "Beneficiary registry blueprint", type: "Template", text: "Structure households, interventions, consent, and longitudinal tracking.", category: "Templates" },
  { title: "Data quality rule starter pack", type: "Template", text: "Create duplicate, outlier, GPS, and validation rules before collection begins.", category: "Downloads" },
  { title: "Donor reporting workbook", type: "Whitepaper", text: "Connect indicators, approved submissions, maps, and governance controls.", category: "Whitepapers" },
  { title: "Enumerator training outline", type: "Video", text: "Plan mobile collection onboarding, field support, and sync readiness.", category: "Videos" },
];

export const blogPosts = [
  {
    title: "How offline data collection software improves field program reliability",
    category: "Data Collection",
    tags: ["offline data collection app", "field operations"],
    excerpt: "A practical guide to building confidence when teams work across unstable connectivity.",
  },
  {
    title: "What modern monitoring and evaluation software needs beyond surveys",
    category: "Monitoring & Evaluation",
    tags: ["M&E platform", "survey management platform"],
    excerpt: "Why connected workflows, beneficiary context, data quality, and approvals matter.",
  },
  {
    title: "Using GIS mapping software to close service coverage gaps",
    category: "GIS Mapping",
    tags: ["GIS mapping software", "coverage monitoring"],
    excerpt: "How maps, GPS, and supervisor workflows turn field data into action.",
  },
  {
    title: "Building donor reports from approved data instead of spreadsheets",
    category: "Reporting",
    tags: ["donor reporting software", "impact measurement platform"],
    excerpt: "How governed submissions and indicators make reporting faster and more trustworthy.",
  },
];

export const caseStudies = [
  {
    title: "Agriculture program improves input verification",
    sector: "Agriculture",
    country: "Regional",
    organizationType: "NGO",
    result: "32% faster field review",
    text: "A regional agriculture team connected farmer registration, input distribution, farm visits, and donor reports.",
  },
  {
    title: "Health outreach team reduces missed follow-ups",
    sector: "Health",
    country: "Multi-district",
    organizationType: "Government",
    result: "41% fewer overdue cases",
    text: "Supervisors used live queues, offline mobile forms, and referral tracking to keep community visits on schedule.",
  },
  {
    title: "Humanitarian team unifies beneficiary feedback",
    sector: "Humanitarian",
    country: "Multi-region",
    organizationType: "INGO",
    result: "5 regions connected",
    text: "A response program linked vulnerability scoring, distribution evidence, feedback, and protection cases.",
  },
];

export const documentationCategories = [
  {
    name: "Getting Started",
    description: "Organization setup, first admin, workspace onboarding, team invitation, and initial project creation.",
    topics: ["Create your organization", "Invite administrators", "Set up your first project", "Configure workspace settings", "Understand roles and permissions"],
  },
  {
    name: "Projects",
    description: "Program setup, locations, teams, indicators, targets, reporting periods, and project health monitoring.",
    topics: ["Create and configure projects", "Add locations and boundaries", "Assign teams and supervisors", "Link indicators to projects", "Monitor project health"],
  },
  {
    name: "Forms",
    description: "Form builder, field types, logic, repeat groups, versioning, templates, publishing, and governance controls.",
    topics: ["Build a form from scratch", "Use templates", "Add conditional logic", "Publish and version forms", "Govern form access"],
  },
  {
    name: "Field Operations",
    description: "Assignments, field officers, supervisors, work plans, targets, daily activity, and operational monitoring.",
    topics: ["Create assignments", "Assign field officers and supervisors", "Build work plans", "Track daily collection progress", "Monitor overdue assignments"],
  },
  {
    name: "Submissions",
    description: "Review queues, approval workflows, corrections, attachments, quality flags, audit history, and bulk actions.",
    topics: ["Review incoming submissions", "Approve and reject records", "Return submissions for correction", "View attachments and GPS evidence", "Bulk-review and export"],
  },
  {
    name: "Mapping",
    description: "GIS maps, project boundaries, submission coverage, GPS validation, spatial filters, and offline map packs.",
    topics: ["View project coverage maps", "Filter submissions by location", "Validate GPS evidence", "Identify coverage gaps", "Export spatial data"],
  },
  {
    name: "Indicators",
    description: "Indicator library, logframes, baselines, targets, calculations, disaggregation, reporting periods, and SDG mapping.",
    topics: ["Create indicators", "Set baselines and targets", "Configure calculations and disaggregation", "Track indicator progress", "Generate indicator reports"],
  },
  {
    name: "Reports",
    description: "Standard reports, custom dashboards, donor outputs, scheduled delivery, export formats, and governed downloads.",
    topics: ["Generate standard reports", "Build custom dashboards", "Schedule report delivery", "Export to PDF and Excel", "Share reports with donors"],
  },
  {
    name: "Data Quality",
    description: "Duplicate detection, outliers, missing data, GPS anomalies, validation failures, and risk alert management.",
    topics: ["Set up data quality rules", "Review duplicate records", "Resolve GPS anomalies", "Handle missing required fields", "Export a quality-clean dataset"],
  },
  {
    name: "Governance",
    description: "Audit trails, policies, approval rules, retention schedules, consent records, compliance, and data stewardship.",
    topics: ["View audit logs", "Configure approval rules", "Set retention and consent policies", "Manage export governance", "Run compliance checks"],
  },
  {
    name: "Administration",
    description: "System settings, reference data, API keys, integrations, notification rules, imports, and backup configuration.",
    topics: ["Configure system settings", "Manage reference data", "Create API keys and scopes", "Set up integrations", "Run data imports and migrations"],
  },
  {
    name: "API",
    description: "REST API authentication, versioned endpoints, rate limits, webhooks, OpenAPI documentation, and example requests.",
    topics: ["Authenticate with API keys", "Use versioned endpoints", "Understand rate limits", "Subscribe to webhooks", "Download OpenAPI specification"],
  },
];

export const seoKeywords = [
  "monitoring and evaluation software",
  "M&E platform",
  "data collection software",
  "offline data collection app",
  "survey management platform",
  "field data collection software",
  "GIS mapping software",
  "indicator tracking software",
  "program management software",
  "donor reporting software",
  "NGO monitoring platform",
  "government monitoring platform",
  "impact measurement platform",
  "results framework software",
  "data quality management platform",
  "beneficiary management platform",
];

export const pageFeatureIcons = [ShieldCheck, RadioTower, BarChart3, Smartphone, Globe2, BadgeCheck];
