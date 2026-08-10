'use client';

import { useSelectedDataset } from '@/features/dataset/context/dataset-context';
import { isProcessedDataset } from '@/features/dataset/utils/dataset-mode';

/**
 * Read-only flag for the currently selected dataset.
 *
 * True saat dataset aktif bukan iNews — artinya isinya sudah melewati tahap
 * pengolahan dataset, sehingga Pipeline & Klasifikasi tidak lagi bisa diubah.
 */
export function useDatasetMode() {
  const { selectedDataset, isHydrated } = useSelectedDataset();
  return {
    selectedDataset,
    isHydrated,
    isProcessed: isHydrated && isProcessedDataset(selectedDataset),
  };
}
