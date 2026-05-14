/**
 * Pipeline feature TypeScript types.
 * Derived from OpenAPI spec schemas for /pipeline/jobs, /jobs, and /upload endpoints.
 */

// ── Job List ────────────────────────────────────────────────────────

export interface JobListItemResponse {
  id: string;
  original_filename?: string | null;
  status: string;
  current_stage: string | null;
  category: string | null;
  progress: number;
  created_at: string | null;
  updated_at: string | null;
  error_message: string | null;
  total_segments: number;
  completed_segments: number;
  curation_status?: string | null;
}

export interface JobListDetailedResponse {
  items: JobListItemResponse[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface JobListParams {
  status?: string;
  from_date?: string;
  to_date?: string;
  page?: number;
  page_size?: number;
}

// ── Job Detail ──────────────────────────────────────────────────────

export interface JobStatusDetailResponse {
  id: string;
  original_filename?: string | null;
  status: string;
  current_stage: string | null;
  category: string | null;
  progress: number;
  created_at: string | null;
  updated_at: string | null;
  error_message: string | null;
  total_segments: number;
  completed_segments: number;
  created_by: string | null;
  curation_status?: string | null;
}

// ── Job Create ──────────────────────────────────────────────────────

export interface JobCreateResponse {
  id: string;
  status: string;
  original_filename: string;
  file_size: number;
  category: string | null;
  created_at: string;
  message: string;
}

export interface JobCreateFromUrlRequest {
  video_url: string;
}

export interface JobCancelResponse {
  id: string;
  status: string;
  queue_jobs_cancelled: number;
  message: string;
}

// ── Job Retry ───────────────────────────────────────────────────────

export interface JobRetryResponse {
  id: string;
  status: string;
  retry_mode: string;
  failed_stage: string | null;
  message: string;
}

// ── Job Results (Legacy) ────────────────────────────────────────────

export interface BboxResponse {
  x_min: number;
  y_min: number;
  width: number;
  height: number;
}

export interface SegmentResponse {
  index: number;
  start_time: string;
  end_time: string;
  start_seconds: number;
  end_seconds: number;
  duration_seconds: number;
  bbox: BboxResponse;
  download_url: string;
}

export interface VideoMetadataResponse {
  fps: number;
  total_frames: number;
  duration_seconds: number;
}

export interface DetectionSummaryResponse {
  total_seconds_scanned: number;
  seconds_with_detection: number;
}

export interface JobResultsResponse {
  job_id: string;
  status: string;
  video_metadata: VideoMetadataResponse;
  detection_summary: DetectionSummaryResponse;
  segments: SegmentResponse[];
}

// ── Category ────────────────────────────────────────────────────────

export interface CategoryUpdateRequest {
  category: string;
}

export interface CategoryUpdateResponse {
  job_id: string;
  category: string;
  message: string;
}

// ── Upload (Tus) ────────────────────────────────────────────────────

export interface UploadDetailedStatus {
  upload_id: string;
  filename: string;
  status: string;
  file_size: number;
  chunks_received: number;
  total_chunks: number;
  progress_percent: number;
  created_at: string | null;
  expires_at: string | null;
  pipeline_job?: {
    job_id: string;
    status: string;
    current_stage: string | null;
    category: string | null;
    file_size: number;
    created_at: string | null;
    stages: Array<{
      stage: string;
      status: string;
      attempts: number;
      max_attempts: number;
      error: string | null;
      created_at: string | null;
      processed_at: string | null;
    }>;
  };
}

// ── Stage 1 Results (Detection) ─────────────────────────────────────

export interface Stage1BboxData {
  x_min: number;
  y_min: number;
  width: number;
  height: number;
}

export interface Stage1SegmentResult {
  id: string;               // Segment UUID
  segment_index: number;     // 0-based
  bbox_data: Stage1BboxData | null;
  url: string;              // Asset URL for segment video
}

export interface Stage1ResultsResponse {
  id: string;               // Job UUID
  results: Stage1SegmentResult[];
}

// ── Stage 2 Results (ASR) ───────────────────────────────────────────

export interface Stage2Utterance {
  id: string;               // Transcript UUID
  utterance_index: number;   // 0-based within segment
  text: string;             // Transcribed text
  start: number;            // Start time (seconds, relative to segment)
  end: number;              // End time (seconds, relative to segment)
  confidence: number;       // 0.0 – 1.0
  url: string | null;       // Asset URL (optional)
  audio_url: string | null; // WAV audio URL from ASR
  status: string;           // pending | cropped | failed
}

export interface Stage2SegmentResult {
  segment_id: string;
  asr_review_flag: boolean;  // true if segment needs ASR review
  utterances: Stage2Utterance[];
}

export interface Stage2ResultsResponse {
  id: string;               // Job UUID
  results: Stage2SegmentResult[];
}

// ── Stage 3 Results (Cropping) ──────────────────────────────────────

export interface Stage3Summary {
  total_utterances: number;
  cropped: number;
  failed: number;
  pending: number;
}

export interface Stage3Utterance {
  id: string;
  utterance_index: number;
  text: string;
  start: number;            // CROPPED start time
  end: number;              // CROPPED end time
  confidence: number;
  url: string | null;       // Asset URL for cropped utterance video
  status: string;           // cropped | pending | failed
}

export interface Stage3SegmentResult {
  segment_id: string;
  asr_review_flag: boolean;
  utterances: Stage3Utterance[];
}

export interface Stage3ResultsResponse {
  id: string;               // Job UUID
  summary: Stage3Summary;
  results: Stage3SegmentResult[];
}

// ── Job Status Constants ────────────────────────────────────────────

export const JOB_STATUS = {
  UPLOADED: 'UPLOADED',
  QUEUED: 'QUEUED',
  DETECTING: 'DETECTING',
  ASR_COMPLETED: 'ASR_COMPLETED',
  TRANSCRIBING: 'TRANSCRIBING',
  CROPPING: 'CROPPING',
  CROPPING_IN_PROGRESS: 'CROPPING_IN_PROGRESS',
  CROPPING_FAILED: 'CROPPING_FAILED',
  NEEDS_VOICE_ANNOTATION: 'NEEDS_VOICE_ANNOTATION',
  READY_FOR_ANNOTATION: 'READY_FOR_ANNOTATION',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;

export type JobStatusType = (typeof JOB_STATUS)[keyof typeof JOB_STATUS];

export const PROCESSING_STATUSES: Set<string> = new Set([
  JOB_STATUS.QUEUED,
  JOB_STATUS.DETECTING,
  JOB_STATUS.ASR_COMPLETED,
  JOB_STATUS.TRANSCRIBING,
  JOB_STATUS.CROPPING,
  JOB_STATUS.CROPPING_IN_PROGRESS,
]);

export const TERMINAL_STATUSES: Set<string> = new Set([
  JOB_STATUS.READY_FOR_ANNOTATION,
  JOB_STATUS.NEEDS_VOICE_ANNOTATION,
  JOB_STATUS.CROPPING_FAILED,
  JOB_STATUS.FAILED,
  JOB_STATUS.CANCELLED,
]);

export type SignLanguageCategory = 'SIBI' | 'BISINDO';

