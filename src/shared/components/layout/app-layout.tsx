'use client';

import { Sidebar } from '@/shared/components/sidebar/sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
  /** Current route path for sidebar active state */
  activePath?: string;
}

/**
 * Shell layout composing sidebar + content area.
 * Used across all authenticated pages.
 */
export function AppLayout({ children, activePath }: AppLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-50 font-sans text-slate-800 overflow-hidden">
      <Sidebar activePath={activePath} />
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {children}
      </main>
    </div>
  );
}
