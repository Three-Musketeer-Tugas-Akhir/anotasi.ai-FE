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

export interface ReassignJobRequest {
  job_id: string;
  annotator_id: string;
}

export interface ReassignJobResponse {
  success: boolean;
  message: string;
  reassigned_count: number;
  job_id: string;
  new_annotator_id: string;
  new_annotator_email: string;
}

export interface JobAssignmentItem {
  job_id: string;
  original_filename: string;
  status: string;
  category: string | null;
  created_at: string | null;
  total_segments: number;
  assigned_segments: number;
  assignment_status: 'unassigned' | 'partial' | 'assigned';
  assigned_to: string | null;
  assigned_to_email: string | null;
}

export interface JobAssignmentsResponse {
  items: JobAssignmentItem[];
  total: number;
  limit: number;
  offset: number;
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

  reassignJob: (params: ReassignJobRequest) =>
    apiClient
      .post<ReassignJobResponse>('/admin/annotations/reassign-job', null, { params })
      .then((r) => r.data),

  getJobAssignments: () =>
    apiClient
      .get<JobAssignmentsResponse>('/admin/annotations/job-assignments')
      .then((r) => r.data),

  getAnnotators: () =>
    apiClient
      .get<UserListResponse>('/admin/users', { params: { role: 'annotator', page_size: 100 } })
      .then((r) => r.data),
};
