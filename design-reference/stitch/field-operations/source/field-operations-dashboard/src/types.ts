export interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  active?: boolean;
}

export interface KpiCardData {
  id: string;
  title: string;
  value: string | number;
  total?: string | number;
  unit?: string;
  icon: string;
  variant: 'primary' | 'secondary' | 'cyan' | 'error';
}

export type TeamStatus = 'On Track' | 'Delayed' | 'Completed';

export interface FieldTeam {
  id: string;
  letter: string;
  name: string;
  officersCount: number;
  currentFocus: string;
  coords: string;
  progress: number;
  status: TeamStatus;
}

export interface FeedItem {
  id: string;
  type: 'submission' | 'route' | 'error' | 'assets' | 'completion';
  author: string;
  time: string;
  title: string;
  subtitle: string;
  extra?: string;
  images?: string[];
  requiresReview?: boolean;
}
