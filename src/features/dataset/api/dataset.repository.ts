import { apiClient } from '@/core/api/axios-client';
import type { Dataset, DatasetListResponse, CreateDatasetRequest } from '@/features/dataset/types/dataset.types';

/**
 * Dataset Repository — Data access layer.
 * All API calls related to dataset management.
 */
export const datasetRepository = {
  /**
   * Fetch all datasets.
   * GET /datasets
   */
  getDatasets: async (): Promise<DatasetListResponse> => {
    const { data } = await apiClient.get<DatasetListResponse>('/datasets');
    return data;
  },

  /**
   * Create a new dataset.
   * POST /datasets
   */
  createDataset: async (payload: CreateDatasetRequest): Promise<Dataset> => {
    const { data } = await apiClient.post<Dataset>('/datasets', payload);
    return data;
  },
};
