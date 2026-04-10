import { apiClient } from '@/core/api/axios-client';
import type {
  ASRReviewQueueResponse,
  ASRReviewQueueParams,
  ASRReviewDetailResponse,
  ASRReviewStatusCheck,
  ASRReviewApproveRequest,
  ASRReviewCorrectRequest,
  ASRReviewFlagRequest,
  ASRReviewActionResponse,
  ASRReviewBySegmentResponse,
} from './asr-review-types';

/**
 * ASR Review API service.
 *
 * All endpoints are protected (JWT required, role: annotator or admin).
 * The apiClient automatically injects the Bearer token from localStorage.
 */
export const asrReviewApi = {
  // ═══════════════════════════════════════════════════════════════════
  // Queue & Detail (read)
  // ═══════════════════════════════════════════════════════════════════

  /** GET /asr-review/queue — list pending ASR reviews */
  getQueue: (params?: ASRReviewQueueParams) =>
    apiClient
      .get<ASRReviewQueueResponse>('/asr-review/queue', { params })
      .then((r) => r.data),

  /** GET /asr-review/:id — get complete review detail with video URL */
  getDetail: (reviewId: string) =>
    apiClient
      .get<ASRReviewDetailResponse>(`/asr-review/${reviewId}`)
      .then((r) => r.data),

  /** GET /asr-review/by-segment/:segmentId — check review by segment */
  getBySegment: (segmentId: string) =>
    apiClient
      .get<ASRReviewBySegmentResponse>(`/asr-review/by-segment/${segmentId}`)
      .then((r) => r.data),

  /** GET /asr-review/:id/status — check if review can be performed */
  checkStatus: (reviewId: string) =>
    apiClient
      .get<ASRReviewStatusCheck>(`/asr-review/${reviewId}/status`)
      .then((r) => r.data),

  // ═══════════════════════════════════════════════════════════════════
  // Actions (write)
  // ═══════════════════════════════════════════════════════════════════

  /** POST /asr-review/:id/approve — approve transcript as-is */
  approve: (reviewId: string, data: ASRReviewApproveRequest) =>
    apiClient
      .post<ASRReviewActionResponse>(`/asr-review/${reviewId}/approve`, data)
      .then((r) => r.data),

  /** POST /asr-review/:id/correct — submit corrected transcript */
  correct: (reviewId: string, data: ASRReviewCorrectRequest) =>
    apiClient
      .post<ASRReviewActionResponse>(`/asr-review/${reviewId}/correct`, data)
      .then((r) => r.data),

  /** POST /asr-review/:id/flag — flag for reprocessing */
  flag: (reviewId: string, data: ASRReviewFlagRequest) =>
    apiClient
      .post<ASRReviewActionResponse>(`/asr-review/${reviewId}/flag`, data)
      .then((r) => r.data),
};
