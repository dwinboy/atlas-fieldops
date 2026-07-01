export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Supervisor' | 'Officer' | 'Admin';
  team: 'Agriculture Alpha' | 'Health Outreach' | 'Infrastructure Delta' | 'Logistics Echo' | 'Central Command';
  status: 'Live' | 'Offline';
  avatarUrl?: string;
  initials?: string;
}

export interface TeamHierarchyItem {
  id: string;
  name: string;
  count: number;
  description: string;
  borderClass: string;
}

export interface StatItem {
  id: string;
  label: string;
  value: string;
  iconName: string;
}
