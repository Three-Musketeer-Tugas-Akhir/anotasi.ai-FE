'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Register page — disabled.
 * Registration is admin-only in jbi-service.
 * Redirects users to the login page.
 */
export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-500 text-sm">Mengalihkan ke halaman login...</p>
    </div>
  );
}
