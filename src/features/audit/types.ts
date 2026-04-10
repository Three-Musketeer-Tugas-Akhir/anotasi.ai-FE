/**
 * Audit Log TypeScript types.
 * Derived from jbi-service/app/schemas/audit.py (Pydantic models).
 */

// ── Core Types ──────────────────────────────────────────────────────

export interface AuditLogActor {
  id: string | null;
  email: string | null;
}

export interface AuditLogResource {
  type: string;
  id: string;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  actor: AuditLogActor | null;
  action: string;
  action_label: string;
  resource: AuditLogResource;
  details: Record<string, unknown>;
  ip_address: string | null;
}

// ── List Response ───────────────────────────────────────────────────

export interface AuditLogListResponse {
  items: AuditLogItem[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface AuditLogListParams {
  start_date?: string;
  end_date?: string;
  actor_id?: string;
  action?: string;
  resource_type?: string;
  resource_id?: string;
  ip_address?: string;
  page?: number;
  page_size?: number;
}

// ── Detail Response ─────────────────────────────────────────────────

export interface AuditLogDetailResponse extends AuditLogItem {
  user_agent: string | null;
}

// ── Stats ───────────────────────────────────────────────────────────

export interface ActionCount {
  action: string;
  label: string;
  count: number;
}

export interface DailyActivity {
  date: string;   // YYYY-MM-DD
  count: number;
}

export interface AuditStatsSummary {
  total_logs: number;
  unique_users: number;
  period_start: string | null;
  period_end: string | null;
  top_actions: ActionCount[];
  daily_activity: DailyActivity[];
}

export interface AuditStatsParams {
  start_date?: string;
  end_date?: string;
  days?: number;
}

// ── User Activity ───────────────────────────────────────────────────

export interface UserActivitySummary {
  user_id: string;
  email: string;
  total_actions: number;
  last_active: string | null;
  actions_by_type: ActionCount[];
  period_days: number;
}

// ── Resource Activity ───────────────────────────────────────────────

export interface ResourceActivitySummary {
  resource_type: string;
  resource_id: string;
  total_actions: number;
  created_at: string | null;
  last_modified: string | null;
  action_history: AuditLogItem[];
}

// ── Available Filters ───────────────────────────────────────────────

export interface AvailableFilters {
  actions: Array<{ action: string; label: string }>;
  resource_types: string[];
}

// ── Action Constants ────────────────────────────────────────────────

export const AUDIT_ACTIONS = {
  USER_CREATED: 'user.created',
  USER_ROLE_CHANGED: 'user.role_changed',
  USER_DEACTIVATED: 'user.deactivated',
  USER_REACTIVATED: 'user.reactivated',
  USER_LOGIN: 'user.login',
  USER_LOGIN_FAILED: 'user.login_failed',
  JOB_CREATED: 'job.created',
  JOB_CANCELLED: 'job.cancelled',
  ANNOTATION_SUBMITTED: 'annotation.submitted',
  ASR_REVIEW_APPROVED: 'asr_review.approved',
  TOKEN_REFRESHED: 'token.refreshed',
} as const;
