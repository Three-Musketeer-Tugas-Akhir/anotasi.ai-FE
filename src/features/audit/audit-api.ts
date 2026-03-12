import { apiClient } from '@/core/api/axios-client';
import type { AuditLogResponse } from './types';

/**
 * Audit trail API service.
 */
export const auditApi = {
  /** GET /audit-logs?page=1&per_page=20 */
  fetchLogs: (page = 1, perPage = 20) =>
    apiClient
      .get<AuditLogResponse>('/audit-logs', {
        params: { page, per_page: perPage },
      })
      .then((r) => r.data),
};
