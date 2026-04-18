import { apiClient } from '@/core/api/axios-client';
import type {
  NotificationListResponse,
  NotificationListParams,
  MarkReadResponse,
  MarkAllReadResponse,
} from './types';

/**
 * Notification REST API service.
 * All endpoints require JWT Bearer token.
 */
export const notificationApi = {
  /** GET /notifications — list notifications with optional filters */
  list: async (params?: NotificationListParams): Promise<NotificationListResponse> => {
    const { data } = await apiClient.get<NotificationListResponse>('/notifications', {
      params,
    });
    return data;
  },

  /** POST /notifications/{id}/read — mark a single notification as read */
  markAsRead: async (notificationId: string): Promise<MarkReadResponse> => {
    const { data } = await apiClient.post<MarkReadResponse>(
      `/notifications/${notificationId}/read`,
    );
    return data;
  },

  /** POST /notifications/read-all — mark all notifications as read */
  markAllAsRead: async (): Promise<MarkAllReadResponse> => {
    const { data } = await apiClient.post<MarkAllReadResponse>('/notifications/read-all');
    return data;
  },
};
