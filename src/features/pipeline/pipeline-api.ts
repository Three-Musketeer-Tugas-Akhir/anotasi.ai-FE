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
    metadata: { filename: string; filetype: string; category?: string; dataset_id?: string },
  ): Promise<string> => {
    // Safe base64 encode that supports unicode characters
    const toB64 = (str: string) => {
      try {
        return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(Number('0x' + p1))));
      } catch {
        return btoa(str);
      }
    };

    const metaParts: string[] = [];
    metaParts.push(`filename ${toB64(metadata.filename)}`);
    metaParts.push(`filetype ${toB64(metadata.filetype)}`);
    if (metadata.category) {
      metaParts.push(`category ${toB64(metadata.category)}`);
    }
    if (metadata.dataset_id) {
      metaParts.push(`dataset_id ${toB64(metadata.dataset_id)}`);
    }

    const response = await apiClient.post('/upload/files', null, {
      headers: {
        'Upload-Length': String(fileSize),
        'Upload-Metadata': metaParts.join(','),
        'Content-Type': 'application/offset+octet-stream',
      },
      timeout: 60_000, // 60s timeout for create
    });

    // Try Upload-Id header first (our custom header), then fallback to Location
    const uploadId =
      response.headers['upload-id'] ||
      (response.headers['location'] || '').split('/').pop() ||
      '';

    if (!uploadId) {
      throw new Error('Server did not return a valid upload ID (Upload-Id / Location header missing)');
    }
    return uploadId;
  },

  /** HEAD /upload/files/:id — get current upload offset */
  tusGetOffset: async (uploadId: string): Promise<number> => {
    const response = await apiClient.head(`/upload/files/${uploadId}`, {
      timeout: 30_000,
    });
    return parseInt(response.headers['upload-offset'] || '0', 10);
  },

  /** PATCH /upload/files/:id — send a chunk using fetch() for reliable binary transport */
  tusUploadChunk: async (
    uploadId: string,
    chunk: ArrayBuffer,
    offset: number,
    signal?: AbortSignal,
  ): Promise<number> => {
    // Use fetch() instead of axios for raw binary uploads
    // Axios can interfere with Content-Type and body encoding
    const token = typeof window !== 'undefined'
      ? localStorage.getItem('auth_token')
      : null;

    const headers: Record<string, string> = {
      'Upload-Offset': String(offset),
      'Content-Length': String(chunk.byteLength),
      'Content-Type': 'application/offset+octet-stream',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${env.API_URL}/upload/files/${uploadId}`, {
      method: 'PATCH',
      headers,
      body: chunk,
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(
        `Chunk upload failed (HTTP ${response.status}): ${errorText}`
      );
    }

    const newOffset = parseInt(response.headers.get('upload-offset') || '0', 10);
    return newOffset;
  },

  /** DELETE /upload/files/:id — cancel upload */
  tusCancelUpload: (uploadId: string) =>
    apiClient.delete(`/upload/files/${uploadId}`),

  /** GET /upload/files/:id/status — detailed upload status */
  tusGetDetailedStatus: (uploadId: string) =>
    apiClient
      .get<UploadDetailedStatus>(`/upload/files/${uploadId}/status`, {
        timeout: 30_000,
      })
      .then((r) => r.data),
};

// ── Robust Tus Chunked Upload Helper ─────────────────────────────────

const TUS_CHUNK_SIZE = 10 * 1024 * 1024; // 10MB per chunk (matches backend)
const MAX_RETRIES = 5;
const RETRY_BASE_DELAY_MS = 1000;
const ASSEMBLY_POLL_INTERVAL_MS = 3000;
const ASSEMBLY_MAX_POLL_MS = 10 * 60 * 1000; // 10 minutes for large file assembly

interface TusUploadResult {
  uploadId: string;
  jobId: string | null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function uploadChunkWithRetry(
  uploadId: string,
  chunk: ArrayBuffer,
  offset: number,
  signal?: AbortSignal,
): Promise<number> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (signal?.aborted) {
      throw new DOMException('Upload cancelled', 'AbortError');
    }

    try {
      const newOffset = await pipelineApi.tusUploadChunk(uploadId, chunk, offset, signal);
      return newOffset;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (signal?.aborted) {
        throw new DOMException('Upload cancelled', 'AbortError');
      }

      // Parse error for HTTP status
      const errMsg = lastError.message || '';
      const statusMatch = errMsg.match(/HTTP (\d+)/);
      const httpStatus = statusMatch ? parseInt(statusMatch[1], 10) : 0;

      // Don't retry on 4xx client errors (except 409 conflict / 423 locked)
      if (httpStatus >= 400 && httpStatus < 500 && httpStatus !== 409 && httpStatus !== 423) {
        throw lastError;
      }

      if (attempt < MAX_RETRIES) {
        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
        console.warn(
          `[TUS] Chunk at offset ${offset} failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}), ` +
          `retrying in ${delay}ms: ${errMsg}`
        );
        await sleep(delay);
      }
    }
  }

  throw lastError ?? new Error(`Failed to upload chunk at offset ${offset} after ${MAX_RETRIES} retries`);
}

/**
 * Upload a file using the Tus resumable upload protocol.
 *
 * Features:
 * - Resume capability: checks server offset before starting
 * - Sequential upload: sends chunks one at a time (reliable for large files)
 * - Retry with exponential backoff: each chunk retried up to 5 times
 * - Assembly polling: waits for server-side assembly and job creation
 * - Returns the created job_id once complete
 */
export async function tusUploadFile(
  file: File,
  options: {
    category?: string;
    dataset_id?: string;
    onProgress?: (percent: number) => void;
    abortSignal?: AbortSignal;
  } = {},
): Promise<TusUploadResult> {
  const { category, dataset_id, onProgress, abortSignal } = options;

  if (abortSignal?.aborted) {
    throw new DOMException('Upload cancelled', 'AbortError');
  }

  // 1. Create upload resource
  console.log(`[TUS] Creating upload for ${file.name} (${file.size} bytes)`);
  const uploadId = await pipelineApi.tusCreateUpload(file.size, {
    filename: file.name,
    filetype: file.type || 'video/mp4',
    category,
    dataset_id,
  });
  console.log(`[TUS] Upload created: ${uploadId}`);

  // 2. Check if resumable (get current server offset)
  let currentOffset = 0;
  try {
    currentOffset = await pipelineApi.tusGetOffset(uploadId);
    if (currentOffset > 0) {
      console.log(`[TUS] Resuming from offset ${currentOffset}`);
    }
  } catch {
    // If HEAD fails, start from 0
    currentOffset = 0;
  }

  const totalSize = file.size;
  const totalChunks = Math.ceil(totalSize / TUS_CHUNK_SIZE);

  // Progress helper
  const reportProgress = (bytesUploaded: number) => {
    if (!onProgress) return;
    const percent = Math.min(99, Math.round((bytesUploaded / totalSize) * 100));
    onProgress(percent);
  };

  reportProgress(currentOffset);

  // 3. Upload chunks SEQUENTIALLY (reliable, avoids race conditions)
  while (currentOffset < totalSize) {
    if (abortSignal?.aborted) {
      // Try to cancel on server
      try { await pipelineApi.tusCancelUpload(uploadId); } catch { /* ignore */ }
      throw new DOMException('Upload cancelled', 'AbortError');
    }

    const chunkStart = currentOffset;
    const chunkEnd = Math.min(chunkStart + TUS_CHUNK_SIZE, totalSize);
    const chunkBlob = file.slice(chunkStart, chunkEnd);
    const chunkBuffer = await chunkBlob.arrayBuffer();

    const chunkIndex = Math.floor(chunkStart / TUS_CHUNK_SIZE);
    console.log(
      `[TUS] Uploading chunk ${chunkIndex + 1}/${totalChunks} ` +
      `(${chunkStart}-${chunkEnd}, ${chunkBuffer.byteLength} bytes)`
    );

    const newOffset = await uploadChunkWithRetry(
      uploadId,
      chunkBuffer,
      chunkStart,
      abortSignal,
    );

    currentOffset = newOffset;
    reportProgress(currentOffset);
  }

  console.log(`[TUS] All chunks uploaded. Polling for assembly...`);

  // 4. Poll assembly status until job is created
  if (onProgress) onProgress(99);

  const startPoll = Date.now();
  let jobId: string | null = null;

  while (Date.now() - startPoll < ASSEMBLY_MAX_POLL_MS) {
    if (abortSignal?.aborted) {
      throw new DOMException('Upload cancelled', 'AbortError');
    }

    try {
      const uploadStatus = await pipelineApi.tusGetDetailedStatus(uploadId);

      if (uploadStatus.status === 'complete' && uploadStatus.pipeline_job?.job_id) {
        jobId = uploadStatus.pipeline_job.job_id;
        console.log(`[TUS] Assembly complete. Job ID: ${jobId}`);
        break;
      }

      if (uploadStatus.status === 'failed') {
        throw new Error('Upload assembly failed on the server');
      }

      console.log(`[TUS] Assembly status: ${uploadStatus.status}, waiting...`);
    } catch (err) {
      // If it's a real error (not just "still assembling"), check if critical
      if (err instanceof Error && err.message.includes('assembly failed')) {
        throw err;
      }
      // Otherwise keep polling
      console.warn(`[TUS] Poll error (will retry): ${err}`);
    }

    await sleep(ASSEMBLY_POLL_INTERVAL_MS);
  }

  if (!jobId) {
    throw new Error(
      'Upload completed but server timed out assembling the file. ' +
      'The file may still be processing — check the dashboard.'
    );
  }

  if (onProgress) onProgress(100);

  return { uploadId, jobId };
}
