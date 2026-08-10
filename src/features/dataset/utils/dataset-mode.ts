import type { Dataset } from '@/features/dataset/types/dataset.types';

/**
 * Dataset editing mode.
 *
 * The iNews dataset is the live workspace: video masuk lewat halaman Klasifikasi
 * lalu jalan end-to-end melewati pipeline. Dataset lain berisi material yang
 * pengolahannya sudah selesai, jadi halaman Pipeline & Klasifikasi jadi read-only
 * dan di halaman Anotasi hanya filmstrip kalimat yang belum OK yang boleh diubah.
 */

const LIVE_DATASET_KEYWORD = 'inews';

/** Dataset yang masih jalan lewat pipeline (iNews). */
export function isLiveDataset(dataset: Dataset | null | undefined): boolean {
  if (!dataset) return true; // belum ada pilihan — jangan kunci apa pun
  return dataset.name.toLowerCase().includes(LIVE_DATASET_KEYWORD);
}

/** Dataset non-iNews — sudah melewati tahap pengolahan dataset end-to-end. */
export function isProcessedDataset(dataset: Dataset | null | undefined): boolean {
  return !isLiveDataset(dataset);
}
