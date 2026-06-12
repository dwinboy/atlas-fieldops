export type NavLinkItem = {
  title: string;
  description: string;
  href: string;
};

export type NavSection = {
  heading: string;
  links: NavLinkItem[];
};

export type NavCta = {
  heading: string;
  text: string;
  cta: { label: string; href: string };
};

export type NavMenu = {
  id: string;
  label: string;
  href?: string;
  sections?: NavSection[];
  ctaCard?: NavCta;
};

export const NAV_CONFIG: NavMenu[] = [
  {
    id: "product",
    label: "Product",
    sections: [
      {
        heading: "Platform",
        links: [
          {
            title: "Product Overview",
            description: "One platform for the full M&E data lifecycle",
            href: "/features",
          },
          {
            title: "How It Works",
            description: "From form design to indicator reporting",
            href: "/how-it-works",
          },
          {
            title: "Integrations",
            description: "Connect your data to the tools you already use",
            href: "/integrations",
          },
        ],
      },
      {
        heading: "Features",
        links: [
          {
            title: "Form Builder",
            description: "Design forms backwards from your indicators",
            href: "/features/form-builder",
          },
          {
            title: "Offline Data Collection",
            description: "Collect anywhere, sync when connected",
            href: "/features/offline-data-collection",
          },
          {
            title: "Indicator Frameworks",
            description: "Link every submission to your results framework",
            href: "/features/indicator-frameworks",
          },
          {
            title: "Data Quality Tools",
            description: "Validation, versioning, and audit trails",
            href: "/features/data-quality",
          },
        ],
      },
      {
        heading: "More Features",
        links: [
          {
            title: "Dashboards & Reporting",
            description: "Real-time visibility into program performance",
            href: "/features/dashboards-reporting",
          },
          {
            title: "Mobile Collector App",
            description: "Built for fieldwork on any device",
            href: "/features/mobile-app",
          },
          {
            title: "Data Security",
            description: "Role-based access and encrypted data",
            href: "/security",
          },
        ],
      },
    ],
    ctaCard: {
      heading: "Better M&E starts with better data",
      text: "See how Atlas FieldOps connects collection, quality, and reporting in one workspace.",
      cta: { label: "Request a Demo", href: "/demo" },
    },
  },
  {
    id: "solutions",
    label: "Solutions",
    sections: [
      {
        heading: "Use Cases",
        links: [
          {
            title: "Monitoring & Evaluation",
            description: "Track activities, outputs, and outcomes against your results framework",
            href: "/use-cases/monitoring-evaluation",
          },
          {
            title: "Baseline & Endline Surveys",
            description: "Measure change with comparable data collected before and after implementation",
            href: "/use-cases/baseline-endline-surveys",
          },
          {
            title: "Impact Evaluations",
            description: "Attribute results to your program with rigorous, structured evidence",
            href: "/use-cases/impact-evaluations",
          },
          {
            title: "Longitudinal Studies",
            description: "Follow the same respondents and indicators across multiple data rounds",
            href: "/use-cases/longitudinal-studies",
          },
        ],
      },
      {
        heading: "Sectors",
        links: [
          {
            title: "Agriculture",
            description: "Track farmer registration, yields, and input distribution in the field",
            href: "/solutions/agriculture",
          },
          {
            title: "Health Programs",
            description: "Coordinate outreach, facility assessments, and patient follow-up",
            href: "/solutions/health",
          },
          {
            title: "Education",
            description: "Monitor school inspections, attendance, and learning outcomes",
            href: "/solutions/education",
          },
          {
            title: "Humanitarian & NGOs",
            description: "Manage entity registries, distributions, and donor reporting",
            href: "/solutions/ngos",
          },
        ],
      },
    ],
    ctaCard: {
      heading: "See how teams use Atlas FieldOps",
      text: "Browse solutions by use case and sector to find the right fit for your program.",
      cta: { label: "Explore Solutions", href: "/solutions" },
    },
  },
  {
    id: "pricing",
    label: "Pricing",
    href: "/pricing",
  },
  {
    id: "resources",
    label: "Resources",
    sections: [
      {
        heading: "Learn",
        links: [
          {
            title: "Blog",
            description: "Insights on M&E practice, data quality, and field operations",
            href: "/blog",
          },
          {
            title: "Guides",
            description: "Step-by-step guides to indicator design, data quality, and more",
            href: "/resources",
          },
          {
            title: "Documentation",
            description: "Technical reference for setup, forms, and the API",
            href: "/documentation",
          },
        ],
      },
      {
        heading: "Company",
        links: [
          {
            title: "About Us",
            description: "Our mission, team, and approach to field data",
            href: "/about",
          },
          {
            title: "Contact",
            description: "Get in touch with our team",
            href: "/contact",
          },
          {
            title: "FAQs",
            description: "Answers to common questions about the platform",
            href: "/help",
          },
        ],
      },
    ],
    ctaCard: {
      heading: "Talk to our team",
      text: "Have a question about implementation, pricing, or data migration? We're here to help.",
      cta: { label: "Contact Us", href: "/contact" },
    },
  },
];
