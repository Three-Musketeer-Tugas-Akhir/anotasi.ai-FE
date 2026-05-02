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
  original_video_url?: string;
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
    // Tambahkan timeout panjang karena proses loading daftar mp4 original memakan waktu lama di backend
    const { data } = await apiClient.get<RawJobListResponse>('/jobs', {
      params,
      timeout: 300000 // 5 minutes timeout
    });
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
   * Upload a video to create a new processing job via the new pipeline.
   * POST /pipeline/jobs (multipart form-data: video)
   */
  uploadVideo: async (
    file: File,
  ): Promise<JobCreateResponse> => {
    const formData = new FormData();
    formData.append('video', file);

    const { data } = await apiClient.post<JobCreateResponse>('/pipeline/jobs', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  /**
   * Start a YouTube video download in the background.
   * POST /upload/youtube
   */
  startYoutubeDownload: async (
    url: string,
    category?: string,
  ): Promise<{ download_id: string; url: string; status: string; message: string }> => {
    const { data } = await apiClient.post('/upload/youtube', { url, category });
    return data;
  },

  /**
   * Get progress of a YouTube download.
   * GET /upload/youtube/:downloadId
   */
  getYoutubeDownloadProgress: async (
    downloadId: string,
  ): Promise<{
    download_id: string;
    url: string;
    status: string;
    title: string | null;
    filename: string | null;
    file_size: number;
    downloaded_bytes: number;
    percent: number;
    speed: string | null;
    eta: string | null;
    error: string | null;
    job_id: string | null;
    created_at: number;
  }> => {
    const { data } = await apiClient.get(`/upload/youtube/${downloadId}`);
    return data;
  },
};
