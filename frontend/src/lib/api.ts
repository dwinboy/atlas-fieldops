export type HealthResponse = {
  status: "ok";
};

export type LoginRequest = {
  email: string;
  password: string;
  organization_slug?: string | null;
};

export type LoginOrganizationOption = {
  slug: string;
  name: string;
};

export type TokenResponse = {
  access_token: string;
  token_type: "bearer";
};

export type CurrentPrincipal = {
  user_id: string;
  organization_id: string;
  email?: string | null;
  full_name?: string | null;
  organization_slug?: string | null;
  organization_name?: string | null;
  platform_admin?: boolean;
  support_mode?: boolean;
  platform_organization_id?: string | null;
  platform_organization_slug?: string | null;
  roles: string[];
  role_assignments?: PrincipalRoleAssignment[];
  permissions?: string[];
  scope_type?: string;
  geography_ids?: string[];
  project_ids?: string[];
  organization_unit_ids?: string[];
  menu_views?: string[];
  workflow_actions?: string[];
};

export type PrincipalRoleAssignment = {
  id: string;
  role_name: string;
  scope_type: string;
  geography_id?: string | null;
  project_id?: string | null;
  organization_unit_id?: string | null;
  team_id?: string | null;
  is_active: boolean;
};

export type OrganizationCreate = {
  name: string;
  slug: string;
  owner_email?: string;
  owner_full_name?: string;
  owner_password?: string;
};

export type OrganizationRead = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  owner_email?: string | null;
  temporary_password?: string | null;
};

export type PlatformOrganizationRead = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  user_count: number;
  owner_email?: string | null;
};

export type PlatformSummaryRead = {
  organization_count: number;
  active_organization_count: number;
  inactive_organization_count: number;
  tenant_user_count: number;
  platform_admin_count: number;
  organizations_without_owner_count: number;
  audit_event_count: number;
};

export type PlatformUserRead = {
  user_id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  role_name: string;
  organization_id: string;
  organization_name: string;
  organization_slug: string;
  membership_active: boolean;
  created_at: string;
  updated_at: string;
};

export type PlatformAuditLogRead = {
  id: string;
  organization_id: string;
  organization_name?: string | null;
  organization_slug?: string | null;
  actor_user_id?: string | null;
  actor_email?: string | null;
  action: string;
  resource_type: string;
  resource_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type PlatformOrganizationUsageRead = {
  organization_id: string;
  organization_name: string;
  organization_slug: string;
  is_active: boolean;
  user_count: number;
  owner_email?: string | null;
  form_count: number;
  submission_count: number;
  beneficiary_count: number;
  field_officer_count: number;
  import_job_count: number;
  export_job_count: number;
  audit_event_count: number;
};

export type PlatformDataIsolationIssueRead = {
  id: string;
  severity: string;
  issue_type: string;
  organization_id?: string | null;
  organization_name?: string | null;
  organization_slug?: string | null;
  resource_type: string;
  affected_records: number;
  detail: string;
  recommendation: string;
};

export type PlatformSettingsRead = {
  app_name: string;
  app_env: string;
  api_version: string;
  cors_origins: string[];
  cors_origin_regex: string;
  access_token_expire_minutes: number;
  database_configured: boolean;
  jwt_secret_configured: boolean;
  redis_configured: boolean;
  kafka_configured: boolean;
};

export type PlatformRoleTemplateRead = {
  key: string;
  label: string;
  scope: string;
  protected: boolean;
  status: string;
  permissions: string[];
};

export type PlatformFeatureFlagRead = {
  key: string;
  label: string;
  description: string;
  global_enabled: boolean;
  rollout_percentage: number;
  environment: string;
  organization_overrides: number;
  updated_at?: string | null;
};

export type PlatformHealthServiceRead = {
  service: string;
  status: string;
  detail: string;
  response_time_ms?: number | null;
};

export type PlatformSystemHealthRead = {
  status: string;
  services: PlatformHealthServiceRead[];
};

export type PlatformSecurityEventRead = {
  id: string;
  event_type: string;
  severity: string;
  actor: string;
  organization?: string | null;
  ip_address?: string | null;
  device?: string | null;
  created_at: string;
  status: string;
};

export type PlatformSecurityPolicyRead = {
  mfa_required_for_admins: boolean;
  mfa_required_for_all_users: boolean;
  password_min_length: number;
  password_rotation_days: number;
  session_timeout_minutes: number;
  failed_login_lock_threshold: number;
  support_session_timeout_minutes: number;
  ip_allowlist_enabled: boolean;
  updated_at?: string | null;
};

export type PlatformSecurityPolicyUpdate = PlatformSecurityPolicyRead & {
  reason: string;
};

export type PlatformIntegrationRead = {
  key: string;
  name: string;
  provider_type: string;
  status: string;
  health: string;
  last_sync_at?: string | null;
  secrets_visible: boolean;
};

export type PlatformIntegrationUpdate = {
  status: string;
  health: string;
  owner: string;
  notes: string;
  reason: string;
};

export type PlatformMobileFleetDeviceRead = {
  organization_id: string;
  organization_name: string;
  organization_slug: string;
  field_officer_id: string;
  officer_name?: string | null;
  device_id: string;
  app_version: string;
  last_sync_at?: string | null;
  last_seen_at?: string | null;
  submission_count: number;
  status: string;
};

export type PlatformMobileFleetSummaryRead = {
  active_devices: number;
  offline_devices: number;
  active_users: number;
  submission_throughput: number;
  current_production_version: string;
  minimum_supported_version: string;
  app_versions: Record<string, number>;
  devices: PlatformMobileFleetDeviceRead[];
};

export type PlatformSectorPackRead = {
  id: string;
  name: string;
  sector: string;
  description: string;
  entity_types: string[];
  form_templates: string[];
  indicator_templates: string[];
  report_templates: string[];
  validation_rules: string[];
  data_quality_rules: string[];
  workflows: string[];
  mobile_guidance: string[];
  dashboard_widgets: string[];
};

export type PlatformBackupJobRead = {
  id: string;
  backup_type: string;
  status: string;
  size: string;
  created_at: string;
  retention: string;
  restore_requires_elevation: boolean;
};

export type PlatformBackupPolicyRead = {
  backup_frequency: string;
  retention_days: number;
  configuration_retention_days: number;
  tenant_export_enabled: boolean;
  restore_requires_approval: boolean;
  restore_approver_role: string;
  anonymize_archived_data: boolean;
  updated_at?: string | null;
};

export type PlatformBackupPolicyUpdate = PlatformBackupPolicyRead & {
  reason: string;
};

export type PlatformReleaseRead = {
  environment: string;
  backend_version: string;
  frontend_version: string;
  mobile_version: string;
  release_status: string;
  maintenance_mode: boolean;
  maintenance_message: string;
  maintenance_starts_at?: string | null;
  maintenance_ends_at?: string | null;
  affected_services: string[];
  announcement_enabled: boolean;
  announcement_title: string;
  announcement_body: string;
  announcement_tone: string;
  database_ready: boolean;
  jwt_ready: boolean;
  redis_ready: boolean;
  kafka_ready: boolean;
  release_notes: string;
  checklist: string[];
  updated_at?: string | null;
};

export type PlatformReleaseUpdate = Pick<
  PlatformReleaseRead,
  | "backend_version"
  | "frontend_version"
  | "mobile_version"
  | "release_status"
  | "maintenance_mode"
  | "maintenance_message"
  | "maintenance_starts_at"
  | "maintenance_ends_at"
  | "affected_services"
  | "announcement_enabled"
  | "announcement_title"
  | "announcement_body"
  | "announcement_tone"
  | "release_notes"
> & {
  reason: string;
};

export type PlatformLeadRead = {
  id: string;
  name: string;
  organization: string;
  country: string;
  email: string;
  phone: string;
  organization_size: string;
  interest_area: string;
  source: string;
  message: string;
  status: string;
  created_at: string;
};

export type PlatformOrganizationPlanRead = {
  organization_id: string;
  organization_name: string;
  organization_slug: string;
  plan: string;
  status: string;
  user_limit: number;
  submission_limit: number;
  storage_limit_gb: number;
  enabled_modules: string[];
  usage_percent: number;
};

export type PlatformOrganizationPlanUpdate = {
  plan: string;
  status: string;
  user_limit: number;
  submission_limit: number;
  storage_limit_gb: number;
  enabled_modules: string[];
  reason: string;
};

export type PlatformTenantLifecyclePolicyRead = {
  trial_days: number;
  grace_days: number;
  suspend_after_grace: boolean;
  require_owner_before_activation: boolean;
  require_project_before_activation: boolean;
  default_plan: string;
  default_user_limit: number;
  default_submission_limit: number;
  onboarding_checklist: string[];
  updated_at?: string | null;
};

export type PlatformTenantLifecyclePolicyUpdate = Omit<PlatformTenantLifecyclePolicyRead, "updated_at"> & {
  reason: string;
};

export type PlatformCompliancePolicyRead = {
  default_data_region: string;
  allowed_data_regions: string[];
  pii_masking_default: boolean;
  require_export_approval: boolean;
  require_dpa_for_exports: boolean;
  audit_retention_days: number;
  data_processing_contact: string;
  subprocessors_public_url: string;
  updated_at?: string | null;
};

export type PlatformCompliancePolicyUpdate = Omit<PlatformCompliancePolicyRead, "updated_at"> & {
  reason: string;
};

export type PlatformSlaPolicyRead = {
  uptime_target_percent: number;
  critical_response_minutes: number;
  high_response_hours: number;
  normal_response_hours: number;
  support_session_max_minutes: number;
  escalation_email: string;
  incident_manager: string;
  status_page_url: string;
  updated_at?: string | null;
};

export type PlatformSlaPolicyUpdate = Omit<PlatformSlaPolicyRead, "updated_at"> & {
  reason: string;
};

export type PlatformQuotaPolicyRead = {
  warning_threshold_percent: number;
  critical_threshold_percent: number;
  api_rate_limit_per_minute: number;
  storage_overage_action: string;
  submission_overage_action: string;
  notify_owners_on_warning: boolean;
  notify_super_admins_on_critical: boolean;
  updated_at?: string | null;
};

export type PlatformQuotaPolicyUpdate = Omit<PlatformQuotaPolicyRead, "updated_at"> & {
  reason: string;
};

export type PlatformObservabilityPolicyRead = {
  health_check_interval_seconds: number;
  api_error_rate_threshold_percent: number;
  slow_request_threshold_ms: number;
  mobile_sync_failure_threshold_percent: number;
  offline_device_alert_days: number;
  alert_email: string;
  pager_channel: string;
  updated_at?: string | null;
};

export type PlatformObservabilityPolicyUpdate = Omit<PlatformObservabilityPolicyRead, "updated_at"> & {
  reason: string;
};

export type PlatformRetentionPolicyRead = {
  tenant_data_retention_days: number;
  audit_log_retention_days: number;
  backup_retention_days: number;
  export_retention_days: number;
  inactive_tenant_archive_days: number;
  anonymize_deleted_user_days: number;
  legal_hold_enabled: boolean;
  updated_at?: string | null;
};

export type PlatformRetentionPolicyUpdate = Omit<PlatformRetentionPolicyRead, "updated_at"> & {
  reason: string;
};

export type PlatformApiGovernancePolicyRead = {
  public_api_enabled: boolean;
  api_key_expiry_days: number;
  webhook_retry_attempts: number;
  webhook_timeout_seconds: number;
  secret_rotation_days: number;
  require_scoped_api_keys: boolean;
  audit_external_access: boolean;
  updated_at?: string | null;
};

export type PlatformApiGovernancePolicyUpdate = Omit<PlatformApiGovernancePolicyRead, "updated_at"> & {
  reason: string;
};

export type PlatformAiGovernancePolicyRead = {
  ai_features_enabled: boolean;
  default_provider: string;
  pii_redaction_required: boolean;
  human_review_required: boolean;
  monthly_token_budget: number;
  max_prompt_retention_days: number;
  audit_ai_actions: boolean;
  updated_at?: string | null;
};

export type PlatformAiGovernancePolicyUpdate = Omit<PlatformAiGovernancePolicyRead, "updated_at"> & {
  reason: string;
};

export type PlatformCommunicationPolicyRead = {
  transactional_email_enabled: boolean;
  default_from_email: string;
  support_reply_to_email: string;
  sms_enabled: boolean;
  push_notifications_enabled: boolean;
  tenant_broadcasts_enabled: boolean;
  notification_log_retention_days: number;
  updated_at?: string | null;
};

export type PlatformCommunicationPolicyUpdate = Omit<PlatformCommunicationPolicyRead, "updated_at"> & {
  reason: string;
};

export type PlatformActionResult = {
  status: string;
  message: string;
};

export type PlatformSupportSessionRead = {
  id: string;
  organization_id: string;
  organization_name?: string | null;
  organization_slug?: string | null;
  actor_email?: string | null;
  status: string;
  reason: string;
  started_at: string;
  expires_at?: string | null;
};

export type PlatformTenantSupportQueueItemRead = {
  organization_id: string;
  organization_name: string;
  organization_slug: string;
  priority: string;
  status: string;
  issue_count: number;
  user_count: number;
  submission_count: number;
  last_support_at?: string | null;
  reasons: string[];
  recommended_action: string;
};

export type PlatformFeatureFlagUpdate = {
  global_enabled?: boolean;
  rollout_percentage?: number;
  reason: string;
};

export type PlatformUserSecurityAction = {
  action: "lock" | "unlock" | "force_password_reset" | "revoke_sessions" | "require_mfa";
  reason: string;
};

export type PublicLeadCreate = {
  name: string;
  organization?: string;
  country?: string;
  email: string;
  phone?: string;
  organization_size?: string;
  interest_area?: string;
  source?: string;
  message?: string;
  metadata?: Record<string, unknown>;
};

export type PublicLeadRead = Required<Omit<PublicLeadCreate, "metadata">> & {
  id: string;
  status: string;
  created_at: string;
};

export type AdministrationSummaryRead = {
  organizations: number;
  countries: number;
  active_users: number;
  active_projects: number;
  api_integrations: number;
  scheduled_backups: number;
  failed_jobs: number;
  active_feature_flags: number;
  system_health: string;
};

export type AdministrationLocationRead = {
  id: string;
  organization_id?: string | null;
  parent_location_id?: string | null;
  name: string;
  code: string;
  location_type: string;
  status: string;
  latitude?: number | null;
  longitude?: number | null;
  boundary_reference?: string | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type AdministrationReferenceValueRead = {
  id: string;
  reference_list_id: string;
  code: string;
  label: string;
  description?: string | null;
  is_active: boolean;
  sort_order: number;
  metadata_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type AdministrationReferenceListRead = {
  id: string;
  organization_id?: string | null;
  name: string;
  slug: string;
  description?: string | null;
  category: string;
  status: string;
  version: number;
  values: AdministrationReferenceValueRead[];
  created_at: string;
  updated_at: string;
};

export type AdministrationNotificationRuleRead = {
  id: string;
  event_type: string;
  channel: string;
  template: string;
  frequency: string;
  status: string;
  recipients_json: string[];
  delivery_rules_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type AdministrationApiKeyRead = {
  id: string;
  api_name: string;
  owner: string;
  key_prefix: string;
  status: string;
  last_used_at?: string | null;
  rotated_at?: string | null;
  revoked_at?: string | null;
  rate_limit: string;
  scope: string;
  created_at: string;
  updated_at: string;
};

export type AdministrationIntegrationRead = {
  id: string;
  name: string;
  integration_type: string;
  status: string;
  environment: string;
  last_sync_at?: string | null;
  owner: string;
  metadata_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type AdministrationFeatureFlagRead = {
  id: string;
  flag_key: string;
  label: string;
  description?: string | null;
  enabled: boolean;
  rollout_percentage: number;
  environment: string;
  created_at: string;
  updated_at: string;
};

export type AdministrationSystemSettingRead = {
  id: string;
  category: string;
  setting_key: string;
  setting_value_json: Record<string, unknown>;
  environment: string;
  is_sensitive: boolean;
  created_at: string;
  updated_at: string;
};

export type AdministrationBackupJobRead = {
  id: string;
  backup_type: string;
  status: string;
  size_bytes?: number | null;
  retention_days: number;
  started_at?: string | null;
  finished_at?: string | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type OrganizationContext = {
  organization_id: string;
  name: string;
  slug: string;
  roles: string[];
  logo_url?: string | null;
};

export type UserCreate = {
  email: string;
  password: string;
  full_name: string;
  role_name: string;
  scope_type?: string | null;
  geography_ids?: string[];
  project_ids?: string[];
};

export type UserRead = {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  role_name?: string | null;
  scope_type?: string | null;
  geography_id?: string | null;
  project_id?: string | null;
  organization_unit_id?: string | null;
  login_slug?: string | null;
  temporary_password?: string | null;
  role_assignments?: UserRoleAssignmentRead[];
  operational_profiles?: UserOperationalProfileRead[];
};

export type UserOperationalProfileRead = {
  id: string;
  profile_type: string;
  display_name: string;
  status: string;
  supervisor_user_id?: string | null;
  primary_project_id?: string | null;
  primary_geography_id?: string | null;
  primary_team_id?: string | null;
  responsibilities_json: string[];
  metrics_json: Record<string, unknown>;
  metadata_json: Record<string, unknown>;
  last_activity_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type UserRoleAssignmentRead = {
  id: string;
  role_id: string;
  role_name: string;
  role_label: string;
  scope_type: string;
  geography_id?: string | null;
  project_id?: string | null;
  organization_unit_id?: string | null;
  team_id?: string | null;
  assigned_by_user_id?: string | null;
  starts_at?: string | null;
  expires_at?: string | null;
  is_active: boolean;
  reason?: string | null;
};

export type UserRoleAssignmentCreate = {
  role_name: string;
  scope_type?: string | null;
  geography_id?: string | null;
  project_id?: string | null;
  organization_unit_id?: string | null;
  team_id?: string | null;
  reason?: string | null;
};

export type UserRoleAssignmentUpdate = Partial<UserRoleAssignmentCreate> & {
  is_active?: boolean;
};

export type UserImportIssue = {
  row_number: number;
  email?: string | null;
  message: string;
};

export type UserImportResponse = {
  created_count: number;
  skipped_count: number;
  error_count: number;
  users: UserRead[];
  issues: UserImportIssue[];
};

export type UserUpdate = {
  full_name?: string;
  role_name?: string;
  scope_type?: string;
  geography_id?: string | null;
  project_id?: string | null;
  organization_unit_id?: string | null;
  is_active?: boolean;
};

export type PasswordResetRead = {
  user_id: string;
  temporary_password: string;
};

export type RoleRead = {
  id: string;
  organization_id: string;
  name: string;
  label?: string;
  description?: string;
  scope_type?: string;
  is_system?: boolean;
  permissions: string[];
};

export type RoleCreate = {
  name: string;
  label?: string;
  description?: string;
  scope_type?: string;
  permissions: string[];
};

export type AccessCatalog = {
  roles: {
    name: string;
    label: string;
    description: string;
    scope_type: string;
    architecture_group?: string;
    common_usage?: string;
    permissions: string[];
    workflow_actions: string[];
    menu_views: string[];
  }[];
  permissions: { key: string; label: string; group: string }[];
  scope_types: string[];
  workflow_actions: string[];
};

export type OrganizationUnitRead = {
  id: string;
  organization_id: string;
  parent_unit_id: string | null;
  name: string;
  code: string;
  unit_type: string;
  region: string | null;
};

export type OrganizationUnitImportIssue = {
  row_number: number;
  code?: string | null;
  message: string;
};

export type OrganizationUnitImportResponse = {
  created_count: number;
  skipped_count: number;
  error_count: number;
  units: OrganizationUnitRead[];
  issues: OrganizationUnitImportIssue[];
};

export type DataRouteCreate = {
  title: string;
  data_type?: string;
  target_role_name?: string | null;
  target_team_id?: string | null;
  target_user_id?: string | null;
  priority?: "low" | "normal" | "high" | "urgent";
  instructions: string;
};

export type DataRouteRead = {
  id: string;
  title: string;
  data_type: string;
  target_role_name: string | null;
  target_team_id: string | null;
  target_user_id: string | null;
  priority: string;
  instructions: string;
  status: string;
  created_at: string;
};

export type GovernanceSummary = {
  policies: number;
  validation_rules: number;
  retention_policies: number;
  open_quality_signals: number;
  audit_events: number;
  lineage_events: number;
  export_events: number;
  consent_records: number;
  compliance_score: number;
  attention_items: string[];
};

export type GovernancePolicyRead = {
  id: string;
  name: string;
  policy_type: string;
  lifecycle_state: string;
  version: number;
  enforcement_level: string;
  rules_json: Record<string, unknown>;
  approved_at: string | null;
  created_at: string;
};

export type RetentionPolicyRead = {
  id: string;
  record_type: string;
  retention_years: number;
  archive_after_days: number;
  legal_hold: boolean;
  purge_allowed: boolean;
  anonymize_on_export: boolean;
  created_at: string;
};

export type ValidationRuleRead = {
  id: string;
  rule_code: string;
  name: string;
  target_entity: string;
  severity: string;
  expression: string;
  version: number;
  is_active: boolean;
  created_at: string;
};

export type DataVersionRead = {
  id: string;
  entity_type: string;
  entity_id: string;
  version_number: number;
  change_type: string;
  field_changes_json: Record<string, unknown>;
  rollback_available: boolean;
  created_at: string;
};

export type LineageEventRead = {
  id: string;
  source_type: string;
  source_id: string;
  target_type: string;
  target_id: string;
  transformation: string;
  lineage_json: Record<string, unknown>;
  created_at: string;
};

export type ExportLogRead = {
  id: string;
  dataset_type: string;
  export_format: string;
  status: string;
  anonymized: boolean;
  record_count: number;
  risk_score: number;
  created_at: string;
};

export type ConsentRecordRead = {
  id: string;
  beneficiary_id: string | null;
  subject_identifier: string;
  consent_type: string;
  status: string;
  captured_at: string | null;
  created_at: string;
};

export type MasterDataEntryRead = {
  id: string;
  category: string;
  code: string;
  label: string;
  status: string;
  version: number;
  order_index: number;
  language: string;
  created_at: string;
};

export type OrganizationGovernanceSummary = {
  departments: number;
  teams: number;
  workforce_profiles: number;
  active_delegations: number;
  pending_access_requests: number;
  approval_matrices: number;
  clearance_levels: number;
  devices: number;
  active_sessions: number;
  high_risk_sessions: number;
  governance_score: number;
  attention_items: string[];
};

export type DepartmentRead = {
  id: string;
  name: string;
  code: string;
  department_type: string;
  parent_department_id: string | null;
  manager_user_id: string | null;
  created_at: string;
};

export type TeamRead = {
  id: string;
  name: string;
  code: string;
  team_type: string;
  department_id: string | null;
  organization_unit_id: string | null;
  manager_user_id: string | null;
  region: string | null;
  project_id: string | null;
  is_active: boolean;
  created_at: string;
};

export type WorkforceProfileRead = {
  id: string;
  user_id: string;
  employee_code: string | null;
  job_title: string;
  department_id: string | null;
  team_id: string | null;
  supervisor_user_id: string | null;
  lifecycle_status: string;
  clearance_level: string;
  performance_score: number;
  created_at: string;
};

export type DelegationRead = {
  id: string;
  delegator_user_id: string;
  delegate_user_id: string;
  permission: string;
  scope_type: string;
  geography_id: string | null;
  project_id: string | null;
  starts_at: string;
  expires_at: string;
  status: string;
  reason: string | null;
};

export type ApprovalMatrixRead = {
  id: string;
  matrix_code: string;
  workflow_type: string;
  threshold_type: string;
  threshold_value: number;
  required_role: string;
  approval_stage: string;
  escalation_role: string | null;
  sla_hours: number;
  is_active: boolean;
};

export type AccessRequestRead = {
  id: string;
  requester_user_id: string;
  requested_permission: string;
  requested_scope_type: string;
  geography_id: string | null;
  project_id: string | null;
  reason: string;
  status: string;
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
  expires_at: string | null;
  created_at: string;
};

export type ClearanceLevelRead = {
  id: string;
  code: string;
  label: string;
  rank: number;
  allowed_data_classes: string[];
  requires_mfa: boolean;
};

export type OperationalZoneRead = {
  id: string;
  code: string;
  name: string;
  zone_type: string;
  parent_zone_id: string | null;
  geography_id: string | null;
  is_active: boolean;
};

export type DeviceRead = {
  id: string;
  user_id: string | null;
  device_id: string;
  device_type: string;
  label: string;
  status: string;
  last_seen_at: string | null;
};

export type SessionLogRead = {
  id: string;
  user_id: string;
  device_id: string | null;
  ip_address: string | null;
  location_hint: string | null;
  risk_score: number;
  status: string;
  created_at: string;
  ended_at: string | null;
};

export type AccessSimulationRead = {
  allowed: boolean;
  decision: string;
  matched_roles: string[];
  matched_scope: string | null;
  reasons: string[];
};

export type UsersTeamsSummaryRead = {
  total_users: number;
  active_users: number;
  inactive_users: number;
  suspended_users: number;
  pending_invitations: number;
  locked_accounts: number;
  teams: number;
  organizations: number;
  roles: number;
  pending_access_requests: number;
  active_sessions: number;
  high_risk_sessions: number;
  permission_alerts: number;
  recent_activity: number;
  access_health_score: number;
};

export type UsersTeamsActivityLogRead = {
  id: string;
  user_id?: string | null;
  user_label?: string | null;
  action: string;
  resource_type: string;
  resource_id: string;
  status: string;
  ip_address?: string | null;
  device?: string | null;
  location?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type FieldOfficerInvite = {
  email: string;
  full_name: string;
  phone_number?: string;
  employee_code?: string;
  home_region?: string;
  temporary_password: string;
};

export type FieldOfficerRead = {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  phone_number: string | null;
  employee_code: string | null;
  home_region: string | null;
  supervisor_user_id: string | null;
  supervisor_name: string | null;
  last_sync_at: string | null;
  last_seen_at: string | null;
  last_latitude: number | null;
  last_longitude: number | null;
  device_id: string | null;
  is_active: boolean;
};

export type FieldOfficerSummaryMetric = {
  label: string;
  value: string;
  tone?: "neutral" | "success" | "warning" | "danger";
  route?: string | null;
};

export type FieldOfficerAssignmentDetailRead = {
  id: string;
  project_id: string;
  project_name: string;
  form_id: string | null;
  form_name: string | null;
  region: string | null;
  target: number;
  completed: number;
  status: string;
  is_active: boolean;
  updated_at: string;
};

export type FieldOfficerSubmissionDetailRead = {
  id: string;
  client_submission_id: string;
  project_id: string | null;
  project_name: string | null;
  form_id: string;
  form_name: string | null;
  entity_id: string | null;
  status: string;
  source: string;
  submitted_at: string;
  sync_received_at: string;
  quality_score: number;
};

export type FieldOfficerDeviceDetailRead = {
  device_id: string;
  device_name: string;
  platform: string;
  app_version: string | null;
  os_version: string | null;
  status: string;
  last_seen_at: string | null;
  last_sync_at: string | null;
};

export type FieldOfficerActivityEventRead = {
  id: string;
  action: string;
  detail: string;
  device_id: string | null;
  project_id: string | null;
  created_at: string;
  status: string;
};

export type FieldOfficerSecurityRead = {
  username: string;
  email: string;
  account_status: string;
  role: string | null;
  scope_type: string | null;
  project_id: string | null;
  geography_id: string | null;
  temporary_password_issued: boolean;
  password_last_changed_at: string | null;
  last_login_at: string | null;
  failed_login_attempts: number;
  mobile_qr_login_enabled: boolean;
  mobile_qr_login_payload: string | null;
  credential_actions: string[];
};

export type FieldOfficerPermissionRead = {
  key: string;
  label: string;
  enabled: boolean;
  source: string;
};

export type FieldOfficerProfileDetailRead = {
  officer: FieldOfficerRead;
  organization_name: string | null;
  team: string | null;
  supervisor: string | null;
  status: string;
  metrics: FieldOfficerSummaryMetric[];
  assignments: FieldOfficerAssignmentDetailRead[];
  projects: FieldOfficerAssignmentDetailRead[];
  locations: string[];
  forms: FieldOfficerAssignmentDetailRead[];
  beneficiaries: Record<string, unknown>[];
  submissions: FieldOfficerSubmissionDetailRead[];
  performance: Record<string, unknown>;
  data_quality: Record<string, unknown>;
  devices: FieldOfficerDeviceDetailRead[];
  activity: FieldOfficerActivityEventRead[];
  permissions: FieldOfficerPermissionRead[];
  security: FieldOfficerSecurityRead;
  audit_trail: FieldOfficerActivityEventRead[];
};

export type FieldOfficerProfileUpdate = {
  employee_code?: string | null;
  phone_number?: string | null;
  home_region?: string | null;
  supervisor_user_id?: string | null;
  is_active?: boolean | null;
};

export type FieldOfficerAssignmentCreate = {
  officer_id: string;
  project_id: string;
  form_id?: string | null;
  region?: string | null;
  is_active?: boolean;
};

export type FieldOfficerAssignmentRead = {
  id: string;
  officer_id: string;
  project_id: string;
  form_id: string | null;
  region: string | null;
  is_active: boolean;
};

export type FieldOfficerImportIssue = {
  row_number: number;
  email?: string | null;
  message: string;
};

export type FieldOfficerImportResponse = {
  created_count: number;
  skipped_count: number;
  error_count: number;
  officers: FieldOfficerRead[];
  issues: FieldOfficerImportIssue[];
};

export type FieldVisitRequestRead = {
  id: string;
  organization_id: string;
  project_id: string | null;
  beneficiary_id: string | null;
  field_officer_id: string | null;
  supervisor_user_id: string | null;
  title: string;
  activity_type: string;
  activity_scope: "organization" | "project" | "beneficiary" | string;
  requires_approval: boolean;
  purpose: string | null;
  location_name: string;
  latitude: number | null;
  longitude: number | null;
  requested_start_at: string;
  requested_end_at: string;
  priority: "low" | "normal" | "high" | "urgent" | string;
  status: "pending" | "approved" | "rejected" | "change_requested" | "scheduled" | "checked_in" | "completed" | "missed" | "flagged" | string;
  required_form_ids: string[];
  planned_activities: string[];
  supervisor_instructions: string | null;
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
  check_in_at: string | null;
  check_in_latitude: number | null;
  check_in_longitude: number | null;
  check_in_accuracy: number | null;
  check_in_note: string | null;
  check_out_at: string | null;
  check_out_latitude: number | null;
  check_out_longitude: number | null;
  check_out_accuracy: number | null;
  check_out_summary: string | null;
  verification_status: string;
  distance_from_planned_meters: number | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type FieldVisitRequestReview = {
  action: "approve" | "reject" | "request_changes";
  comment?: string | null;
  approved_start_at?: string | null;
  approved_end_at?: string | null;
  supervisor_instructions?: string | null;
};

export type FieldVisitOutcomeReview = {
  action: "verify" | "accept_with_exception" | "flag" | "request_correction";
  comment: string;
  supervisor_instructions?: string | null;
  quality_score?: number | null;
};

export type SubmissionRead = {
  id: string;
  client_submission_id: string;
  project_id: string | null;
  survey_id: string | null;
  form_id: string;
  entity_id?: string | null;
  entity_type?: string | null;
  assignment_id?: string | null;
  supervisor_id?: string | null;
  frequency_period?: string | null;
  event_id?: string | null;
  field_officer_id: string | null;
  status: string;
  server_sequence: number;
  captured_at: string;
  submitted_at: string;
  sync_received_at: string;
  offline_created: boolean;
  device_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  payload_json: Record<string, unknown>;
  is_imported?: boolean;
  source_system?: string | null;
  source_record_id?: string | null;
  source_project_id?: string | null;
  source_form_id?: string | null;
  source_submission_id?: string | null;
  import_batch_id?: string | null;
  imported_at?: string | null;
  imported_by_user_id?: string | null;
  reviewed_by_user_id?: string | null;
  reviewed_at?: string | null;
  review_comments?: string | null;
  approved_by_user_id?: string | null;
  approved_at?: string | null;
  beneficiary_code?: string | null;
  submitted_by_name?: string | null;
  approved_by_name?: string | null;
  imported_by_name?: string | null;
  reviewed_by_name?: string | null;
  linked_beneficiaries?: {
    id: string;
    beneficiary_id: string;
    beneficiary_uid: string;
    display_name: string;
    beneficiary_type: string;
    link_type: string;
    source: string;
    source_field?: string | null;
    created_at: string;
  }[];
  review_quality?: number | null;
  redacted_fields?: string[];
};

export type ImportCleaningRowRead = {
  id: string;
  client_submission_id: string;
  form_id: string;
  form_name: string;
  project_id?: string | null;
  project_name?: string | null;
  status: string;
  imported_at?: string | null;
  imported_by_user_id?: string | null;
  uploaded_by_name?: string | null;
  source_system?: string | null;
  source_record_id?: string | null;
  missing_fields: string[];
  missing_field_keys: string[];
  validation_issues: string[];
  response_values: Record<string, unknown>;
  issue_count: number;
  missing_field_count: number;
  ready_to_confirm: boolean;
  quality_status?: string | null;
  updated_at: string;
};

export type ImportCleaningBulkUpdateResponse = {
  updated_rows: number;
  skipped_rows: number;
  issues: FormDataImportIssue[];
  rows: ImportCleaningRowRead[];
};

export type SubmissionResponsesUpdate = {
  responses: Record<string, unknown>;
  reason: string;
};

export type OperationsSummary = {
  beneficiaries: number;
  active_programs: number;
  indicators: number;
  open_cases: number;
  quality_flags: number;
  sync_health_percent: number;
  offline_ready: boolean;
};

export type OperationalEventRead = {
  id: string;
  project_id: string | null;
  beneficiary_id: string | null;
  submission_id: string | null;
  actor_user_id: string | null;
  event_type: string;
  source_module: string;
  status: string;
  priority: string;
  summary: string;
  effects_json: Record<string, unknown>[];
  created_at: string;
};

export type WorkflowQueueItemRead = {
  id: string;
  project_id: string | null;
  beneficiary_id: string | null;
  submission_id: string | null;
  queue_type: string;
  trigger_event_type: string;
  status: string;
  priority: string;
  title: string;
  next_action: string;
  due_at: string | null;
  created_at: string;
};

export type OperationalEcosystemRead = {
  nodes: { id: string; label: string; node_type: string; status: string; count: number }[];
  edges: { source: string; target: string; label: string; health: string }[];
  recent_events: OperationalEventRead[];
  workflow_queue: WorkflowQueueItemRead[];
  attention_items: string[];
};

export type BeneficiaryRead = {
  id: string;
  project_id: string | null;
  beneficiary_uid: string;
  beneficiary_type: string;
  display_name: string;
  sex: string | null;
  birth_year: number | null;
  phone_number: string | null;
  region: string | null;
  district: string | null;
  community: string | null;
  enrollment_status: string;
  vulnerability_score: number;
  duplicate_risk_score: number;
  latitude: number | null;
  longitude: number | null;
  last_visit_at: string | null;
  profile_json?: Record<string, unknown>;
};

export type BeneficiaryCreate = {
  beneficiary_uid: string;
  beneficiary_type: string;
  display_name: string;
  project_id: string;
  sex?: string | null;
  birth_year?: number | null;
  phone_number?: string | null;
  region?: string | null;
  district?: string | null;
  community?: string | null;
  vulnerability_score?: number;
  latitude?: number | null;
  longitude?: number | null;
  profile_json?: Record<string, unknown>;
};

export type BeneficiaryMergeRequest = {
  master_beneficiary_id: string;
  duplicate_beneficiary_id: string;
  reason: string;
  merge_profile_fields?: boolean;
};

export type BeneficiaryMergeRead = {
  master_beneficiary: BeneficiaryRead;
  duplicate_beneficiary: BeneficiaryRead;
  moved_submissions: number;
  moved_quality_signals: number;
  reason: string;
};

export type EntityAttributeCreate = {
  label: string;
  field_key: string;
  field_type: string;
  description?: string | null;
  required?: boolean;
  order_index?: number;
  options_json?: string[];
  validation_json?: Record<string, unknown>;
  default_value?: string | null;
  status?: string;
};

export type EntityCategoryCreate = {
  name: string;
  slug?: string | null;
  project_id?: string | null;
  sector?: string | null;
  description?: string | null;
  icon?: string;
  color?: string;
  status?: string;
  is_predefined?: boolean;
  metadata_json?: Record<string, unknown>;
  statuses_json?: string[];
  workflow_json?: Record<string, unknown>;
  attributes?: EntityAttributeCreate[];
};

export type EntityCategoryRead = Required<Omit<EntityCategoryCreate, "attributes" | "slug">> & {
  id: string;
  slug: string;
  project_id: string | null;
  attributes: (EntityAttributeCreate & {
    id: string;
    category_id: string;
    created_at: string;
    updated_at: string;
  })[];
  created_at: string;
  updated_at: string;
};

export type PredefinedEntityCategoryRead = {
  sector: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  attributes: EntityAttributeCreate[];
};

export type DuplicateCheckRequest = {
  entity_id?: string;
  entity_type?: string;
  full_name?: string;
  phone_number?: string;
  national_id?: string;
  household_id?: string;
  village?: string;
  date_of_birth?: string;
  latitude?: number | null;
  longitude?: number | null;
  project_id?: string | null;
};

export type DuplicateCandidateRead = {
  entity_id: string;
  entity_uid: string;
  display_name: string;
  score: number;
  level: string;
  matched_fields: string[];
};

export type DataQualitySignalRead = {
  id: string;
  submission_id: string | null;
  beneficiary_id: string | null;
  signal_type: string;
  severity: string;
  confidence: number;
  summary: string;
  status: string;
  evidence_json: Record<string, unknown>;
  created_at: string;
};

export type EntityPrefillRead = {
  entity_id: string;
  values: Record<string, unknown>;
  locked_fields: string[];
  update_requires_reason: boolean;
};

export type FrequencyValidationRequest = {
  form_id: string;
  entity_id?: string | null;
  project_id?: string | null;
  frequency_rule: string;
  frequency_period?: string | null;
  event_id?: string | null;
};

export type FrequencyValidationRead = {
  allowed: boolean;
  decision: "allowed" | "warn" | "blocked";
  reason: string;
  existing_submission_id?: string | null;
};

export type MobileSyncPackageRead = {
  assigned_entities: BeneficiaryRead[];
  assigned_forms: DataFormRead[];
  published_form_versions: Record<string, unknown>[];
  reference_data: Record<string, unknown>[];
  duplicate_rules: Record<string, unknown>[];
  frequency_rules: Record<string, unknown>[];
  returned_submissions: SubmissionRead[];
  sync_conflicts: Record<string, unknown>[];
};

export type ProgramRead = {
  id: string;
  name: string;
  slug: string;
  region: string | null;
  is_active: boolean;
};

export type ProjectCreate = {
  name: string;
  project_code: string;
  sector_id?: string | null;
  description?: string | null;
  program_type?: string | null;
  category?: string | null;
  donor?: string | null;
  implementing_organization?: string | null;
  country?: string | null;
  region?: string | null;
  district?: string | null;
  community?: string | null;
  owner?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  settings_json?: Record<string, unknown>;
  status?: string;
};

export type ProjectUpdate = Partial<ProjectCreate>;

export type ProjectSummaryRead = {
  total_projects: number;
  active_projects: number;
  draft_projects: number;
  closed_projects: number;
  total_beneficiaries: number;
  total_submissions: number;
  active_forms: number;
  active_field_officers: number;
  project_completion_rate: number;
  indicator_achievement_rate: number;
  attention_projects: number;
  risk_alerts: number;
};

export type ProjectListItemRead = {
  id: string;
  name: string;
  project_code: string;
  sector_id?: string | null;
  sector_name?: string | null;
  status: string;
  donor?: string | null;
  country?: string | null;
  region?: string | null;
  owner?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  active_forms: number;
  active_assignments: number;
  total_submissions: number;
  indicator_count: number;
  beneficiary_count: number;
  progress_percent: number;
  health_score: number;
  health_status: string;
  created_at: string;
  updated_at: string;
};

export type ProjectRelatedRecordRead = {
  id: string;
  label: string;
  status: string;
  category?: string | null;
  metric?: string | null;
  updated_at?: string | null;
};

export type ProjectAuditEventRead = {
  id: string;
  user?: string | null;
  action: string;
  resource_type: string;
  old_value?: string | null;
  new_value?: string | null;
  reason?: string | null;
  created_at: string;
};

export type ProjectDetailRead = ProjectListItemRead & {
  description?: string | null;
  program_type?: string | null;
  category?: string | null;
  implementing_organization?: string | null;
  settings_json?: Record<string, unknown>;
  forms: ProjectRelatedRecordRead[];
  indicators: ProjectRelatedRecordRead[];
  locations: ProjectRelatedRecordRead[];
  teams: ProjectRelatedRecordRead[];
  assignments: ProjectRelatedRecordRead[];
  submissions: ProjectRelatedRecordRead[];
  reports: ProjectRelatedRecordRead[];
  audit_trail: ProjectAuditEventRead[];
};

export type ProjectTemplateRead = {
  id: string;
  name: string;
  template_type: string;
  description: string;
  forms: number;
  indicators: number;
  governance_controls: number;
  status: string;
};

export type ProjectSectorPackRead = {
  id: string;
  name: string;
  sector: string;
  description: string;
  terminology: Record<string, string>;
  entity_types: string[];
  form_templates: string[];
  form_definitions: Record<string, unknown>[];
  indicator_templates: string[];
  indicator_definitions: Record<string, unknown>[];
  dashboard_widgets: string[];
  report_templates: string[];
  report_definitions: Record<string, unknown>[];
  validation_rules: string[];
  data_quality_rules: string[];
  workflows: string[];
  mobile_guidance: string[];
  governance_defaults: Record<string, unknown>;
  recommended_settings: Record<string, unknown>;
  manager_controls: Record<string, unknown>;
};

export type ProjectSectorInstallRead = {
  project_id: string;
  sector_id?: string | null;
  installed_forms: number;
  installed_indicators: number;
  installed_reports: number;
  skipped_forms: number;
  skipped_indicators: number;
  skipped_reports: number;
  message: string;
};

export type IndicatorRead = {
  id: string;
  project_id: string | null;
  survey_id: string | null;
  code: string;
  name: string;
  description: string | null;
  unit: string;
  reporting_frequency: string;
  baseline_value: number;
  target_value: number;
  current_value: number;
  sdg_code: string | null;
  formula: string | null;
  category: string | null;
  disaggregation_fields: string[];
  is_active: boolean;
  progress_percent: number;
  calculated_at: string | null;
};

export type IndicatorCreate = {
  code: string;
  name: string;
  project_id?: string | null;
  survey_id?: string | null;
  description?: string | null;
  unit?: string;
  reporting_frequency?: "monthly" | "quarterly" | "annual";
  baseline_value?: number;
  target_value?: number;
  current_value?: number;
  sdg_code?: string | null;
  formula?: string | null;
  category?: string | null;
  disaggregation_fields?: string[];
};

export type IndicatorLinkedSubmissionRead = {
  submission_id: string;
  client_submission_id: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  field_value: unknown;
  project_id: string | null;
};

export type IndicatorLinkedSubmissionsRead = {
  field_name: string | null;
  operation: string | null;
  total_count: number;
  items: IndicatorLinkedSubmissionRead[];
};

export type IndicatorDisaggregationRead = {
  field_name: string;
  operation: string | null;
  breakdown: Record<string, number>;
};

export type IndicatorDisaggregationsRead = {
  items: IndicatorDisaggregationRead[];
};

export type CaseRead = {
  id: string;
  project_id: string | null;
  beneficiary_id: string | null;
  case_number: string;
  case_type: string;
  title: string;
  priority: string;
  status: string;
  assigned_to_user_id: string | null;
  due_at: string | null;
  closed_at: string | null;
  notes: string | null;
};

export type DonorReportIndicatorMetric = {
  code: string;
  name: string;
  unit: string;
  baseline_value: number;
  target_value: number;
  current_value: number;
  progress_percent: number;
};

export type DonorReportMetrics = {
  projects: number;
  submissions_total: number;
  submissions_approved: number;
  beneficiaries: number;
  indicators: DonorReportIndicatorMetric[];
  period_start: string | null;
  period_end: string | null;
  generated_at: string;
};

export type DonorReportRead = {
  id: string;
  project_id: string | null;
  survey_id: string | null;
  name: string;
  donor: string | null;
  report_type: string;
  period_start: string | null;
  period_end: string | null;
  status: string;
  summary: string | null;
  export_formats: string[];
  metrics_json: Partial<DonorReportMetrics>;
  generated_at: string | null;
};

export type ImportPreviewRequest = {
  dataset_type: string;
  columns: string[];
  sample_rows: Record<string, unknown>[];
};

export type ImportPreviewResponse = {
  suggested_mapping: { source_column: string; target_field: string; required: boolean; transform?: string | null }[];
  issues: { row_number: number; field_name: string | null; issue_type: string; severity: string; message: string; suggested_fix: string | null }[];
  valid_rows: number;
  error_rows: number;
  duplicate_rows: number;
};

export type ImportReadinessScoreRead = {
  score: number;
  category: string;
  issues: string[];
  recommended_action: string;
  factors: Record<string, number>;
};

export type ImportDuplicateGroupRead = {
  group_id: string;
  confidence: number;
  reason: string;
  recommended_action: string;
  actions: string[];
  records: {
    row_number: number;
    display_name: string;
    phone_number?: string | null;
    location?: string | null;
    legacy_id?: string | null;
  }[];
};

export type ImportMatchSuggestionRead = {
  source_value: string;
  suggested_value: string;
  confidence: number;
  match_type: string;
  row_numbers: number[];
  actions: string[];
};

export type ImportGeneratedIdRead = {
  row_number: number;
  generated_id: string;
  entity_type: string;
  legacy_id?: string | null;
  generated_by_import: boolean;
};

export type ImportDateFormatRead = {
  field_name: string;
  detected_format: string;
  normalized_preview: string[];
  invalid_rows: number[];
};

export type ImportQualityReportRead = {
  import_batch_id: string;
  source_system: string;
  records_created: number;
  records_updated: number;
  records_skipped: number;
  errors: number;
  warnings: number;
  duplicate_candidates: number;
  location_issues: number;
  unlinked_submissions: number;
  data_quality_score: number;
  recommendations: string[];
};

export type ImportAnalysisRequest = ImportPreviewRequest & {
  source_system?: string;
  target_project_id?: string | null;
};

export type ImportAnalysisResponse = {
  readiness: ImportReadinessScoreRead;
  suggested_mapping: ImportPreviewResponse["suggested_mapping"];
  validation_issues: ImportPreviewResponse["issues"];
  duplicate_groups: ImportDuplicateGroupRead[];
  location_matches: ImportMatchSuggestionRead[];
  entity_matches: ImportMatchSuggestionRead[];
  indicator_matches: ImportMatchSuggestionRead[];
  generated_ids: ImportGeneratedIdRead[];
  legacy_fields: string[];
  date_formats: ImportDateFormatRead[];
  gps_warnings: ImportPreviewResponse["issues"];
  preview_counts: Record<string, number>;
  quality_report: ImportQualityReportRead;
  progress_percent: number;
};

export type ImportJobCreate = {
  dataset_type: string;
  source_name: string;
  source_format: string;
  total_rows: number;
  mapping?: { source_column: string; target_field: string; required?: boolean; transform?: string | null }[];
  target_project_id?: string | null;
  target_mode?: string;
  source_system?: string;
  import_reason?: string | null;
};

export type ImportJobRead = {
  id: string;
  dataset_type: string;
  source_name: string;
  source_format: string;
  status: string;
  total_rows: number;
  valid_rows: number;
  error_rows: number;
  duplicate_rows: number;
  rollback_available: boolean;
  target_project_id?: string | null;
  target_mode?: string | null;
  source_system?: string | null;
  import_reason?: string | null;
  successful_records?: number;
  failed_records?: number;
  skipped_records?: number;
  completed_at?: string | null;
};

export type ImportRowRead = {
  id: string;
  import_job_id: string;
  row_number: number;
  row_data: Record<string, unknown>;
  edited_data: Record<string, unknown>;
  validation_status: string;
  issue_count: number;
  version: number;
};

export type ImportUploadResponse = {
  job: ImportJobRead;
  columns: string[];
  preview_rows: Record<string, unknown>[];
  issues: ImportPreviewResponse["issues"];
};

export type ImportApplyResponse = {
  job: ImportJobRead;
  created_records: number;
  updated_records: number;
  skipped_rows: number;
  dataset_type: string;
  message: string;
};

export type ImportSupportedSourceRead = {
  id: string;
  label: string;
  phase: string;
  supported_formats: string[];
  status: string;
  description: string;
};

export type ImportMigrationOverviewRead = {
  supported_types: string[];
  supported_sources: ImportSupportedSourceRead[];
  recent_batches: ImportJobRead[];
  mobile_ready_outputs: string[];
};

export type ImportErrorReportRead = {
  import_batch_id: string;
  file_name: string;
  status: string;
  errors: ImportPreviewResponse["issues"];
  warnings: ImportPreviewResponse["issues"];
  downloadable: boolean;
};

export type ImportRollbackRead = {
  job: ImportJobRead;
  rolled_back_records: number;
  skipped_records: number;
  message: string;
};

export type ExportJobCreate = {
  dataset_type: string;
  export_format: string;
  filtered_view?: Record<string, unknown>;
  scheduled?: boolean;
};

export type ExportJobRead = {
  id: string;
  dataset_type: string;
  export_format: string;
  status: string;
  download_url: string | null;
  scheduled: boolean;
};

export type PublicCollectionLinkCreate = {
  form_id: string;
  slug: string;
  title: string;
  description?: string | null;
  access_mode?: "public" | "restricted" | "partner";
  require_authentication?: boolean;
  allow_offline_web?: boolean;
  expires_at?: string | null;
  allowed_domains?: string[];
  permission_json?: Record<string, unknown>;
};

export type PublicCollectionLinkRead = {
  id: string;
  form_id: string;
  slug: string;
  title: string;
  description: string | null;
  access_mode: string;
  status: string;
  require_authentication: boolean;
  allow_offline_web: boolean;
  expires_at: string | null;
  allowed_domains: string[];
  permission_json: Record<string, unknown>;
  submission_count: number;
  public_url: string;
};

export type MediaEvidenceCreate = {
  media_type: string;
  file_name: string;
  storage_url: string;
  mime_type: string;
  size_bytes?: number;
  submission_id?: string | null;
  beneficiary_id?: string | null;
  form_id?: string | null;
  activity_id?: string | null;
  checksum?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  captured_at?: string | null;
  metadata_json?: Record<string, unknown>;
};

export type MediaEvidenceRead = {
  id: string;
  submission_id: string | null;
  beneficiary_id: string | null;
  form_id: string | null;
  activity_id: string | null;
  media_type: string;
  file_name: string;
  storage_url: string;
  mime_type: string;
  size_bytes: number;
  review_status: string;
  checksum: string | null;
  latitude: number | null;
  longitude: number | null;
  captured_at: string | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
};

export type OperationalActivityReportType =
  | "monthly_operations"
  | "field_officer_movement"
  | "incident_report"
  | "supervisor_approval"
  | "gps_exception";

export type OperationalActivityReportRead = {
  report_type: OperationalActivityReportType;
  title: string;
  period_start: string | null;
  period_end: string | null;
  generated_at: string;
  total_activities: number;
  pending: number;
  approved: number;
  completed: number;
  rejected: number;
  flagged: number;
  gps_verified: number;
  organization_scope: number;
  project_scope: number;
  incident_count: number;
  attachment_count: number;
  approval_rate: number;
  completion_rate: number;
  gps_exception_rate: number;
  by_activity_type: Record<string, number>;
  by_officer_id: Record<string, number>;
  by_scope: Record<string, number>;
  recommendations: string[];
  rows: Array<Record<string, unknown>>;
};

export const FORM_TYPES = [
  "registration",
  "monitoring",
  "follow_up",
  "verification",
  "assessment",
  "custom",
] as const;

export type FormType = (typeof FORM_TYPES)[number];

export type DataFormCreate = {
  project_id: string;
  survey_id: string;
  name: string;
  slug: string;
  description?: string | null;
  form_type?: FormType | null;
  schema: Record<string, unknown>;
  publish?: boolean;
};

export type XlsFormWorkbook = {
  survey: {
    type: string;
    name: string;
    label: string;
    hint?: string | null;
    required?: string | null;
    constraint?: string | null;
    relevant?: string | null;
    calculation?: string | null;
  }[];
  choices: { list_name: string; name: string; label: string }[];
  settings: {
    form_title: string;
    form_id: string;
    version: string;
    default_language: string;
  };
};

export type FormCollectionCompatibility = {
  form_id: string;
  version: number;
  offline_ready: boolean;
  xlsform_ready: boolean;
  web_form_ready: boolean;
  mobile_app_ready: boolean;
  has_gps: boolean;
  has_repeat_groups: boolean;
  media_field_count: number;
  warnings: string[];
};

export type FormReferenceBinding = {
  id: string;
  question_id: string;
  question_label: string;
  reference_list_name: string;
  reference_type: string;
  source: "new" | "existing" | "imported";
  enforce_controlled_values: boolean;
  allow_inactive_values: boolean;
  parent_reference?: string | null;
  effective_from?: string | null;
  effective_to?: string | null;
  version: number;
  updated_by?: string | null;
  changed_since_publish: boolean;
};

export type FormPermissionRule = {
  subject_type: "role" | "user" | "team";
  subject_name: string;
  permissions: string[];
  location_scope: string;
  can_approve_own_submission: boolean;
  read_only: boolean;
};

export type FormWorkflowStage = {
  id: string;
  name: string;
  reviewer_roles: string[];
  reviewer_location_scope: string;
  require_comment_on_reject: boolean;
  require_comment_on_return: boolean;
  sla_hours: number;
};

export type FormDataQualityRule = {
  id: string;
  label: string;
  rule_type: string;
  enabled: boolean;
  severity: "low" | "medium" | "high" | "critical";
  blocking: boolean;
  fields: string[];
  expression?: string | null;
};

export type FormGovernancePolicy = {
  form_status:
    | "draft"
    | "testing"
    | "review"
    | "approved"
    | "published"
    | "suspended"
    | "archived";
  approval_workflow: "simple" | "standard" | "correction" | "custom";
  required_review_levels: number;
  submitted_records_editable: boolean;
  approved_records_editable: boolean;
  rejected_records_resubmittable: boolean;
  duplicate_submissions_allowed: boolean;
  duplicate_detection_fields: string[];
  require_gps_capture: boolean;
  require_timestamp_capture: boolean;
  require_enumerator_assignment: boolean;
  require_supervisor_review: boolean;
  data_retention_days: number;
  export_restricted: boolean;
  sensitive_field_masking: boolean;
  pii_tagging_required: boolean;
  consent_required: boolean;
  minimum_quality_score: number;
  review_sla_hours: number;
  auto_lock_after_approval: boolean;
  auto_archive_after_project_closure: boolean;
  export_approval_required?: boolean;
  export_approval_role?: string | null;
  approved_data_freeze_required?: boolean;
  decision_use?: string;
  reporting_period?: string;
  source_of_truth_rule?: string;
};

export type FormCollectionAccessSettings = {
  selection_mode: "assigned_only" | "project_team" | "open_link";
  field_officer_ids: string[];
  team_ids: string[];
  assigned_at?: string | null;
  assigned_by_user_id?: string | null;
  notes?: string | null;
};

export type FormAuditSettings = {
  immutable: boolean;
  reason_required_events: string[];
  tracked_events: string[];
  export_allowed_roles: string[];
};

export type FormVersioningSettings = {
  editing_published_creates_draft: boolean;
  preserve_submission_version_link: boolean;
  compare_versions_enabled: boolean;
  reference_lists_version_aware: boolean;
  archived_versions_viewable: boolean;
};

export type FormEntityControlSettings = {
  linked_to_entity: boolean;
  entity_category_id?: string | null;
  entity_type: string;
  creates_new_entity: boolean;
  updates_existing_entity: boolean;
  requires_existing_entity: boolean;
  allows_anonymous: boolean;
  submission_frequency: string;
  unique_fields: string[];
  matching_fields: string[];
  duplicate_mode: string;
  duplicate_threshold: number;
  duplicate_action: "block" | "warn" | "review";
  prefill_profile: boolean;
  lock_prefilled_fields: boolean;
  editable_with_reason: boolean;
  profile_update_mode: string;
};

export type FormInstrumentSettings = {
  purpose?: Record<string, unknown>;
  indicator_mappings?: Record<string, unknown>[];
  data_dictionary?: Record<string, unknown>[];
  dependency_map?: Record<string, unknown>[];
  profile_impact_rules?: Record<string, unknown>[];
  profile_history_policy?: Record<string, unknown>;
  respondent_identity?: Record<string, unknown>;
  submission_policy?: Record<string, unknown>;
  privacy?: Record<string, unknown>;
  attachment_governance?: Record<string, unknown>;
  interview_duration?: Record<string, unknown>;
  enumerator_quality?: Record<string, unknown>;
  repeat_group_policy?: Record<string, unknown>;
  event_settings?: Record<string, unknown>;
  tracking?: Record<string, unknown>;
  seasonal_rules?: Record<string, unknown>;
  survey_wave?: Record<string, unknown>;
  data_source?: Record<string, unknown>;
  geographic_scope?: Record<string, unknown>;
  auto_assignment_rules?: Record<string, unknown>[];
  trigger_rules?: Record<string, unknown>[];
  related_forms?: Record<string, unknown>;
  lifecycle?: Record<string, unknown>;
  certification?: Record<string, unknown>;
  sampling?: Record<string, unknown>;
  performance_analytics?: Record<string, unknown>;
  validation_standards?: Record<string, unknown>;
  field_guidance?: Record<string, unknown>;
  data_import?: Record<string, unknown>;
  localization?: Record<string, unknown>;
  mobile_package?: Record<string, unknown>;
  testing?: Record<string, unknown>;
  accessibility?: Record<string, unknown>;
  field_integrity?: Record<string, unknown>;
  partner_data_sharing?: Record<string, unknown>;
  case_escalation?: Record<string, unknown>;
  ai_readiness?: Record<string, unknown>;
};

export type FormControlsSettings = {
  reference_bindings: FormReferenceBinding[];
  permission_rules: FormPermissionRule[];
  workflow_stages: FormWorkflowStage[];
  data_quality_rules: FormDataQualityRule[];
  collection_access?: FormCollectionAccessSettings;
  entity_controls?: FormEntityControlSettings;
  governance: FormGovernancePolicy;
  audit: FormAuditSettings;
  versioning: FormVersioningSettings;
  instrument?: FormInstrumentSettings;
};

export type DataFormRead = {
  id: string;
  project_id: string | null;
  survey_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  form_type?: FormType | null;
  status: string;
  current_version: number;
  controls_json?: FormControlsSettings | Record<string, unknown>;
  is_active: boolean;
};

export type DataFormUpdate = {
  name: string;
  description?: string | null;
  form_type?: FormType | null;
  schema: Record<string, unknown>;
  publish?: boolean;
};

export type DataFormSchemaRead = {
  form_id: string;
  version: number;
  schema: Record<string, unknown>;
  published_at?: string | null;
  published_by_user_id?: string | null;
};

export type FormDataImportIssue = {
  row_number: number;
  field_name?: string | null;
  question_label?: string | null;
  issue_type: string;
  severity: "info" | "warning" | "error";
  message: string;
  suggested_fix?: string | null;
};

export type FormDataImportResponse = {
  imported_rows: number;
  warning_count: number;
  error_count: number;
  issues: FormDataImportIssue[];
  submissions: SubmissionRead[];
};

export type FormDataImportConfirmResponse = {
  confirmed_rows: number;
  skipped_rows: number;
  issues: FormDataImportIssue[];
  submissions: SubmissionRead[];
};

export type FormDataImportReturnResponse = {
  returned_rows: number;
  skipped_rows: number;
  issues: FormDataImportIssue[];
  submissions: SubmissionRead[];
};

export type TemplateFieldSummary = {
  field_count: number;
  repeat_group_count: number;
  has_gps: boolean;
  has_media: boolean;
  offline_compatible: boolean;
};

export type FormTemplateRead = {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  version: number;
  tags: string[];
  recommended_for: string[];
  estimated_minutes: number;
  popularity_score: number;
  is_featured: boolean;
  summary: TemplateFieldSummary;
};

export type FormTemplateDetail = FormTemplateRead & {
  template_schema: Record<string, unknown>;
  logic_overview: string[];
  mobile_preview_fields: string[];
};

export type TemplateDuplicateRequest = {
  project_id: string;
  survey_id: string;
  name?: string;
  slug?: string;
  publish?: boolean;
};

export type SurveyStatus = "draft" | "active" | "paused" | "completed" | "archived";

export type SurveyRole =
  | "survey_owner"
  | "survey_manager"
  | "survey_supervisor"
  | "data_quality_officer"
  | "enumerator"
  | "analyst";

export type SurveyGovernanceSettings = {
  data_visibility_roles: string[];
  review_roles: string[];
  approval_roles: string[];
  edit_roles: string[];
  correction_roles: string[];
  upload_roles: string[];
  export_roles: string[];
  synced_submission_default_status: "submitted" | "under_review";
  uploaded_submission_default_status: "submitted" | "under_review";
  review_required: boolean;
  allow_reviewer_edit: boolean;
  require_correction_note: boolean;
  lock_after_approval: boolean;
};

export type SurveyCreate = {
  project_id: string;
  title: string;
  code: string;
  description?: string | null;
  survey_type: string;
  status?: SurveyStatus;
  start_date?: string | null;
  end_date?: string | null;
  geographic_scope?: string | null;
  target_population?: string | null;
  indicator_ids?: string[];
  custom_type_label?: string | null;
  owner_user_id?: string | null;
  manager_user_id?: string | null;
};

export type SurveyRead = {
  id: string;
  organization_id: string;
  project_id: string;
  created_by_user_id: string | null;
  owner_user_id: string | null;
  manager_user_id: string | null;
  title: string;
  code: string;
  description: string | null;
  survey_type: string;
  status: SurveyStatus;
  start_date: string | null;
  end_date: string | null;
  geographic_scope: string | null;
  target_population: string | null;
  indicator_ids_json: string[];
  governance_json?: Partial<SurveyGovernanceSettings>;
  custom_type_label: string | null;
  is_active: boolean;
};

export type SurveyTeamMemberCreate = {
  user_id: string;
  survey_role: SurveyRole;
};

export type SurveyTeamMemberRead = {
  id: string;
  survey_id: string;
  user_id: string;
  survey_role: SurveyRole;
  is_active: boolean;
};

export function resolveApiBaseUrl(candidate: string | undefined): string {
  const apiUrl = candidate?.trim().replace(/\/+$/, "");
  if (!apiUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is required");
  }
  return apiUrl.endsWith("/api/v1") ? apiUrl : `${apiUrl}/api/v1`;
}

function getApiBaseUrl(): string {
  return resolveApiBaseUrl(process.env.NEXT_PUBLIC_API_URL);
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
  }
}

/**
 * When an email-first login matches several workspaces the backend returns
 * 409 with the choices in the body. Parse them so the caller can show a picker.
 */
export function parseMultipleOrganizations(error: unknown): LoginOrganizationOption[] | null {
  if (!(error instanceof ApiError) || error.status !== 409) return null;
  try {
    const parsed = JSON.parse(error.message) as {
      detail?: { reason?: string; organizations?: LoginOrganizationOption[] };
    };
    if (
      parsed.detail?.reason === "multiple_organizations" &&
      Array.isArray(parsed.detail.organizations)
    ) {
      return parsed.detail.organizations;
    }
  } catch {
    return null;
  }
  return null;
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string; bodyJson?: unknown } = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("accept", "application/json");
  if (options.bodyJson !== undefined) {
    headers.set("content-type", "application/json");
  }
  if (options.token) {
    headers.set("authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers,
    body: options.bodyJson === undefined ? options.body : JSON.stringify(options.bodyJson)
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new ApiError(detail || response.statusText, response.status);
  }

  return response.json() as Promise<T>;
}

export async function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/health", { cache: "no-store" });
}

export async function login(payload: LoginRequest): Promise<TokenResponse> {
  return request<TokenResponse>("/auth/login", { method: "POST", bodyJson: payload });
}

export async function getCurrentPrincipal(token: string): Promise<CurrentPrincipal> {
  return request<CurrentPrincipal>("/auth/me", { token });
}

export async function getOrganizationContext(token: string): Promise<OrganizationContext> {
  return request<OrganizationContext>("/organizations/me", { token });
}

export async function createOrganization(token: string, payload: OrganizationCreate): Promise<OrganizationRead> {
  return request<OrganizationRead>("/organizations", { method: "POST", token, bodyJson: payload });
}

export async function listPlatformOrganizations(token: string): Promise<PlatformOrganizationRead[]> {
  return request<PlatformOrganizationRead[]>("/organizations/platform", { token });
}

export async function updatePlatformOrganizationStatus(token: string, organizationId: string, isActive: boolean, reason?: string): Promise<PlatformOrganizationRead> {
  return request<PlatformOrganizationRead>(`/organizations/platform/${organizationId}`, {
    method: "PATCH",
    token,
    bodyJson: { is_active: isActive, reason }
  });
}

export async function createOrganizationSupportSession(token: string, organizationId: string, reason?: string): Promise<TokenResponse> {
  return request<TokenResponse>(`/organizations/platform/${organizationId}/support-session`, { method: "POST", token, bodyJson: { reason } });
}

export async function returnToPlatformSession(token: string): Promise<TokenResponse> {
  return request<TokenResponse>("/organizations/platform/session/return", { method: "POST", token });
}

export async function getPlatformSummary(token: string): Promise<PlatformSummaryRead> {
  return request<PlatformSummaryRead>("/platform/summary", { token });
}

export async function listPlatformUsers(token: string): Promise<PlatformUserRead[]> {
  return request<PlatformUserRead[]>("/platform/users", { token });
}

export async function runPlatformUserSecurityAction(token: string, userId: string, payload: PlatformUserSecurityAction): Promise<PlatformActionResult> {
  return request<PlatformActionResult>(`/platform/users/${userId}/security-action`, { method: "POST", token, bodyJson: payload });
}

export async function listPlatformAuditLogs(token: string, limit = 50): Promise<PlatformAuditLogRead[]> {
  return request<PlatformAuditLogRead[]>(`/platform/audit-logs?limit=${limit}`, { token });
}

export async function listPlatformUsage(token: string): Promise<PlatformOrganizationUsageRead[]> {
  return request<PlatformOrganizationUsageRead[]>("/platform/usage", { token });
}

export async function listPlatformDataIsolationIssues(token: string): Promise<PlatformDataIsolationIssueRead[]> {
  return request<PlatformDataIsolationIssueRead[]>("/platform/data-isolation", { token });
}

export async function listPlatformLeads(token: string): Promise<PlatformLeadRead[]> {
  return request<PlatformLeadRead[]>("/platform/leads", { token });
}

export async function listPlatformOrganizationPlans(token: string): Promise<PlatformOrganizationPlanRead[]> {
  return request<PlatformOrganizationPlanRead[]>("/platform/organization-plans", { token });
}

export async function updatePlatformOrganizationPlan(
  token: string,
  organizationId: string,
  payload: PlatformOrganizationPlanUpdate,
): Promise<PlatformOrganizationPlanRead> {
  return request<PlatformOrganizationPlanRead>(`/platform/organization-plans/${organizationId}`, { method: "PATCH", token, bodyJson: payload });
}

export async function getPlatformTenantLifecyclePolicy(token: string): Promise<PlatformTenantLifecyclePolicyRead> {
  return request<PlatformTenantLifecyclePolicyRead>("/platform/tenant-lifecycle-policy", { token });
}

export async function updatePlatformTenantLifecyclePolicy(token: string, payload: PlatformTenantLifecyclePolicyUpdate): Promise<PlatformTenantLifecyclePolicyRead> {
  return request<PlatformTenantLifecyclePolicyRead>("/platform/tenant-lifecycle-policy", { method: "PATCH", token, bodyJson: payload });
}

export async function getPlatformCompliancePolicy(token: string): Promise<PlatformCompliancePolicyRead> {
  return request<PlatformCompliancePolicyRead>("/platform/compliance-policy", { token });
}

export async function updatePlatformCompliancePolicy(token: string, payload: PlatformCompliancePolicyUpdate): Promise<PlatformCompliancePolicyRead> {
  return request<PlatformCompliancePolicyRead>("/platform/compliance-policy", { method: "PATCH", token, bodyJson: payload });
}

export async function getPlatformSlaPolicy(token: string): Promise<PlatformSlaPolicyRead> {
  return request<PlatformSlaPolicyRead>("/platform/sla-policy", { token });
}

export async function updatePlatformSlaPolicy(token: string, payload: PlatformSlaPolicyUpdate): Promise<PlatformSlaPolicyRead> {
  return request<PlatformSlaPolicyRead>("/platform/sla-policy", { method: "PATCH", token, bodyJson: payload });
}

export async function getPlatformQuotaPolicy(token: string): Promise<PlatformQuotaPolicyRead> {
  return request<PlatformQuotaPolicyRead>("/platform/quota-policy", { token });
}

export async function updatePlatformQuotaPolicy(token: string, payload: PlatformQuotaPolicyUpdate): Promise<PlatformQuotaPolicyRead> {
  return request<PlatformQuotaPolicyRead>("/platform/quota-policy", { method: "PATCH", token, bodyJson: payload });
}

export async function getPlatformObservabilityPolicy(token: string): Promise<PlatformObservabilityPolicyRead> {
  return request<PlatformObservabilityPolicyRead>("/platform/observability-policy", { token });
}

export async function updatePlatformObservabilityPolicy(token: string, payload: PlatformObservabilityPolicyUpdate): Promise<PlatformObservabilityPolicyRead> {
  return request<PlatformObservabilityPolicyRead>("/platform/observability-policy", { method: "PATCH", token, bodyJson: payload });
}

export async function getPlatformRetentionPolicy(token: string): Promise<PlatformRetentionPolicyRead> {
  return request<PlatformRetentionPolicyRead>("/platform/retention-policy", { token });
}

export async function updatePlatformRetentionPolicy(token: string, payload: PlatformRetentionPolicyUpdate): Promise<PlatformRetentionPolicyRead> {
  return request<PlatformRetentionPolicyRead>("/platform/retention-policy", { method: "PATCH", token, bodyJson: payload });
}

export async function getPlatformApiGovernancePolicy(token: string): Promise<PlatformApiGovernancePolicyRead> {
  return request<PlatformApiGovernancePolicyRead>("/platform/api-governance-policy", { token });
}

export async function updatePlatformApiGovernancePolicy(token: string, payload: PlatformApiGovernancePolicyUpdate): Promise<PlatformApiGovernancePolicyRead> {
  return request<PlatformApiGovernancePolicyRead>("/platform/api-governance-policy", { method: "PATCH", token, bodyJson: payload });
}

export async function getPlatformAiGovernancePolicy(token: string): Promise<PlatformAiGovernancePolicyRead> {
  return request<PlatformAiGovernancePolicyRead>("/platform/ai-governance-policy", { token });
}

export async function updatePlatformAiGovernancePolicy(token: string, payload: PlatformAiGovernancePolicyUpdate): Promise<PlatformAiGovernancePolicyRead> {
  return request<PlatformAiGovernancePolicyRead>("/platform/ai-governance-policy", { method: "PATCH", token, bodyJson: payload });
}

export async function getPlatformCommunicationPolicy(token: string): Promise<PlatformCommunicationPolicyRead> {
  return request<PlatformCommunicationPolicyRead>("/platform/communication-policy", { token });
}

export async function updatePlatformCommunicationPolicy(token: string, payload: PlatformCommunicationPolicyUpdate): Promise<PlatformCommunicationPolicyRead> {
  return request<PlatformCommunicationPolicyRead>("/platform/communication-policy", { method: "PATCH", token, bodyJson: payload });
}

export async function listPlatformSupportSessions(token: string): Promise<PlatformSupportSessionRead[]> {
  return request<PlatformSupportSessionRead[]>("/platform/support-sessions", { token });
}

export async function listPlatformSupportQueue(token: string): Promise<PlatformTenantSupportQueueItemRead[]> {
  return request<PlatformTenantSupportQueueItemRead[]>("/platform/support-queue", { token });
}

export async function getPlatformSettings(token: string): Promise<PlatformSettingsRead> {
  return request<PlatformSettingsRead>("/platform/settings", { token });
}

export async function listPlatformRoles(token: string): Promise<PlatformRoleTemplateRead[]> {
  return request<PlatformRoleTemplateRead[]>("/platform/roles", { token });
}

export async function listPlatformFeatureFlags(token: string): Promise<PlatformFeatureFlagRead[]> {
  return request<PlatformFeatureFlagRead[]>("/platform/feature-flags", { token });
}

export async function updatePlatformFeatureFlag(token: string, flagKey: string, payload: PlatformFeatureFlagUpdate): Promise<PlatformFeatureFlagRead> {
  return request<PlatformFeatureFlagRead>(`/platform/feature-flags/${flagKey}`, { method: "PATCH", token, bodyJson: payload });
}

export async function getPlatformSystemHealth(token: string): Promise<PlatformSystemHealthRead> {
  return request<PlatformSystemHealthRead>("/platform/system-health", { token });
}

export async function listPlatformSecurityEvents(token: string): Promise<PlatformSecurityEventRead[]> {
  return request<PlatformSecurityEventRead[]>("/platform/security", { token });
}

export async function getPlatformSecurityPolicy(token: string): Promise<PlatformSecurityPolicyRead> {
  return request<PlatformSecurityPolicyRead>("/platform/security-policy", { token });
}

export async function updatePlatformSecurityPolicy(token: string, payload: PlatformSecurityPolicyUpdate): Promise<PlatformSecurityPolicyRead> {
  return request<PlatformSecurityPolicyRead>("/platform/security-policy", { method: "PATCH", token, bodyJson: payload });
}

export async function listPlatformIntegrations(token: string): Promise<PlatformIntegrationRead[]> {
  return request<PlatformIntegrationRead[]>("/platform/integrations", { token });
}

export async function updatePlatformIntegration(token: string, integrationKey: string, payload: PlatformIntegrationUpdate): Promise<PlatformIntegrationRead> {
  return request<PlatformIntegrationRead>(`/platform/integrations/${integrationKey}`, { method: "PATCH", token, bodyJson: payload });
}

export async function getPlatformMobileFleet(token: string): Promise<PlatformMobileFleetSummaryRead> {
  return request<PlatformMobileFleetSummaryRead>("/platform/mobile-fleet", { token });
}

export async function listPlatformSectorPacks(token: string): Promise<PlatformSectorPackRead[]> {
  return request<PlatformSectorPackRead[]>("/platform/sector-packs", { token });
}

export async function listPlatformBackups(token: string): Promise<PlatformBackupJobRead[]> {
  return request<PlatformBackupJobRead[]>("/platform/backups", { token });
}

export async function getPlatformBackupPolicy(token: string): Promise<PlatformBackupPolicyRead> {
  return request<PlatformBackupPolicyRead>("/platform/backup-policy", { token });
}

export async function updatePlatformBackupPolicy(token: string, payload: PlatformBackupPolicyUpdate): Promise<PlatformBackupPolicyRead> {
  return request<PlatformBackupPolicyRead>("/platform/backup-policy", { method: "PATCH", token, bodyJson: payload });
}

export async function getPlatformRelease(token: string): Promise<PlatformReleaseRead> {
  return request<PlatformReleaseRead>("/platform/release", { token });
}

export async function getPlatformAnnouncement(): Promise<PlatformReleaseRead> {
  return request<PlatformReleaseRead>("/platform/announcement");
}

export async function updatePlatformRelease(token: string, payload: PlatformReleaseUpdate): Promise<PlatformReleaseRead> {
  return request<PlatformReleaseRead>("/platform/release", { method: "PATCH", token, bodyJson: payload });
}

export async function createPublicLead(payload: PublicLeadCreate): Promise<PublicLeadRead> {
  return request<PublicLeadRead>("/public/leads", { method: "POST", bodyJson: payload });
}

export async function getAdministrationSummary(token: string): Promise<AdministrationSummaryRead> {
  return request<AdministrationSummaryRead>("/administration/summary", { token });
}

export async function listAdministrationLocations(token: string): Promise<AdministrationLocationRead[]> {
  return request<AdministrationLocationRead[]>("/administration/locations", { token });
}

export async function createAdministrationLocation(
  token: string,
  payload: Record<string, unknown>
): Promise<AdministrationLocationRead> {
  return request<AdministrationLocationRead>("/administration/locations", { method: "POST", token, bodyJson: payload });
}

export async function updateAdministrationLocation(
  token: string,
  locationId: string,
  payload: Record<string, unknown>
): Promise<AdministrationLocationRead> {
  return request<AdministrationLocationRead>(`/administration/locations/${locationId}`, {
    method: "PATCH",
    token,
    bodyJson: payload
  });
}

export async function listAdministrationReferenceLists(token: string): Promise<AdministrationReferenceListRead[]> {
  return request<AdministrationReferenceListRead[]>("/administration/reference-lists", { token });
}

export async function createAdministrationReferenceList(
  token: string,
  payload: Record<string, unknown>
): Promise<AdministrationReferenceListRead> {
  return request<AdministrationReferenceListRead>("/administration/reference-lists", { method: "POST", token, bodyJson: payload });
}

export async function createAdministrationReferenceValue(
  token: string,
  referenceListId: string,
  payload: Record<string, unknown>
): Promise<AdministrationReferenceValueRead> {
  return request<AdministrationReferenceValueRead>(`/administration/reference-lists/${referenceListId}/values`, {
    method: "POST",
    token,
    bodyJson: payload
  });
}

export async function updateAdministrationReferenceValue(
  token: string,
  valueId: string,
  payload: Record<string, unknown>
): Promise<AdministrationReferenceValueRead> {
  return request<AdministrationReferenceValueRead>(`/administration/reference-values/${valueId}`, {
    method: "PATCH",
    token,
    bodyJson: payload
  });
}

export async function listAdministrationNotificationRules(token: string): Promise<AdministrationNotificationRuleRead[]> {
  return request<AdministrationNotificationRuleRead[]>("/administration/notification-rules", { token });
}

export async function createAdministrationNotificationRule(
  token: string,
  payload: Record<string, unknown>
): Promise<AdministrationNotificationRuleRead> {
  return request<AdministrationNotificationRuleRead>("/administration/notification-rules", { method: "POST", token, bodyJson: payload });
}

export async function updateAdministrationNotificationRule(
  token: string,
  ruleId: string,
  payload: Record<string, unknown>
): Promise<AdministrationNotificationRuleRead> {
  return request<AdministrationNotificationRuleRead>(`/administration/notification-rules/${ruleId}`, {
    method: "PATCH",
    token,
    bodyJson: payload
  });
}

export async function listAdministrationApiKeys(token: string): Promise<AdministrationApiKeyRead[]> {
  return request<AdministrationApiKeyRead[]>("/administration/api-keys", { token });
}

export async function createAdministrationApiKey(token: string, payload: Record<string, unknown>): Promise<AdministrationApiKeyRead> {
  return request<AdministrationApiKeyRead>("/administration/api-keys", { method: "POST", token, bodyJson: payload });
}

export async function rotateAdministrationApiKey(token: string, apiKeyId: string): Promise<AdministrationApiKeyRead> {
  return request<AdministrationApiKeyRead>(`/administration/api-keys/${apiKeyId}/rotate`, { method: "POST", token });
}

export async function revokeAdministrationApiKey(token: string, apiKeyId: string): Promise<AdministrationApiKeyRead> {
  return request<AdministrationApiKeyRead>(`/administration/api-keys/${apiKeyId}/revoke`, { method: "POST", token });
}

export async function listAdministrationIntegrations(token: string): Promise<AdministrationIntegrationRead[]> {
  return request<AdministrationIntegrationRead[]>("/administration/integrations", { token });
}

export async function createAdministrationIntegration(token: string, payload: Record<string, unknown>): Promise<AdministrationIntegrationRead> {
  return request<AdministrationIntegrationRead>("/administration/integrations", { method: "POST", token, bodyJson: payload });
}

export async function testAdministrationIntegration(token: string, integrationId: string): Promise<AdministrationIntegrationRead> {
  return request<AdministrationIntegrationRead>(`/administration/integrations/${integrationId}/test`, { method: "POST", token });
}

export async function disconnectAdministrationIntegration(token: string, integrationId: string): Promise<AdministrationIntegrationRead> {
  return request<AdministrationIntegrationRead>(`/administration/integrations/${integrationId}/disconnect`, { method: "POST", token });
}

export async function listAdministrationSystemSettings(token: string): Promise<AdministrationSystemSettingRead[]> {
  return request<AdministrationSystemSettingRead[]>("/administration/system-settings", { token });
}

export async function upsertAdministrationSystemSetting(token: string, payload: Record<string, unknown>): Promise<AdministrationSystemSettingRead> {
  return request<AdministrationSystemSettingRead>("/administration/system-settings", { method: "PUT", token, bodyJson: payload });
}

export async function listAdministrationFeatureFlags(token: string): Promise<AdministrationFeatureFlagRead[]> {
  return request<AdministrationFeatureFlagRead[]>("/administration/feature-flags", { token });
}

export async function upsertAdministrationFeatureFlag(token: string, payload: Record<string, unknown>): Promise<AdministrationFeatureFlagRead> {
  return request<AdministrationFeatureFlagRead>("/administration/feature-flags", { method: "PUT", token, bodyJson: payload });
}

export async function listAdministrationBackups(token: string): Promise<AdministrationBackupJobRead[]> {
  return request<AdministrationBackupJobRead[]>("/administration/backups", { token });
}

export async function createAdministrationBackup(token: string, payload: Record<string, unknown>): Promise<AdministrationBackupJobRead> {
  return request<AdministrationBackupJobRead>("/administration/backups", { method: "POST", token, bodyJson: payload });
}

export async function requestAdministrationRecovery(token: string, payload: Record<string, unknown>): Promise<unknown> {
  return request<unknown>("/administration/recoveries", { method: "POST", token, bodyJson: payload });
}

export async function listUsers(token: string): Promise<UserRead[]> {
  return request<UserRead[]>("/users", { token });
}

export async function createUser(token: string, payload: UserCreate): Promise<UserRead> {
  return request<UserRead>("/users", { method: "POST", token, bodyJson: payload });
}

export async function importUsers(token: string, file: File): Promise<UserImportResponse> {
  const body = new FormData();
  body.set("file", file);
  const response = await fetch(`${getApiBaseUrl()}/users/import`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, accept: "application/json" },
    body
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new ApiError(detail || response.statusText, response.status);
  }
  return response.json() as Promise<UserImportResponse>;
}

export async function updateUser(token: string, userId: string, payload: UserUpdate): Promise<UserRead> {
  return request<UserRead>(`/users/${userId}`, { method: "PATCH", token, bodyJson: payload });
}

export async function addUserRoleAssignment(token: string, userId: string, payload: UserRoleAssignmentCreate): Promise<UserRead> {
  return request<UserRead>(`/users/${userId}/role-assignments`, { method: "POST", token, bodyJson: payload });
}

export async function updateUserRoleAssignment(token: string, userId: string, assignmentId: string, payload: UserRoleAssignmentUpdate): Promise<UserRead> {
  return request<UserRead>(`/users/${userId}/role-assignments/${assignmentId}`, { method: "PATCH", token, bodyJson: payload });
}

export async function deactivateUserRoleAssignment(token: string, userId: string, assignmentId: string): Promise<UserRead> {
  return request<UserRead>(`/users/${userId}/role-assignments/${assignmentId}`, { method: "DELETE", token });
}

export async function resetUserPassword(token: string, userId: string): Promise<PasswordResetRead> {
  return request<PasswordResetRead>(`/users/${userId}/reset-password`, { method: "POST", token });
}

export async function listRoles(token: string): Promise<RoleRead[]> {
  return request<RoleRead[]>("/roles", { token });
}

export async function createRole(token: string, payload: RoleCreate): Promise<RoleRead> {
  return request<RoleRead>("/roles", { method: "POST", token, bodyJson: payload });
}

export async function getAccessCatalog(token: string): Promise<AccessCatalog> {
  return request<AccessCatalog>("/roles/catalog", { token });
}

export async function listOrganizationUnits(token: string): Promise<OrganizationUnitRead[]> {
  return request<OrganizationUnitRead[]>("/roles/organization-units", { token });
}

export async function importOrganizationUnits(token: string, file: File): Promise<OrganizationUnitImportResponse> {
  const body = new FormData();
  body.set("file", file);
  const response = await fetch(`${getApiBaseUrl()}/operations/units/import`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, accept: "application/json" },
    body
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new ApiError(detail || response.statusText, response.status);
  }
  return response.json() as Promise<OrganizationUnitImportResponse>;
}

export async function routeData(token: string, payload: DataRouteCreate): Promise<DataRouteRead> {
  return request<DataRouteRead>("/operations/data-routes", { method: "POST", token, bodyJson: payload });
}

export async function getGovernanceSummary(token: string): Promise<GovernanceSummary> {
  return request<GovernanceSummary>("/governance/summary", { token });
}

export async function listGovernancePolicies(token: string): Promise<GovernancePolicyRead[]> {
  return request<GovernancePolicyRead[]>("/governance/policies", { token });
}

export async function createGovernancePolicy(token: string, payload: {
  name: string;
  policy_type: string;
  lifecycle_state?: string;
  enforcement_level?: string;
  rules_json?: Record<string, unknown>;
}): Promise<GovernancePolicyRead> {
  return request<GovernancePolicyRead>("/governance/policies", { method: "POST", token, bodyJson: payload });
}

export async function listRetentionPolicies(token: string): Promise<RetentionPolicyRead[]> {
  return request<RetentionPolicyRead[]>("/governance/retention-policies", { token });
}

export async function createRetentionPolicy(token: string, payload: {
  record_type: string;
  retention_years: number;
  archive_after_days: number;
  legal_hold?: boolean;
  purge_allowed?: boolean;
  anonymize_on_export?: boolean;
}): Promise<RetentionPolicyRead> {
  return request<RetentionPolicyRead>("/governance/retention-policies", { method: "POST", token, bodyJson: payload });
}

export async function listValidationRules(token: string): Promise<ValidationRuleRead[]> {
  return request<ValidationRuleRead[]>("/governance/validation-rules", { token });
}

export async function createValidationRule(token: string, payload: {
  rule_code: string;
  name: string;
  target_entity: string;
  severity?: string;
  expression?: string;
}): Promise<ValidationRuleRead> {
  return request<ValidationRuleRead>("/governance/validation-rules", { method: "POST", token, bodyJson: payload });
}

export async function listDataVersions(token: string): Promise<DataVersionRead[]> {
  return request<DataVersionRead[]>("/governance/data-versions", { token });
}

export async function listLineageEvents(token: string): Promise<LineageEventRead[]> {
  return request<LineageEventRead[]>("/governance/lineage", { token });
}

export async function listExportLogs(token: string): Promise<ExportLogRead[]> {
  return request<ExportLogRead[]>("/governance/export-logs", { token });
}

export async function listConsentRecords(token: string): Promise<ConsentRecordRead[]> {
  return request<ConsentRecordRead[]>("/governance/consent-records", { token });
}

export async function governExport(token: string, payload: {
  dataset_type: string;
  export_format: string;
  anonymized?: boolean;
  record_count?: number;
  filters_json?: Record<string, unknown>;
}): Promise<ExportLogRead> {
  return request<ExportLogRead>("/governance/export-logs", { method: "POST", token, bodyJson: payload });
}

export async function listMasterDataEntries(token: string): Promise<MasterDataEntryRead[]> {
  return request<MasterDataEntryRead[]>("/governance/master-data", { token });
}

export async function listChoiceList(token: string, category: string): Promise<MasterDataEntryRead[]> {
  return request<MasterDataEntryRead[]>(`/governance/master-data/${encodeURIComponent(category)}`, { token });
}

export async function getOrganizationGovernanceSummary(token: string): Promise<OrganizationGovernanceSummary> {
  return request<OrganizationGovernanceSummary>("/organization-governance/summary", { token });
}

export async function getUsersTeamsSummary(token: string): Promise<UsersTeamsSummaryRead> {
  return request<UsersTeamsSummaryRead>("/users-teams/summary", { token });
}

export async function listUsersTeamsActivityLogs(token: string, limit = 100): Promise<UsersTeamsActivityLogRead[]> {
  return request<UsersTeamsActivityLogRead[]>(`/users-teams/activity-logs?limit=${limit}`, { token });
}

export async function listDepartments(token: string): Promise<DepartmentRead[]> {
  return request<DepartmentRead[]>("/organization-governance/departments", { token });
}

export async function createDepartment(token: string, payload: {
  name: string;
  code: string;
  department_type?: string;
  manager_user_id?: string | null;
}): Promise<DepartmentRead> {
  return request<DepartmentRead>("/organization-governance/departments", { method: "POST", token, bodyJson: payload });
}

export async function listTeams(token: string): Promise<TeamRead[]> {
  return request<TeamRead[]>("/organization-governance/teams", { token });
}

export async function createTeam(token: string, payload: {
  name: string;
  code: string;
  team_type?: string;
  department_id?: string | null;
  organization_unit_id?: string | null;
  manager_user_id?: string | null;
  region?: string | null;
  project_id?: string | null;
}): Promise<TeamRead> {
  return request<TeamRead>("/organization-governance/teams", { method: "POST", token, bodyJson: payload });
}

export async function updateTeam(token: string, teamId: string, payload: {
  name?: string;
  code?: string;
  team_type?: string;
  department_id?: string | null;
  organization_unit_id?: string | null;
  manager_user_id?: string | null;
  region?: string | null;
  project_id?: string | null;
  is_active?: boolean;
}): Promise<TeamRead> {
  return request<TeamRead>(`/organization-governance/teams/${teamId}`, { method: "PATCH", token, bodyJson: payload });
}

export async function listWorkforceProfiles(token: string): Promise<WorkforceProfileRead[]> {
  return request<WorkforceProfileRead[]>("/organization-governance/workforce-profiles", { token });
}

export async function createWorkforceProfile(token: string, payload: {
  user_id: string;
  employee_code?: string | null;
  job_title?: string;
  department_id?: string | null;
  team_id?: string | null;
  supervisor_user_id?: string | null;
  lifecycle_status?: string;
  clearance_level?: string;
}): Promise<WorkforceProfileRead> {
  return request<WorkforceProfileRead>("/organization-governance/workforce-profiles", { method: "POST", token, bodyJson: payload });
}

export async function listDelegations(token: string): Promise<DelegationRead[]> {
  return request<DelegationRead[]>("/organization-governance/delegations", { token });
}

export async function createDelegation(token: string, payload: {
  delegate_user_id: string;
  permission: string;
  scope_type?: string;
  geography_id?: string | null;
  project_id?: string | null;
  starts_at: string;
  expires_at: string;
  reason?: string | null;
}): Promise<DelegationRead> {
  return request<DelegationRead>("/organization-governance/delegations", { method: "POST", token, bodyJson: payload });
}

export async function listApprovalMatrices(token: string): Promise<ApprovalMatrixRead[]> {
  return request<ApprovalMatrixRead[]>("/organization-governance/approval-matrices", { token });
}

export async function createApprovalMatrix(token: string, payload: {
  matrix_code: string;
  workflow_type?: string;
  threshold_type?: string;
  threshold_value?: number;
  required_role: string;
  approval_stage?: string;
  escalation_role?: string | null;
  sla_hours?: number;
  conditions_json?: Record<string, unknown>;
}): Promise<ApprovalMatrixRead> {
  return request<ApprovalMatrixRead>("/organization-governance/approval-matrices", { method: "POST", token, bodyJson: payload });
}

export async function listAccessRequests(token: string): Promise<AccessRequestRead[]> {
  return request<AccessRequestRead[]>("/organization-governance/access-requests", { token });
}

export async function createAccessRequest(token: string, payload: {
  requested_permission: string;
  requested_scope_type?: string;
  geography_id?: string | null;
  project_id?: string | null;
  reason?: string;
  expires_at?: string | null;
}): Promise<AccessRequestRead> {
  return request<AccessRequestRead>("/organization-governance/access-requests", { method: "POST", token, bodyJson: payload });
}

export async function reviewAccessRequest(token: string, requestId: string, decision: "approved" | "rejected"): Promise<AccessRequestRead> {
  return request<AccessRequestRead>(`/organization-governance/access-requests/${requestId}/review`, {
    method: "POST",
    token,
    bodyJson: { decision }
  });
}

export async function listClearanceLevels(token: string): Promise<ClearanceLevelRead[]> {
  return request<ClearanceLevelRead[]>("/organization-governance/clearance-levels", { token });
}

export async function createClearanceLevel(token: string, payload: {
  code: string;
  label: string;
  rank?: number;
  allowed_data_classes?: string[];
  requires_mfa?: boolean;
}): Promise<ClearanceLevelRead> {
  return request<ClearanceLevelRead>("/organization-governance/clearance-levels", { method: "POST", token, bodyJson: payload });
}

export async function listOperationalZones(token: string): Promise<OperationalZoneRead[]> {
  return request<OperationalZoneRead[]>("/organization-governance/zones", { token });
}

export async function createOperationalZone(token: string, payload: {
  code: string;
  name: string;
  zone_type?: string;
  parent_zone_id?: string | null;
  geography_id?: string | null;
  boundary_json?: Record<string, unknown>;
}): Promise<OperationalZoneRead> {
  return request<OperationalZoneRead>("/organization-governance/zones", { method: "POST", token, bodyJson: payload });
}

export async function listDevices(token: string): Promise<DeviceRead[]> {
  return request<DeviceRead[]>("/organization-governance/devices", { token });
}

export async function createDevice(token: string, payload: {
  device_id: string;
  user_id?: string | null;
  device_type?: string;
  label?: string;
  status?: string;
  metadata_json?: Record<string, unknown>;
}): Promise<DeviceRead> {
  return request<DeviceRead>("/organization-governance/devices", { method: "POST", token, bodyJson: payload });
}

export async function listSessionLogs(token: string): Promise<SessionLogRead[]> {
  return request<SessionLogRead[]>("/organization-governance/sessions", { token });
}

export async function simulateAccess(token: string, payload: {
  user_id: string;
  permission: string;
  geography_id?: string | null;
  project_id?: string | null;
  organization_unit_id?: string | null;
  workflow_stage?: string | null;
}): Promise<AccessSimulationRead> {
  return request<AccessSimulationRead>("/organization-governance/simulate-access", { method: "POST", token, bodyJson: payload });
}

export async function listFieldOfficers(token: string): Promise<FieldOfficerRead[]> {
  return request<FieldOfficerRead[]>("/field-officers", { token });
}

export async function getFieldOfficerProfile(token: string, fieldOfficerId: string): Promise<FieldOfficerProfileDetailRead> {
  return request<FieldOfficerProfileDetailRead>(`/field-officers/${fieldOfficerId}`, { token });
}

export async function updateFieldOfficerProfile(
  token: string,
  fieldOfficerId: string,
  payload: FieldOfficerProfileUpdate,
): Promise<FieldOfficerProfileDetailRead> {
  return request<FieldOfficerProfileDetailRead>(`/field-officers/${fieldOfficerId}/profile`, {
    method: "PATCH",
    token,
    bodyJson: payload,
  });
}

export async function inviteFieldOfficer(token: string, payload: FieldOfficerInvite): Promise<FieldOfficerRead> {
  return request<FieldOfficerRead>("/field-officers", { method: "POST", token, bodyJson: payload });
}

export async function createFieldOfficerAssignment(
  token: string,
  payload: FieldOfficerAssignmentCreate,
): Promise<FieldOfficerAssignmentRead> {
  return request<FieldOfficerAssignmentRead>("/field-officers/assignments", { method: "POST", token, bodyJson: payload });
}

export type FieldWorkAssignmentRead = {
  id: string;
  project_id: string;
  form_id: string | null;
  created_by_user_id: string;
  supervisor_user_id: string | null;
  name: string;
  description: string | null;
  assignment_type: string;
  officer_ids: string[];
  assigned_entity_ids: string[];
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  target_count: number;
  completed_count: number;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type FieldWorkAssignmentCreate = {
  project_id: string;
  form_id?: string | null;
  supervisor_user_id?: string | null;
  name: string;
  description?: string | null;
  assignment_type?: string;
  officer_ids?: string[];
  assigned_entity_ids?: string[];
  location?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  target_count?: number;
  priority?: string;
};

export type FieldWorkAssignmentUpdate = Partial<Omit<FieldWorkAssignmentCreate, "project_id">> & {
  completed_count?: number;
};

export async function listFieldWorkAssignments(token: string): Promise<FieldWorkAssignmentRead[]> {
  return request<FieldWorkAssignmentRead[]>("/field-officers/work-assignments/all", { token });
}

export async function createFieldWorkAssignment(
  token: string,
  payload: FieldWorkAssignmentCreate,
): Promise<FieldWorkAssignmentRead> {
  return request<FieldWorkAssignmentRead>("/field-officers/work-assignments", { method: "POST", token, bodyJson: payload });
}

export async function updateFieldWorkAssignment(
  token: string,
  assignmentId: string,
  payload: FieldWorkAssignmentUpdate,
): Promise<FieldWorkAssignmentRead> {
  return request<FieldWorkAssignmentRead>(`/field-officers/work-assignments/${assignmentId}`, {
    method: "PATCH",
    token,
    bodyJson: payload,
  });
}

export async function setFieldWorkAssignmentStatus(
  token: string,
  assignmentId: string,
  status: string,
  reason?: string,
): Promise<FieldWorkAssignmentRead> {
  return request<FieldWorkAssignmentRead>(`/field-officers/work-assignments/${assignmentId}/status`, {
    method: "POST",
    token,
    bodyJson: { status, reason: reason ?? null },
  });
}

export type FieldWorkPlanRead = {
  id: string;
  created_by_user_id: string;
  name: string;
  project: string | null;
  objectives: string | null;
  locations: string[];
  assigned_teams: string[];
  deliverables: string[];
  start_date: string | null;
  end_date: string | null;
  progress: number;
  view: string;
  created_at: string;
  updated_at: string;
};

export type FieldWorkPlanCreate = {
  name: string;
  project?: string | null;
  objectives?: string | null;
  locations?: string[];
  assigned_teams?: string[];
  deliverables?: string[];
  start_date?: string | null;
  end_date?: string | null;
  view?: string;
};

export type OperationalTargetRecordRead = {
  id: string;
  created_by_user_id: string;
  name: string;
  target_type: string;
  project: string | null;
  indicator: string | null;
  indicator_id: string | null;
  team: string | null;
  assigned_staff: string[];
  target_value: number;
  achieved_value: number;
  achieved_source: string;
  deadline: string | null;
  created_at: string;
  updated_at: string;
};

export type OperationalTargetRecordCreate = {
  name: string;
  target_type?: string;
  project?: string | null;
  indicator?: string | null;
  indicator_id?: string | null;
  team?: string | null;
  assigned_staff?: string[];
  target_value?: number;
  deadline?: string | null;
};

export async function listFieldWorkPlans(token: string): Promise<FieldWorkPlanRead[]> {
  return request<FieldWorkPlanRead[]>("/operations/work-plans", { token });
}

export async function createFieldWorkPlan(
  token: string,
  payload: FieldWorkPlanCreate,
): Promise<FieldWorkPlanRead> {
  return request<FieldWorkPlanRead>("/operations/work-plans", { method: "POST", token, bodyJson: payload });
}

export async function listOperationalTargets(token: string): Promise<OperationalTargetRecordRead[]> {
  return request<OperationalTargetRecordRead[]>("/operations/targets", { token });
}

export async function createOperationalTarget(
  token: string,
  payload: OperationalTargetRecordCreate,
): Promise<OperationalTargetRecordRead> {
  return request<OperationalTargetRecordRead>("/operations/targets", { method: "POST", token, bodyJson: payload });
}

export async function updateOperationalTarget(
  token: string,
  targetId: string,
  payload: Partial<OperationalTargetRecordCreate> & { achieved_value?: number },
): Promise<OperationalTargetRecordRead> {
  return request<OperationalTargetRecordRead>(`/operations/targets/${targetId}`, {
    method: "PATCH",
    token,
    bodyJson: payload,
  });
}

export async function listFieldVisitRequests(token: string, status?: string): Promise<FieldVisitRequestRead[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return request<FieldVisitRequestRead[]>(`/operations/operational-activities${query}`, { token });
}

export async function getOperationalActivityReport(
  token: string,
  reportType: OperationalActivityReportType,
  periodStart?: string | null,
  periodEnd?: string | null,
): Promise<OperationalActivityReportRead> {
  const params = new URLSearchParams();
  if (periodStart) params.set("period_start", periodStart);
  if (periodEnd) params.set("period_end", periodEnd);
  const query = params.toString();
  return request<OperationalActivityReportRead>(
    `/operations/operational-activities/reports/${reportType}${query ? `?${query}` : ""}`,
    { token },
  );
}

export async function reviewFieldVisitRequest(
  token: string,
  visitRequestId: string,
  payload: FieldVisitRequestReview,
): Promise<FieldVisitRequestRead> {
  return request<FieldVisitRequestRead>(`/operations/operational-activities/${visitRequestId}/review`, {
    method: "POST",
    token,
    bodyJson: payload,
  });
}

export async function reviewOperationalActivityOutcome(
  token: string,
  visitRequestId: string,
  payload: FieldVisitOutcomeReview,
): Promise<FieldVisitRequestRead> {
  return request<FieldVisitRequestRead>(`/operations/operational-activities/${visitRequestId}/outcome-review`, {
    method: "POST",
    token,
    bodyJson: payload,
  });
}

export async function importFieldOfficers(token: string, file: File): Promise<FieldOfficerImportResponse> {
  const body = new FormData();
  body.set("file", file);
  const response = await fetch(`${getApiBaseUrl()}/field-officers/import`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, accept: "application/json" },
    body
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new ApiError(detail || response.statusText, response.status);
  }
  return response.json() as Promise<FieldOfficerImportResponse>;
}

export async function listSubmissions(token: string, status?: string): Promise<SubmissionRead[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return request<SubmissionRead[]>(`/submissions${query}`, { token });
}

export type CorrectionLogEntryRead = {
  submission_id: string;
  submission_key: string;
  corrected_field: string;
  old_value: unknown;
  new_value: unknown;
  corrected_by: string | null;
  corrected_at: string;
  reason: string | null;
  change_type: string;
  review_comment: string | null;
};

export async function listSubmissionCorrections(token: string, submissionId: string): Promise<CorrectionLogEntryRead[]> {
  return request<CorrectionLogEntryRead[]>(`/submissions/${submissionId}/corrections`, { token });
}

export type SubmissionHistoryRead = {
  id: string;
  from_status: string | null;
  to_status: string;
  actor_user_id: string;
  actor_name: string | null;
  comment: string | null;
  created_at: string;
};

export async function listSubmissionHistory(token: string, submissionId: string): Promise<SubmissionHistoryRead[]> {
  return request<SubmissionHistoryRead[]>(`/submissions/${submissionId}/history`, { token });
}

export type SubmissionRepeatRowRead = {
  id: string;
  submission_id: string;
  parent_submission_key: string;
  field_id: string;
  row_index: number;
  row_json: Record<string, unknown>;
};

export async function listSubmissionRepeatRows(token: string, submissionId: string): Promise<SubmissionRepeatRowRead[]> {
  return request<SubmissionRepeatRowRead[]>(`/submissions/${submissionId}/repeat-groups`, { token });
}

export async function listFormRepeatRows(token: string, formId: string): Promise<SubmissionRepeatRowRead[]> {
  return request<SubmissionRepeatRowRead[]>(`/submissions/by-form/${formId}/repeat-groups`, { token });
}

export async function listImportCleaningRows(token: string): Promise<ImportCleaningRowRead[]> {
  return request<ImportCleaningRowRead[]>("/submissions/import-cleaning", { token });
}

export async function bulkUpdateImportCleaningRows(
  token: string,
  payload: { rows: { submission_id: string; responses: Record<string, unknown> }[]; reason: string },
): Promise<ImportCleaningBulkUpdateResponse> {
  return request<ImportCleaningBulkUpdateResponse>("/submissions/import-cleaning/bulk-responses", {
    method: "PATCH",
    token,
    bodyJson: payload,
  });
}

export async function reviewSubmission(
  token: string,
  submissionId: string,
  payload: { action: "approve" | "reject" | "request_correction" | "start_review" | "archive"; comment: string }
): Promise<SubmissionRead> {
  return request<SubmissionRead>(`/submissions/${submissionId}/review`, {
    method: "POST",
    token,
    bodyJson: payload
  });
}

export async function updateSubmissionResponses(
  token: string,
  submissionId: string,
  payload: SubmissionResponsesUpdate
): Promise<SubmissionRead> {
  return request<SubmissionRead>(`/submissions/${submissionId}/responses`, {
    method: "PATCH",
    token,
    bodyJson: payload
  });
}

export async function getOperationsSummary(token: string): Promise<OperationsSummary> {
  return request<OperationsSummary>("/operations/summary", { token });
}

export async function getOperationalEcosystem(token: string): Promise<OperationalEcosystemRead> {
  return request<OperationalEcosystemRead>("/operations/ecosystem", { token });
}

export async function listBeneficiaries(token: string): Promise<BeneficiaryRead[]> {
  return request<BeneficiaryRead[]>("/operations/beneficiaries", { token });
}

export async function listPredefinedEntityCategories(token: string, sector?: string): Promise<PredefinedEntityCategoryRead[]> {
  const query = sector ? `?sector=${encodeURIComponent(sector)}` : "";
  return request<PredefinedEntityCategoryRead[]>(`/operations/entity-categories/library${query}`, { token });
}

export async function listEntityCategories(
  token: string,
  filters: { project_id?: string; include_archived?: boolean } = {},
): Promise<EntityCategoryRead[]> {
  const params = new URLSearchParams();
  if (filters.project_id) params.set("project_id", filters.project_id);
  if (filters.include_archived) params.set("include_archived", "true");
  const query = params.toString() ? `?${params.toString()}` : "";
  return request<EntityCategoryRead[]>(`/operations/entity-categories${query}`, { token });
}

export async function createEntityCategory(token: string, payload: EntityCategoryCreate): Promise<EntityCategoryRead> {
  return request<EntityCategoryRead>("/operations/entity-categories", { method: "POST", token, bodyJson: payload });
}

export async function activatePredefinedEntityCategory(
  token: string,
  projectId: string,
  slug: string,
): Promise<EntityCategoryRead> {
  return request<EntityCategoryRead>(
    `/operations/entity-categories/activate-predefined?project_id=${encodeURIComponent(projectId)}&slug=${encodeURIComponent(slug)}`,
    { method: "POST", token },
  );
}

export async function updateEntityCategory(
  token: string,
  categoryId: string,
  payload: Partial<EntityCategoryCreate>,
): Promise<EntityCategoryRead> {
  return request<EntityCategoryRead>(`/operations/entity-categories/${categoryId}`, { method: "PATCH", token, bodyJson: payload });
}

export type BeneficiaryUpdate = {
  reason: string;
  display_name?: string;
  sex?: string | null;
  birth_year?: number | null;
  phone_number?: string | null;
  region?: string | null;
  district?: string | null;
  community?: string | null;
  enrollment_status?: string;
  vulnerability_score?: number;
  latitude?: number | null;
  longitude?: number | null;
};

export async function updateBeneficiary(
  token: string,
  beneficiaryId: string,
  payload: BeneficiaryUpdate,
): Promise<BeneficiaryRead> {
  return request<BeneficiaryRead>(`/operations/beneficiaries/${beneficiaryId}`, {
    method: "PATCH",
    token,
    bodyJson: payload,
  });
}

export async function createBeneficiary(token: string, payload: BeneficiaryCreate): Promise<BeneficiaryRead> {
  return request<BeneficiaryRead>("/operations/beneficiaries", { method: "POST", token, bodyJson: payload });
}

export async function searchEntities(token: string, query: string): Promise<BeneficiaryRead[]> {
  return request<BeneficiaryRead[]>(`/operations/beneficiaries/search?q=${encodeURIComponent(query)}`, { token });
}

export async function checkEntityDuplicates(token: string, payload: DuplicateCheckRequest): Promise<DuplicateCandidateRead[]> {
  return request<DuplicateCandidateRead[]>("/operations/beneficiaries/duplicate-check", { method: "POST", token, bodyJson: payload });
}

export async function mergeBeneficiaries(token: string, payload: BeneficiaryMergeRequest): Promise<BeneficiaryMergeRead> {
  return request<BeneficiaryMergeRead>("/operations/beneficiaries/merge", { method: "POST", token, bodyJson: payload });
}

export async function listDataQualitySignals(
  token: string,
  filters: { status?: string; signal_type?: string } = {},
): Promise<DataQualitySignalRead[]> {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.signal_type) params.set("signal_type", filters.signal_type);
  const query = params.toString() ? `?${params.toString()}` : "";
  return request<DataQualitySignalRead[]>(`/operations/data-quality/signals${query}`, { token });
}

export async function updateDataQualitySignal(
  token: string,
  signalId: string,
  payload: { status: "open" | "assigned" | "under_investigation" | "resolved" | "closed"; comment?: string | null },
): Promise<DataQualitySignalRead> {
  return request<DataQualitySignalRead>(`/operations/data-quality/signals/${signalId}`, { method: "PATCH", token, bodyJson: payload });
}

export async function getProjectEntities(token: string, projectId: string): Promise<BeneficiaryRead[]> {
  return request<BeneficiaryRead[]>(`/projects/${projectId}/beneficiaries`, { token });
}

export async function getEntityPrefillData(token: string, entityId: string, formId: string): Promise<EntityPrefillRead> {
  return request<EntityPrefillRead>(`/operations/beneficiaries/${entityId}/prefill?form_id=${encodeURIComponent(formId)}`, { token });
}

export async function validateEntityFrequencyRule(token: string, payload: FrequencyValidationRequest): Promise<FrequencyValidationRead> {
  return request<FrequencyValidationRead>("/submissions/entity-frequency/validate", { method: "POST", token, bodyJson: payload });
}

export async function getAssignedEntitiesForMobile(token: string): Promise<BeneficiaryRead[]> {
  return request<BeneficiaryRead[]>("/operations/mobile/assigned-entities", { token });
}

export async function getMobileSyncPackage(token: string): Promise<MobileSyncPackageRead> {
  return request<MobileSyncPackageRead>("/operations/mobile/sync-package", { token });
}

export async function listPrograms(token: string): Promise<ProgramRead[]> {
  return request<ProgramRead[]>("/operations/programs", { token });
}

export async function getProjectsSummary(token: string): Promise<ProjectSummaryRead> {
  return request<ProjectSummaryRead>("/projects/summary", { token });
}

export async function listProjects(token: string): Promise<ProjectListItemRead[]> {
  return request<ProjectListItemRead[]>("/projects", { token });
}

export async function createProject(token: string, payload: ProjectCreate): Promise<ProjectListItemRead> {
  return request<ProjectListItemRead>("/projects", { method: "POST", token, bodyJson: payload });
}

export async function updateProject(token: string, projectId: string, payload: ProjectUpdate): Promise<ProjectListItemRead> {
  return request<ProjectListItemRead>(`/projects/${projectId}`, { method: "PATCH", token, bodyJson: payload });
}

export async function getProjectDetail(token: string, projectId: string): Promise<ProjectDetailRead> {
  return request<ProjectDetailRead>(`/projects/${projectId}`, { token });
}

export async function listProjectImportJobs(token: string, projectId: string): Promise<ImportJobRead[]> {
  return request<ImportJobRead[]>(`/projects/${projectId}/data-imports`, { token });
}

export async function listProjectTemplates(token: string): Promise<ProjectTemplateRead[]> {
  return request<ProjectTemplateRead[]>("/projects/templates", { token });
}

export async function listProjectSectorPacks(token: string): Promise<ProjectSectorPackRead[]> {
  return request<ProjectSectorPackRead[]>("/projects/sector-packs", { token });
}

export async function installProjectSectorForms(token: string, projectId: string): Promise<ProjectSectorInstallRead> {
  return request<ProjectSectorInstallRead>(`/projects/${projectId}/sector-pack/install-forms`, { method: "POST", token });
}

export async function installProjectSectorIndicators(token: string, projectId: string): Promise<ProjectSectorInstallRead> {
  return request<ProjectSectorInstallRead>(`/projects/${projectId}/sector-pack/install-indicators`, { method: "POST", token });
}

export async function installProjectSectorReports(token: string, projectId: string): Promise<ProjectSectorInstallRead> {
  return request<ProjectSectorInstallRead>(`/projects/${projectId}/sector-pack/install-reports`, { method: "POST", token });
}

export async function listSurveys(token: string, projectId?: string): Promise<SurveyRead[]> {
  const query = projectId ? `?project_id=${encodeURIComponent(projectId)}` : "";
  return request<SurveyRead[]>(`/surveys${query}`, { token });
}

export async function createSurvey(token: string, payload: SurveyCreate): Promise<SurveyRead> {
  return request<SurveyRead>("/surveys", { method: "POST", token, bodyJson: payload });
}

export async function updateSurveyGovernance(
  token: string,
  surveyId: string,
  payload: SurveyGovernanceSettings
): Promise<SurveyRead> {
  return request<SurveyRead>(`/surveys/${surveyId}/governance`, { method: "PATCH", token, bodyJson: payload });
}

export async function listSurveyTeam(token: string, surveyId: string): Promise<SurveyTeamMemberRead[]> {
  return request<SurveyTeamMemberRead[]>(`/surveys/${surveyId}/team`, { token });
}

export async function addSurveyTeamMember(
  token: string,
  surveyId: string,
  payload: SurveyTeamMemberCreate
): Promise<SurveyTeamMemberRead> {
  return request<SurveyTeamMemberRead>(`/surveys/${surveyId}/team`, { method: "POST", token, bodyJson: payload });
}

export async function listIndicators(token: string): Promise<IndicatorRead[]> {
  return request<IndicatorRead[]>("/operations/indicators", { token });
}

export type IndicatorUpdate = {
  name?: string;
  description?: string | null;
  unit?: string;
  reporting_frequency?: string;
  baseline_value?: number;
  target_value?: number;
  current_value?: number;
  sdg_code?: string | null;
  formula?: string | null;
  category?: string | null;
  disaggregation_fields?: string[];
  is_active?: boolean;
};

export async function updateIndicator(
  token: string,
  indicatorId: string,
  payload: IndicatorUpdate,
): Promise<IndicatorRead> {
  return request<IndicatorRead>(`/operations/indicators/${indicatorId}`, {
    method: "PATCH",
    token,
    bodyJson: payload,
  });
}

export async function createIndicator(token: string, payload: IndicatorCreate): Promise<IndicatorRead> {
  return request<IndicatorRead>("/operations/indicators", { method: "POST", token, bodyJson: payload });
}

export async function getIndicatorDisaggregation(token: string, indicatorId: string): Promise<IndicatorDisaggregationsRead> {
  return request<IndicatorDisaggregationsRead>(`/operations/indicators/${indicatorId}/disaggregation`, { token });
}

export async function getIndicatorLinkedSubmissions(token: string, indicatorId: string): Promise<IndicatorLinkedSubmissionsRead> {
  return request<IndicatorLinkedSubmissionsRead>(`/operations/indicators/${indicatorId}/linked-submissions`, { token });
}

export async function listCases(token: string): Promise<CaseRead[]> {
  return request<CaseRead[]>("/operations/cases", { token });
}

export async function listReports(token: string): Promise<DonorReportRead[]> {
  return request<DonorReportRead[]>("/operations/reports", { token });
}

export type DonorReportCreate = {
  name: string;
  project_id?: string | null;
  survey_id?: string | null;
  donor?: string | null;
  report_type?: string;
  period_start?: string | null;
  period_end?: string | null;
  summary?: string | null;
  export_formats?: string[];
};

export async function createReport(token: string, payload: DonorReportCreate): Promise<DonorReportRead> {
  return request<DonorReportRead>("/operations/reports", { method: "POST", token, bodyJson: payload });
}

export async function generateReport(token: string, reportId: string): Promise<DonorReportRead> {
  return request<DonorReportRead>(`/operations/reports/${reportId}/generate`, { method: "POST", token });
}

export async function exportReportCsv(token: string, reportId: string): Promise<string> {
  const response = await fetch(`${getApiBaseUrl()}/operations/reports/${reportId}/export.csv`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new ApiError(detail || response.statusText, response.status);
  }
  return response.text();
}

export type ReportScheduleRead = {
  id: string;
  report_id: string;
  report_name: string | null;
  frequency: string;
  hour: number;
  timezone: string;
  recipients: string[];
  export_format: string;
  status: string;
  next_run_at: string;
  last_run_at: string | null;
  last_status: string | null;
  failure_log: string | null;
};

export type ReportScheduleCreate = {
  report_id: string;
  frequency: string;
  hour: number;
  timezone?: string;
  recipients?: string[];
  export_format?: string;
};

export async function listReportSchedules(token: string): Promise<ReportScheduleRead[]> {
  return request<ReportScheduleRead[]>("/operations/report-schedules", { token });
}

export async function createReportSchedule(token: string, payload: ReportScheduleCreate): Promise<ReportScheduleRead> {
  return request<ReportScheduleRead>("/operations/report-schedules", { method: "POST", token, bodyJson: payload });
}

export async function runReportSchedule(token: string, scheduleId: string): Promise<ReportScheduleRead> {
  return request<ReportScheduleRead>(`/operations/report-schedules/${scheduleId}/run`, { method: "POST", token });
}

export async function updateReportScheduleStatus(
  token: string,
  scheduleId: string,
  status: "active" | "paused",
): Promise<ReportScheduleRead> {
  return request<ReportScheduleRead>(`/operations/report-schedules/${scheduleId}/status`, {
    method: "PATCH",
    token,
    bodyJson: { status },
  });
}

export async function deleteReportSchedule(token: string, scheduleId: string): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/operations/report-schedules/${scheduleId}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new ApiError(detail || response.statusText, response.status);
  }
}

export type DashboardWidget = {
  id: string;
  type: "kpi" | "bar_chart" | "pie_chart" | "line_chart" | "table" | "progress" | "map_link";
  title: string;
  data_source: "indicators" | "form_performance" | "submissions" | "data_quality" | "donor_report";
  reference_id?: string | null;
  metric?: string | null;
  width: 1 | 2 | 3;
};

export type CustomDashboardRead = {
  id: string;
  organization_id: string;
  project_id: string | null;
  created_by_user_id: string | null;
  name: string;
  description: string | null;
  dashboard_type: string;
  visibility: string;
  status: "draft" | "active" | "archived";
  widgets: DashboardWidget[];
  created_at: string;
  updated_at: string;
};

export type CustomDashboardCreate = {
  name: string;
  description?: string | null;
  dashboard_type?: string;
  project_id?: string | null;
  visibility?: string;
  status?: "draft" | "active" | "archived";
  widgets?: DashboardWidget[];
};

export type CustomDashboardUpdate = Partial<CustomDashboardCreate>;

export async function listCustomDashboards(token: string): Promise<CustomDashboardRead[]> {
  return request<CustomDashboardRead[]>("/operations/dashboards", { token });
}

export async function createCustomDashboard(token: string, payload: CustomDashboardCreate): Promise<CustomDashboardRead> {
  return request<CustomDashboardRead>("/operations/dashboards", { method: "POST", token, bodyJson: payload });
}

export async function updateCustomDashboard(token: string, dashboardId: string, payload: CustomDashboardUpdate): Promise<CustomDashboardRead> {
  return request<CustomDashboardRead>(`/operations/dashboards/${dashboardId}`, { method: "PATCH", token, bodyJson: payload });
}

export async function deleteCustomDashboard(token: string, dashboardId: string): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/operations/dashboards/${dashboardId}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new ApiError(detail || response.statusText, response.status);
  }
}

export async function previewImport(token: string, payload: ImportPreviewRequest): Promise<ImportPreviewResponse> {
  return request<ImportPreviewResponse>("/operations/data/imports/preview", { method: "POST", token, bodyJson: payload });
}

export async function analyzeImport(token: string, payload: ImportAnalysisRequest): Promise<ImportAnalysisResponse> {
  return request<ImportAnalysisResponse>("/operations/data/imports/analyze", { method: "POST", token, bodyJson: payload });
}

export async function getImportMigrationOverview(token: string): Promise<ImportMigrationOverviewRead> {
  return request<ImportMigrationOverviewRead>("/operations/data/migration/overview", { token });
}

export async function listImportSupportedSources(token: string): Promise<ImportSupportedSourceRead[]> {
  return request<ImportSupportedSourceRead[]>("/operations/data/migration/sources", { token });
}

export async function createImportJob(token: string, payload: ImportJobCreate): Promise<ImportJobRead> {
  return request<ImportJobRead>("/operations/data/imports", { method: "POST", token, bodyJson: payload });
}

export async function listImportJobs(token: string): Promise<ImportJobRead[]> {
  return request<ImportJobRead[]>("/operations/data/imports", { token });
}

export async function uploadImportFile(
  token: string,
  datasetType: string,
  file: File,
  options?: {
    importReason?: string | null;
    sourceSystem?: string;
    targetMode?: string;
    targetProjectId?: string | null;
  }
): Promise<ImportUploadResponse> {
  const body = new FormData();
  body.set("dataset_type", datasetType);
  body.set("file", file);
  if (options?.targetProjectId) body.set("target_project_id", options.targetProjectId);
  if (options?.targetMode) body.set("target_mode", options.targetMode);
  if (options?.sourceSystem) body.set("source_system", options.sourceSystem);
  if (options?.importReason) body.set("import_reason", options.importReason);
  const response = await fetch(`${getApiBaseUrl()}/operations/data/imports/upload`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, accept: "application/json" },
    body
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new ApiError(detail || response.statusText, response.status);
  }
  return response.json() as Promise<ImportUploadResponse>;
}

export async function listImportRows(token: string, importJobId: string): Promise<ImportRowRead[]> {
  return request<ImportRowRead[]>(`/operations/data/imports/${importJobId}/rows`, { token });
}

export async function updateImportRow(
  token: string,
  importJobId: string,
  rowId: string,
  payload: { changes: Record<string, unknown>; expected_version?: number }
): Promise<ImportRowRead> {
  return request<ImportRowRead>(`/operations/data/imports/${importJobId}/rows/${rowId}`, { method: "PATCH", token, bodyJson: payload });
}

export async function applyImportJob(token: string, importJobId: string): Promise<ImportApplyResponse> {
  return request<ImportApplyResponse>(`/operations/data/imports/${importJobId}/apply`, { method: "POST", token });
}

export async function confirmImportJob(
  token: string,
  importJobId: string,
  payload: { acknowledge_warnings?: boolean; reason: string }
): Promise<ImportApplyResponse> {
  return request<ImportApplyResponse>(`/operations/data/imports/${importJobId}/confirm`, { method: "POST", token, bodyJson: payload });
}

export async function rollbackImportJob(
  token: string,
  importJobId: string,
  payload: { confirm: boolean; reason: string }
): Promise<ImportRollbackRead> {
  return request<ImportRollbackRead>(`/operations/data/imports/${importJobId}/rollback`, { method: "POST", token, bodyJson: payload });
}

export async function getImportErrorReport(token: string, importJobId: string): Promise<ImportErrorReportRead> {
  return request<ImportErrorReportRead>(`/operations/data/imports/${importJobId}/error-report`, { token });
}

export async function createExportJob(token: string, payload: ExportJobCreate): Promise<ExportJobRead> {
  return request<ExportJobRead>("/operations/data/exports", { method: "POST", token, bodyJson: payload });
}

export async function listPublicCollectionLinks(token: string): Promise<PublicCollectionLinkRead[]> {
  return request<PublicCollectionLinkRead[]>("/operations/data/public-links", { token });
}

export async function createPublicCollectionLink(token: string, payload: PublicCollectionLinkCreate): Promise<PublicCollectionLinkRead> {
  return request<PublicCollectionLinkRead>("/operations/data/public-links", { method: "POST", token, bodyJson: payload });
}

export async function listMediaEvidence(token: string): Promise<MediaEvidenceRead[]> {
  return request<MediaEvidenceRead[]>("/operations/data/media-evidence", { token });
}

export async function createMediaEvidence(token: string, payload: MediaEvidenceCreate): Promise<MediaEvidenceRead> {
  return request<MediaEvidenceRead>("/operations/data/media-evidence", { method: "POST", token, bodyJson: payload });
}

export async function listActivityMediaEvidence(token: string, activityId: string): Promise<MediaEvidenceRead[]> {
  return request<MediaEvidenceRead[]>(`/operations/operational-activities/${activityId}/media-evidence`, { token });
}

export async function createActivityMediaEvidence(
  token: string,
  activityId: string,
  payload: MediaEvidenceCreate,
): Promise<MediaEvidenceRead> {
  return request<MediaEvidenceRead>(`/operations/operational-activities/${activityId}/media-evidence`, {
    method: "POST",
    token,
    bodyJson: payload,
  });
}

export async function listForms(token: string): Promise<DataFormRead[]> {
  return request<DataFormRead[]>("/forms", { token });
}

export async function getFormSchema(token: string, formId: string): Promise<DataFormSchemaRead> {
  return request<DataFormSchemaRead>(`/forms/${formId}/schema`, { token });
}

export async function importFormDataRows(
  token: string,
  formId: string,
  payload: {
    rows: Record<string, unknown>[];
    source_name?: string;
    source_system?: string;
    import_reason?: string | null;
  },
): Promise<FormDataImportResponse> {
  return request<FormDataImportResponse>(`/forms/${formId}/data-import`, {
    method: "POST",
    token,
    bodyJson: payload,
  });
}

export async function confirmImportedFormDataRows(
  token: string,
  formId: string,
  payload: { submission_ids: string[]; comment: string },
): Promise<FormDataImportConfirmResponse> {
  return request<FormDataImportConfirmResponse>(`/forms/${formId}/data-import/confirm`, {
    method: "POST",
    token,
    bodyJson: payload,
  });
}

export async function returnImportedFormDataRows(
  token: string,
  formId: string,
  payload: { submission_ids: string[]; comment: string },
): Promise<FormDataImportReturnResponse> {
  return request<FormDataImportReturnResponse>(`/forms/${formId}/data-import/return`, {
    method: "POST",
    token,
    bodyJson: payload,
  });
}

export async function createForm(token: string, payload: DataFormCreate): Promise<DataFormRead> {
  return request<DataFormRead>("/forms", { method: "POST", token, bodyJson: payload });
}

export async function updateForm(token: string, formId: string, payload: DataFormUpdate): Promise<DataFormRead> {
  return request<DataFormRead>(`/forms/${formId}`, { method: "PATCH", token, bodyJson: payload });
}

export async function archiveForm(token: string, formId: string): Promise<DataFormRead> {
  return request<DataFormRead>(`/forms/${formId}/archive`, { method: "POST", token });
}

export async function restoreForm(token: string, formId: string): Promise<DataFormRead> {
  return request<DataFormRead>(`/forms/${formId}/restore`, { method: "POST", token });
}

export async function getFormControls(token: string, formId: string): Promise<FormControlsSettings> {
  return request<FormControlsSettings>(`/forms/${formId}/controls`, { token });
}

export async function updateFormControls(
  token: string,
  formId: string,
  payload: FormControlsSettings
): Promise<DataFormRead> {
  return request<DataFormRead>(`/forms/${formId}/controls`, { method: "PATCH", token, bodyJson: payload });
}

export async function exportFormXlsForm(token: string, formId: string): Promise<XlsFormWorkbook> {
  return request<XlsFormWorkbook>(`/forms/${formId}/xlsform`, { token });
}

export async function getFormCollectionCompatibility(token: string, formId: string): Promise<FormCollectionCompatibility> {
  return request<FormCollectionCompatibility>(`/forms/${formId}/compatibility`, { token });
}

export async function listFormTemplates(
  token: string,
  params: { category?: string; search?: string; organization_type?: string } = {}
): Promise<FormTemplateRead[]> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      query.set(key, value);
    }
  }
  const suffix = query.size ? `?${query.toString()}` : "";
  return request<FormTemplateRead[]>(`/forms/templates${suffix}`, { token });
}

export async function getFormTemplate(token: string, templateId: string): Promise<FormTemplateDetail> {
  return request<FormTemplateDetail>(`/forms/templates/${templateId}`, { token });
}

export async function duplicateFormTemplate(
  token: string,
  templateId: string,
  payload: TemplateDuplicateRequest
): Promise<{ id: string; name: string; slug: string; status: string; current_version: number; is_active: boolean }> {
  return request(`/forms/templates/${templateId}/duplicate`, { method: "POST", token, bodyJson: payload });
}

export const api = {
  analyzeImport,
  applyImportJob,
  bulkUpdateImportCleaningRows,
  confirmImportJob,
  confirmImportedFormDataRows,
  returnImportedFormDataRows,
  createAdministrationApiKey,
  createAdministrationBackup,
  createAdministrationIntegration,
  createAdministrationLocation,
  createAdministrationNotificationRule,
  createAdministrationReferenceList,
  createAdministrationReferenceValue,
  createAccessRequest,
  createApprovalMatrix,
  createClearanceLevel,
  createDelegation,
  createDepartment,
  createDevice,
  createOrganization,
  createPublicLead,
  createExportJob,
  createProject,
  createRole,
  createActivityMediaEvidence,
  createMediaEvidence,
  createPublicCollectionLink,
  createOperationalZone,
  disconnectAdministrationIntegration,
  duplicateFormTemplate,
  exportFormXlsForm,
  createForm,
  getFormControls,
  getImportErrorReport,
  getImportMigrationOverview,
  getPlatformApiGovernancePolicy,
  getPlatformAiGovernancePolicy,
  getPlatformBackupPolicy,
  getPlatformAnnouncement,
  getPlatformCommunicationPolicy,
  getPlatformCompliancePolicy,
  getPlatformRelease,
  getPlatformQuotaPolicy,
  getPlatformMobileFleet,
  getPlatformObservabilityPolicy,
  getPlatformRetentionPolicy,
  getPlatformSecurityPolicy,
  getPlatformSlaPolicy,
  createGovernancePolicy,
  createImportJob,
  createSurvey,
  createUser,
  createTeam,
  createWorkforceProfile,
  createRetentionPolicy,
  createValidationRule,
  getCurrentPrincipal,
  getAdministrationSummary,
  getHealth,
  getPlatformSettings,
  getPlatformSummary,
  getPlatformSystemHealth,
  getPlatformTenantLifecyclePolicy,
  getProjectDetail,
  getProjectsSummary,
  getFormTemplate,
  getFormSchema,
  getFormCollectionCompatibility,
  getGovernanceSummary,
  getOrganizationGovernanceSummary,
  getUsersTeamsSummary,
  getOrganizationContext,
  getOperationalEcosystem,
  getOperationalActivityReport,
  governExport,
  installProjectSectorForms,
  installProjectSectorIndicators,
  installProjectSectorReports,
  importFieldOfficers,
  importFormDataRows,
  importOrganizationUnits,
  importUsers,
  inviteFieldOfficer,
  getOperationsSummary,
  listBeneficiaries,
  listCases,
  listAccessRequests,
  listAdministrationApiKeys,
  listAdministrationBackups,
  listAdministrationFeatureFlags,
  listAdministrationIntegrations,
  listAdministrationLocations,
  listAdministrationNotificationRules,
  listAdministrationReferenceLists,
  listAdministrationSystemSettings,
  listApprovalMatrices,
  listClearanceLevels,
  listConsentRecords,
  listDelegations,
  listDepartments,
  listDevices,
  listDataVersions,
  listExportLogs,
  listMediaEvidence,
  listActivityMediaEvidence,
  listPublicCollectionLinks,
  listFieldOfficers,
  listFieldVisitRequests,
  listFormRepeatRows,
  listForms,
  listFormTemplates,
  listGovernancePolicies,
  listIndicators,
  listImportCleaningRows,
  listImportJobs,
  listImportRows,
  listImportSupportedSources,
  listChoiceList,
  listLineageEvents,
  listMasterDataEntries,
  listOperationalZones,
  listPlatformAuditLogs,
  listPlatformBackups,
  listPlatformDataIsolationIssues,
  listPlatformFeatureFlags,
  listPlatformIntegrations,
  listPlatformLeads,
  listPlatformOrganizationPlans,
  listPlatformRoles,
  listPlatformSecurityEvents,
  listPlatformSectorPacks,
  listPlatformSupportSessions,
  listPlatformSupportQueue,
  listPrograms,
  listProjectImportJobs,
  listProjects,
  listProjectSectorPacks,
  listProjectTemplates,
  listSurveyTeam,
  listSurveys,
  listPlatformUsage,
  listPlatformUsers,
  listReports,
  listRetentionPolicies,
  listRoles,
  listSessionLogs,
  listSubmissionCorrections,
  listSubmissionHistory,
  listSubmissionRepeatRows,
  listSubmissions,
  listTeams,
  listUsersTeamsActivityLogs,
  listValidationRules,
  listUsers,
  listWorkforceProfiles,
  login,
  previewImport,
  requestAdministrationRecovery,
  rollbackImportJob,
  reviewSubmission,
  addSurveyTeamMember,
  revokeAdministrationApiKey,
  rotateAdministrationApiKey,
  runPlatformUserSecurityAction,
  resetUserPassword,
  routeData,
  reviewAccessRequest,
  reviewFieldVisitRequest,
  reviewOperationalActivityOutcome,
  simulateAccess,
  updateAdministrationLocation,
  updateAdministrationNotificationRule,
  updateAdministrationReferenceValue,
  updatePlatformApiGovernancePolicy,
  updatePlatformAiGovernancePolicy,
  updatePlatformFeatureFlag,
  updatePlatformCommunicationPolicy,
  updatePlatformIntegration,
  updatePlatformOrganizationPlan,
  updatePlatformObservabilityPolicy,
  updatePlatformQuotaPolicy,
  updatePlatformRelease,
  updatePlatformRetentionPolicy,
  updatePlatformSecurityPolicy,
  updatePlatformSlaPolicy,
  updatePlatformBackupPolicy,
  updatePlatformCompliancePolicy,
  updatePlatformTenantLifecyclePolicy,
  updateImportRow,
  updateForm,
  updateFormControls,
  updateSubmissionResponses,
  updateSurveyGovernance,
  updateTeam,
  upsertAdministrationFeatureFlag,
  upsertAdministrationSystemSetting,
  updateUser,
  uploadImportFile
};
