/**
 * ASR Review feature TypeScript types.
 * Derived from OpenAPI spec schemas for /asr-review endpoints.
 */

// ── Queue ───────────────────────────────────────────────────────────

export interface ASRReviewQueueItem {
  review_id: string;
  segment_id: string;
  job_id: string;
  original_filename: string;
  video_url: string;
  asr_text: string;
  asr_start: number | null;
  asr_end: number | null;
  confidence_score: number | null;
  is_low_confidence: boolean;
  requires_attention: boolean;
}

export interface ASRReviewQueueResponse {
  items: ASRReviewQueueItem[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
  low_confidence_count: number;
}

export interface ASRReviewQueueParams {
  low_confidence_only?: boolean;
  page?: number;
  page_size?: number;
}

// ── Detail ──────────────────────────────────────────────────────────

export interface ASRReviewDetailResponse {
  review_id: string;
  segment_id: string;
  job_id: string;
  original_filename: string;
  video_url: string;
  video_duration: number | null;
  asr_text: string;
  asr_start: number | null;
  asr_end: number | null;
  confidence_score: number | null;
  status: string;
  reviewer_id: string | null;
  reviewed_at: string | null;
  is_low_confidence: boolean;
  attention_message: string | null;
}

// ── Status Check ────────────────────────────────────────────────────

export interface ASRReviewStatusCheck {
  review_id: string;
  segment_id: string;
  is_reviewed: boolean;
  status: string | null;
  reviewer_id: string | null;
  can_review: boolean;
  message: string;
}

// ── Action Requests ─────────────────────────────────────────────────

export interface ASRReviewApproveRequest {
  notes?: string | null;
}

export interface ASRReviewCorrectRequest {
  corrected_text: string;
  notes?: string | null;
}

export type ASRFlagReason =
  | 'background_noise'
  | 'overlapping_speech'
  | 'unclear_audio'
  | 'other';

export interface ASRReviewFlagRequest {
  flag_reason: ASRFlagReason;
  notes: string;
}

// ── Action Response ─────────────────────────────────────────────────

export interface ASRReviewActionResponse {
  review_id: string;
  segment_id: string;
  action: string;
  status: string;
  reviewer_id: string;
  reviewed_at: string;
  message: string;
  moved_to_annotation_queue: boolean;
  queue_entry_id: string | null;
}

// ── By-Segment Response ─────────────────────────────────────────────

export interface ASRReviewBySegmentResponse {
  segment_id: string;
  has_review: boolean;
  review?: {
    review_id: string;
    segment_id: string;
    status: string;
    confidence_score: number | null;
    is_pending: boolean;
  };
  message?: string;
}

// ── Status Constants ────────────────────────────────────────────────

export const ASR_REVIEW_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  CORRECTED: 'CORRECTED',
  FLAGGED: 'FLAGGED',
} as const;

export const FLAG_REASONS: { value: ASRFlagReason; label: string }[] = [
  { value: 'background_noise', label: 'Background Noise' },
  { value: 'overlapping_speech', label: 'Overlapping Speech' },
  { value: 'unclear_audio', label: 'Audio Tidak Jelas' },
  { value: 'other', label: 'Lainnya' },
];
