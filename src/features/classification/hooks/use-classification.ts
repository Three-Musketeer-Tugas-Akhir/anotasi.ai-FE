import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { classificationRepository } from '@/features/classification/api/classification.repository';
import type { JobListParams, JobListResponse } from '@/features/classification/types/classification.types';

// ── Query Keys ───────────────────────────────────────────────────────
export const classificationKeys = {
  all: ['classification'] as const,
  jobs: (params?: JobListParams) => [...classificationKeys.all, 'jobs', params] as const,
};

// ── Queries ──────────────────────────────────────────────────────────

/**
 * Fetch jobs for classification workflow.
 * Supports filter params (status, category, limit, offset).
 */
export function useJobs(params?: JobListParams) {
  return useQuery<JobListResponse>({
    queryKey: classificationKeys.jobs(params),
    queryFn: () => classificationRepository.getJobs(params),
  });
}

// ── Mutations ────────────────────────────────────────────────────────

/**
 * Update a job's sign language category (SIBI / BISINDO).
 * Automatically invalidates the job list on success.
 */
export function useUpdateCategory(onSuccess?: () => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ jobId, category }: { jobId: string; category: 'SIBI' | 'BISINDO' }) =>
      classificationRepository.updateCategory(jobId, category),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: classificationKeys.all });
      onSuccess?.();
    },
  });
}

/**
 * Upload a new video file to create a processing job.
 * Invalidates job list on success.
 */
export function useUploadJob(onSuccess?: (data: ReturnType<typeof classificationRepository.uploadVideo> extends Promise<infer T> ? T : never) => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file }: { file: File }) =>
      classificationRepository.uploadVideo(file),

    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: classificationKeys.all });
      onSuccess?.(data);
    },
  });
}
