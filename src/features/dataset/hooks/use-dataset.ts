import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { datasetRepository } from '@/features/dataset/api/dataset.repository';
import type { CreateDatasetRequest } from '@/features/dataset/types/dataset.types';

// ── Query Keys ───────────────────────────────────────────────────────
export const datasetKeys = {
  all: ['datasets'] as const,
  list: () => [...datasetKeys.all, 'list'] as const,
};

// ── Queries ──────────────────────────────────────────────────────────

/**
 * Fetch all datasets.
 */
export function useDatasets() {
  return useQuery({
    queryKey: datasetKeys.list(),
    queryFn: () => datasetRepository.getDatasets(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// ── Mutations ────────────────────────────────────────────────────────

/**
 * Create a new dataset.
 * Automatically invalidates the dataset list on success.
 */
export function useCreateDataset(onSuccess?: () => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateDatasetRequest) =>
      datasetRepository.createDataset(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: datasetKeys.all });
      onSuccess?.();
    },
  });
}
