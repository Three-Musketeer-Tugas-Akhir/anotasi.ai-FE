import { apiClient } from '@/core/api/axios-client';

export interface AssignJobRequest {
  job_id: string;
  annotator_id: string;
  priority?: number;
  due_days?: number;
}

export interface AssignJobResponse {
  success: boolean;
  message: string;
  assigned_count: number;
  segment_ids: string[];
}

export interface QueueStatusResponse {
  by_status: Record<string, number>;
  by_annotator: {
    annotator_email: string;
    status: string;
    count: number;
  }[];
  total_in_queue: number;
}

export interface UserItem {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
}

export interface UserListResponse {
  items: UserItem[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export const adminAnnotationsApi = {
  getQueueStatus: () =>
    apiClient.get<QueueStatusResponse>('/admin/annotations/queue-status').then((r) => r.data),

  assignJob: (params: AssignJobRequest) =>
    apiClient
      .post<AssignJobResponse>('/admin/annotations/assign-job', null, { params })
      .then((r) => r.data),

  getAnnotators: () =>
    apiClient
      .get<UserListResponse>('/admin/users', { params: { role: 'annotator', page_size: 100 } })
      .then((r) => r.data),
};
