'use client';

import { AppLayout } from '@/shared/components/layout/app-layout';
import { PremergeDashboardPage } from '@/features/admin/premerge/dashboard';
import { useAuth } from '@/features/auth';
import { Shield, Loader2 } from 'lucide-react';

export default function AdminPremergePage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <AppLayout activePath="/admin/premerge">
        <div className="flex flex-1 items-center justify-center">
          <Loader2 size={32} className="animate-spin text-teal-600" />
        </div>
      </AppLayout>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <AppLayout activePath="/admin/premerge">
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <Shield size={48} className="mx-auto mb-4 text-gray-300" />
            <h2 className="text-xl font-bold text-gray-900">Akses Ditolak</h2>
            <p className="mt-1 text-sm text-gray-500">
              Hanya admin yang dapat mengakses halaman ini.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activePath="/admin/premerge">
      <div className="flex-1 overflow-y-auto">
        <PremergeDashboardPage />
      </div>
    </AppLayout>
  );
}
