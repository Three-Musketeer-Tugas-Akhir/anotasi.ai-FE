'use client';

import { useAuth } from './auth-context';

/**
 * Blocks rendering of the entire app until the initial auth hydration is complete.
 *
 * This prevents:
 * 1. Dashboard flashing for unauthenticated users
 * 2. Wrong page showing while auth state is being resolved
 * 3. Route-guard race conditions during initial load
 *
 * Returns null (blank screen) instead of a spinner to avoid
 * showing a loading indicator that fights with page-level skeletons.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isHydrated } = useAuth();

  if (!isHydrated) {
    return null;
  }

  return <>{children}</>;
}
