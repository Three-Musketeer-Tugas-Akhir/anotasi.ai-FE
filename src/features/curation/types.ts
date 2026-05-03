/**
 * Curation module domain types.
 * Covers PRD requirements CUR-01 through CUR-05.
 */

// ── Status ─────────────────────────────────────────────────────────

export type CurationStatus =
  | 'ANNOTATED'                  // Ready for curation (CUR-01 entry gate)
  | 'READY_TO_BE_NORMALIZED'     // All reviews approved, can normalize or skip
  | 'NORMALIZING'                // Auto-normalize in progress
  | 'NORMALIZED'                 // Normalization complete, pending review
  | 'READY_TO_EXPORT';           // Approved by curator (CUR-05 exit gate)

// ── Domain Models ──────────────────────────────────────────────────

/** A single utterance in the normalization workflow */
export interface CurationSegment {
  id: string;
  segmentId: string;
  utteranceIndex: number;

  /** Ground truth transcript — before */
  originalText: string;
  /** Ground truth transcript — after normalization */
  normalizedText: string;

  /** Glosa (annotator label) — before */
  originalGlosa: string;
  /** Glosa — after SIBI normalization */
  normalizedGlosa: string;

  /** Timing */
  start: number;
  end: number;

  /** Whether the curator has manually edited any normalized field */
  isEdited: boolean;
}

/** A video entering the curation dashboard (mapped from backend job) */
export interface CurationVideo {
  id: string;
  filename: string;
  source: string;
  category: 'SIBI' | 'BISINDO' | null;
  segmentCount: number;
  status: CurationStatus;
  segments: CurationSegment[];
}

/** Slang dictionary entry (CUR-03) — kept for visual reference in UI */
export interface SlangEntry {
  slang: string;
  standard: string;
}
