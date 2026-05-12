import { apiClient } from '@/core/api/axios-client';
import type {
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
  getQueue: (params?: QueueFilterParams) =>
    apiClient
      .get<QueueListResponse>('/annotations/queue', { params })
      .then((r) => r.data),

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
  getMergedVideo: (segmentId: string, utteranceIndex: number) =>
    apiClient
      .get<{
        merged_video_url: string;
        merged_video_path: string;
        video_n_duration: number;
        total_duration: number;
        is_single_video?: boolean;
      }>(`/annotations/segments/${segmentId}/utterances/${utteranceIndex}/merged-video`)
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
