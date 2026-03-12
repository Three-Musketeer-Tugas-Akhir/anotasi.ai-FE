import { apiClient } from '@/core/api/axios-client';
import type { CurationSegment } from './types';

// The payload sent to /api/v1/curation/normalize
export interface CurationRequest {
  items: CurationSegment[];
}

// The response from /api/v1/curation/normalize
export interface CurationResponse {
  items: CurationSegment[];
}

export const curationApi = {
  /**
   * Sends the raw text segments to the Go backend for auto-normalization.
   */
  normalizeSegments: async (items: CurationSegment[]): Promise<CurationSegment[]> => {
    // Map the FE shape to the BE shape
    const payload = items.map((i) => ({
      id: i.id,
      original_text: i.originalText,
    }));

    const res = await apiClient.post<CurationResponse>('/curation/normalize', { items: payload });
    
    // Map back BE shape to FE shape
    return res.data.items.map((i: { id: string; original_text?: string; originalText?: string; normalized_text?: string; normalizedText?: string }) => ({
      id: i.id,
      originalText: i.original_text || i.originalText || '', // fallback
      normalizedText: i.normalized_text || i.normalizedText || '',
      isEdited: false,
    }));
  },

  /**
   * Finalizes the video dataset format and locks it for export.
   */
  approveVideo: async (videoId: string): Promise<void> => {
    await apiClient.post('/curation/approve', { video_id: videoId });
  },
};
