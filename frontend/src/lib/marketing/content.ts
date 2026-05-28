import {
  BadgeCheck,
  BarChart3,
  Brain,
  ClipboardList,
  FileText,
  Globe2,
  Map,
  RadioTower,
  ShieldCheck,
  Smartphone,
  UsersRound,
  Workflow
} from "lucide-react";

export const site = {
  name: "Atlas FieldOps",
  url: "https://atlasfieldops.com",
  description:
    "Offline-ready monitoring, evaluation, data collection, beneficiary management, and operational intelligence for NGOs, governments, and field teams."
};

export const navItems = [
  { label: "Features", href: "/features" },
  { label: "Solutions", href: "/solutions" },
  { label: "Services", href: "/services" },
  { label: "Pricing", href: "/pricing" },
  { label: "Resources", href: "/resources" }
];

export const platformFeatures = [
  {
    title: "Field data collection",
    text: "Build mobile-ready forms, collect GPS and media evidence, and keep teams productive offline.",
    icon: ClipboardList
  },
  {
    title: "Beneficiary management",
    text: "Unify households, farmers, students, patients, cases, visits, documents, and interventions.",
    icon: UsersRound
  },
  {
    title: "Operational intelligence",
    text: "Connect submissions, approvals, quality checks, maps, indicators, tasks, and reports in one workflow.",
    icon: Workflow
  },
  {
    title: "Geospatial coverage",
    text: "See villages, farm boundaries, facility catchments, officer movement, and intervention gaps.",
    icon: Map
  },
  {
    title: "AI validation",
    text: "Detect duplicate records, suspicious timing, GPS anomalies, outliers, and fraud signals.",
    icon: Brain
  },
  {
    title: "Donor reporting",
    text: "Generate executive reports, logframes, indicator exports, and GIS-ready operational datasets.",
    icon: FileText
  }
];

export const workflowSteps = [
  "Programs",
  "Indicators",
  "Regions",
  "Field teams",
  "Beneficiaries",
  "Forms",
  "Submissions",
  "Approvals",
  "Reports",
  "Interventions"
];

export const industries = [
  {
    title: "Agriculture",
    text: "Register farmers, map farms, monitor crop performance, track inputs, and verify yields.",
    image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80"
  },
  {
    title: "Health",
    text: "Coordinate outreach, vaccination follow-up, facility inspections, referrals, and disease surveillance.",
    image: "https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=1200&q=80"
  },
  {
    title: "Humanitarian",
    text: "Manage vulnerability assessments, food distribution, cash transfers, protection cases, and feedback.",
    image: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1200&q=80"
  },
  {
    title: "Government",
    text: "Monitor public services, infrastructure, regional teams, citizen feedback, and program delivery.",
    image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80"
  }
];

export const trustLogos = ["UN Agency", "Health Mission", "AgriFund", "ReliefWorks", "Gov Delivery", "Impact Lab"];

export const metrics = [
  { label: "Records processed daily", value: "10M+" },
  { label: "Offline sync reliability", value: "99.9%" },
  { label: "Approval workflow coverage", value: "100%" },
  { label: "Deployment regions", value: "40+" }
];

export const pricingTiers = [
  {
    name: "Program",
    price: "Custom",
    description: "For NGOs and programs launching structured field operations.",
    features: ["Forms and mobile sync", "Beneficiary registry", "Dashboards", "Email support"]
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For large organizations managing multi-region operations.",
    features: ["Advanced RBAC", "Approval workflows", "GIS exports", "Implementation support"],
    featured: true
  },
  {
    name: "Government",
    price: "Custom",
    description: "For public sector teams requiring governance, scale, and reporting.",
    features: ["Tenant isolation", "Regional structures", "Custom reports", "Security review"]
  }
];

export const resourceCards = [
  { title: "M&E implementation guide", type: "Guide", text: "Design indicators, workflows, field roles, and reporting cycles." },
  { title: "Offline field operations checklist", type: "Checklist", text: "Prepare forms, maps, media queues, sync retries, and training." },
  { title: "Beneficiary registry blueprint", type: "Template", text: "Structure households, interventions, consent, and longitudinal tracking." }
];

export const blogPosts = [
  {
    title: "How offline-first data collection changes field program reliability",
    category: "Field operations",
    excerpt: "A practical guide to building confidence when teams work across unstable connectivity."
  },
  {
    title: "What modern M&E platforms need beyond surveys",
    category: "Monitoring & Evaluation",
    excerpt: "Why connected workflows, beneficiary context, and operational events matter."
  },
  {
    title: "Using geospatial intelligence to close service coverage gaps",
    category: "Geospatial",
    excerpt: "How maps, GPS, and supervisor workflows turn data into field action."
  }
];

export const caseStudies = [
  {
    title: "Agriculture program improves input verification",
    result: "32% faster field review",
    text: "A regional agriculture team connected farmer registration, input distribution, farm visits, and donor reports."
  },
  {
    title: "Health outreach team reduces missed follow-ups",
    result: "41% fewer overdue cases",
    text: "Supervisors used live queues, offline mobile forms, and referral tracking to keep community visits on schedule."
  },
  {
    title: "Humanitarian team unifies beneficiary feedback",
    result: "5 regions connected",
    text: "A response program linked vulnerability scoring, distribution evidence, feedback, and protection cases."
  }
];

export const seoKeywords = [
  "monitoring and evaluation software",
  "data collection platform",
  "field data collection system",
  "NGO data platform",
  "agriculture monitoring platform",
  "beneficiary management software",
  "M&E platform",
  "offline data collection app",
  "operational intelligence system"
];

export const pageFeatureIcons = [ShieldCheck, RadioTower, BarChart3, Smartphone, Globe2, BadgeCheck];
