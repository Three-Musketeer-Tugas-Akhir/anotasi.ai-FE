/**
 * Audit trail types — matches the Go backend audit log domain.
 */

/** Full audit log entry (returned to admin users) */
export interface AuditLogEntry {
  id: string;
  user_id?: string;
  username?: string;
  role?: string;
  action: string;
  resource: string;
  detail: string;
  created_at: string;
}

/** Paginated audit log response */
export interface AuditLogResponse {
  data: AuditLogEntry[];
  meta: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}
