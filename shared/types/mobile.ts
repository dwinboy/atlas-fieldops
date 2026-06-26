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

export type MobileConflictType =
  | "FormVersionChanged"
  | "EntityUpdated"
  | "AssignmentCancelled"
  | "SubmissionRejected"
  | "AccountOrDeviceBlocked";

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

export type MobileOfficerStatus = "Active" | "Inactive" | "Suspended" | "OnLeave";

export type MobileOfficerProfile = LocalRecord & {
  id: UUID;
  userId: UUID;
  username: string;
  email: string | null;
  fullName: string | null;
  employeeCode: string | null;
  phone: string | null;
  team: string | null;
  supervisorId: UUID | null;
  supervisorName: string | null;
  status: MobileOfficerStatus;
  lastSyncAt: ISODateTime | null;
};

export type MobileSupervisorProfile = LocalRecord & {
  id: UUID;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  team: string | null;
};

export type MobilePermissionSet = LocalRecord & {
  id: UUID;
  userId: UUID;
  permissions: string[];
  canCollectData: boolean;
  canWorkOffline: boolean;
  canUploadMedia: boolean;
  canUseGps: boolean;
  canCorrectReturnedSubmissions: boolean;
};

export type MobileOfflineRules = LocalRecord & {
  id: string;
  offlineCollectionAllowed: boolean;
  syncRequired: boolean;
  maxOfflineDays: number;
  gpsRequired: boolean;
  photoRequired: boolean;
  minimumAppVersion: string;
  allowedCollectionHours: { start: string | null; end: string | null };
  maximumSubmissionsPerDay: number | null;
  minimumInterviewDurationSeconds: number | null;
};

export type MobileAssignedCounts = {
  projects: number;
  assignments: number;
  forms: number;
  beneficiaries: number;
  locations: number;
  returnedSubmissions: number;
  pendingUploads: number;
};

export type MobileBlockedState = {
  blocked: boolean;
  reason: string | null;
  accountStatus: MobileOfficerStatus | "Unknown";
  deviceStatus: MobileDeviceStatus | "Unknown";
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
  sector?: {
    id?: string;
    name?: string;
    sector?: string;
    terminology?: Record<string, string>;
    entityTypes?: string[];
    formTemplates?: string[];
    indicatorTemplates?: string[];
    dashboardWidgets?: string[];
    reportTemplates?: string[];
    validationRules?: string[];
    dataQualityRules?: string[];
    workflows?: string[];
    mobileGuidance?: string[];
  };
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
  entityCategoryId?: UUID | null;
  parentEntityIds: UUID[];
  childEntityIds: UUID[];
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

export type MobileEntityCategoryAttribute = {
  id: UUID;
  label: string;
  fieldKey: string;
  fieldType: string;
  description: string | null;
  required: boolean;
  orderIndex: number;
  options: string[];
  validation: Record<string, unknown>;
  defaultValue: string | null;
};

export type MobileEntityCategory = LocalRecord & {
  id: UUID;
  projectId: UUID | null;
  parentCategoryId?: UUID | null;
  name: string;
  slug: string;
  sector: string | null;
  icon: string;
  color: string;
  statuses: string[];
  workflow: Record<string, unknown>;
  attributes: MobileEntityCategoryAttribute[];
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
  | "Lookup"
  | "Ranking"
  | "Nps"
  | "Rating"
  | "Hidden"
  | "Polygon";

export type MobilePolygonGeometry = {
  type: "Polygon";
  /** [ring][vertex][lng, lat] — GeoJSON coordinate order */
  coordinates: number[][][];
  properties?: {
    capturedAt?: string;
    vertexCount?: number;
  };
};

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
  inputMode?: "phone" | "email" | "url" | null;
  required: boolean;
  readOnly: boolean;
  defaultValue: unknown;
  options: MobileQuestionOption[];
  validationRules: MobileValidationRule[];
  logicRules: MobileLogicRule[];
  referenceListId: string | null;
  cascadingParentQuestionId: string | null;
  sensitive: boolean;
  metadataTags?: string[];
  indicatorMapping?: {
    indicatorId?: string | null;
    component?: string | null;
    unit?: string | null;
    reportingPeriod?: string | null;
    disaggregation?: string | null;
    donorTag?: string | null;
  };
  beneficiaryMapping?: {
    profileImpact?: string | null;
    beneficiaryField?: string | null;
    profileUpdateRule?: string | null;
    duplicateKey?: boolean;
    sourceOfTruth?: boolean;
    lineageRequired?: boolean;
  };
  referenceControls?: {
    referenceListId?: string | null;
    parentQuestionId?: string | null;
    newReferencePolicy?: string | null;
    offlineRequired?: boolean;
    searchable?: boolean;
    versionLocked?: boolean;
  };
  qualityControls?: {
    captureTimestamp?: boolean;
    captureGps?: boolean;
    photoEvidence?: boolean;
    backCheckCandidate?: boolean;
    staticGpsWarning?: boolean;
    fastInterviewWarning?: boolean;
    minimumSeconds?: string | number | null;
    integrityAction?: string | null;
  };
  privacyControls?: {
    sensitivity?: string | null;
    consentField?: string | null;
    maskOnScreen?: boolean;
    maskOnExport?: boolean;
    encryptAtRest?: boolean;
    hideAfterSubmit?: boolean;
    screenshotRestricted?: boolean;
    consentRequired?: boolean;
  };
  mobileControls?: {
    displayMode?: string | null;
    blockedHelp?: string | null;
    offlineCompatible?: boolean;
    lowBandwidth?: boolean;
    prefillAllowed?: boolean;
    saveDraftAfterAnswer?: boolean;
    reviewBeforeSubmit?: boolean;
    syncPriority?: boolean;
  };
  governanceControls?: {
    editRule?: string | null;
    reviewerRole?: string | null;
    auditLabel?: string | null;
    changeReasonRequired?: boolean;
    approvedDataLock?: boolean;
    reviewerCommentRequired?: boolean;
    includeInDataFreeze?: boolean;
    qualityFlagVisible?: boolean;
    sourceLineageVisible?: boolean;
  };
  repeatSettings: {
    minRepeats: number | null;
    maxRepeats: number | null;
    addButtonLabel: string | null;
    countFromVariable?: string | null;
  } | null;
  /** Per-language overrides keyed by language name; base label/helpText are the default language. */
  translations?: Record<
    string,
    { label?: string; hint?: string; options?: string[]; matrixRows?: string[]; matrixColumns?: string[] }
  > | null;
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
  entityCategoryId?: UUID | null;
  createsNewEntity: boolean;
  updatesExistingEntity: boolean;
  requiresExistingEntity: boolean;
  allowsAnonymousSubmission: boolean;
  respondentIdentityMode?:
    | "existing_beneficiary"
    | "new_registration"
    | "existing_or_new"
    | "anonymous_allowed"
    | null;
  entitySearchMode?: "required" | "optional" | "disabled";
  frequencyRule: FrequencyRule;
  prefillMappings: PrefillMapping[];
  duplicateMode: "exact" | "fuzzy" | "weighted";
  duplicateThreshold: number;
  duplicateAction: "block" | "warn" | "review";
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

export type MobileReviewStatus = "pending_review" | "under_review" | "approved" | "returned";

export type MobileSubmissionStatus = {
  clientSubmissionId: string;
  status: string;
  reviewStatus: MobileReviewStatus;
  reviewComments: string | null;
  reviewedAt: ISODateTime | null;
  approvedAt: ISODateTime | null;
};

export type MobileSubmissionResponse = {
  questionId: string;
  variableName: string;
  value: unknown;
  updatedAt: ISODateTime;
};

export type MobileIntegritySignal = {
  code: string;
  severity: "Info" | "Warning" | "Critical";
  message: string;
  evidence: Record<string, unknown>;
  createdAt: ISODateTime;
};

export type MobileCollectionIntegrity = {
  score: number;
  riskLevel: "Low" | "Medium" | "High";
  startedAt: ISODateTime;
  reviewedAt: ISODateTime;
  durationSeconds: number;
  expectedMinimumSeconds: number;
  gpsCaptured: boolean;
  gpsAccuracy: number | null;
  mediaEvidenceCount: number;
  requiredMediaCount: number;
  signals: MobileIntegritySignal[];
};

export type MobileSubmission = LocalRecord & {
  id: string;
  projectId: UUID;
  assignmentId: UUID | null;
  formId: UUID;
  formVersionId: UUID;
  entityId: UUID | null;
  linkedEntityIds: UUID[];
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
  integritySignals: MobileCollectionIntegrity | null;
  reviewStatus: MobileReviewStatus | null;
  reviewComments: string | null;
  reviewedAt: ISODateTime | null;
  approvedAt: ISODateTime | null;
};

export type MobileAttachment = LocalRecord & {
  id: string;
  submissionLocalId: string;
  activityLocalId?: string | null;
  contextType?: "Submission" | "OperationalActivity";
  type: "Photo" | "Audio" | "Video" | "Signature" | "FileUpload";
  localUri: string;
  remoteUrl: string | null;
  mimeType: string;
  size: number;
  encrypted: boolean;
  uploadProgress: number;
  errorMessage: string | null;
  /** Transient base64 of the file, attached only at upload time so the server can store the
   * actual bytes for export bundling. Not persisted in the local database. */
  contentBase64?: string | null;
};

export type MobileNotification = LocalRecord & {
  id: string;
  title: string;
  body: string;
  eventType: string | null;
  resourceType: string | null;
  resourceId: string | null;
  readAt: ISODateTime | null;
  createdByServerAt: ISODateTime;
};

export type MobileVisitRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "change_requested"
  | "scheduled"
  | "checked_in"
  | "completed"
  | "missed"
  | "flagged";

export type MobileVisitVerificationStatus =
  | "not_checked_in"
  | "verified"
  | "warning_distance"
  | "outside_planned_area"
  | "poor_gps_accuracy";

export type MobileVisitRequest = LocalRecord & {
  id: UUID;
  organizationId: UUID;
  projectId: UUID | null;
  beneficiaryId: UUID | null;
  fieldOfficerId: UUID;
  supervisorUserId: UUID | null;
  title: string;
  activityType:
    | "field_visit"
    | "office_visit"
    | "stakeholder_meeting"
    | "training_support"
    | "incident_report"
    | "equipment_delivery"
    | "partner_coordination"
    | "general_observation";
  activityScope: "organization" | "project" | "beneficiary";
  requiresApproval: boolean;
  purpose: string | null;
  locationName: string;
  latitude: number | null;
  longitude: number | null;
  requestedStartAt: ISODateTime;
  requestedEndAt: ISODateTime;
  priority: "low" | "normal" | "high" | "urgent";
  status: MobileVisitRequestStatus;
  requiredFormIds: UUID[];
  plannedActivities: string[];
  supervisorInstructions: string | null;
  reviewedByUserId: UUID | null;
  reviewedAt: ISODateTime | null;
  checkInAt: ISODateTime | null;
  checkInLatitude: number | null;
  checkInLongitude: number | null;
  checkInAccuracy: number | null;
  checkInNote: string | null;
  checkOutAt: ISODateTime | null;
  checkOutLatitude: number | null;
  checkOutLongitude: number | null;
  checkOutAccuracy: number | null;
  checkOutSummary: string | null;
  verificationStatus: MobileVisitVerificationStatus;
  distanceFromPlannedMeters: number | null;
  metadata: Record<string, unknown>;
};

export type MobileSyncOperation =
  | "CREATE_SUBMISSION"
  | "UPDATE_DRAFT"
  | "UPLOAD_ATTACHMENT"
  | "SUBMIT_CORRECTION"
  | "UPLOAD_AUDIT_EVENT"
  | "MARK_NOTIFICATION_READ"
  | "CREATE_VISIT_REQUEST"
  | "VISIT_CHECK_IN"
  | "VISIT_CHECK_OUT"
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
  serverId?: string | null;
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
  id: string;
  localId: string;
  serverId: string | null;
  syncStatus: MobileSyncStatus;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  lastSyncedAt: ISODateTime | null;
  userId: string;
  organizationId: string;
  status: MobileDeviceStatus;
  registeredAt: ISODateTime;
  lastSyncAt: ISODateTime | null;
  lastLoginAt: ISODateTime | null;
  remoteLogoutRequired: boolean;
  remoteWipeRequired: boolean;
  deviceIdForRecord?: string;
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
  customIdentifiers?: Array<{ fieldKey: string; label: string; value: string }>;
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
  fieldOfficerProfile: MobileOfficerProfile | null;
  supervisor: MobileSupervisorProfile | null;
  permissionSet: MobilePermissionSet;
  mobileRules: MobileOfflineRules;
  device: MobileDeviceRecord | null;
  assignedCounts: MobileAssignedCounts;
  blockedState: MobileBlockedState;
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
  entityCategories: MobileEntityCategory[];
  entities: MobileEntity[];
  locations: MobileLocation[];
  referenceLists: MobileReferenceList[];
  returnedSubmissions: MobileSubmission[];
  submissionStatuses: MobileSubmissionStatus[];
  notifications: MobileNotification[];
};
