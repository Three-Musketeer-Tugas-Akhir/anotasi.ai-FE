/**
 * Voice Annotation feature TypeScript types.
 * Maps to /voice-annotation API endpoints.
 */

// ── Job List ────────────────────────────────────────────────────────

export interface VoiceAnnotationJob {
  job_id: string;
  original_filename: string;
  status: string;
  total_utterances: number;
  clean_count: number;
  flagged_count: number;
  created_at: string | null;
}

export interface VoiceAnnotationJobListResponse {
  items: VoiceAnnotationJob[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

// ── Job Summary ─────────────────────────────────────────────────────

export interface VoiceAnnotationJobSummary {
  job_id: string;
  original_filename: string;
  status: string;
  total_utterances: number;
  clean_count: number;
  flagged_count: number;
  is_gate_passed: boolean;
}

// ── Utterance ───────────────────────────────────────────────────────

export interface VoiceAnnotationUtterance {
  id: string;
  transcript_id: string;
  global_index: number;
  asr_text: string;
  ground_truth_text: string;
  flagged_words: string[];
  has_flag: boolean;
  voice_annotation_status: 'PENDING' | 'FLAGGED' | 'CLEAN';
  start: number;
  end: number;
  annotator_id: string | null;
  edited_at: string | null;
}

export interface VoiceAnnotationUtteranceListResponse {
  utterances: VoiceAnnotationUtterance[];
  total: number;
}

// ── PATCH Ground Truth ──────────────────────────────────────────────

export interface UpdateGroundTruthRequest {
  ground_truth_text: string;
  is_unflagged?: boolean;
}

export interface UpdateGroundTruthResponse {
  id: string;
  ground_truth_text: string;
  flagged_words: string[];
  has_flag: boolean;
  voice_annotation_status: string;
  old_text: string;
  job_status: string;
  job_clean_count: number;
  job_flagged_count: number;
}

// ── Status Constants ────────────────────────────────────────────────

export const VOICE_ANNOTATION_STATUS = {
  PENDING: 'PENDING',
  FLAGGED: 'FLAGGED',
  CLEAN: 'CLEAN',
} as const;
