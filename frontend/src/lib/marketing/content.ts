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
    "Enterprise field data collection and operations software for offline mobile forms, inspections, surveys, inventory checks, service monitoring, GIS mapping, data quality, KPI tracking, and governed reporting.",
};

export const platformModules = [
  ["Projects", "Sector setup, locations, teams, KPIs, reports, and project health."],
  ["Forms", "Enterprise form builder for surveys, inspections, audits, stock counts, checklists, and mobile workflows."],
  ["Field Operations", "Assignments, field officers, supervisors, targets, work plans, and monitoring."],
  ["Submissions", "Review queues, approval workflows, corrections, attachments, quality flags, and audit history."],
  ["Mapping", "GIS maps, boundaries, coverage, GPS validation, and spatial issue discovery."],
  ["Metrics & Results", "KPI library, targets, baselines, calculations, trend tracking, and disaggregation."],
  ["Reports", "Standard reports, custom dashboards, client outputs, scheduled delivery, and exports."],
  ["Data Quality", "Duplicates, outliers, missing data, GPS issues, validation failures, and risk alerts."],
  ["Governance", "Audit trails, policies, approvals, retention, consent, compliance, and data stewardship."],
  ["Administration", "Reference data, integrations, notifications, API settings, backups, and system defaults."],
];

export const platformFeatures = [
  {
    title: "Project and sector setup",
    text: "Start from sector packs for agriculture, health, education, retail, logistics, inventory, audits, inspections, HR, and custom operations.",
    icon: Building2,
  },
  {
    title: "Enterprise form builder",
    text: "Build mobile-ready surveys, checklists, inspections, stock counts, delivery proofs, HR records, and audits with logic, validation, GPS, media, and governance.",
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
    title: "KPI and result tracking",
    text: "Manage indicators, operational KPIs, baselines, targets, calculations, disaggregation, and performance reports.",
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
    title: "Governed reporting",
    text: "Create executive reports, donor/client dashboards, KPI exports, map outputs, scheduled reports, and governed downloads.",
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
  "Metrics",
  "Reports",
];

export const operatingFlow = [
  {
    title: "Configure the operating context",
    text: "Choose a sector pack or custom setup, define projects, locations, teams, entities, KPIs, approval rules, and reporting needs.",
  },
  {
    title: "Build governed data instruments",
    text: "Create forms for surveys, inspections, stock counts, registrations, delivery proof, audits, training, complaints, or custom workflows.",
  },
  {
    title: "Assign field work",
    text: "Send the right forms, entities, locations, boundaries, and instructions to field officers, supervisors, stores, routes, facilities, or assets.",
  },
  {
    title: "Collect online or offline",
    text: "Capture responses, GPS, timestamps, photos, signatures, files, barcodes, linked records, and draft work even when connectivity is weak.",
  },
  {
    title: "Review and clean the evidence",
    text: "Run approvals, corrections, duplicate checks, GPS validation, spreadsheet-style cleaning, data quality review, and audit logging.",
  },
  {
    title: "Use trusted data everywhere",
    text: "Approved data updates entities, maps, dashboards, KPIs, reports, exports, supervisor queues, and management decisions.",
  },
];

export const architectureLayers = [
  ["Organization", "Tenant, users, roles, branding, security, plans, and audit policy."],
  ["Projects", "Sector context, geography, entity categories, teams, forms, KPIs, and governance."],
  ["Entities", "People, households, facilities, products, stores, assets, cases, routes, or custom records."],
  ["Forms", "Mobile-ready surveys, inspections, audits, inventory checks, registrations, and follow-ups."],
  ["Submissions", "Field, web, uploaded, imported, returned, corrected, approved, or rejected records."],
  ["Quality", "Validation, duplicates, GPS checks, missing data, outliers, conflicts, and reconciliation."],
  ["Intelligence", "Maps, metrics, dashboards, reports, exports, donor/client views, and management actions."],
];

export const sectorCapabilities = [
  ["Agriculture", "Farmers, farms, crops, inputs, training, yields, farm GPS, extension visits."],
  ["Health", "Facilities, outreach, referrals, visits, patient follow-up, stock, supervision."],
  ["Education", "Schools, students, teachers, attendance, inspections, infrastructure, training."],
  ["Retail", "Stores, products, prices, brands, shelves, suppliers, stock, sales visits."],
  ["Inventory", "Items, warehouses, receipts, issues, transfers, counts, variances, barcodes."],
  ["Logistics", "Routes, vehicles, shipments, proof of delivery, incidents, warehouses."],
  ["Manufacturing", "Batches, production checks, downtime, quality control, waste, corrective action."],
  ["Audits", "Checklists, findings, evidence, risk scoring, corrective actions, approval trails."],
  ["HR", "Employees, attendance, training, equipment assignment, supervisor review."],
  ["Custom", "Any record, workflow, form, approval process, dashboard, and report structure."],
];

export const industries = [
  {
    title: "NGO and humanitarian operations",
    text: "Manage programs, entities, field officers, mobile surveys, approvals, maps, KPIs, reports, and audit requirements.",
    image: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Agriculture and farmer programs",
    text: "Register farmers, map farms, track inputs, monitor yields, verify training, and report agriculture results with offline mobile data.",
    image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
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
  {
    title: "Retail and inventory field checks",
    text: "Track products, stock levels, stores, suppliers, price checks, receipts, issues, barcode scans, and variance review.",
    image: "https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Logistics and delivery operations",
    text: "Manage shipments, routes, vehicles, proof of delivery, incidents, warehouse checks, and GPS-based delivery evidence.",
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Audits, inspections, and assets",
    text: "Run compliance checklists, site inspections, asset condition checks, corrective actions, evidence capture, and review workflows.",
    image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80",
  },
];

export const solutionPages = [
  {
    slug: "agriculture",
    title: "Agriculture data collection software for farmer programs",
    audience: "Agriculture programs",
    icon: Globe2,
    description: "Register farmers, map farms, verify input distribution, monitor yields, track training, and report agriculture KPIs with offline mobile collection.",
    challenges: ["Farmer lists become outdated quickly", "Input distribution evidence is hard to verify", "Yield and training data arrive late", "GPS and farm coverage are difficult to prove"],
    modules: ["Projects", "Forms", "Field Operations", "Mapping", "Metrics & Results", "Reports"],
    outcomes: ["Cleaner farmer registries", "Verified input delivery", "Faster extension monitoring", "Traceable agriculture results"],
  },
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
  {
    slug: "retail",
    title: "Retail field operations and inventory data collection software",
    audience: "Retail, FMCG, and store operations",
    icon: Building2,
    description: "Collect store audits, product availability, stock counts, price checks, supplier deliveries, shelf evidence, and sales visit data from mobile teams.",
    challenges: ["Stock and price data is delayed", "Store visits are hard to verify", "Supplier delivery issues are missed", "Field reports stay in spreadsheets"],
    modules: ["Projects", "Forms", "Field Operations", "Submissions", "Data Quality", "Reports"],
    outcomes: ["Faster stock visibility", "Verified store coverage", "Cleaner price and supplier data", "Actionable retail dashboards"],
  },
  {
    slug: "inventory",
    title: "Inventory and stock count software for field teams",
    audience: "Inventory and warehouse teams",
    icon: Database,
    description: "Run stock counts, receipts, issues, transfers, variance reviews, barcode capture, and warehouse checks with mobile-ready forms and approval workflows.",
    challenges: ["Stock counts are inconsistent", "Variance reasons are not captured", "Warehouse teams work offline", "Receipts and issues are hard to reconcile"],
    modules: ["Forms", "Mobile Collector App", "Submissions", "Data Quality", "Reports"],
    outcomes: ["More accurate counts", "Clear variance queues", "Mobile warehouse records", "Governed stock reports"],
  },
  {
    slug: "logistics",
    title: "Logistics and delivery operations software",
    audience: "Logistics, delivery, and route teams",
    icon: RadioTower,
    description: "Manage shipments, routes, vehicles, delivery confirmation, GPS evidence, proof of delivery, incidents, and exception review in one field operations platform.",
    challenges: ["Delivery proof is scattered", "Route exceptions arrive late", "Vehicle inspections are disconnected", "Supervisors lack real-time delivery status"],
    modules: ["Projects", "Field Operations", "Forms", "Mapping", "Submissions", "Reports"],
    outcomes: ["Verified delivery evidence", "Clear route exceptions", "Better fleet visibility", "Faster supervisor review"],
  },
  {
    slug: "manufacturing",
    title: "Manufacturing data collection and quality inspection software",
    audience: "Manufacturing and production teams",
    icon: Workflow,
    description: "Collect production batch records, quality checks, downtime reports, waste records, machine inspections, and corrective actions from the floor.",
    challenges: ["Production records are fragmented", "Quality issues lack evidence", "Downtime is not captured consistently", "Corrective actions are hard to follow"],
    modules: ["Forms", "Data Quality", "Field Operations", "Reports", "Governance"],
    outcomes: ["Cleaner batch records", "Faster quality review", "Traceable downtime", "Operational performance dashboards"],
  },
  {
    slug: "audits-inspections",
    title: "Audit and inspection management software",
    audience: "Audit, compliance, safety, and inspection teams",
    icon: ShieldCheck,
    description: "Build checklists, capture findings, collect photo/file evidence, assign corrective actions, review risks, and export audit-ready reports.",
    challenges: ["Findings lack evidence", "Corrective actions are missed", "Inspection data is hard to compare", "Audit trails are incomplete"],
    modules: ["Forms", "Submissions", "Data Quality", "Governance", "Reports"],
    outcomes: ["Evidence-backed findings", "Closed corrective actions", "Consistent inspection data", "Audit-ready exports"],
  },
  {
    slug: "hr-workforce",
    title: "HR and workforce field data collection software",
    audience: "HR, workforce, and training teams",
    icon: UsersRound,
    description: "Track employee records, attendance checks, training completion, field staff activity, asset assignment, and supervisor review workflows.",
    challenges: ["Attendance and training records are scattered", "Field staff activity is hard to verify", "HR data needs permissions", "Managers need cleaner workforce reporting"],
    modules: ["Users & Teams", "Forms", "Field Operations", "Governance", "Reports"],
    outcomes: ["Cleaner workforce records", "Verified attendance", "Training compliance visibility", "Permissioned HR reporting"],
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
  { title: "Retail field audit checklist", type: "Checklist", text: "Standardize store visits, shelf checks, price monitoring, stock evidence, and supervisor review.", category: "Sector Packs" },
  { title: "GIS coverage planning guide", type: "Guide", text: "Use boundaries, assigned locations, GPS accuracy, and coverage layers to monitor field reach.", category: "Mapping" },
  { title: "Submission approval playbook", type: "Guide", text: "Set practical approval chains, return reasons, correction steps, and audit-ready review policies.", category: "Governance" },
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
  {
    title: "How to design forms that field officers can complete correctly",
    category: "Form Design",
    tags: ["mobile forms", "data quality"],
    excerpt: "A practical approach to question wording, validation, choice lists, GPS, media evidence, and supervisor review.",
  },
  {
    title: "Why entity-linked data collection is stronger than standalone surveys",
    category: "Entity Management",
    tags: ["entity registry", "beneficiary tracking"],
    excerpt: "How registration, follow-up, profile history, and linked submissions create a clearer operational record.",
  },
  {
    title: "Preparing mobile teams for offline sync before field deployment",
    category: "Mobile Operations",
    tags: ["offline sync", "field officer app"],
    excerpt: "The readiness checks every manager should complete before sending teams to low-connectivity areas.",
  },
  {
    title: "Using data quality queues to protect operational decisions",
    category: "Data Quality",
    tags: ["duplicate detection", "approval workflow"],
    excerpt: "How missing data, duplicates, GPS issues, and returned submissions should move through a controlled review process.",
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
  {
    title: "Retail operations team improves store audit visibility",
    sector: "Retail",
    country: "National",
    organizationType: "Private sector",
    result: "87% same-day review",
    text: "Store visits, product checks, supplier evidence, and stock issues were moved from spreadsheets into governed mobile workflows.",
  },
  {
    title: "Education program standardizes school monitoring",
    sector: "Education",
    country: "Regional",
    organizationType: "Foundation",
    result: "120 schools profiled",
    text: "School profiles, attendance checks, infrastructure findings, and training follow-ups were connected to district dashboards.",
  },
  {
    title: "Inspection team creates audit-ready evidence trail",
    sector: "Audits",
    country: "Multi-site",
    organizationType: "Enterprise",
    result: "64% faster closure",
    text: "Inspection forms, photos, GPS evidence, corrective actions, approvals, and exports were kept in one traceable workflow.",
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
