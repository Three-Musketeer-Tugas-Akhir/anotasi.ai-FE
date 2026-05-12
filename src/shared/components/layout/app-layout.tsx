'use client';

import { Sidebar } from '@/shared/components/sidebar/sidebar';
import { TopBar } from '@/shared/components/layout/top-bar';
import { ClientOnly } from '@/shared/components/client-only';

interface AppLayoutProps {
  children: React.ReactNode;
  /** Current route path for sidebar active state */
  activePath?: string;
}

/**
 * Shell layout composing sidebar + top bar + content area.
 * Used across all authenticated pages.
 *
 * Note: Sidebar tour trigger has been moved to DashboardPage
 * so it only fires on the user's first Dashboard visit.
 */
export function AppLayout({ children, activePath }: AppLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-50 font-sans text-slate-800 overflow-hidden">
      <ClientOnly>
        <Sidebar activePath={activePath} />
      </ClientOnly>
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <TopBar />
        <main className="flex-1 flex flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
