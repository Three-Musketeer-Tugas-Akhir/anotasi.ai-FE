import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { classificationRepository } from '@/features/classification/api/classification.repository';
import { VideoStatus } from '@/features/classification/types/classification.types';

// ── Query Keys ───────────────────────────────────────────────────────
// Centralised query keys prevent typo bugs and make invalidation explicit.
export const classificationKeys = {
  all: ['classification'] as const,
  videos: () => [...classificationKeys.all, 'videos'] as const,
};

// ── Queries ──────────────────────────────────────────────────────────

/**
 * Fetch all videos for the classification workflow.
 */
export function useVideos() {
  return useQuery({
    queryKey: classificationKeys.videos(),
    queryFn: classificationRepository.getVideos,
  });
}

// ── Mutations ────────────────────────────────────────────────────────

/**
 * Update a video's JBI classification status.
 * Automatically invalidates the video list on success.
 *
 * @param onSuccess — optional callback after mutation succeeds (e.g. auto-advance)
 */
export function useUpdateVideoStatus(onSuccess?: (data: ReturnType<typeof classificationRepository.updateVideoStatus> extends Promise<infer T> ? T : never) => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: VideoStatus }) =>
      classificationRepository.updateVideoStatus(id, status),

    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: classificationKeys.videos() });
      onSuccess?.(data);
    },
  });
}
