import { apiClient } from '@/core/api/axios-client';

// ── Admin Dashboard Types ───────────────────────────────────────────

export interface DashboardStatsCard {
  label: string;
  value: number;
  sublabel: string;
  icon: string;
}

export interface DashboardPipelineStage {
  name: string;
  current: number;
  total: number;
  percentage: number;
  color: string;
}

export interface DashboardSystemActivity {
  action: string;
  description: string;
  timestamp: string;
}

export interface DashboardResponse {
  stats: DashboardStatsCard[];
  pipeline_progress: DashboardPipelineStage[];
  conversion_rates: number[];
  system_activities: DashboardSystemActivity[];
}

// ── Non-Admin Dashboard Types ───────────────────────────────────────

export interface AnnotatorJobSummary {
  job_id: string;
  original_filename: string;
  job_status: string;
  job_status_label: string;
  queue_status: string;
  queue_status_label: string;
  assigned_at: string | null;
  due_date: string | null;
  total_segments: number;
  completed_segments: number;
  in_progress_segments: number;
  pending_segments: number;
  progress_percent: number;
}

export interface AnnotatorDashboardStats {
  total_segments: number;
  completed_segments: number;
  in_progress_segments: number;
  pending_segments: number;
  overall_progress_percent: number;
  total_jobs: number;
}

export interface AnnotatorDashboardResponse {
  role: 'annotator';
  stats: AnnotatorDashboardStats;
  jobs: AnnotatorJobSummary[];
}

export interface CuratorJobSummary {
  job_id: string;
  original_filename: string;
  job_status: string;
  curation_status: string;
  curation_status_label: string;
  total_segments: number;
  updated_at: string | null;
  created_at: string | null;
}

export interface CuratorDashboardStats {
  total_jobs: number;
  pending_review: number;
  in_normalization: number;
  completed_normalization: number;
}

export interface CuratorDashboardResponse {
  role: 'curator';
  stats: CuratorDashboardStats;
  jobs: CuratorJobSummary[];
}

export type MyDashboardResponse = AnnotatorDashboardResponse | CuratorDashboardResponse;

// ── API ────────────────────────────────────────────────────────────

export const dashboardApi = {
  /** GET /api/v1/dashboard — admin-only dashboard data */
  getDashboard: async (): Promise<DashboardResponse> => {
    const { data } = await apiClient.get<DashboardResponse>('/dashboard');
    return data;
  },

  /** GET /api/v1/dashboard/my — personalized dashboard for annotator/curator */
  getMyDashboard: async (): Promise<MyDashboardResponse> => {
    const { data } = await apiClient.get<MyDashboardResponse>('/dashboard/my');
    return data;
  },
};
