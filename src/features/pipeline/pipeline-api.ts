import { apiClient } from '@/core/api/axios-client';
import { env } from '@/core/config/env';
import type {
  JobListDetailedResponse,
  JobListParams,
  JobStatusDetailResponse,
  JobCreateResponse,
  JobCreateFromUrlRequest,
  JobCancelResponse,
  JobResultsResponse,
  CategoryUpdateRequest,
  CategoryUpdateResponse,
  UploadDetailedStatus,
  Stage1ResultsResponse,
  Stage2ResultsResponse,
  Stage3ResultsResponse,
} from './types';

/**
 * Pipeline API service.
 *
 * Integrates with:
 * - /api/v1/pipeline/jobs/* (protected — JWT required)
 * - /api/v1/jobs/* (legacy, some public)
 * - /api/v1/upload/files/* (protected — JWT required, Tus protocol)
 */
export const pipelineApi = {
  // ═══════════════════════════════════════════════════════════════════
  // Pipeline Jobs (Protected via JWT)
  // ═══════════════════════════════════════════════════════════════════

  /** GET /pipeline/jobs — list jobs with pagination & filtering */
  listJobs: (params?: JobListParams) =>
    apiClient
      .get<JobListDetailedResponse>('/pipeline/jobs', { params })
      .then((r) => r.data),

  /** GET /pipeline/jobs/:id — get job detail with progress */
  getJob: (jobId: string) =>
    apiClient
      .get<JobStatusDetailResponse>(`/pipeline/jobs/${jobId}`)
      .then((r) => r.data),

  /** POST /pipeline/jobs — upload video (simple multipart) */
  uploadVideo: (
    file: File,
    onProgress?: (percent: number) => void,
    signal?: AbortSignal,
  ) => {
    const formData = new FormData();
    formData.append('video', file);

    return apiClient
      .post<JobCreateResponse>('/pipeline/jobs', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 600_000, // 10 min timeout for large uploads
        signal,
        onUploadProgress: (e) => {
          if (e.total && onProgress) {
            onProgress(Math.round((e.loaded / e.total) * 100));
          }
        },
      })
      .then((r) => r.data);
  },

  /** POST /pipeline/jobs/from-url — create job from video URL */
  createJobFromUrl: (data: JobCreateFromUrlRequest) =>
    apiClient
      .post<JobCreateResponse>('/pipeline/jobs/from-url', data)
      .then((r) => r.data),

  /** DELETE /pipeline/jobs/:id — cancel a job */
  cancelJob: (jobId: string) =>
    apiClient
      .delete<JobCancelResponse>(`/pipeline/jobs/${jobId}`)
      .then((r) => r.data),

  /** POST /pipeline/jobs/:id/start — start processing for a single classified job */
  startProcessing: (jobId: string) =>
    apiClient
      .post<{ job_id: string; status: string; message: string }>(`/pipeline/jobs/${jobId}/start`)
      .then((r) => r.data),

  /** POST /pipeline/jobs/start-classified — batch-start all classified-but-unprocessed jobs */
  startAllClassified: () =>
    apiClient
      .post<{ started_count: number; errors: Array<{ job_id: string; error: string }>; message: string }>(
        '/pipeline/jobs/start-classified',
      )
      .then((r) => r.data),

  // ═══════════════════════════════════════════════════════════════════
  // Stage Results (Protected via JWT)
  // ═══════════════════════════════════════════════════════════════════

  /** GET /pipeline/jobs/:id/stage1/results — detection results */
  getStage1Results: (jobId: string) =>
    apiClient
      .get<Stage1ResultsResponse>(`/pipeline/jobs/${jobId}/stage1/results`)
      .then((r) => r.data),

  /** GET /pipeline/jobs/:id/stage2/results — ASR results */
  getStage2Results: (jobId: string) =>
    apiClient
      .get<Stage2ResultsResponse>(`/pipeline/jobs/${jobId}/stage2/results`)
      .then((r) => r.data),

  /** GET /pipeline/jobs/:id/stage3/results — cropping results */
  getStage3Results: (jobId: string) =>
    apiClient
      .get<Stage3ResultsResponse>(`/pipeline/jobs/${jobId}/stage3/results`)
      .then((r) => r.data),

  /** GET /pipeline/jobs/:id/dataset/download — download dataset ZIP */
  getDatasetDownloadUrl: (jobId: string) =>
    `${env.API_URL}/pipeline/jobs/${jobId}/dataset/download`,

  // ═══════════════════════════════════════════════════════════════════
  // Legacy Jobs (some are public)
  // ═══════════════════════════════════════════════════════════════════

  /** GET /jobs/:id/results — get detection results + segments */
  getJobResults: (jobId: string) =>
    apiClient
      .get<JobResultsResponse>(`/jobs/${jobId}/results`)
      .then((r) => r.data),

  /** PUT /jobs/:id/category — update sign language category */
  updateJobCategory: (jobId: string, data: CategoryUpdateRequest) =>
    apiClient
      .put<CategoryUpdateResponse>(`/jobs/${jobId}/category`, data)
      .then((r) => r.data),

  /** GET /jobs/:id/segments/:idx/download — download segment video URL */
  getSegmentDownloadUrl: (jobId: string, segmentIndex: number) =>
    `${env.API_URL}/jobs/${jobId}/segments/${segmentIndex}/download`,

  // ═══════════════════════════════════════════════════════════════════
  // Tus Upload Protocol (Protected via JWT)
  // ═══════════════════════════════════════════════════════════════════

  /** POST /upload/files — create Tus upload resource */
  tusCreateUpload: async (
    fileSize: number,
    metadata: { filename: string; filetype: string; category?: string },
  ): Promise<string> => {
    // Base64-encode metadata values per Tus spec
    const metaParts: string[] = [];
    metaParts.push(`filename ${btoa(metadata.filename)}`);
    metaParts.push(`filetype ${btoa(metadata.filetype)}`);
    if (metadata.category) {
      metaParts.push(`category ${btoa(metadata.category)}`);
    }

    const response = await apiClient.post('/upload/files', null, {
      headers: {
        'Upload-Length': String(fileSize),
        'Upload-Metadata': metaParts.join(','),
        'Content-Type': 'application/offset+octet-stream',
      },
    });

    // Extract upload ID from Location header
    const location = response.headers['location'] || '';
    const uploadId = location.split('/').pop() || '';
    return uploadId;
  },

  /** HEAD /upload/files/:id — get current upload offset */
  tusGetOffset: async (uploadId: string): Promise<number> => {
    const response = await apiClient.head(`/upload/files/${uploadId}`);
    return parseInt(response.headers['upload-offset'] || '0', 10);
  },

  /** PATCH /upload/files/:id — send a chunk */
  tusUploadChunk: async (
    uploadId: string,
    chunk: ArrayBuffer,
    offset: number,
  ): Promise<number> => {
    const response = await apiClient.patch(
      `/upload/files/${uploadId}`,
      chunk,
      {
        headers: {
          'Upload-Offset': String(offset),
          'Content-Length': String(chunk.byteLength),
          'Content-Type': 'application/offset+octet-stream',
        },
        timeout: 120_000, // 2 min per chunk
      },
    );
    return parseInt(response.headers['upload-offset'] || '0', 10);
  },

  /** DELETE /upload/files/:id — cancel upload */
  tusCancelUpload: (uploadId: string) =>
    apiClient.delete(`/upload/files/${uploadId}`),

  /** GET /upload/files/:id/status — detailed upload status */
  tusGetDetailedStatus: (uploadId: string) =>
    apiClient
      .get<UploadDetailedStatus>(`/upload/files/${uploadId}/status`)
      .then((r) => r.data),
};

// ── Tus Chunked Upload Helper ───────────────────────────────────────

const TUS_CHUNK_SIZE = 5 * 1024 * 1024; // 5MB per chunk

/**
 * Upload a file using the Tus resumable upload protocol.
 * Splits the file into 5MB chunks, sends them sequentially.
 */
export async function tusUploadFile(
  file: File,
  options: {
    category?: string;
    onProgress?: (percent: number) => void;
    abortSignal?: AbortSignal;
  } = {},
): Promise<string> {
  const { category, onProgress, abortSignal } = options;

  // 1. Create upload resource
  const uploadId = await pipelineApi.tusCreateUpload(file.size, {
    filename: file.name,
    filetype: file.type || 'video/mp4',
    category,
  });

  // 2. Upload chunks sequentially
  let offset = 0;
  const totalSize = file.size;

  while (offset < totalSize) {
    if (abortSignal?.aborted) {
      await pipelineApi.tusCancelUpload(uploadId);
      throw new DOMException('Upload cancelled', 'AbortError');
    }

    const end = Math.min(offset + TUS_CHUNK_SIZE, totalSize);
    const chunk = await file.slice(offset, end).arrayBuffer();

    const newOffset = await pipelineApi.tusUploadChunk(uploadId, chunk, offset);
    offset = newOffset;

    if (onProgress) {
      onProgress(Math.round((offset / totalSize) * 100));
    }
  }

  return uploadId;
}
