import { apiClient } from '@/core/api/axios-client';
import type { CurationSegment } from './types';

// ── Backend response shapes ────────────────────────────────────────

/** Raw job from GET /jobs */
interface RawCurationJob {
  job_id: string;
  status: string;
  curation_status: string | null;
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

/** Auto-normalize response shapes */
interface NormalizedUtteranceResponse {
  utterance_index: number;
  segment_id: string;
  original_transcript: string;
  normalized_transcript: string;
  original_glosa: string;
  normalized_glosa: string;
  start: number;
  end: number;
}

interface AutoNormalizeApiResponse {
  job_id: string;
  total_ok_utterances: number;
  items: NormalizedUtteranceResponse[];
}

/** Apply normalization shapes */
interface NormalizedUtteranceOverride {
  utterance_index: number;
  segment_id: string;
  normalized_transcript?: string;
  normalized_glosa?: string;
}

interface ApplyNormalizationApiResponse {
  job_id: string;
  utterances_updated: number;
  curation_status: string;
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
  getCuratableJobs: async (dataset_id?: string): Promise<RawCurationJob[]> => {
    const params: Record<string, unknown> = { status: 'READY_FOR_ANNOTATION', limit: 100, offset: 0 };
    if (dataset_id) params.dataset_id = dataset_id;
    const { data } = await apiClient.get<RawJobListResponse>('/jobs', {
      params,
      timeout: 300000,
    });
    return data.jobs;
  },

  /**
   * Fetch current normalization state (segments) for a job.
   */
  getJobSegments: async (jobId: string): Promise<CurationSegment[]> => {
    const { data } = await apiClient.get<AutoNormalizeApiResponse>(
      `/normalization/segments/${jobId}`,
    );

    return data.items.map((item) => ({
      id: `${item.segment_id}-${item.utterance_index}`,
      segmentId: item.segment_id,
      utteranceIndex: item.utterance_index,
      originalText: item.original_transcript,
      normalizedText: item.normalized_transcript,
      originalGlosa: item.original_glosa,
      normalizedGlosa: item.normalized_glosa,
      start: item.start,
      end: item.end,
      isEdited: false,
    }));
  },

  /**
   * Auto-normalize all OK-status utterances for a job.
   * Calls the new job-level endpoint that handles everything server-side:
   * - Fetches OK utterances from annotation edits
   * - Pulls ground truth from voice annotations
   * - Normalizes transcript (universal pipeline) and glosa (SIBI pipeline)
   * - Returns before/after preview (read-only, nothing persisted)
   */
  autoNormalize: async (jobId: string): Promise<CurationSegment[]> => {
    const { data } = await apiClient.post<AutoNormalizeApiResponse>(
      `/normalization/auto-normalize/${jobId}`,
    );

    return data.items.map((item) => ({
      id: `${item.segment_id}-${item.utterance_index}`,
      segmentId: item.segment_id,
      utteranceIndex: item.utterance_index,
      originalText: item.original_transcript,
      normalizedText: item.normalized_transcript,
      originalGlosa: item.original_glosa,
      normalizedGlosa: item.normalized_glosa,
      start: item.start,
      end: item.end,
      isEdited: false,
    }));
  },

  /**
   * Apply (persist) normalization results.
   * Optionally pass manual overrides for specific utterances.
   */
  applyNormalization: async (
    jobId: string,
    overrides?: CurationSegment[],
  ): Promise<ApplyNormalizationApiResponse> => {
    // Build overrides from segments that were manually edited
    const payload: { overrides?: NormalizedUtteranceOverride[] } = {};
    if (overrides && overrides.length > 0) {
      payload.overrides = overrides
        .filter((s) => s.isEdited)
        .map((s) => ({
          utterance_index: s.utteranceIndex,
          segment_id: s.segmentId,
          normalized_transcript: s.normalizedText,
          normalized_glosa: s.normalizedGlosa,
        }));
    }

    const { data } = await apiClient.post<ApplyNormalizationApiResponse>(
      `/normalization/apply/${jobId}`,
      payload,
    );
    return data;
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
};
