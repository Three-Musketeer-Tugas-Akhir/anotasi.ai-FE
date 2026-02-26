'use client';

import { Bell, ChevronDown } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * Top navigation bar with user profile, role badge, and notifications.
 */
export function TopBar() {
  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0 z-10">
      {/* Left: Breadcrumb / Page context */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-400 font-medium">Anotasi.ai</span>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-semibold text-gray-700">Pipeline Anotasi SIBI</span>
      </div>

      {/* Right: Notifications + Profile */}
      <div className="flex items-center gap-4">
        {/* Notification Bell */}
        <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700">
          <Bell size={18} />
          {/* Red dot indicator */}
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
        </button>

        {/* Role Badge */}
        <Badge variant="outline" className="text-teal-700 border-teal-200 bg-teal-50 font-semibold text-xs">
          Admin
        </Badge>

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-gray-100 transition-colors cursor-pointer">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-gradient-to-br from-teal-400 to-emerald-600 text-white text-xs font-bold">
                MT
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-gray-700 leading-none">Martin</p>
              <p className="text-xs text-gray-400 leading-none mt-0.5">Admin</p>
            </div>
            <ChevronDown size={14} className="text-gray-400" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>Profil Saya</DropdownMenuItem>
            <DropdownMenuItem>Pengaturan</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600">Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
