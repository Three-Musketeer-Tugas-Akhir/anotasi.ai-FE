'use client';

import { AppLayout } from '@/shared/components/layout/app-layout';
import { AlertTriangle } from 'lucide-react';

/**
 * Pre-merge page removed.
 * 
 * Pre-merge is now fully on-demand during annotation viewing.
 * When annotator opens utterance N, the merged video (N + N+1) is created
 * lazily. Only the first utterance is pre-merged after CV2 completes.
 */
export default function AdminPremergePage() {
  return (
    <AppLayout activePath="/admin/premerge">
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle size={48} className="mx-auto mb-4 text-amber-400" />
          <h2 className="text-xl font-bold text-gray-900">Halaman Dihapus</h2>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">
            Pre-merge sekarang dilakukan secara on-demand saat annotator membuka kalimat.
            Tidak ada lagi proses background pre-merge massal.
            Hanya kalimat pertama yang di-merge otomatis setelah CV2 selesai.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
