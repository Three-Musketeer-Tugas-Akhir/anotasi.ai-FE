'use client';

import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Video as VideoIcon,
  Cog,
  FileText,
  PenTool,
  Search,
  Package,
  Menu,
  ScrollText,
  Users,
  Server,
  Network,
} from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/features/auth';

/** Navigation item config */
export interface NavItemConfig {
  icon: React.ReactNode;
  label: string;
  href: string;
  badge?: string;
}

/** All navigation items matching the blueprint */
const navItems: NavItemConfig[] = [
  { icon: <LayoutDashboard size={20} />, label: 'Dashboard', href: '/' },
  { icon: <VideoIcon size={20} />, label: 'Klasifikasi JBI', href: '/classification' },
  { icon: <Cog size={20} />, label: 'Pemrosesan', href: '/pipeline', badge: '3' },
  { icon: <FileText size={20} />, label: 'Anotasi Suara', href: '/asr-review' },
  { icon: <PenTool size={20} />, label: 'Anotasi JBI', href: '/annotation' },
  { icon: <Search size={20} />, label: 'Normalisasi', href: '/curation' },
  { icon: <ScrollText size={20} />, label: 'Audit Trail', href: '/audit' },
  { icon: <Package size={20} />, label: 'Unduh Dataset', href: '/export' },
];

/** Admin-only navigation items */
const adminNavItems: NavItemConfig[] = [
  { icon: <Network size={20} />, label: 'Distribusi Tugas JBI', href: '/admin/assign-jbi' },
  { icon: <Users size={20} />, label: 'Kelola User', href: '/admin/users' },
  { icon: <Server size={20} />, label: 'Sistem', href: '/admin/system' },
];

interface SidebarProps {
  /** Currently active route path */
  activePath?: string;
}

/**
 * App sidebar navigation.
 * Collapsible with branding and nav items. Shadcn Tooltip for collapsed labels.
 * Admin section shown only for admin role.
 */
export function Sidebar({ activePath = '/' }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Listen for global events to collapse/expand from other components
  useEffect(() => {
    const handleCollapse = () => setIsOpen(false);
    const handleExpand = () => setIsOpen(true);
    window.addEventListener('collapse-main-sidebar', handleCollapse);
    window.addEventListener('expand-main-sidebar', handleExpand);
    return () => {
      window.removeEventListener('collapse-main-sidebar', handleCollapse);
      window.removeEventListener('expand-main-sidebar', handleExpand);
    };
  }, []);

  return (
    <aside
      id="tour-sidebar"
      className={cn(
        'bg-slate-900 text-white transition-all duration-300 flex flex-col flex-shrink-0 z-20',
        isOpen ? 'w-60' : 'w-[68px]',
      )}
    >
      {/* Header / Brand */}
      <div className="p-4 flex items-center justify-between border-b border-slate-700/50">
        {isOpen ? (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-teal-600 rounded-lg flex items-center justify-center font-bold text-sm shadow-lg shadow-teal-900/30">
              A
            </div>
            <span className="font-bold text-base tracking-tight">Anotasi.ai</span>
          </div>
        ) : (
          <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-teal-600 rounded-lg flex items-center justify-center font-bold text-sm mx-auto shadow-lg shadow-teal-900/30">
            A
          </div>
        )}
        {isOpen && (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <Menu size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2.5 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavItem
            key={item.href}
            icon={item.icon}
            label={item.label}
            badge={item.badge}
            isOpen={isOpen}
            active={activePath === item.href}
            href={item.href}
          />
        ))}

        {/* Admin Section */}
        {isAdmin && (
          <>
            <div className="my-3 border-t border-slate-700/50" />
            {isOpen && (
              <p className="px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">
                Admin
              </p>
            )}
            {adminNavItems.map((item) => (
              <NavItem
                key={item.href}
                icon={item.icon}
                label={item.label}
                isOpen={isOpen}
                active={activePath === item.href}
                href={item.href}
              />
            ))}
          </>
        )}
      </nav>

      {/* Collapse toggle when collapsed */}
      {!isOpen && (
        <div className="p-3 border-t border-slate-700/50">
          <button
            onClick={() => setIsOpen(true)}
            className="w-full flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <Menu size={18} />
          </button>
        </div>
      )}
    </aside>
  );
}

// ── Internal NavItem component ─────────────────────────────────────
function NavItem({
  icon,
  label,
  badge,
  active = false,
  isOpen,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  badge?: string;
  active?: boolean;
  isOpen: boolean;
  href: string;
}) {
  const content = (
    <a
      href={href}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 mb-0.5',
        active
          ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/20'
          : 'text-slate-300 hover:bg-slate-800 hover:text-white',
      )}
    >
      <div className={cn('flex-shrink-0', active ? 'text-white' : 'text-slate-400')}>{icon}</div>
      {isOpen && (
        <div className="flex items-center justify-between flex-1 min-w-0">
          <span className="text-sm font-medium truncate">{label}</span>
          {badge && (
            <Badge variant="secondary" className="bg-slate-700 text-slate-200 text-[10px] px-1.5 py-0 h-5 font-semibold">
              {badge}
            </Badge>
          )}
        </div>
      )}
    </a>
  );

  if (!isOpen) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

