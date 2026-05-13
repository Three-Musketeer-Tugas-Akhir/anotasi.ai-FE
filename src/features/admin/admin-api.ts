import { apiClient } from '@/core/api/axios-client';
import type {
  UserListResponse,
  UserListParams,
  UserDetailResponse,
  CreateUserRequest,
  UserRoleUpdateRequest,
  UserRoleUpdateResponse,
  UserDeactivateResponse,
  SystemConfigResponse,
  SystemConfigUpdateRequest,
  SystemMetricsResponse,
  FailedJobsResponse,
  FailedJobsParams,
  ASRConfidenceStatsResponse,
  PremergeJobStatus,
  PremergeQueueResponse,
} from './types';

/**
 * Admin API service.
 * Integrates with /api/v1/admin/* endpoints (admin role required).
 */
export const adminApi = {
  // ── User Management ─────────────────────────────────────────────

  /** GET /admin/users */
  listUsers: (params?: UserListParams) =>
    apiClient
      .get<UserListResponse>('/admin/users', { params })
      .then((r) => r.data),

  /** GET /admin/users/:id */
  getUser: (userId: string) =>
    apiClient
      .get<UserDetailResponse>(`/admin/users/${userId}`)
      .then((r) => r.data),

  /** POST /admin/users */
  createUser: (data: CreateUserRequest) =>
    apiClient
      .post('/admin/users', data)
      .then((r) => r.data),

  /** PUT /admin/users/:id/role */
  updateUserRole: (userId: string, data: UserRoleUpdateRequest) =>
    apiClient
      .put<UserRoleUpdateResponse>(`/admin/users/${userId}/role`, data)
      .then((r) => r.data),

  /** DELETE /admin/users/:id (soft deactivate) */
  deactivateUser: (userId: string) =>
    apiClient
      .delete<UserDeactivateResponse>(`/admin/users/${userId}`)
      .then((r) => r.data),

  // ── System ──────────────────────────────────────────────────────

  /** GET /admin/system/config */
  getSystemConfig: () =>
    apiClient
      .get<SystemConfigResponse>('/admin/system/config')
      .then((r) => r.data),

  /** PUT /admin/system/config */
  updateSystemConfig: (data: SystemConfigUpdateRequest) =>
    apiClient
      .put<SystemConfigResponse>('/admin/system/config', data)
      .then((r) => r.data),

  /** GET /admin/system/metrics */
  getSystemMetrics: () =>
    apiClient
      .get<SystemMetricsResponse>('/admin/system/metrics')
      .then((r) => r.data),

  // ── Jobs ────────────────────────────────────────────────────────

  /** GET /admin/jobs/failed */
  getFailedJobs: (params?: FailedJobsParams) =>
    apiClient
      .get<FailedJobsResponse>('/admin/jobs/failed', { params })
      .then((r) => r.data),

  // ── ASR ─────────────────────────────────────────────────────────

  /** GET /admin/asr/confidence-stats */
  getASRConfidenceStats: () =>
    apiClient
      .get<ASRConfidenceStatsResponse>('/admin/asr/confidence-stats')
      .then((r) => r.data),

  // ── Pre-merge ───────────────────────────────────────────────────

  /** GET /pipeline/jobs/premerge-queue */
  getPremergeQueue: () =>
    apiClient
      .get<PremergeQueueResponse>('/pipeline/jobs/premerge-queue')
      .then((r) => r.data),

  /** GET /pipeline/jobs/:job_id/premerge-status */
  getPremergeStatus: (jobId: string) =>
    apiClient
      .get<PremergeJobStatus>(`/pipeline/jobs/${jobId}/premerge-status`)
      .then((r) => r.data),
};
