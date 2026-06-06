export type ISODateTime = string;
export type UUID = string;

export type MobileSyncStatus =
  | "Pending"
  | "NotSynced"
  | "Queued"
  | "Syncing"
  | "Synced"
  | "Failed"
  | "Conflict"
  | "ReturnedForCorrection"
  | "Returned";

export type MobileConflictStatus = "None" | "PendingReview" | "ServerWins" | "DeviceWins" | "Merged";

export type MobileConflictType = "FormVersionChanged" | "EntityUpdated" | "AssignmentCancelled" | "SubmissionRejected";

export type MobileConflictRecord = LocalRecord & {
  id: string;
  conflictType: MobileConflictType;
  localEntityType: string;
  localEntityId: string;
  serverEntityId: string | null;
  summary: string;
  localValue: Record<string, unknown>;
  serverValue: Record<string, unknown>;
  resolution: "UseServerVersion" | "UseLocalVersion" | "ReviewLater" | null;
  resolvedAt: ISODateTime | null;
};

export type LocalRecord = {
  localId: string;
  serverId: string | null;
  syncStatus: MobileSyncStatus;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  lastSyncedAt: ISODateTime | null;
  deviceId: string | null;
  conflictStatus: MobileConflictStatus | null;
  deletedAt: ISODateTime | null;
};

export type MobileUser = {
  id: UUID;
  email: string | null;
  fullName: string | null;
  roles: string[];
  permissions: string[];
};

export type MobileOrganization = {
  id: UUID;
  name: string | null;
  slug: string | null;
  defaultLanguage: string;
  timezone: string;
  branding: {
    logoUrl: string | null;
    brandColor: string | null;
  };
};

export type MobileProject = LocalRecord & {
  id: UUID;
  organizationId: UUID;
  name: string;
  code: string;
  status: "Active" | "Draft" | "Closed" | "Archived";
  region: string | null;
  country: string | null;
};

export type MobileAssignmentStatus =
  | "Assigned"
  | "InProgress"
  | "Completed"
  | "Overdue"
  | "Paused"
  | "Cancelled";

export type MobileAssignment = LocalRecord & {
  id: UUID;
  projectId: UUID;
  formId: UUID | null;
  formVersionId: UUID | null;
  entityIds: UUID[];
  locationIds: string[];
  startDate: ISODateTime | null;
  endDate: ISODateTime | null;
  targetCount: number;
  completedCount: number;
  status: MobileAssignmentStatus;
  priority: "Low" | "Normal" | "High" | "Urgent";
};

export type MobileEntity = LocalRecord & {
  id: UUID;
  entityUid: string;
  entityType: string;
  name: string;
  phone: string | null;
  nationalId: string | null;
  householdId: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  location: {
    country: string | null;
    region: string | null;
    district: string | null;
    community: string | null;
    village: string | null;
  };
  gps: {
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
  };
  status: "Active" | "Inactive" | "Deceased" | "Moved" | "Duplicate" | "Archived";
  projectIds: UUID[];
  assignedFormIds: UUID[];
  profile: Record<string, unknown>;
};

export type MobileLocation = LocalRecord & {
  id: string;
  organizationId: UUID;
  parentId: string | null;
  name: string;
  code: string | null;
  level: "Country" | "Region" | "District" | "Community" | "Village" | "Facility" | "Custom";
  latitude: number | null;
  longitude: number | null;
  boundaryVersionId: string | null;
  active: boolean;
};

export type MobileQuestionType =
  | "Text"
  | "LongText"
  | "Number"
  | "Decimal"
  | "Currency"
  | "Date"
  | "Time"
  | "DateTime"
  | "SingleSelect"
  | "MultiSelect"
  | "Dropdown"
  | "GPS"
  | "Photo"
  | "Audio"
  | "Video"
  | "FileUpload"
  | "Signature"
  | "Barcode"
  | "QRCode"
  | "Consent"
  | "CalculatedField"
  | "RepeatGroup"
  | "Matrix"
  | "Ranking";

export type MobileQuestionOption = {
  id: string;
  label: string;
  value: string;
  order: number;
};

export type MobileValidationRule = {
  ruleType: "Required" | "Min" | "Max" | "MinLength" | "MaxLength" | "Regex" | "Custom";
  value: string | number | boolean | null;
  message: string;
  severity: "Warning" | "Block";
};

export type MobileLogicRule = {
  id: string;
  action: "ShowIf" | "HideIf" | "SkipTo" | "RequiredIf" | "Calculate";
  sourceQuestionId: string;
  operator: "Equals" | "NotEquals" | "GreaterThan" | "LessThan" | "Contains" | "IsEmpty" | "IsNotEmpty";
  value: string | number | boolean | null;
  targetQuestionId: string | null;
};

export type MobileQuestion = {
  id: string;
  sectionId: string;
  variableName: string;
  label: string;
  helpText: string | null;
  type: MobileQuestionType;
  required: boolean;
  readOnly: boolean;
  defaultValue: unknown;
  options: MobileQuestionOption[];
  validationRules: MobileValidationRule[];
  logicRules: MobileLogicRule[];
  referenceListId: string | null;
  cascadingParentQuestionId: string | null;
  sensitive: boolean;
  repeatSettings: {
    minRepeats: number | null;
    maxRepeats: number | null;
    addButtonLabel: string | null;
  } | null;
  order: number;
};

export type MobileFormSection = {
  id: string;
  title: string;
  description: string | null;
  order: number;
  questions: MobileQuestion[];
};

export type FrequencyRule =
  | "OnceEverPerEntity"
  | "OncePerProjectPerEntity"
  | "OncePerYearPerEntity"
  | "OncePerSeasonPerEntity"
  | "OncePerQuarterPerEntity"
  | "OncePerMonthPerEntity"
  | "OncePerEventPerEntity"
  | "Unlimited";

export type PrefillLockBehavior = "ReadOnly" | "Editable" | "EditableWithReason";

export type PrefillMapping = {
  sourceEntityField: string;
  targetQuestionId: string;
  lockBehavior: PrefillLockBehavior;
};

export type MobileFormEntitySettings = {
  linkedToEntity: boolean;
  entityType: string | null;
  createsNewEntity: boolean;
  updatesExistingEntity: boolean;
  requiresExistingEntity: boolean;
  allowsAnonymousSubmission: boolean;
  frequencyRule: FrequencyRule;
  prefillMappings: PrefillMapping[];
};

export type MobileForm = LocalRecord & {
  id: UUID;
  projectId: UUID | null;
  name: string;
  description: string | null;
  status: "Draft" | "Testing" | "Published" | "Suspended" | "Archived";
  currentVersionId: UUID | null;
};

export type MobileFormVersion = LocalRecord & {
  id: UUID;
  formId: UUID;
  version: number;
  publishedAt: ISODateTime | null;
  offlineCompatible: boolean;
  sections: MobileFormSection[];
  entitySettings: MobileFormEntitySettings;
};

export type MobileReferenceValue = LocalRecord & {
  id: string;
  listId: string;
  code: string;
  label: string;
  parentCode: string | null;
  active: boolean;
  order: number;
};

export type MobileReferenceList = LocalRecord & {
  id: string;
  name: string;
  slug: string;
  version: number;
  values: MobileReferenceValue[];
};

export type DraftSubmissionStatus =
  | "Draft"
  | "ReadyToSubmit"
  | "Queued"
  | "Synced"
  | "Failed"
  | "ReturnedForCorrection";

export type MobileSubmissionResponse = {
  questionId: string;
  variableName: string;
  value: unknown;
  updatedAt: ISODateTime;
};

export type MobileSubmission = LocalRecord & {
  id: string;
  projectId: UUID;
  assignmentId: UUID | null;
  formId: UUID;
  formVersionId: UUID;
  entityId: UUID | null;
  entityType: string | null;
  status: DraftSubmissionStatus;
  frequencyPeriod: string | null;
  eventId: string | null;
  responses: MobileSubmissionResponse[];
  attachments: MobileAttachment[];
  location: {
    latitude: number | null;
    longitude: number | null;
    altitude: number | null;
    accuracy: number | null;
    timestamp: ISODateTime | null;
  } | null;
  submittedAt: ISODateTime | null;
  appVersion: string | null;
};

export type MobileAttachment = LocalRecord & {
  id: string;
  submissionLocalId: string;
  type: "Photo" | "Audio" | "Video" | "Signature" | "FileUpload";
  localUri: string;
  remoteUrl: string | null;
  mimeType: string;
  size: number;
  encrypted: boolean;
  uploadProgress: number;
  errorMessage: string | null;
};

export type MobileNotification = LocalRecord & {
  id: string;
  title: string;
  body: string;
  readAt: ISODateTime | null;
  createdByServerAt: ISODateTime;
};

export type MobileSyncOperation =
  | "CREATE_SUBMISSION"
  | "UPDATE_DRAFT"
  | "UPLOAD_ATTACHMENT"
  | "SUBMIT_CORRECTION"
  | "UPLOAD_AUDIT_EVENT"
  | "MARK_NOTIFICATION_READ"
  | "RESOLVE_CONFLICT";

export type MobileSyncQueueItem = LocalRecord & {
  id: string;
  operation: MobileSyncOperation;
  payload: Record<string, unknown>;
  status: MobileSyncStatus;
  retryCount: number;
  lastAttemptAt: ISODateTime | null;
  errorMessage: string | null;
};

export type MobileAuditEvent = LocalRecord & {
  id: string;
  eventType: string;
  module: "Auth" | "Forms" | "Assignments" | "Submissions" | "Sync" | "Entities" | "Attachments";
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown>;
  occurredAt: ISODateTime;
};

export type MobileSyncLog = LocalRecord & {
  id: string;
  startedAt: ISODateTime;
  completedAt: ISODateTime | null;
  mode: "Manual" | "Automatic" | "Background" | "RetryFailed";
  status: "Running" | "Completed" | "CompletedWithErrors" | "Failed";
  processed: number;
  synced: number;
  failed: number;
  message: string;
};

export type MobileActionAccepted = {
  status: "accepted";
  message: string;
};

export type MobileSupervisorSummary = {
  teamAssignments: number;
  fieldOfficerProgress: Array<{ userId: string; name: string; completed: number; target: number }>;
  returnedSubmissions: number;
  coverageProgress: number;
  qualityAlerts: number;
};

export type MobileDiagnosticsReport = {
  generatedAt: ISODateTime;
  fakeOfflineMode: boolean;
  storage: { drafts: number; queueItems: number; entities: number; forms: number };
  sync: { pending: number; failed: number; conflicts: number };
  warnings: string[];
};

export type MobileVersionState = {
  currentVersion: string;
  minimumSupportedVersion: string;
  updateRequired: boolean;
  updateAvailable: boolean;
  message: string | null;
};

export type MobileDeviceStatus = "Active" | "Inactive" | "Blocked" | "Lost" | "Retired";

export type MobileDeviceRegistration = {
  deviceId: string;
  deviceName: string | null;
  platform: "Android" | "iOS" | "Unknown";
  appVersion: string;
  osVersion: string | null;
  lastSeenAt: ISODateTime;
};

export type MobileDeviceRecord = MobileDeviceRegistration & {
  userId: string;
  organizationId: string;
  status: MobileDeviceStatus;
  registeredAt: ISODateTime;
  lastSyncAt: ISODateTime | null;
  lastLoginAt: ISODateTime | null;
  remoteLogoutRequired: boolean;
  remoteWipeRequired: boolean;
};

export type MobileCrashReport = {
  deviceId: string;
  userId: string | null;
  appVersion: string;
  timestamp: ISODateTime;
  severity: "Low" | "Medium" | "High" | "Critical";
  message: string;
  stackTrace: string | null;
  context: Record<string, unknown>;
};

export type MobileFeedbackCategory = "Bug" | "Feature Request" | "Performance" | "Sync Problem" | "Other";

export type MobileFeedback = {
  category: MobileFeedbackCategory;
  description: string;
  screenshotLocalUri: string | null;
  includeDiagnostics: boolean;
  diagnostics: MobileDiagnosticsReport | null;
  createdAt: ISODateTime;
};

export type MobilePilotStatus = "Planned" | "Active" | "Completed" | "Archived";

export type MobilePilotRecord = {
  id: string;
  pilotName: string;
  projectId: string;
  startDate: string;
  endDate: string;
  deviceIds: string[];
  fieldOfficerIds: string[];
  supervisorIds: string[];
  status: MobilePilotStatus;
  submissions: number;
  syncFailures: number;
  crashes: number;
  issues: number;
  feedback: number;
};

export type MobileMonitoringSummary = {
  activeDevices: number;
  syncSuccessRate: number;
  syncFailures: number;
  crashes: number;
  appVersions: Record<string, number>;
  activeUsers: number;
  offlineDevices: number;
  submissionThroughput: number;
};

export type MobileTestingRecord = {
  id: string;
  scenario: "Offline Test" | "GPS Test" | "Attachment Test" | "Sync Test" | "Large Form Test";
  result: "Pass" | "Fail";
  comments: string;
  testedAt: ISODateTime;
};

export type MobilePageRequest = {
  cursor?: string | null;
  limit?: number;
};

export type MobileApiErrorPayload = {
  code: string;
  message: string;
  retryable: boolean;
  retryAfterSeconds: number | null;
};

export type MobileSubmissionUploadResult = {
  status: "synced" | "conflict" | "failed";
  serverSubmissionId: string | null;
  localId: string;
  syncedAt: ISODateTime | null;
  message: string;
};

export type DuplicateCheckInput = {
  entityUid?: string;
  phone?: string;
  nationalId?: string;
  name?: string;
  village?: string;
  householdId?: string;
};

export type DuplicateCheckResult = {
  level: "NoMatch" | "PossibleDuplicate" | "LikelyDuplicate";
  score: number;
  matchedFields: string[];
  entity: MobileEntity | null;
};

export type MobileBootstrapPackage = {
  user: MobileUser;
  organization: MobileOrganization;
  permissions: string[];
  assignedProjects: MobileProject[];
  lastSync: {
    deviceId: string | null;
    lastSyncedAt: ISODateTime | null;
    serverTime: ISODateTime;
  };
};

export type MobileSyncPackage = {
  bootstrap: MobileBootstrapPackage;
  assignments: MobileAssignment[];
  forms: MobileForm[];
  formVersions: MobileFormVersion[];
  entities: MobileEntity[];
  locations: MobileLocation[];
  referenceLists: MobileReferenceList[];
  returnedSubmissions: MobileSubmission[];
  notifications: MobileNotification[];
};
