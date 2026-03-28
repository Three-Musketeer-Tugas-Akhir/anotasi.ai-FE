import { apiClient } from '@/core/api/axios-client';
import {
  toCategoryStatus,
  type ClassificationJob,
  type JobListResponse,
  type JobListParams,
  type CategoryUpdateResponse,
  type JobCreateResponse,
} from '@/features/classification/types/classification.types';

/**
 * Raw job shape from jbi-service GET /jobs endpoint.
 * Category comes as string | null from the API; we normalise it.
 */
interface RawJobStatusResponse {
  job_id: string;
  status: string;
  video_title: string | null;
  category: string | null;
  progress: { phase: string; current: number; total: number; percent: number } | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

interface RawJobListResponse {
  jobs: RawJobStatusResponse[];
  total: number;
  limit: number;
  offset: number;
}

/** Convert raw API job to typed ClassificationJob */
function mapJob(raw: RawJobStatusResponse): ClassificationJob {
  return {
    ...raw,
    category: toCategoryStatus(raw.category),
  };
}

/**
 * Classification Repository — Data access layer.
 * All API calls related to video classification (now via jbi-service Jobs API).
 */
export const classificationRepository = {
  /**
   * Fetch jobs for classification.
   * GET /jobs with optional filters + pagination.
   */
  getJobs: async (params?: JobListParams): Promise<JobListResponse> => {
    const { data } = await apiClient.get<RawJobListResponse>('/jobs', { params });
    return {
      ...data,
      jobs: data.jobs.map(mapJob),
    };
  },

  /**
   * Update a job's sign language category (SIBI / BISINDO).
   * PUT /jobs/{jobId}/category
   */
  updateCategory: async (jobId: string, category: 'SIBI' | 'BISINDO'): Promise<CategoryUpdateResponse> => {
    const { data } = await apiClient.put<CategoryUpdateResponse>(
      `/jobs/${jobId}/category`,
      { category },
    );
    return data;
  },

  /**
   * Upload a video to create a new processing job.
   * POST /jobs (multipart form-data: file + optional category)
   */
  uploadVideo: async (
    file: File,
    category?: 'SIBI' | 'BISINDO',
  ): Promise<JobCreateResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    if (category) formData.append('category', category);

    const { data } = await apiClient.post<JobCreateResponse>('/jobs', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
};
