import { apiClient } from '@/core/api/axios-client';
import { env } from '@/core/config/env';
import type {
  AuditLogListResponse,
  AuditLogListParams,
  AuditLogDetailResponse,
  AuditStatsSummary,
  AuditStatsParams,
  UserActivitySummary,
  ResourceActivitySummary,
  AvailableFilters,
  AuditModule,
} from './types';

/**
 * Audit Log API service.
 * All endpoints require admin role JWT.
 */
export const auditApi = {
  // ═══════════════════════════════════════════════════════════════════
  // Logs
  // ═══════════════════════════════════════════════════════════════════

  /** GET /admin/audit/logs — list with filtering & pagination */
  listLogs: (params?: AuditLogListParams) =>
    apiClient
      .get<AuditLogListResponse>('/admin/audit/logs', { params })
      .then((r) => r.data),

  /** GET /admin/audit/logs/:id — single log detail */
  getLog: (logId: string) =>
    apiClient
      .get<AuditLogDetailResponse>(`/admin/audit/logs/${logId}`)
      .then((r) => r.data),

  // ═══════════════════════════════════════════════════════════════════
  // Stats
  // ═══════════════════════════════════════════════════════════════════

  /** GET /admin/audit/stats — statistics summary */
  getStats: (params?: AuditStatsParams) =>
    apiClient
      .get<AuditStatsSummary>('/admin/audit/stats', { params })
      .then((r) => r.data),

  // ═══════════════════════════════════════════════════════════════════
  // User & Resource Activity
  // ═══════════════════════════════════════════════════════════════════

  /** GET /admin/audit/users/:id/activity */
  getUserActivity: (userId: string, periodDays?: number) =>
    apiClient
      .get<UserActivitySummary>(`/admin/audit/users/${userId}/activity`, {
        params: periodDays ? { period_days: periodDays } : undefined,
      })
      .then((r) => r.data),

  /** GET /admin/audit/resources/:type/:id */
  getResourceActivity: (resourceType: string, resourceId: string, limit?: number) =>
    apiClient
      .get<ResourceActivitySummary>(`/admin/audit/resources/${resourceType}/${resourceId}`, {
        params: limit ? { limit } : undefined,
      })
      .then((r) => r.data),

  // ═══════════════════════════════════════════════════════════════════
  // Export
  // ═══════════════════════════════════════════════════════════════════

  /** GET /admin/audit/export — download as CSV or JSON */
  exportLogs: async (format: 'csv' | 'json', params?: Record<string, string | number>) => {
    const queryParams = { format, ...params };
    const response = await apiClient.get('/admin/audit/export', {
      params: queryParams,
      responseType: 'blob',
    });
    // Trigger file download
    const blob = new Blob([response.data as BlobPart]);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.${format}`;
    a.click();
    window.URL.revokeObjectURL(url);
  },

  // ═══════════════════════════════════════════════════════════════════
  // Filters
  // ═══════════════════════════════════════════════════════════════════

  /** GET /admin/audit/filters — get available filter values */
  getFilters: () =>
    apiClient
      .get<AvailableFilters>('/admin/audit/filters')
      .then((r) => r.data),
};
