import { SidebarItem, KpiCardData, FieldTeam, FeedItem } from './types';

export const sidebarItems: SidebarItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { id: 'projects', label: 'Projects', icon: 'FolderHeart' },
  { id: 'forms', label: 'Forms', icon: 'ClipboardList' },
  { id: 'field_ops', label: 'Field Operations', icon: 'Construction', active: true },
  { id: 'mapping', label: 'Mapping', icon: 'Map' },
  { id: 'analytics', label: 'Analytics', icon: 'BarChart3' },
];

export const kpiCards: KpiCardData[] = [
  {
    id: 'active_officers',
    title: 'Active Officers',
    value: '942',
    total: '1,248',
    icon: 'Users',
    variant: 'primary',
  },
  {
    id: 'assignments',
    title: 'Assignments',
    value: '85%',
    total: '3,412',
    unit: 'of',
    icon: 'CheckSquare',
    variant: 'secondary',
  },
  {
    id: 'sync_health',
    title: 'Sync Health',
    value: '99.9%',
    total: 'Real-time',
    icon: 'RefreshCw',
    variant: 'cyan',
  },
  {
    id: 'critical_flags',
    title: 'Critical Flags',
    value: '12',
    total: 'Pending',
    icon: 'AlertTriangle',
    variant: 'error',
  },
];

export const initialFieldTeams: FieldTeam[] = [
  {
    id: 'team-alpha',
    letter: 'A',
    name: 'Agriculture Team Alpha',
    officersCount: 8,
    currentFocus: 'Village A - Sector 4',
    coords: '42.348, -71.048',
    progress: 78,
    status: 'On Track',
  },
  {
    id: 'team-beta',
    letter: 'B',
    name: 'Health Outreach Beta',
    officersCount: 12,
    currentFocus: 'North Ridge Settlements',
    coords: '42.352, -71.052',
    progress: 45,
    status: 'Delayed',
  },
  {
    id: 'team-gamma',
    letter: 'G',
    name: 'GIS Survey Gamma',
    officersCount: 4,
    currentFocus: 'Southern Basin',
    coords: '42.339, -71.042',
    progress: 100,
    status: 'Completed',
  },
];

export const initialFeedItems: FeedItem[] = [
  {
    id: 'feed-1',
    type: 'submission',
    author: 'Officer Smith',
    time: '2m ago',
    title: 'Submitted ',
    subtitle: '#Record-821',
    extra: 'Focus: Agriculture Census',
  },
  {
    id: 'feed-2',
    type: 'route',
    author: 'Team Alpha',
    time: '5m ago',
    title: 'Started ',
    subtitle: 'Route #4',
    extra: 'Location: Sector 4 Edge',
  },
  {
    id: 'feed-3',
    type: 'error',
    author: 'Officer Chen',
    time: '12m ago',
    title: 'Flagged ',
    subtitle: 'Sync Error',
    extra: 'in Zone B',
    requiresReview: true,
  },
  {
    id: 'feed-4',
    type: 'assets',
    author: 'Officer Marcus',
    time: '18m ago',
    title: 'Uploaded ',
    subtitle: 'Site Assets',
    extra: '(4 images)',
    images: [
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=150&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=150&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1472214222541-d510753a8707?w=150&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=150&auto=format&fit=crop&q=60'
    ]
  },
  {
    id: 'feed-5',
    type: 'completion',
    author: 'Team Gamma',
    time: '45m ago',
    title: 'Completed ',
    subtitle: 'Daily Target',
    extra: 'Final Syncing...',
  },
];
