'use client';

import { useEffect, useState } from 'react';

/**
 * ClientOnly wrapper — prevents SSR hydration mismatches.
 *
 * Use this to wrap components that:
 * - Access browser APIs (window, localStorage)
 * - Read auth state from client-side storage
 * - Are targeted by browser extensions that mutate DOM attributes
 *
 * The children will only render after the client has hydrated,
 * eliminating any hydration mismatch warnings.
 */
export function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Render a visually identical placeholder to prevent layout shift
    return (
      <aside className="bg-slate-900 text-white flex flex-col flex-shrink-0 z-20 w-60" aria-hidden="true">
        <div className="p-4 flex items-center justify-between border-b border-slate-700/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-teal-600 rounded-lg flex items-center justify-center font-bold text-sm shadow-lg shadow-teal-900/30">
              A
            </div>
            <span className="font-bold text-base tracking-tight">Anotasi.ai</span>
          </div>
        </div>
        <nav className="flex-1 py-4 px-2.5 space-y-0.5 overflow-y-auto">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5">
              <div className="w-5 h-5 bg-slate-700 rounded flex-shrink-0 animate-pulse" />
              <div className="flex-1 h-4 bg-slate-700 rounded animate-pulse" />
            </div>
          ))}
        </nav>
      </aside>
    );
  }

  return <>{children}</>;
}
