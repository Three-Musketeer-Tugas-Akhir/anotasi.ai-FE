import { apiClient } from '@/core/api/axios-client';

// ── Types ──────────────────────────────────────────────────────────

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

// ── API ────────────────────────────────────────────────────────────

export const dashboardApi = {
  /** GET /api/v1/dashboard — admin-only dashboard data */
  getDashboard: async (): Promise<DashboardResponse> => {
    const { data } = await apiClient.get<DashboardResponse>('/dashboard');
    return data;
  },
};
