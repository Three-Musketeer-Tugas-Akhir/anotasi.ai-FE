import { Video, VideoStatus } from '@/features/classification/types/classification.types';
import { MOCK_VIDEOS } from '@/mocks/videos.mock';

// ── NOTE ─────────────────────────────────────────────────────────────
// This repository currently uses mock data.
// When the Go backend is ready, uncomment the Axios implementation
// and remove the mock fallback.
// ─────────────────────────────────────────────────────────────────────

// import { apiClient } from '@/core/api/axios-client';
// import { ApiResponse } from '@/core/types/api';

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
    // ── Real API (uncomment when backend is ready) ───────────────
    // const { data } = await apiClient.get<ApiResponse<Video[]>>('/videos');
    // return data.data;

    // ── Mock fallback ────────────────────────────────────────────
    await new Promise((resolve) => setTimeout(resolve, 600));
    return [...MOCK_VIDEOS];
  },

  /**
   * Update a video's classification status (SIBI / BISINDO / uncategorized).
   */
  updateVideoStatus: async (id: string, status: VideoStatus): Promise<Video> => {
    // ── Real API (uncomment when backend is ready) ───────────────
    // const { data } = await apiClient.patch<ApiResponse<Video>>(
    //   `/videos/${id}/status`,
    //   { status },
    // );
    // return data.data;

    // ── Mock fallback ────────────────────────────────────────────
    await new Promise((resolve) => setTimeout(resolve, 300));
    const index = MOCK_VIDEOS.findIndex((v) => v.id === id);
    if (index === -1) throw new Error('Video tidak ditemukan');
    MOCK_VIDEOS[index] = { ...MOCK_VIDEOS[index], status };
    return MOCK_VIDEOS[index];
  },
};
