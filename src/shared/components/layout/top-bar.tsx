'use client';

import { Bell, ChevronDown, LogOut, MessageCircle, User, CheckCheck, ExternalLink } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/features/auth';
import { DatasetSelector } from '@/features/dataset';
import { useRouter } from 'next/navigation';
import { USER_ROLE_LABELS } from '@/features/auth/types';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { chatApi } from '@/features/chat/chat-api';
import { notificationApi } from '@/features/notification/notification-api';
import type { Notification } from '@/features/notification/types';
import { toast } from 'sonner';

// ── Helpers ────────────────────────────────────────────────────────

function formatNotifTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Baru saja';
  if (diffMin < 60) return `${diffMin}m lalu`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}j lalu`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}h lalu`;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function getNotifIcon(type: string): string {
  if (type === 'job_complete') return '🎬';
  if (type === 'annotation_ready') return '📝';
  if (type === 'stage_complete') return '✅';
  return '🔔';
}

/**
 * Top navigation bar with user profile, role badge, chat, and notifications.
 * Notifications now poll from GET /api/v1/notifications.
 */
export function TopBar() {
  const { user, logout, isAuthenticated } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const prevUnreadRef = useRef(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const initials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : '??';

  const displayName = user?.email?.split('@')[0] || 'User';
  const roleLabel = user?.role ? (USER_ROLE_LABELS[user.role] || user.role) : 'User';

  // Poll chat rooms for total unread count
  const { data: chatRooms } = useQuery({
    queryKey: ['chat-rooms-unread'],
    queryFn: () => chatApi.listRooms(50, 0),
    refetchInterval: 20000,
    enabled: isAuthenticated && mounted,
  });

  const totalChatUnread = chatRooms?.items?.reduce((sum, r) => sum + (r.unread_count || 0), 0) ?? 0;

  // Poll notifications every 30s
  const { data: notifData } = useQuery({
    queryKey: ['notifications-topbar'],
    queryFn: () => notificationApi.list({ limit: 10, unread_only: false }),
    refetchInterval: 30000,
    enabled: isAuthenticated && mounted,
  });

  const notifications: Notification[] = notifData?.items ?? [];
  const unreadCount = notifData?.unread_count ?? 0;

  // Show toast for new unread notifications
  useEffect(() => {
    if (unreadCount > prevUnreadRef.current && prevUnreadRef.current > 0) {
      const newest = notifications.find((n) => !n.is_read);
      if (newest) {
        toast.info(newest.title, { description: newest.message, duration: 5000 });
      }
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount, notifications]);

  // Mark single notification as read + navigate
  const handleNotifClick = useCallback(async (notif: Notification) => {
    if (!notif.is_read) {
      await notificationApi.markAsRead(notif.id);
      queryClient.invalidateQueries({ queryKey: ['notifications-topbar'] });
    }
    if (notif.job_id) {
      router.push(`/pipeline`);
    }
  }, [queryClient, router]);

  // Mark all as read
  const handleMarkAllRead = useCallback(async () => {
    await notificationApi.markAllAsRead();
    queryClient.invalidateQueries({ queryKey: ['notifications-topbar'] });
    toast.success('Semua notifikasi ditandai dibaca');
  }, [queryClient]);

  // ── Pre-mount: render a static placeholder to avoid Radix ID hydration mismatches ──
  if (!mounted) {
    return (
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0 z-30 relative">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400 font-medium">Anotasi.ai</span>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-semibold text-gray-700">Pipeline Anotasi SIBI</span>
          <div className="hidden md:block w-px h-5 bg-gray-200 mx-1" />
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 h-9 w-40" />
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2 text-gray-500"><MessageCircle size={18} /></div>
          <div className="p-2 text-gray-500"><Bell size={18} /></div>
          <Badge variant="outline" className="text-teal-700 border-teal-200 bg-teal-50 font-semibold text-xs capitalize">
            {roleLabel}
          </Badge>
          <div className="flex items-center gap-2 rounded-lg p-1.5">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-gradient-to-br from-teal-400 to-emerald-600 text-white text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-gray-700 leading-none capitalize">{displayName}</p>
              <p className="text-xs text-gray-400 leading-none mt-0.5 capitalize">{roleLabel}</p>
            </div>
            <ChevronDown size={14} className="text-gray-400" />
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0 z-30 relative">
      {/* Left: Breadcrumb / Page context + Dataset Selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-400 font-medium">Anotasi.ai</span>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-semibold text-gray-700">Pipeline Anotasi SIBI</span>
        <div className="hidden md:block w-px h-5 bg-gray-200 mx-1" />
        <DatasetSelector />
      </div>

      {/* Right: Chat + Notifications + Profile */}
      <div className="flex items-center gap-3">
        {/* Chat Button */}
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <button
              onClick={() => router.push('/chat')}
              className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
            >
              <MessageCircle size={18} />
              {totalChatUnread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-teal-500 text-white text-[10px] font-bold rounded-full ring-2 ring-white px-1">
                  {totalChatUnread > 99 ? '99+' : totalChatUnread}
                </span>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom"><p>Live Chat</p></TooltipContent>
        </Tooltip>

        {/* Notification Bell with Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700">
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full ring-2 ring-white px-1">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 bg-white p-0">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="text-sm font-bold text-gray-800">Notifikasi</span>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[11px] font-medium text-teal-600 hover:text-teal-800 flex items-center gap-1"
                >
                  <CheckCheck size={12} />
                  Tandai semua dibaca
                </button>
              )}
            </div>

            {/* Notification List */}
            <ScrollArea className="max-h-80">
              {notifications.length === 0 ? (
                <div className="py-8 text-center">
                  <Bell size={24} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">Belum ada notifikasi</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <button
                    key={notif.id}
                    onClick={() => handleNotifClick(notif)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                      !notif.is_read ? 'bg-blue-50/40' : ''
                    }`}
                  >
                    <div className="flex gap-2.5">
                      <span className="text-base mt-0.5 flex-shrink-0">
                        {getNotifIcon(notif.type)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className={`text-xs font-semibold truncate ${!notif.is_read ? 'text-gray-900' : 'text-gray-600'}`}>
                            {notif.title}
                          </p>
                          {!notif.is_read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
                          {notif.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-gray-400">
                            {formatNotifTime(notif.created_at)}
                          </span>
                          {notif.job_id && (
                            <span className="text-[10px] text-teal-600 flex items-center gap-0.5">
                              <ExternalLink size={8} /> Lihat Job
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Role Badge */}
        <Badge variant="outline" className="text-teal-700 border-teal-200 bg-teal-50 font-semibold text-xs capitalize">
          {roleLabel}
        </Badge>

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-gray-100 transition-colors cursor-pointer">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-gradient-to-br from-teal-400 to-emerald-600 text-white text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-gray-700 leading-none capitalize">{displayName}</p>
              <p className="text-xs text-gray-400 leading-none mt-0.5 capitalize">{roleLabel}</p>
            </div>
            <ChevronDown size={14} className="text-gray-400" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-white">
            <DropdownMenuItem onClick={() => router.push('/profile')} className="cursor-pointer">
              <User size={14} className="mr-2" />
              Profil Saya
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setIsLogoutModalOpen(true)} className="text-red-600 cursor-pointer">
              <LogOut size={14} className="mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Logout Confirmation Modal */}
      <Dialog open={isLogoutModalOpen} onOpenChange={setIsLogoutModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Logout</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin keluar dari aplikasi? Anda harus login kembali untuk mengakses sistem.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsLogoutModalOpen(false)}>
              Batal
            </Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={logout}>
              Ya, Keluar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
