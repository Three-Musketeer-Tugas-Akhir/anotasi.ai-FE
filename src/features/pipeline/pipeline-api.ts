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
  JobRetryResponse,
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

  /** POST /pipeline/jobs/:id/retry — retry a failed job */
  retryJob: (jobId: string, mode: 'full' | 'from_failed_stage') =>
    apiClient
      .post<JobRetryResponse>(`/pipeline/jobs/${jobId}/retry`, { mode })
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

  /** PATCH /upload/files/:id — send a chunk using XMLHttpRequest for reliable progress tracking */
  tusUploadChunk: async (
    uploadId: string,
    chunk: ArrayBuffer,
    offset: number,
    signal?: AbortSignal,
    onChunkProgress?: (loaded: number) => void,
  ): Promise<number> => {
    const token = typeof window !== 'undefined'
      ? localStorage.getItem('auth_token')
      : null;

    return new Promise<number>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PATCH', `${env.API_URL}/upload/files/${uploadId}`);

      // Set headers
      xhr.setRequestHeader('Upload-Offset', String(offset));
      xhr.setRequestHeader('Content-Length', String(chunk.byteLength));
      xhr.setRequestHeader('Content-Type', 'application/offset+octet-stream');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      // Wire abort signal
      if (signal) {
        if (signal.aborted) {
          xhr.abort();
          reject(new DOMException('Upload cancelled', 'AbortError'));
          return;
        }
        signal.addEventListener('abort', () => xhr.abort(), { once: true });
      }

      // ── Upload progress (fires continuously during send) ──
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onChunkProgress) {
          onChunkProgress(e.loaded);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const newOffset = parseInt(
            xhr.getResponseHeader('upload-offset') || '0',
            10,
          );
          resolve(newOffset);
        } else {
          reject(
            new Error(
              `Chunk upload failed (HTTP ${xhr.status}): ${xhr.responseText || 'Unknown error'}`,
            ),
          );
        }
      };

      xhr.onerror = () => reject(new Error('Network error during chunk upload'));
      xhr.ontimeout = () => reject(new Error('Chunk upload timed out'));
      xhr.onabort = () => reject(new DOMException('Upload cancelled', 'AbortError'));

      // 5 min timeout per chunk (50MB on slow connections)
      xhr.timeout = 5 * 60 * 1000;

      xhr.send(chunk);
    });
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

const TUS_CHUNK_SIZE = 50 * 1024 * 1024; // 50MB per chunk (matches backend)
const MAX_RETRIES = 5;
const RETRY_BASE_DELAY_MS = 1000;
const ASSEMBLY_POLL_INTERVAL_MS = 3000;
const ASSEMBLY_MAX_POLL_MS = 10 * 60 * 1000; // 10 minutes for large file assembly
const PARALLEL_CHUNKS = 3; // Upload 3 chunks concurrently

interface TusUploadResult {
  uploadId: string;
  jobId: string | null;
}

interface TusUploadProgress {
  percent: number;
  speed: number;      // bytes per second
  eta: number;         // seconds remaining
  uploaded: number;    // bytes uploaded so far
  total: number;       // total bytes
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function uploadChunkWithRetry(
  uploadId: string,
  chunk: ArrayBuffer,
  offset: number,
  signal?: AbortSignal,
  onChunkProgress?: (loaded: number) => void,
): Promise<number> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (signal?.aborted) {
      throw new DOMException('Upload cancelled', 'AbortError');
    }

    try {
      const newOffset = await pipelineApi.tusUploadChunk(
        uploadId, chunk, offset, signal, onChunkProgress,
      );
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
 * Performance features:
 * - **Parallel uploads**: sends up to 3 chunks concurrently (sliding window)
 * - **50 MB chunks**: 5× fewer HTTP round-trips than 10 MB
 * - **Resume capability**: checks server offset before starting
 * - **Retry with exponential backoff**: each chunk retried up to 5 times
 * - **Speed & ETA**: reports upload speed and estimated time remaining
 */
export async function tusUploadFile(
  file: File,
  options: {
    category?: string;
    dataset_id?: string;
    onProgress?: (percent: number) => void;
    onDetailedProgress?: (detail: TusUploadProgress) => void;
    abortSignal?: AbortSignal;
  } = {},
): Promise<TusUploadResult> {
  const { category, dataset_id, onProgress, onDetailedProgress, abortSignal } = options;

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
  let startOffset = 0;
  try {
    startOffset = await pipelineApi.tusGetOffset(uploadId);
    if (startOffset > 0) {
      console.log(`[TUS] Resuming from offset ${startOffset}`);
    }
  } catch {
    startOffset = 0;
  }

  const totalSize = file.size;
  const totalChunks = Math.ceil(totalSize / TUS_CHUNK_SIZE);

  // ── Speed / ETA tracking with intra-chunk granularity ─────────────
  let bytesConfirmed = startOffset;          // Bytes fully confirmed by server
  const inFlightProgress = new Map<number, number>(); // chunkIndex → bytes uploaded so far
  const uploadStartTime = Date.now();
  let lastReportTime = uploadStartTime;
  let lastReportBytes = startOffset;

  const reportProgress = () => {
    // Total = confirmed + partial progress of in-flight chunks
    const inFlightBytes = [...inFlightProgress.values()].reduce((a, b) => a + b, 0);
    const effectiveUploaded = bytesConfirmed + inFlightBytes;
    const percent = Math.min(99, Math.round((effectiveUploaded / totalSize) * 100));
    onProgress?.(percent);

    // Calculate speed over the last window
    const now = Date.now();
    const elapsed = (now - lastReportTime) / 1000;
    const totalElapsed = (now - uploadStartTime) / 1000;

    let speed = 0;
    if (elapsed > 0.5) {
      speed = (effectiveUploaded - lastReportBytes) / elapsed;
      lastReportTime = now;
      lastReportBytes = effectiveUploaded;
    } else if (totalElapsed > 0) {
      speed = (effectiveUploaded - startOffset) / totalElapsed;
    }

    const remaining = totalSize - effectiveUploaded;
    const eta = speed > 0 ? remaining / speed : 0;

    onDetailedProgress?.({ percent, speed, eta, uploaded: effectiveUploaded, total: totalSize });
  };

  reportProgress();

  // 3. Build list of chunks that still need to be uploaded
  const startChunkIndex = Math.floor(startOffset / TUS_CHUNK_SIZE);
  const pendingChunks: Array<{ index: number; offset: number; end: number }> = [];

  for (let i = startChunkIndex; i < totalChunks; i++) {
    const chunkOffset = i * TUS_CHUNK_SIZE;
    if (chunkOffset < startOffset) continue; // skip already-uploaded chunks
    const chunkEnd = Math.min(chunkOffset + TUS_CHUNK_SIZE, totalSize);
    pendingChunks.push({ index: i, offset: chunkOffset, end: chunkEnd });
  }

  // 4. Upload chunks with PARALLEL sliding window + real-time progress
  console.log(
    `[TUS] Uploading ${pendingChunks.length} chunks (${PARALLEL_CHUNKS} parallel, ${TUS_CHUNK_SIZE / 1024 / 1024}MB each)`
  );

  let cursor = 0;
  const inFlight = new Map<number, Promise<void>>();

  while (cursor < pendingChunks.length || inFlight.size > 0) {
    if (abortSignal?.aborted) {
      try { await pipelineApi.tusCancelUpload(uploadId); } catch { /* ignore */ }
      throw new DOMException('Upload cancelled', 'AbortError');
    }

    // Launch new chunks up to PARALLEL_CHUNKS concurrency
    while (cursor < pendingChunks.length && inFlight.size < PARALLEL_CHUNKS) {
      const chunk = pendingChunks[cursor];
      const chunkBlob = file.slice(chunk.offset, chunk.end);

      // Track partial progress for this chunk
      inFlightProgress.set(chunk.index, 0);

      const chunkPromise = (async () => {
        const chunkBuffer = await chunkBlob.arrayBuffer();
        console.log(
          `[TUS] Uploading chunk ${chunk.index + 1}/${totalChunks} ` +
          `(${chunk.offset}-${chunk.end}, ${chunkBuffer.byteLength} bytes)`
        );
        await uploadChunkWithRetry(
          uploadId,
          chunkBuffer,
          chunk.offset,
          abortSignal,
          // Intra-chunk progress callback (fires continuously via XHR)
          (loaded: number) => {
            inFlightProgress.set(chunk.index, loaded);
            reportProgress();
          },
        );
        // Chunk complete: move its bytes from in-flight to confirmed
        inFlightProgress.delete(chunk.index);
        bytesConfirmed = Math.max(bytesConfirmed, chunk.end);
        reportProgress();
      })();

      inFlight.set(chunk.index, chunkPromise);
      cursor++;
    }

    // Wait for at least one to complete before launching more
    if (inFlight.size > 0) {
      const [settled, success, error] = await Promise.race(
        [...inFlight.entries()].map(([idx, p]) =>
          p.then(() => [idx, true, null] as const)
           .catch((err) => [idx, false, err] as const)
        )
      );
      inFlight.delete(settled);

      if (!success) {
        // Cancel remaining in-flight uploads and abort
        const remaining = [...inFlight.values()];
        inFlight.clear();
        await Promise.allSettled(remaining);
        throw error;
      }
    }
  }

  // Verify all chunks were actually received by server before polling
  const finalOffset = await pipelineApi.tusGetOffset(uploadId);
  if (finalOffset < totalSize) {
    throw new Error(
      `Upload incomplete: server reports ${finalOffset}/${totalSize} bytes. ` +
      `Some chunks may have failed to upload.`
    );
  }

  console.log(`[TUS] All chunks uploaded and verified. Polling for assembly...`);

  // 5. Poll assembly status until job is created
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
      if (err instanceof Error && err.message.includes('assembly failed')) {
        throw err;
      }
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

