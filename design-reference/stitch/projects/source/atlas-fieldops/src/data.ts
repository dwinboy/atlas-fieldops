import { Project, KpiItem } from './types';

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'PRJ-9421-AG',
    name: 'Climate-Smart Agriculture',
    category: 'Agriculture',
    formsCount: 24,
    leadsCount: '1.2k Leads',
    metricLabel: 'Submissions Trend',
    metricValue: '+12%',
    metricType: 'trend',
    trendData: [4, 6, 5, 8, 7],
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBxus8vV21f3bDZXg3XizddiSWTdUW7GwMhl_XnCJIFgeSmEl1kKqb4aRqvN-p5FSsXB161vupdE1Nm5GGwZcu1xPqYANaxS29Oh8ajb2ktXpu2_FxtQmZ0kjJv2qVnYVY8Pxx6D51sdk0Gz7xZShbBZVEdPbm_uRsVowL1hHYNTAr6mMTyrDcBIc7v5ADNySN7NCg3XxsftVBUzeoQq7ZIX86PykUxbhc-PK6zS8Pbj6jvQu68Mvy2TGqiZwT9qdaOPS-TxY-6gw',
    locationLabel: 'Sub-Saharan Cluster',
    leadName: 'Sarah Mitchell',
    region: 'Sub-Saharan Africa',
    startDate: 'Jan 12, 2024',
    activities: [
      {
        id: 'act-1',
        title: 'Field Survey Complete',
        description: '342 submissions synced from Nigeria Cluster 4.',
        timestamp: '2 HOURS AGO'
      },
      {
        id: 'act-2',
        title: 'New Form Published',
        description: "'Soil Quality Assessment v2.1' is now live.",
        timestamp: 'YESTERDAY'
      },
      {
        id: 'act-3',
        title: 'Milestone Reached',
        description: 'Phase 1: Baseline Mapping reached 100%.',
        timestamp: '3 DAYS AGO'
      }
    ]
  },
  {
    id: 'PRJ-3104-HL',
    name: 'Regional Health Outreach',
    category: 'Health',
    formsCount: 18,
    leadsCount: '842 Active',
    metricLabel: 'Deployment Rate',
    metricValue: 'Stable',
    metricType: 'deployment',
    trendData: [5, 7, 6, 6, 8],
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAE3B-GWZ79fI8UhBrDFkU2ubKYLqJ3Ox8V7PA73naUsFM7Svjn2lwTXQYKIy3Z_Cmx_yXE_mM_wP1neifh8INNP4P945chmgZMPoZmGwsTm8XiU3nmrjNmIKr1Kj4OZ9vYKS4-zJSVgYFJT5gP9A6hJSuOVEBHLhaf3_PB5dDvUixhWb-GVo5SuYQ3TgwYdhUfgH9CsOa09zrM4N8KIqfHpVPuytZ3SUIevoto_48KdhSgGHW03vhKbxzlabTYV0RNUf5QiYfYSg',
    locationLabel: 'Urban Coastal Zones',
    leadName: 'Dr. Marcus Vance',
    region: 'East Asia & Pacific',
    startDate: 'Mar 05, 2024',
    activities: [
      {
        id: 'act-4',
        title: 'Vaccination Drive Logged',
        description: '650 children immunized in Sector G.',
        timestamp: '5 HOURS AGO'
      },
      {
        id: 'act-5',
        title: 'Supply Order Dispatched',
        description: 'Cold-chain equipment routed to central hub.',
        timestamp: '2 DAYS AGO'
      },
      {
        id: 'act-6',
        title: 'Operational Status Confirmed',
        description: 'Clinic infrastructure audit complete.',
        timestamp: '5 DAYS AGO'
      }
    ]
  },
  {
    id: 'PRJ-5562-RT',
    name: 'Retail Inventory Audit',
    category: 'Retail',
    formsCount: 42,
    leadsCount: '2.1k Points',
    metricLabel: 'Audit Speed',
    metricValue: 'Fast',
    metricType: 'speed',
    trendData: [8, 7, 9, 6, 7],
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDmWdWN-0-4qspSxFRymujV4nfq5KTfLLyidre0oibup5lho6jKT8ShU9wy-oVslANw_KZt9Xv8ZvL9bBnRhgyG8Vg41G5KFqk73g5Zo1v20aTvcOHSkdDrkc0a6Dgq4_4BIefZLj6g2rai5J2414Z5vN1s0ue_svGaDXUHBQ-KTYckdYFlWOBxkO1hx0j01uN8QrSkgAqeiYJw0oEUoopEFhEk_2OQjOlKo8LVIdhiHY5pw7FB8wq7nCCZug4SBKQStspLMjjEXw',
    locationLabel: 'Metropolitan Corridor',
    leadName: 'Elena Rostova',
    region: 'Eastern Europe',
    startDate: 'May 18, 2024',
    activities: [
      {
        id: 'act-7',
        title: 'Q2 Stock Reconciliation',
        description: '98.4% accuracy verified across 45 stores.',
        timestamp: '1 HOUR AGO'
      },
      {
        id: 'act-8',
        title: 'Audit Form Updated',
        description: 'Standardized inventory checklist published.',
        timestamp: '4 DAYS AGO'
      },
      {
        id: 'act-9',
        title: 'Merchant Training Complete',
        description: 'Completed onboarding for 12 retail leads.',
        timestamp: '1 WEEK AGO'
      }
    ]
  }
];

export const INITIAL_KPIS: KpiItem[] = [
  {
    title: 'Total Active Projects',
    value: '12',
    subValue: '+2 from last month',
    type: 'text',
    iconName: 'LayoutGrid',
    trendUp: true
  },
  {
    title: 'Global Coverage',
    value: '84%',
    type: 'progress',
    progressVal: 84,
    iconName: 'Globe'
  },
  {
    title: 'Total Entities',
    value: '142k',
    subValue: 'Verified field agents',
    type: 'text',
    iconName: 'Users'
  },
  {
    title: 'Sync Health',
    value: '99.8%',
    subValue: 'Optimal',
    type: 'percentage',
    iconName: 'RefreshCw'
  }
];
