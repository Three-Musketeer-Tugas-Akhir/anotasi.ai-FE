'use client';

import { Bell, ChevronDown, LogOut, MessageCircle, User } from 'lucide-react';
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
import { useAuth } from '@/features/auth';
import { useRouter } from 'next/navigation';
import { USER_ROLE_LABELS } from '@/features/auth/types';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { chatApi } from '@/features/chat/chat-api';

/**
 * Top navigation bar with user profile, role badge, chat, and notifications.
 * Now wired to real user data from auth context.
 */
export function TopBar() {
  const { user, logout, isAuthenticated } = useAuth();
  const router = useRouter();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const initials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : '??';

  const displayName = user?.email?.split('@')[0] || 'User';
  const roleLabel = user?.role ? (USER_ROLE_LABELS[user.role] || user.role) : 'User';

  // Poll chat rooms for total unread count
  const { data: chatRooms } = useQuery({
    queryKey: ['chat-rooms-unread'],
    queryFn: () => chatApi.listRooms(50, 0),
    refetchInterval: 20000, // Poll every 20s
    enabled: isAuthenticated,
  });

  const totalUnread = chatRooms?.items?.reduce((sum, r) => sum + (r.unread_count || 0), 0) ?? 0;

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0 z-10">
      {/* Left: Breadcrumb / Page context */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-400 font-medium">Anotasi.ai</span>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-semibold text-gray-700">Pipeline Anotasi SIBI</span>
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
              {totalUnread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-teal-500 text-white text-[10px] font-bold rounded-full ring-2 ring-white px-1">
                  {totalUnread > 99 ? '99+' : totalUnread}
                </span>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom"><p>Live Chat</p></TooltipContent>
        </Tooltip>

        {/* Notification Bell */}
        <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700">
          <Bell size={18} />
          {/* Red dot indicator */}
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
        </button>

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


