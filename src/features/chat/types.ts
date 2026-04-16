/** Chat room from GET /chat/rooms */
export interface ChatRoom {
  id: string;
  name: string | null;
  created_at: string;
  unread_count: number;
  last_message: ChatMessagePreview | null;
  participants: string[];
}

/** Preview of last message inside a room listing */
export interface ChatMessagePreview {
  id: string;
  content: string;
  sender_id: string | null;
  created_at: string;
}

/** Full message from GET /chat/rooms/{id}/messages */
export interface ChatMessage {
  id: string;
  sender_id: string | null;
  sender_email: string | null;
  content: string;
  created_at: string;
  is_read: boolean;
}

/** Paginated room list response */
export interface ChatRoomListResponse {
  items: ChatRoom[];
  total: number;
  limit: number;
  offset: number;
}

/** Paginated message list response */
export interface ChatMessageListResponse {
  items: ChatMessage[];
  total: number;
  limit: number;
  offset: number;
}

/** Mark-as-read response */
export interface MarkReadResponse {
  marked_count: number;
  message: string;
}

/** Join room response */
export interface JoinRoomResponse {
  joined: boolean;
  message: string;
}

/** Create room request */
export interface CreateRoomRequest {
  name: string;
}

/** Create room response */
export interface CreateRoomResponse {
  id: string;
  name: string;
  created_at: string;
}

// ── WebSocket message types ────────────────────────────────────────

export type WSIncomingMessage =
  | {
      type: 'message';
      id: string;
      room_id: string;
      sender_id: string;
      content: string;
      created_at: string;
    }
  | {
      type: 'typing';
      room_id: string;
      user_id: string;
    }
  | {
      type: 'read_receipt';
      room_id: string;
      reader_id: string;
    }
  | {
      type: 'system';
      event: 'user_joined' | 'user_left';
      room_id: string;
      user_id: string;
    }
  | {
      type: 'error';
      detail: string;
    };

export interface WSOutgoingMessage {
  type: 'message' | 'typing' | 'read_receipt';
  content?: string;
}
