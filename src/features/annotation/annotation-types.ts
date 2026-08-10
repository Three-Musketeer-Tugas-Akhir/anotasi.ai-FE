/**
 * Annotation feature TypeScript types.
 * Derived from OpenAPI spec + jbi-service/app/schemas/annotation.py
 */

// ── Utterance-Level Types (NEW) ─────────────────────────────────────

export interface TranscriptUtterance {
  utterance_index: number;
  text: string;
  start: number;
  end: number;
  confidence: number;
  segment_id?: string;
  video_path?: string;
}

export interface UtteranceCorrection {
  utterance_index: number;
  text: string;
  start: number;           // Local timestamp (relative to segment video)
  end: number;             // Local timestamp (relative to segment video)
  cropped_video_path?: string;
  status?: string;
  segment_id?: string;
  confidence?: number;
  // ── Virtual Continuous Timeline (FE-only, never sent to API) ──
  global_start?: number;   // start + segment_offset
  global_end?: number;     // end + segment_offset
  segment_offset?: number; // Cumulative duration of all previous segments
  segment_video_url?: string; // Video URL for the segment this utterance belongs to
}

// ── Queue ───────────────────────────────────────────────────────────

export interface QueueItemResponse {
  id: string;
  segment_id: string;
  job_id: string;
  /** Index of this segment within its job — the canonical ordering key. */
  segment_index?: number | null;
  original_filename: string;
  video_preview_url: string;
  transcript_text: string | null;
  utterance_count: number;
  completed_utterance_count?: number;
  asr_confidence: number | null;
  status: string;
  priority: number;
  assigned_at: string;
  due_date: string | null;
  // ── New fields (edit_id support) ──
  edit_id: string | null;
  edit_status: 'DRAFT' | 'PENDING' | 'SUBMITTED' | null;
  has_active_work: boolean;
  last_edited_at: string | null;
}

export interface QueueListResponse {
  items: QueueItemResponse[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface QueueFilterParams {
  status?: string | null;
  page?: number;
  page_size?: number;
}

// ── Segment Detail ──────────────────────────────────────────────────

export interface SegmentEditHistory {
  edit_id: string;
  old_text: string | null;
  new_text: string;
  old_start: number | null;
  new_start: number;
  old_end: number | null;
  new_end: number;
  edited_at: string;
  status: string;
}

export interface SegmentDetailResponse {
  segment_id: string;
  job_id: string;
  /** Index of this segment within its job — the canonical ordering key. */
  segment_index?: number | null;
  original_filename: string;
  video_url: string;
  video_duration: number | null;

  // NEW: full utterance list
  transcripts: TranscriptUtterance[];
  avg_confidence: number | null;
  current_utterances: UtteranceCorrection[] | null;

  // DEPRECATED but kept for backward compat
  asr_text: string | null;
  asr_start: number | null;
  asr_end: number | null;
  asr_confidence: number | null;
  jbi_start: number | null;
  jbi_end: number | null;

  current_text: string;
  current_start: number;
  current_end: number;
  edit_history: SegmentEditHistory[];
  queue_status: string;
  priority: number;
}

// ── Annotation Edit ─────────────────────────────────────────────────

export interface AnnotationEditCreate {
  utterances: UtteranceCorrection[];
}

export interface AnnotationEditResponse {
  id: string;
  segment_id: string;
  editor_id: string | null;
  old_text: string | null;
  old_start: number | null;
  old_end: number | null;
  new_text: string;
  new_start: number;
  new_end: number;
  status: string;
  is_deleted: boolean;
  edited_at: string;
  submitted_at: string | null;
}

export interface AnnotationEditListResponse {
  segment_id: string;
  edits: AnnotationEditResponse[];
  total: number;
}

// ── Preview ─────────────────────────────────────────────────────────

export interface AnnotationPreviewRequest {
  start_time: number;
  end_time: number;
  transcript_text?: string | null;
}

export interface AnnotationPreviewResponse {
  segment_id: string;
  video_url: string;
  start_time: number;
  end_time: number;
  transcript_text: string | null;
  duration: number;
}

// ── Draft ───────────────────────────────────────────────────────────

export interface SaveDraftRequest {
  utterances: UtteranceCorrection[];
}

export interface SaveDraftResponse {
  edit_id: string;
  segment_id: string;
  status: string;
  saved_at: string;
  message?: string; // has default 'Draft saved successfully'
}

// ── Reset ───────────────────────────────────────────────────────────

export interface ResetResponse {
  segment_id: string;
  reset_edit_id: string;
  edits_removed: number;
  message: string;
  /** Generic object — BE schema is additionalProperties:true.
   *  Expected keys: text, start, end (but not guaranteed) */
  reverted_to: Record<string, unknown>;
}

// ── Submission ──────────────────────────────────────────────────────

export interface SubmitForReviewRequest {
  confirm_no_changes?: boolean;
}

export interface SubmitForReviewResponse {
  segment_id: string;
  edit_id: string;
  review_id: string;
  status: string;
  message: string;
  submitted_at: string;
}

export interface SubmissionStatusResponse {
  segment_id: string;
  has_edits: boolean;
  edit_count: number;
  last_edit_status: string | null;
  can_submit: boolean;
  warning: string | null;
}

// ── Review Status ───────────────────────────────────────────────────

export interface ReviewStatusResponse {
  segment_id: string;
  job_id?: string;
  original_filename?: string;
  review_id: string;
  status: string;
  submitted_at: string;
  reviewed_at: string | null;
  curator_id: string | null;
  feedback: string | null;
}

export interface ReviewStatusListResponse {
  items: ReviewStatusResponse[];
  total: number;
}

// ── Status Constants ────────────────────────────────────────────────

export const QUEUE_STATUS = {
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
} as const;

export const EDIT_STATUS = {
  DRAFT: 'DRAFT',
  PENDING: 'PENDING',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

export const REVIEW_STATUS = {
  NOT_SUBMITTED: 'NOT_SUBMITTED',
  SUBMITTED: 'SUBMITTED',
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

// ── Sync Status ─────────────────────────────────────────────────────

export const SYNC_STATUS = {
  UNSYNCED: 'UNSYNCED',
  PARTIAL: 'PARTIAL',
  SYNCED: 'SYNCED',
  LOCKED: 'LOCKED',
} as const;

export type SyncStatusType = (typeof SYNC_STATUS)[keyof typeof SYNC_STATUS];

// ── Sync Quality Indicators ─────────────────────────────────────────

export interface SyncStatusIndicators {
  text_match: boolean;
  video_complete: boolean;
  sync_locked: boolean;
}

// ── Sync Response ───────────────────────────────────────────────────

export interface AnnotationSyncResponse {
  id: string;
  annotation_edit_id: string;
  audio_start: number;
  audio_end: number;
  audio_duration: number;
  video_start_offset: number | null;
  video_end_offset: number | null;
  video_duration: number;
  extension_seconds: number;
  sync_status: string;
  glosa: string | null;
  precision_ms: number;
  indicators: SyncStatusIndicators;
  created_at: string;
  updated_at: string;
}

// ── Sync Update Request ─────────────────────────────────────────────

export interface AnnotationSyncUpdateRequest {
  video_start_offset?: number;
  video_end_offset?: number;
  glosa?: string;
  precision_ms?: number;
}

// ── Sync Fine-Tune ──────────────────────────────────────────────────

export interface AnnotationSyncFineTuneRequest {
  adjustment_ms: number;
  target: 'start' | 'end' | 'both';
}

export interface FineTuneResponse {
  edit_id: string;
  adjustment_ms: number;
  previous_start: number | null;
  previous_end: number | null;
  new_start: number | null;
  new_end: number | null;
  video_duration: number;
  message: string;
}

// ── Sync Validate ───────────────────────────────────────────────────

export interface AnnotationSyncValidateRequest {
  text_match: boolean;
  video_complete: boolean;
  sync_locked: boolean;
}

export interface AnnotationSyncValidateResponse {
  edit_id: string;
  is_valid: boolean;
  sync_status: string;
  indicators: SyncStatusIndicators;
  warnings: string[];
  suggestions: string[];
}

// ── Stitch Preview ──────────────────────────────────────────────────

export interface StitchedSegment {
  segment_id: string;
  start: number;
  end: number;
  url: string;
}

export interface StitchPreviewResponse {
  edit_id: string;
  segment_id: string;
  original_start: number;
  original_end: number;
  stitched_start: number;
  stitched_end: number;
  total_duration: number;
  video_url: string;
  requires_stitching: boolean;
  stitched_segments: StitchedSegment[];
  sync_status: string;
  extension_seconds: number;
}

// ── Timeline Range ──────────────────────────────────────────────────

export interface TimelineRangeResponse {
  edit_id: string;
  audio_start: number;
  audio_end: number;
  video_start: number;
  video_end: number;
  playhead_position: number;
  text_overlay: string;
  min_bound: number;
  max_bound: number;
  step: number;
}

// ── Sync Context ────────────────────────────────────────────────────

export interface SyncContextItem {
  segment_id: string;
  transcript_id: string;
  text: string;
  audio_start: number;
  audio_end: number;
  video_available: boolean;
  has_sync_data: boolean;
}

export interface AnnotationSyncContextResponse {
  segment_id: string;
  transcript_id: string;
  edit_id: string;
  text: string;
  sync: AnnotationSyncResponse;
  previous_segments: SyncContextItem[];
  next_segments: SyncContextItem[];
  video_url: string | null;
  waveform_data: number[] | null;
}

