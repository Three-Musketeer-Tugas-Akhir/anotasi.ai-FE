/**
 * Admin module types — mirrors jbi-service admin endpoints.
 */

// ── User List ──────────────────────────────────────────────────────

export interface UserListItem {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface UserListResponse {
  items: UserListItem[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface UserListParams {
  page?: number;
  page_size?: number;
  role?: string | null;
  is_active?: boolean | null;
  sort_by?: string;
  sort_order?: string;
}

// ── User Detail ────────────────────────────────────────────────────

export interface UserDetailResponse {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string | null;
}

// ── Create User ────────────────────────────────────────────────────

export interface CreateUserRequest {
  email: string;
  role: string;
  temporary_password?: string;
}

// ── User Role Update ───────────────────────────────────────────────

export interface UserRoleUpdateRequest {
  role: string;
}

export interface UserRoleUpdateResponse {
  id: string;
  email: string;
  role: string;
  previous_role?: string | null;
  updated_at?: string | null;
}

// ── User Deactivate ────────────────────────────────────────────────

export interface UserDeactivateResponse {
  id: string;
  email: string;
  is_active: boolean;
  deactivated_at?: string | null;
  message: string;
  tokens_revoked: number;
}

// ── System Config ──────────────────────────────────────────────────

export interface SystemConfigResponse {
  min_segment_duration: number;
  max_concurrent_jobs: number;
  queue_max_depth: number;
  asr_model_default: string;
  asr_compute_type: string;
  jbi_buffer_seconds: number;
}

export interface SystemConfigUpdateRequest {
  min_segment_duration?: number | null;
  max_concurrent_jobs?: number | null;
  queue_max_depth?: number | null;
  asr_model_default?: string | null;
  asr_compute_type?: string | null;
  jbi_buffer_seconds?: number | null;
}

// ── System Metrics ─────────────────────────────────────────────────

export interface SystemMetricsResponse {
  jobs_completed_today: number;
  jobs_failed_today: number;
  jobs_cancelled_today: number;
  average_processing_time_seconds: number;
  queue_depth_by_stage: Record<string, number>;
  gpu_utilization_percent: number;
  timestamp: string;
}

// ── Failed Jobs ────────────────────────────────────────────────────

export interface FailedJobItem {
  job_id: string;
  error_message: string;
  failed_at: string | null;
  stage: string;
  retry_count: number;
  original_filename: string;
}

export interface FailedJobsResponse {
  jobs: FailedJobItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface FailedJobsParams {
  limit?: number;
  offset?: number;
}

// ── ASR Confidence Stats ───────────────────────────────────────────

export interface ConfidenceDistribution {
  low: number;
  medium: number;
  high: number;
}

export interface ASRConfidenceStatsResponse {
  average_confidence?: number | null;
  min_confidence?: number | null;
  max_confidence?: number | null;
  total_segments: number;
  confidence_distribution: ConfidenceDistribution;
}
