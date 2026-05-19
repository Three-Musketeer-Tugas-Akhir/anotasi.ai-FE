'use client';

import { useAuth } from './auth-context';
import { Loader2 } from 'lucide-react';

/**
 * Blocks rendering of the entire app until the initial auth hydration is complete.
 *
 * This prevents:
 * 1. Dashboard flashing for unauthenticated users
 * 2. Wrong page showing while auth state is being resolved
 * 3. Route-guard race conditions during initial load
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isHydrated } = useAuth();

  if (!isHydrated) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-[100]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-teal-600" />
          <p className="text-sm text-gray-500">Memuat...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
