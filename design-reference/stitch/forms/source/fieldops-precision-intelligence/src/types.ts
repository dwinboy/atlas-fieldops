export type SectorType = 'AGRI' | 'HEALTH' | 'RETAIL' | 'LOGISTICS';

export interface FormField {
  id: string;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'textarea';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[]; // For dropdown options
}

export interface Form {
  id: string;
  name: string;
  sector: SectorType;
  version: string;
  createdDate: string;
  submissionsCount: number;
  trend: number[]; // Sparkline data (0-100 values)
  status: 'Published' | 'Draft';
  verified: boolean;
  image: string;
  fields: FormField[];
}

export interface Submission {
  id: string;
  formId: string;
  formName: string;
  submittedAt: string;
  submittedBy: string;
  data: Record<string, any>;
  gps: { lat: number; lng: number; locationName: string };
  biometricHash: string;
  deviceFingerprint: string;
}

export interface AuditLog {
  id: string;
  type: 'publish' | 'review' | 'sync_fail' | 'submission';
  title: string;
  description: string;
  timestamp: string; // human readable (e.g. '2 mins ago' or datetime)
  status: 'success' | 'warning' | 'error' | 'info';
}
