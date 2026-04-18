/**
 * Notification feature types.
 * Based on GET /api/v1/notifications response schema.
 */

export type NotificationType =
  | 'job_complete'
  | 'annotation_ready'
  | 'stage_complete';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  job_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface NotificationListResponse {
  items: Notification[];
  total: number;
  unread_count: number;
  limit: number;
  offset: number;
}

export interface NotificationListParams {
  unread_only?: boolean;
  limit?: number;
  offset?: number;
}

export interface MarkReadResponse {
  success: boolean;
  notification_id: string;
}

export interface MarkAllReadResponse {
  success: boolean;
  marked_count: number;
}
