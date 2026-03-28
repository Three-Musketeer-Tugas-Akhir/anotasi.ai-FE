/**
 * Classification feature types.
 * Maps to jbi-service Jobs API for SIBI/BISINDO classification workflow.
 */

/** Possible categorization states for a job's sign language type */
export type CategoryStatus = 'uncategorized' | 'SIBI' | 'BISINDO';

/** Map API category to UI display status */
export function toCategoryStatus(apiCategory: string | null | undefined): CategoryStatus {
  if (apiCategory === 'SIBI') return 'SIBI';
  if (apiCategory === 'BISINDO') return 'BISINDO';
  return 'uncategorized';
}

/** Progress info for an in-progress job */
export interface JobProgress {
  phase: string;
  current: number;
  total: number;
  percent: number;
}

/** A classification job from the jbi-service */
export interface ClassificationJob {
  job_id: string;
  status: string;
  video_title: string | null;
  category: CategoryStatus;
  progress: JobProgress | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

/** List response from GET /jobs */
export interface JobListResponse {
  jobs: ClassificationJob[];
  total: number;
  limit: number;
  offset: number;
}

/** Query params for listing jobs */
export interface JobListParams {
  status?: string;
  category?: 'SIBI' | 'BISINDO';
  limit?: number;
  offset?: number;
}

/** Request for PUT /jobs/{id}/category */
export interface CategoryUpdateRequest {
  category: 'SIBI' | 'BISINDO';
}

/** Response from PUT /jobs/{id}/category */
export interface CategoryUpdateResponse {
  job_id: string;
  category: string;
  message: string;
}

/** Response from POST /jobs (create) */
export interface JobCreateResponse {
  id: string;
  status: string;
  original_filename: string;
  file_size: number;
  category: string | null;
  created_at: string;
  message: string;
}

// ── Legacy compat aliases (used by status-badge, etc.) ─────────────
export type VideoStatus = CategoryStatus;
