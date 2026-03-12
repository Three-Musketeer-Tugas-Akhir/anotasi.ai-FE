import { Video, VideoStatus } from '@/features/classification/types/classification.types';
// Removed MOCK_VIDEOS
import { apiClient } from '@/core/api/axios-client';
import { ApiResponse } from '@/core/types/api';

/**
 * Classification Repository — Data access layer.
 * Encapsulates all API calls related to video classification.
 * Components should NEVER call apiClient directly; always go through here.
 */
export const classificationRepository = {
  /**
   * Fetch all videos for classification.
   */
  getVideos: async (): Promise<Video[]> => {
    const { data } = await apiClient.get<ApiResponse<Video[]>>('/videos');
    return data.data;
  },

  /**
   * Update a video's classification status (SIBI / BISINDO / uncategorized).
   */
  updateVideoStatus: async (id: string, status: VideoStatus): Promise<Video> => {
    const { data } = await apiClient.patch<ApiResponse<Video>>(
      `/videos/${id}/status`,
      { status },
    );
    return data.data;
  },
};
