'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  MessageCircle,
  Send,
  Plus,
  Loader2,
  Wifi,
  WifiOff,
  Users,
  Clock,
  ChevronLeft,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth';
import { chatApi } from '../chat-api';
import { useChatSocket } from '../hooks/use-chat-socket';
import type { ChatRoom, ChatMessage } from '../types';

// ── Helpers ────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();

  if (isToday) {
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return `Kemarin ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
  }

  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getInitials(email: string | null): string {
  if (!email) return '?';
  return email.substring(0, 2).toUpperCase();
}

// ── Main Component ─────────────────────────────────────────────────

export function ChatPage() {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();

  // State
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isNewRoomOpen, setIsNewRoomOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [isMobileRoomView, setIsMobileRoomView] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Fetch rooms ──────────────────────────────────────────────────

  const {
    data: roomsData,
    isLoading: isLoadingRooms,
  } = useQuery({
    queryKey: ['chat-rooms'],
    queryFn: () => chatApi.listRooms(50, 0),
    refetchInterval: 15000, // Poll every 15s for unread badges
  });

  const rooms: ChatRoom[] = roomsData?.items ?? [];

  // ── Fetch messages when room selected ────────────────────────────

  const {
    data: messagesData,
    isLoading: isLoadingMessages,
  } = useQuery({
    queryKey: ['chat-messages', selectedRoom?.id],
    queryFn: () => chatApi.getMessages(selectedRoom!.id, 100, 0),
    enabled: !!selectedRoom,
  });

  useEffect(() => {
    if (messagesData?.items) {
      setMessages(messagesData.items);
    }
  }, [messagesData]);

  // Mark as read when opening a room
  useEffect(() => {
    if (selectedRoom) {
      chatApi.markAsRead(selectedRoom.id).then(() => {
        queryClient.invalidateQueries({ queryKey: ['chat-rooms'] });
      });
    }
  }, [selectedRoom, queryClient]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── WebSocket ────────────────────────────────────────────────────

  const handleIncomingMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => {
      // Prevent duplicate IDs (just in case)
      if (prev.some((p) => p.id === msg.id)) {
        return prev;
      }

      // Reconcile optimistic UI: check if there's a temporary message sent by us with the same content
      const existingOptimisticIndex = prev.findIndex(
        (p) => p.id.startsWith('temp-') && p.sender_id === msg.sender_id && p.content === msg.content
      );

      if (existingOptimisticIndex >= 0) {
        // Replace the optimistic message with the real one from server
        const newMessages = [...prev];
        newMessages[existingOptimisticIndex] = msg;
        return newMessages;
      }

      // Otherwise, just append
      return [...prev, msg];
    });
    
    // Also re-mark as read since user is actively viewing
    if (selectedRoom) {
      chatApi.markAsRead(selectedRoom.id);
      queryClient.invalidateQueries({ queryKey: ['chat-rooms'] });
    }
  }, [selectedRoom, queryClient]);

  const handleTyping = useCallback((userId: string) => {
    setTypingUser(userId);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => setTypingUser(null), 2000);
  }, []);

  const { isConnected, sendMessage, sendTyping } = useChatSocket({
    roomId: selectedRoom?.id ?? null,
    token,
    currentUserId: user?.id ?? '',
    onMessage: handleIncomingMessage,
    onTyping: handleTyping,
  });

  // ── Send ─────────────────────────────────────────────────────────

  const handleSend = () => {
    const text = inputValue.trim();
    if (!text || !selectedRoom) return;

    // Optimistic UI — add message immediately
    const optimistic: ChatMessage = {
      id: `temp-${Date.now()}`,
      sender_id: user?.id ?? null,
      sender_email: user?.email ?? null,
      content: text,
      created_at: new Date().toISOString(),
      is_read: false,
    };
    setMessages((prev) => [...prev, optimistic]);
    sendMessage(text);
    setInputValue('');
    inputRef.current?.focus();
  };

  // ── Create room ──────────────────────────────────────────────────

  const handleCreateRoom = async () => {
    const name = newRoomName.trim();
    if (!name) return;

    setIsCreatingRoom(true);
    try {
      const room = await chatApi.createRoom(name);
      toast.success('Room berhasil dibuat');
      setIsNewRoomOpen(false);
      setNewRoomName('');
      queryClient.invalidateQueries({ queryKey: ['chat-rooms'] });
      // Auto-select the new room
      setSelectedRoom({
        id: room.id,
        name: room.name,
        created_at: room.created_at,
        unread_count: 0,
        last_message: null,
        participants: [user?.email ?? ''],
      });
      setIsMobileRoomView(true);
    } catch {
      toast.error('Gagal membuat room');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  // ── Select room ──────────────────────────────────────────────────

  const handleSelectRoom = (room: ChatRoom) => {
    setSelectedRoom(room);
    setMessages([]);
    setIsMobileRoomView(true);
  };

  // ── Render ───────────────────────────────────────────────────────

  return (
    <>
      {/* Page Header */}
      <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 flex-shrink-0 shadow-sm z-10">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <MessageCircle className="text-teal-500" size={20} />
            Live Chat
          </h1>
          <p className="text-xs text-slate-500">Komunikasi real-time dengan tim</p>
        </div>
        {isConnected && selectedRoom && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <Wifi size={14} />
            Terhubung
          </div>
        )}
      </header>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── Left Panel: Room List ──────────────────────────────────── */}
        <div
          className={`w-full md:w-80 lg:w-96 border-r border-gray-200 bg-white flex flex-col flex-shrink-0 ${
            isMobileRoomView ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Room list header */}
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-700">
              Pesan ({rooms.length})
            </h2>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs"
              onClick={() => setIsNewRoomOpen(true)}
            >
              <Plus size={14} />
              Room Baru
            </Button>
          </div>

          {/* Room list */}
          <ScrollArea className="flex-1">
            {isLoadingRooms ? (
              <div className="space-y-0 divide-y divide-gray-100">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-10" />
                    </div>
                    <Skeleton className="h-3 w-3/4" />
                    <div className="flex items-center gap-2 pt-0.5">
                      <Skeleton className="h-3 w-3 rounded-full" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            ) : rooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <MessageCircle className="text-slate-300 mb-3" size={40} />
                <p className="text-sm text-slate-500 font-medium">Belum ada percakapan</p>
                <p className="text-xs text-slate-400 mt-1">
                  Mulai percakapan baru dengan tombol &ldquo;Room Baru&rdquo;
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {rooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => handleSelectRoom(room)}
                    className={`w-full text-left p-4 hover:bg-slate-50 transition-colors ${
                      selectedRoom?.id === room.id
                        ? 'bg-teal-50 border-l-2 border-teal-500'
                        : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-800 truncate">
                            {room.name || 'Unnamed Room'}
                          </span>
                          {room.unread_count > 0 && (
                            <Badge className="bg-teal-500 text-white text-[10px] px-1.5 py-0 h-5 font-bold">
                              {room.unread_count}
                            </Badge>
                          )}
                        </div>
                        {room.last_message && (
                          <p className="text-xs text-slate-500 mt-1 truncate">
                            {room.last_message.content}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          <Users size={10} className="text-slate-400" />
                          <span className="text-[10px] text-slate-400">
                            {room.participants.length} peserta
                          </span>
                        </div>
                      </div>
                      {room.last_message && (
                        <span className="text-[10px] text-slate-400 whitespace-nowrap mt-0.5">
                          {formatTime(room.last_message.created_at)}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* ── Right Panel: Conversation ─────────────────────────────── */}
        <div
          className={`flex-1 flex flex-col bg-slate-50 ${
            !isMobileRoomView ? 'hidden md:flex' : 'flex'
          }`}
        >
          {selectedRoom ? (
            <>
              {/* Conversation header */}
              <div className="px-4 py-3 bg-white border-b border-gray-200 flex items-center gap-3">
                <button
                  className="md:hidden p-1 rounded hover:bg-slate-100"
                  onClick={() => setIsMobileRoomView(false)}
                >
                  <ChevronLeft size={20} className="text-slate-600" />
                </button>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {getInitials(selectedRoom.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {selectedRoom.name || 'Unnamed Room'}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {selectedRoom.participants.join(', ')}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {isConnected ? (
                    <Wifi size={14} className="text-emerald-500" />
                  ) : (
                    <WifiOff size={14} className="text-red-400" />
                  )}
                </div>
              </div>

              {/* Messages area */}
              <ScrollArea className="flex-1 p-4">
                {isLoadingMessages ? (
                  <div className="space-y-4 max-w-3xl mx-auto">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}
                      >
                        <Skeleton
                          className={`h-16 rounded-2xl ${
                            i % 2 === 0 ? 'w-2/3 rounded-bl-md' : 'w-1/2 rounded-br-md'
                          }`}
                        />
                      </div>
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <MessageCircle className="text-slate-300 mb-3" size={32} />
                    <p className="text-sm text-slate-500">Belum ada pesan</p>
                    <p className="text-xs text-slate-400 mt-1">Mulai percakapan!</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-w-3xl mx-auto">
                    {messages.map((msg) => {
                      const isMine = msg.sender_id === user?.id;
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${
                              isMine
                                ? 'bg-teal-600 text-white rounded-br-md'
                                : 'bg-white text-slate-800 border border-gray-200 rounded-bl-md'
                            }`}
                          >
                            {!isMine && msg.sender_email && (
                              <p
                                className={`text-[10px] font-semibold mb-0.5 ${
                                  isMine ? 'text-teal-100' : 'text-teal-600'
                                }`}
                              >
                                {msg.sender_email}
                              </p>
                            )}
                            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                              {msg.content}
                            </p>
                            <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : ''}`}>
                              <Clock size={10} className={isMine ? 'text-teal-200' : 'text-slate-400'} />
                              <span
                                className={`text-[10px] ${
                                  isMine ? 'text-teal-200' : 'text-slate-400'
                                }`}
                              >
                                {formatTime(msg.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={bottomRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Typing indicator */}
              {typingUser && (
                <div className="px-4 py-1.5 bg-white border-t border-gray-100">
                  <p className="text-xs text-slate-500 animate-pulse">
                    Seseorang sedang mengetik...
                  </p>
                </div>
              )}

              {/* Input area */}
              <div className="p-3 bg-white border-t border-gray-200">
                <div className="flex items-center gap-2 max-w-3xl mx-auto">
                  <Input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value);
                      sendTyping();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Tulis pesan..."
                    className="flex-1 h-10"
                    disabled={!isConnected}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!isConnected || !inputValue.trim()}
                    size="sm"
                    className="h-10 px-4 bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    <Send size={16} />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            /* No room selected placeholder */
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
              <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <MessageCircle className="text-slate-400" size={36} />
              </div>
              <h3 className="text-lg font-semibold text-slate-700">
                Pilih percakapan
              </h3>
              <p className="text-sm text-slate-400 mt-1 max-w-sm">
                Pilih room dari daftar di sebelah kiri, atau buat room baru untuk memulai
                percakapan.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── New Room Dialog ────────────────────────────────────────── */}
      <Dialog open={isNewRoomOpen} onOpenChange={setIsNewRoomOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Buat Room Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="Nama room, contoh: Support Request #42"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateRoom();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewRoomOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={handleCreateRoom}
              disabled={isCreatingRoom || !newRoomName.trim()}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {isCreatingRoom && <Loader2 className="animate-spin mr-2" size={14} />}
              Buat Room
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
