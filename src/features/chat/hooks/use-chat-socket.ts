'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import type { ChatMessage, WSIncomingMessage } from '../types';

// ── Helpers ────────────────────────────────────────────────────────

/** Derive WebSocket base URL from the current environment. */
function getWsBaseUrl(): string {
  if (typeof window === 'undefined') return '';

  // If deployed on Vercel (or any proxy), use the browser origin
  // and derive ws:// or wss:// from the protocol
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

  // If the API is proxied through Next.js rewrites, the WS path
  // is also proxied via `/ws/...` → backend
  return `${proto}//${window.location.host}`;
}

// ── Hook Types ─────────────────────────────────────────────────────

interface UseChatSocketOptions {
  roomId: string | null;
  token: string | null;
  currentUserId: string;
  onMessage?: (msg: ChatMessage) => void;
  onTyping?: (userId: string) => void;
  onReadReceipt?: (readerId: string) => void;
}

interface UseChatSocketReturn {
  isConnected: boolean;
  error: string | null;
  sendMessage: (content: string) => void;
  sendTyping: () => void;
}

// ── Hook ───────────────────────────────────────────────────────────

/**
 * WebSocket hook for real-time chat.
 *
 * Handles:
 * - Auto-connect when roomId + token are available
 * - Reconnect with exponential backoff on unexpected close
 * - Typing throttle (1 event per 500ms)
 * - Clean disconnect on unmount / room change
 */
export function useChatSocket({
  roomId,
  token,
  currentUserId,
  onMessage,
  onTyping,
  onReadReceipt,
}: UseChatSocketOptions): UseChatSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempt = useRef(0);
  const lastTypingSent = useRef(0);

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Store latest callbacks in refs to avoid re-creating the WS on every render
  const onMessageRef = useRef(onMessage);
  const onTypingRef = useRef(onTyping);
  const onReadReceiptRef = useRef(onReadReceipt);
  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);
  useEffect(() => { onTypingRef.current = onTyping; }, [onTyping]);
  useEffect(() => { onReadReceiptRef.current = onReadReceipt; }, [onReadReceipt]);

  // Connect / reconnect logic
  useEffect(() => {
    if (!roomId || !token) return;

    let isCancelled = false;

    function connect() {
      if (isCancelled) return;

      const wsBase = getWsBaseUrl();
      const wsUrl = `${wsBase}/ws/chat/${roomId}?token=${token}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (isCancelled) { ws.close(); return; }
        setIsConnected(true);
        setError(null);
        reconnectAttempt.current = 0;
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        wsRef.current = null;

        // Known auth/validation close codes — don't reconnect
        if ([4001, 4002, 4003, 4004].includes(event.code)) {
          setError(event.reason || `Connection refused (${event.code})`);
          return;
        }

        // Unexpected close — reconnect with exponential backoff
        if (!isCancelled && event.code !== 1000) {
          const delay = Math.min(1000 * 2 ** reconnectAttempt.current, 30000);
          reconnectAttempt.current += 1;
          reconnectTimer.current = setTimeout(connect, delay);
        }
      };

      ws.onerror = () => {
        // onclose will fire after onerror, that handles the state
      };

      ws.onmessage = (event) => {
        try {
          const data: WSIncomingMessage = JSON.parse(event.data);

          if (data.type === 'message') {
            onMessageRef.current?.({
              id: data.id,
              sender_id: data.sender_id,
              sender_email: null, // resolved from room participants cache
              content: data.content,
              created_at: data.created_at,
              is_read: false,
            });
          } else if (data.type === 'typing') {
            if (data.user_id !== currentUserId) {
              onTypingRef.current?.(data.user_id);
            }
          } else if (data.type === 'read_receipt') {
            onReadReceiptRef.current?.(data.reader_id);
          } else if (data.type === 'error') {
            console.error('[Chat WS] Server error:', data.detail);
          }
        } catch (err) {
          console.error('[Chat WS] Failed to parse message:', err);
        }
      };
    }

    connect();

    return () => {
      isCancelled = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.close(1000, 'component unmount');
        wsRef.current = null;
      }
      setIsConnected(false);
    };
  }, [roomId, token, currentUserId]);

  // ── Send helpers ─────────────────────────────────────────────────

  const sendMessage = useCallback((content: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'message', content }));
    }
  }, []);

  const sendTyping = useCallback(() => {
    const now = Date.now();
    // Throttle: max 1 typing event per 500ms
    if (now - lastTypingSent.current < 500) return;
    lastTypingSent.current = now;

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'typing' }));
    }
  }, []);

  return { isConnected, error, sendMessage, sendTyping };
}
