import { apiClient } from '@/core/api/axios-client';
import type {
  QueueItemResponse,
  QueueListResponse,
  QueueFilterParams,
  SegmentDetailResponse,
  AnnotationEditCreate,
  AnnotationEditResponse,
  AnnotationEditListResponse,
  AnnotationPreviewRequest,
  AnnotationPreviewResponse,
  SaveDraftRequest,
  SaveDraftResponse,
  ResetResponse,
  SubmitForReviewRequest,
  SubmitForReviewResponse,
  SubmissionStatusResponse,
  ReviewStatusResponse,
  ReviewStatusListResponse,
  AnnotationSyncResponse,
  AnnotationSyncUpdateRequest,
  AnnotationSyncFineTuneRequest,
  FineTuneResponse,
  AnnotationSyncValidateRequest,
  AnnotationSyncValidateResponse,
  StitchPreviewResponse,
  TimelineRangeResponse,
  AnnotationSyncContextResponse,
} from './annotation-types';

/**
 * Annotation API service.
 *
 * All endpoints require JWT (role: annotator or admin).
 * The apiClient automatically injects the Bearer token.
 */
export const annotationApi = {
  // ═══════════════════════════════════════════════════════════════════
  // Queue
  // ═══════════════════════════════════════════════════════════════════

  /** GET /annotations/queue — annotator's assigned segments */
  getQueue: (params?: QueueFilterParams & { dataset_id?: string; job_id?: string }) =>
    apiClient
      .get<QueueListResponse>('/annotations/queue', { params })
      .then((r) => r.data),

  /** Every queue item of one job, across as many pages as it takes.
   *
   *  A dataset like TVRI puts more segments in one annotator's queue than a
   *  single page holds, and the job's segments are not guaranteed to land on
   *  page 1 — fetching one page and filtering client-side silently drops
   *  segments (or the whole job). */
  getQueueForJob: async (jobId: string): Promise<QueueItemResponse[]> => {
    const pageSize = 200;
    const all: QueueItemResponse[] = [];
    for (let page = 1; ; page++) {
      const data = await apiClient
        .get<QueueListResponse>('/annotations/queue', {
          params: { page, page_size: pageSize, job_id: jobId },
        })
        .then((r) => r.data);
      all.push(...data.items);
      if (data.items.length < pageSize || page >= data.pages) break;
    }
    return all;
  },

  // ═══════════════════════════════════════════════════════════════════
  // Segment Detail
  // ═══════════════════════════════════════════════════════════════════

  /** GET /annotations/segments/:segmentId — full segment detail */
  getSegment: (segmentId: string) =>
    apiClient
      .get<SegmentDetailResponse>(`/annotations/segments/${segmentId}`)
      .then((r) => r.data),

  /** GET /annotations/:segmentId/current — current values (ASR or draft) */
  getCurrentValues: (segmentId: string) =>
    apiClient
      .get<Record<string, unknown>>(`/annotations/${segmentId}/current`)
      .then((r) => r.data),

  // ═══════════════════════════════════════════════════════════════════
  // Edits
  // ═══════════════════════════════════════════════════════════════════

  /** POST /annotations/:segmentId/edits — create new edit */
  createEdit: (segmentId: string, data: AnnotationEditCreate) =>
    apiClient
      .post<AnnotationEditResponse>(`/annotations/${segmentId}/edits`, data)
      .then((r) => r.data),

  /** GET /annotations/:segmentId/edits — edit history */
  getEditHistory: (segmentId: string) =>
    apiClient
      .get<AnnotationEditListResponse>(`/annotations/${segmentId}/edits`)
      .then((r) => r.data),

  /** POST /annotations/:segmentId/utterances/:utteranceIndex/crop — trigger physical crop */
  cropUtterance: (segmentId: string, utteranceIndex: number) =>
    apiClient
      .post<{ status: string; message: string }>(`/annotations/${segmentId}/utterances/${utteranceIndex}/crop`)
      .then((r) => r.data),

  /** GET /annotations/segments/:segmentId/utterances/:utteranceIndex/merged-video — get merged video (SIBI style) */
  getMergedVideo: (segmentId: string, utteranceIndex: number, includePrev = false) =>
    apiClient
      .get<{
        merged_video_url: string;
        merged_video_path: string;
        video_n_duration: number;
        total_duration: number;
        is_single_video?: boolean;
        /** Seconds of the annotator's OWN head trim-in kept in the tape as a
         *  recoverable gray region (start - floor). The merged video physically
         *  begins at `floor`, so mergedBase = global_start - head_offset. */
        head_offset?: number;
        /** Seconds of utterance N-1's orphan tail actually prepended to the tape.
         *  Only non-zero when requested via `includePrev`. Shifts the tape's left
         *  edge further left: mergedBase = global_start - head_offset - prev_offset. */
        prev_offset?: number;
        /** Seconds of orphan tail available to prepend — the stretch utterance N-1
         *  released by trimming in. Returned on every call so the UI knows whether
         *  to offer the lookback at all. */
        prev_available?: number;
      }>(`/annotations/segments/${segmentId}/utterances/${utteranceIndex}/merged-video`, {
        params: includePrev ? { include_prev: true } : undefined,
      })
      .then((r) => r.data),

  /** POST /annotations/:segmentId/utterances/:utteranceIndex/revert — revert a trimmed utterance to pre-trim state */
  revertUtterance: (segmentId: string, utteranceIndex: number) =>
    apiClient
      .post<{ status: string; utterance_index: number; reverted_start: number; reverted_end: number; message: string }>(
        `/annotations/${segmentId}/utterances/${utteranceIndex}/revert`
      )
      .then((r) => r.data),

  // ═══════════════════════════════════════════════════════════════════
  // Draft & Preview
  // ═══════════════════════════════════════════════════════════════════

  /** POST /annotations/:segmentId/draft — save as draft */
  saveDraft: (segmentId: string, data: SaveDraftRequest) =>
    apiClient
      .post<SaveDraftResponse>(`/annotations/${segmentId}/draft`, data)
      .then((r) => r.data),

  /** POST /annotations/:segmentId/preview — get preview video URL */
  getPreview: (segmentId: string, data: AnnotationPreviewRequest) =>
    apiClient
      .post<AnnotationPreviewResponse>(`/annotations/${segmentId}/preview`, data)
      .then((r) => r.data),

  // ═══════════════════════════════════════════════════════════════════
  // Reset
  // ═══════════════════════════════════════════════════════════════════

  /** POST /annotations/:segmentId/reset — reset to ASR original */
  resetToOriginal: (segmentId: string) =>
    apiClient
      .post<ResetResponse>(`/annotations/${segmentId}/reset`)
      .then((r) => r.data),

  // ═══════════════════════════════════════════════════════════════════
  // Submission & Review
  // ═══════════════════════════════════════════════════════════════════

  /** GET /annotations/:segmentId/submission-status — check if can submit */
  checkSubmissionStatus: (segmentId: string) =>
    apiClient
      .get<SubmissionStatusResponse>(`/annotations/${segmentId}/submission-status`)
      .then((r) => r.data),

  /** POST /annotations/:segmentId/submit — submit for curator review */
  submitForReview: (segmentId: string, data?: SubmitForReviewRequest) =>
    apiClient
      .post<SubmitForReviewResponse>(`/annotations/${segmentId}/submit`, data ?? {})
      .then((r) => r.data),

  /** GET /annotations/:segmentId/review-status — get review result */
  getReviewStatus: (segmentId: string) =>
    apiClient
      .get<ReviewStatusResponse>(`/annotations/${segmentId}/review-status`)
      .then((r) => r.data),

  /** GET /annotations/my-submissions — list all my submissions */
  getMySubmissions: (params?: { status?: string; page?: number; page_size?: number }) =>
    apiClient
      .get<ReviewStatusListResponse>('/annotations/my-submissions', { params })
      .then((r) => r.data),

  // ═══════════════════════════════════════════════════════════════════
  // Annotation Sync (Video-Audio Temporal Alignment)
  // ═══════════════════════════════════════════════════════════════════

  /** GET /annotations/sync/:editId — get sync data */
  getSyncData: (editId: string) =>
    apiClient
      .get<AnnotationSyncResponse>(`/annotations/sync/${editId}`)
      .then((r) => r.data),

  /** PUT /annotations/sync/:editId — update video boundaries */
  updateSyncBoundaries: (editId: string, data: AnnotationSyncUpdateRequest) =>
    apiClient
      .put<AnnotationSyncResponse>(`/annotations/sync/${editId}`, data)
      .then((r) => r.data),

  /** POST /annotations/sync/:editId/fine-tune — fine-tune ±ms */
  fineTuneSync: (editId: string, data: AnnotationSyncFineTuneRequest) =>
    apiClient
      .post<FineTuneResponse>(`/annotations/sync/${editId}/fine-tune`, data)
      .then((r) => r.data),

  /** POST /annotations/sync/:editId/validate — validate & set indicators */
  validateSync: (editId: string, data: AnnotationSyncValidateRequest) =>
    apiClient
      .post<AnnotationSyncValidateResponse>(`/annotations/sync/${editId}/validate`, data)
      .then((r) => r.data),

  /** GET /annotations/sync/:editId/preview — stitched video preview */
  getStitchedPreview: (editId: string, bufferSeconds?: number) =>
    apiClient
      .get<StitchPreviewResponse>(`/annotations/sync/${editId}/preview`, {
        params: bufferSeconds ? { buffer_seconds: bufferSeconds } : undefined,
      })
      .then((r) => r.data),

  /** GET /annotations/sync/:editId/timeline — timeline range config */
  getTimelineRange: (editId: string) =>
    apiClient
      .get<TimelineRangeResponse>(`/annotations/sync/${editId}/timeline`)
      .then((r) => r.data),

  /** GET /annotations/sync/segments/:segmentId/context — context with neighbors */
  getSyncContext: (segmentId: string, contextRange?: number) =>
    apiClient
      .get<AnnotationSyncContextResponse>(`/annotations/sync/segments/${segmentId}/context`, {
        params: contextRange ? { context_range: contextRange } : undefined,
      })
      .then((r) => r.data),
};
