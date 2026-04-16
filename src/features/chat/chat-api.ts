import { apiClient } from '@/core/api/axios-client';
import type {
  ChatRoomListResponse,
  ChatMessageListResponse,
  CreateRoomResponse,
  MarkReadResponse,
  JoinRoomResponse,
} from './types';

/**
 * Chat REST API service.
 * All endpoints require JWT Bearer token (attached by axios interceptor).
 */
export const chatApi = {
  /** GET /chat/rooms — list rooms the current user participates in */
  listRooms: async (limit = 20, offset = 0): Promise<ChatRoomListResponse> => {
    const { data } = await apiClient.get<ChatRoomListResponse>('/chat/rooms', {
      params: { limit, offset },
    });
    return data;
  },

  /** POST /chat/rooms — create a new chat room */
  createRoom: async (name: string): Promise<CreateRoomResponse> => {
    const { data } = await apiClient.post<CreateRoomResponse>('/chat/rooms', { name });
    return data;
  },

  /** GET /chat/rooms/{roomId}/messages — paginated message history */
  getMessages: async (
    roomId: string,
    limit = 50,
    offset = 0,
  ): Promise<ChatMessageListResponse> => {
    const { data } = await apiClient.get<ChatMessageListResponse>(
      `/chat/rooms/${roomId}/messages`,
      { params: { limit, offset } },
    );
    return data;
  },

  /** PATCH /chat/rooms/{roomId}/read — mark all messages in room as read */
  markAsRead: async (roomId: string): Promise<MarkReadResponse> => {
    const { data } = await apiClient.patch<MarkReadResponse>(
      `/chat/rooms/${roomId}/read`,
    );
    return data;
  },

  /** POST /chat/rooms/{roomId}/join — admin joins a room */
  joinRoom: async (roomId: string): Promise<JoinRoomResponse> => {
    const { data } = await apiClient.post<JoinRoomResponse>(
      `/chat/rooms/${roomId}/join`,
    );
    return data;
  },
};
