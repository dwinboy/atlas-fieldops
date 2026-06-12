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
    text: "Visualize project boundaries, submission points, entities, facilities, coverage gaps, and spatial data quality issues.",
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
    text: "Manage programs, entities, field officers, surveys, approvals, maps, indicators, donor reports, and audit requirements.",
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
    description: "Run entity programs, field surveys, approvals, data quality checks, GIS coverage, indicator tracking, and donor reports without scattered spreadsheets.",
    challenges: ["Disconnected survey tools and reporting files", "Slow field supervision and approval queues", "Weak entity visibility across projects", "Donor reporting pressure with limited data trust"],
    modules: ["Projects", "Forms", "Field Operations", "Submissions", "Data Quality", "Reports"],
    outcomes: ["Cleaner monitoring data", "Faster review cycles", "Better donor reporting", "Clearer entity reach"],
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
  ["baseline-surveys", "Baseline Surveys", "Collect baseline values, demographics, GPS evidence, and indicator starting points before implementation begins."],
  ["endline-surveys", "Endline Surveys", "Compare final results against baselines, targets, locations, and approved submissions."],
  ["monitoring-visits", "Monitoring Visits", "Plan visits, assign field officers, collect evidence, review findings, and resolve issues."],
  ["registration-programs", "Registration Programs", "Register entities, households, facilities, farmers, students, or participants with governed reference data."],
  ["beneficiary-tracking", "Entity Tracking", "Maintain longitudinal entity records, interventions, consent, locations, and status changes."],
  ["needs-assessments", "Needs Assessments", "Collect household, community, facility, and market needs data with offline forms and quality controls."],
  ["health-monitoring", "Health Monitoring", "Track outreach, facility performance, referrals, symptoms, and public health program indicators."],
  ["education-monitoring", "Education Monitoring", "Monitor schools, attendance, training, infrastructure, and learning program outcomes."],
  ["agriculture-programs", "Agriculture Programs", "Register farmers, map farms, monitor yields, verify inputs, and report agriculture indicators."],
  ["humanitarian-programs", "Humanitarian Programs", "Manage vulnerability assessments, distributions, complaints, protection cases, and donor evidence."],
].map(([slug, title, description]) => ({ slug, title, description }));

export const trustLogos = ["NGOs", "Governments", "Donors", "Research Teams", "Health Programs", "Education Programs"];

export const footerColumns = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/features" },
      { label: "Solutions", href: "/solutions" },
      { label: "Use Cases", href: "/use-cases" },
      { label: "Templates", href: "/templates" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Case Studies", href: "/case-studies" },
      { label: "Careers", href: "/careers" },
      { label: "Security", href: "/security" },
      { label: "Status", href: "/status" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Resources", href: "/resources" },
      { label: "Blog", href: "/blog" },
      { label: "Documentation", href: "/documentation" },
      { label: "Help Center", href: "/help" },
    ],
  },
  {
    title: "Get Started",
    links: [
      { label: "Book a demo", href: "/book-demo" },
      { label: "Start free trial", href: "/signup" },
      { label: "Contact sales", href: "/contact" },
      { label: "Sign in", href: "/login" },
    ],
  },
];

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
    cta: { label: "Talk to sales", href: "/contact" },
  },
  {
    name: "Professional",
    price: "Contact sales",
    description: "For growing teams managing multiple projects, locations, field officers, data quality, and donor reporting.",
    features: ["Everything in Starter", "GIS mapping", "Indicator tracking", "Data quality rules", "Advanced exports", "Implementation support"],
    featured: true,
    cta: { label: "Book a demo", href: "/book-demo" },
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For organizations needing multi-tenant controls, integrations, security review, governance, and dedicated support.",
    features: ["Everything in Professional", "Advanced RBAC", "Audit and governance", "API access", "SSO readiness", "Dedicated success plan"],
    cta: { label: "Contact sales", href: "/contact" },
  },
];

export const resourceCards = [
  { title: "M&E implementation guide", type: "Guide", text: "Design indicators, workflows, field roles, and reporting cycles.", category: "Guides" },
  { title: "Offline field operations checklist", type: "Checklist", text: "Prepare forms, maps, media queues, sync retries, and training.", category: "Best Practices" },
  { title: "Entity registry blueprint", type: "Template", text: "Structure households, interventions, consent, and longitudinal tracking.", category: "Templates" },
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
    excerpt: "Why connected workflows, entity context, data quality, and approvals matter.",
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
    title: "Humanitarian team unifies entity feedback",
    sector: "Humanitarian",
    country: "Multi-region",
    organizationType: "INGO",
    result: "5 regions connected",
    text: "A response program linked vulnerability scoring, distribution evidence, feedback, and protection cases.",
  },
];

export const documentationCategories = [
  "Getting Started",
  "Projects",
  "Forms",
  "Field Operations",
  "Submissions",
  "Mapping",
  "Indicators",
  "Reports",
  "Data Quality",
  "Governance",
  "Administration",
  "API",
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
  "entity management platform",
];

export const pageFeatureIcons = [ShieldCheck, RadioTower, BarChart3, Smartphone, Globe2, BadgeCheck];
