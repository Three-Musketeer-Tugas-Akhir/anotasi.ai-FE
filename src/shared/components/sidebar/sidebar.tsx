'use client';

import { useState } from 'react';
import {
  Layout,
  Video as VideoIcon,
  HandMetal,
  FileText,
  CheckCircle,
  Menu,
} from 'lucide-react';
import { cn } from '@/shared/utils/cn';

/** Navigation item config */
export interface NavItemConfig {
  icon: React.ReactNode;
  label: string;
  href: string;
}

/** Default navigation items matching the PRD modules */
export const defaultNavItems: NavItemConfig[] = [
  { icon: <Layout size={20} />, label: 'Dashboard', href: '/' },
];

export const pipelineNavItems: NavItemConfig[] = [
  { icon: <VideoIcon size={20} />, label: 'Media Library', href: '/media' },
  { icon: <HandMetal size={20} />, label: 'Klasifikasi JBI', href: '/classification' },
  { icon: <FileText size={20} />, label: 'Annotation Workbench', href: '/annotation' },
  { icon: <CheckCircle size={20} />, label: 'Curation Hub', href: '/curation' },
];

interface SidebarProps {
  /** Currently active route path */
  activePath?: string;
}

/**
 * App sidebar navigation.
 * Collapsible with branding, nav items, and user profile.
 */
export function Sidebar({ activePath = '/' }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <aside
      className={cn(
        'bg-slate-900 text-white transition-all duration-300 flex flex-col flex-shrink-0 z-20',
        isOpen ? 'w-64' : 'w-20',
      )}
    >
      {/* Header / Brand */}
      <div className="p-4 flex items-center justify-between border-b border-slate-700">
        {isOpen ? (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center font-bold">
              A
            </div>
            <span className="font-bold text-lg tracking-tight">Anotasi.ai</span>
          </div>
        ) : (
          <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center font-bold mx-auto">
            A
          </div>
        )}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-slate-400 hover:text-white"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-1">
        {defaultNavItems.map((item) => (
          <NavItem
            key={item.href}
            icon={item.icon}
            label={item.label}
            isOpen={isOpen}
            active={activePath === item.href}
            href={item.href}
          />
        ))}

        <div className="pt-4 pb-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {isOpen && 'Pipeline'}
        </div>

        {pipelineNavItems.map((item) => (
          <NavItem
            key={item.href}
            icon={item.icon}
            label={item.label}
            isOpen={isOpen}
            active={activePath === item.href}
            href={item.href}
          />
        ))}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-slate-700">
        {isOpen && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-teal-400 to-emerald-600" />
            <div>
              <p className="text-sm font-medium">Martin</p>
              <p className="text-xs text-slate-400">Annotator Role</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

// ── Internal NavItem component ─────────────────────────────────────
function NavItem({
  icon,
  label,
  active = false,
  isOpen,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  isOpen: boolean;
  href: string;
}) {
  return (
    <a
      href={href}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors mb-1',
        active
          ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/20'
          : 'text-slate-300 hover:bg-slate-800 hover:text-white',
      )}
    >
      <div className={cn(active ? 'text-white' : 'text-slate-400')}>{icon}</div>
      {isOpen && <span className="text-sm font-medium">{label}</span>}
    </a>
  );
}
