/**
 * Dataset feature types.
 * Maps to jbi-service Datasets API.
 */

export interface Dataset {
  id: string;
  name: string;
  description: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface DatasetListResponse {
  items: Dataset[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateDatasetRequest {
  name: string;
  description?: string;
}
