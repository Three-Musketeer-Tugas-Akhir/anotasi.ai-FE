import { apiClient } from '@/core/api/axios-client';
import type { CurationSegment } from './types';

// ── Backend response shapes ────────────────────────────────────────

/** Raw job from GET /jobs */
interface RawCurationJob {
  job_id: string;
  status: string;
  video_title: string | null;
  category: string | null;
  progress: unknown;
  error: string | null;
  created_at: string;
  updated_at: string;
  original_video_url?: string;
}

interface RawJobListResponse {
  jobs: RawCurationJob[];
  total: number;
  limit: number;
  offset: number;
}

/** Utterance from Stage 2 (ASR) results */
interface Stage2Utterance {
  id: string;
  utterance_index: number;
  text: string;
  start: number;
  end: number;
  confidence: number;
  url: string | null;
  status: string;
}

interface Stage2SegmentResult {
  segment_id: string;
  asr_review_flag: boolean;
  utterances: Stage2Utterance[];
}

interface Stage2ResultsResponse {
  id: string;
  results: Stage2SegmentResult[];
}

/** Normalize request/response */
interface NormalizeRequestItem {
  id: string;
  original_text: string;
}

interface NormalizeResponseItem {
  id: string;
  original_text: string;
  normalized_text: string;
}

interface NormalizeApiResponse {
  items: NormalizeResponseItem[];
}

/** Approve response */
interface ApproveApiResponse {
  success: boolean;
  video_id: string;
  curation_status: string;
}

// ── API ────────────────────────────────────────────────────────────

export const curationApi = {
  /**
   * Fetch jobs that are ready for curation.
   * These are jobs with status "READY_FOR_ANNOTATION" — pipeline complete.
   */
  getCuratableJobs: async (): Promise<RawCurationJob[]> => {
    const { data } = await apiClient.get<RawJobListResponse>('/jobs', {
      params: { status: 'READY_FOR_ANNOTATION', limit: 100, offset: 0 },
      timeout: 300000,
    });
    return data.jobs;
  },

  /**
   * Fetch ASR transcript segments for a completed job.
   * Uses Stage 2 (ASR) results to get the transcript text per segment.
   */
  getJobSegments: async (jobId: string): Promise<CurationSegment[]> => {
    const { data } = await apiClient.get<Stage2ResultsResponse>(
      `/pipeline/jobs/${jobId}/stage2/results`,
    );

    // Flatten all utterances from all segments into a flat list of CurationSegments
    const segments: CurationSegment[] = [];
    for (const segmentResult of data.results) {
      for (const utt of segmentResult.utterances) {
        segments.push({
          id: utt.id,
          originalText: utt.text,
          normalizedText: '',
          isEdited: false,
        });
      }
    }
    return segments;
  },

  /**
   * Send raw text segments to the backend for auto-normalization.
   * Optionally pass category=SIBI for SIBI-specific rules.
   */
  normalizeSegments: async (
    items: CurationSegment[],
    category?: 'SIBI' | 'BISINDO' | null,
  ): Promise<CurationSegment[]> => {
    // Map the FE shape to the BE shape
    const payload: NormalizeRequestItem[] = items.map((i) => ({
      id: i.id,
      original_text: i.originalText,
    }));

    // Build URL with optional category query param
    const url = category === 'SIBI'
      ? '/curation/normalize?category=SIBI'
      : '/curation/normalize';

    const res = await apiClient.post<NormalizeApiResponse>(url, { items: payload });

    // Map back BE shape to FE shape
    return res.data.items.map((i) => ({
      id: i.id,
      originalText: i.original_text,
      normalizedText: i.normalized_text,
      isEdited: false,
    }));
  },

  /**
   * Mark a video as approved and ready for export.
   * Only admin and curator roles are allowed.
   */
  approveVideo: async (videoId: string): Promise<ApproveApiResponse> => {
    const { data } = await apiClient.post<ApproveApiResponse>('/curation/approve', {
      video_id: videoId,
    });
    return data;
  },

  /**
   * Mark a video as normalized (transition from READY_TO_BE_NORMALIZED → NORMALIZED).
   * This step is optional — curator can also approve directly to skip normalization.
   */
  markAsNormalized: async (videoId: string): Promise<ApproveApiResponse> => {
    const { data } = await apiClient.post<ApproveApiResponse>('/curation/normalize-status', {
      video_id: videoId,
    });
    return data;
  },
};
