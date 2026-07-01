export interface Activity {
  id: string;
  title: string;
  description: string;
  timestamp: string;
}

export interface Project {
  id: string;
  name: string;
  category: 'Agriculture' | 'Health' | 'Retail';
  formsCount: number;
  leadsCount: string;
  metricLabel: string;
  metricValue: string;
  metricType: 'trend' | 'deployment' | 'speed';
  trendData: number[]; // relative heights from 1 to 10
  locationLabel: string;
  image: string;
  leadName: string;
  region: string;
  startDate: string;
  activities: Activity[];
}

export interface KpiItem {
  title: string;
  value: string;
  subValue?: string;
  type: 'text' | 'percentage' | 'progress';
  progressVal?: number; // 0 to 100
  iconName: string;
  trendUp?: boolean;
}
