/**
 * Curation module domain types.
 * Covers PRD requirements CUR-01 through CUR-05.
 */

// ── Status ─────────────────────────────────────────────────────────

export type CurationStatus =
  | 'ANNOTATED'       // Ready for curation (CUR-01 entry gate)
  | 'NORMALIZING'     // Auto-normalize in progress
  | 'NORMALIZED'      // Normalization complete, pending review
  | 'READY_TO_EXPORT'; // Approved by curator (CUR-05 exit gate)

// ── Domain Models ──────────────────────────────────────────────────

/** A single text segment within a video's transcript */
export interface CurationSegment {
  id: string;
  /** Original text (Before column – CUR-04) */
  originalText: string;
  /** Text after auto-normalization (After column – CUR-04) */
  normalizedText: string;
  /** Whether the curator has manually edited the normalizedText */
  isEdited: boolean;
}

/** A video entering the curation dashboard */
export interface CurationVideo {
  id: string;
  filename: string;
  source: string;
  segmentCount: number;
  status: CurationStatus;
  segments: CurationSegment[];
}

/** Slang dictionary entry (CUR-03) */
export interface SlangEntry {
  slang: string;
  standard: string;
}

// ── API Payloads ───────────────────────────────────────────────────

/** POST /curation/videos/{id}/normalize */
export interface NormalizeRequest {
  videoId: string;
}

export interface NormalizeResponse {
  videoId: string;
  segments: CurationSegment[];
}

/** PATCH /curation/videos/{id}/segments/{segId} */
export interface UpdateSegmentRequest {
  videoId: string;
  segmentId: string;
  normalizedText: string;
}

/** POST /curation/videos/{id}/approve */
export interface ApproveRequest {
  videoId: string;
}

/** POST /curation/videos/approve-all */
export interface ApproveAllRequest {
  videoIds: string[];
}

export interface ApproveResponse {
  success: boolean;
  updatedCount: number;
}
