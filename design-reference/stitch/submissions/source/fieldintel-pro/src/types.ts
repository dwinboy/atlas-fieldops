export type SectorType = 'HEALTH' | 'AGRI' | 'INFRA';
export type StatusType = 'In Review' | 'Pending' | 'Approved' | 'Returned';
export type UrgencyType = 'URGENT' | 'NORMAL';

export interface FieldOfficer {
  name: string;
  avatarUrl?: string;
}

export interface GPSLocation {
  latitude: number;
  longitude: number;
  displayString: string;
}

export interface FormIntelligence {
  supplyLevel?: string;
  lastAudit?: string;
  additionalMetrics?: { label: string; value: string }[];
}

export interface SubmissionRecord {
  id: string;
  entityName: string;
  subTitle: string;
  sector: SectorType;
  fieldOfficer: FieldOfficer;
  dateSubmitted: string; // "Oct 24, 09:12 AM"
  timestamp: number; // for sorting
  status: StatusType;
  urgency: UrgencyType;
  gps: GPSLocation;
  mapImage: string;
  entityImage: string;
  formIntelligence: FormIntelligence;
  officerNotes: string;
  fieldEvidence: string[];
}

export interface OperationsStats {
  pendingReviewCount: number;
  awaitingCorrectionCount: number;
  avgReviewTimeHours: number;
  qualityScorePercent: number;
  totalCount: number;
}
