'use client';

import { useSelectedDataset } from '@/features/dataset/context/dataset-context';
import { useDatasets } from '@/features/dataset/hooks/use-dataset';
import { useAuth } from '@/features/auth';
import { Database, Loader2, FolderOpen } from 'lucide-react';
import type { Dataset } from '@/features/dataset/types/dataset.types';

/**
 * DatasetGate — full-screen overlay that forces dataset selection.
 *
 * Renders on top of everything when:
 *  1. The user is authenticated
 *  2. Context has hydrated from localStorage
 *  3. No dataset is currently selected
 *
 * Once the user picks a dataset the overlay dismisses instantly.
 */
export function DatasetGate() {
  const { isAuthenticated } = useAuth();
  const { needsDatasetSelection, setSelectedDataset, isHydrated } = useSelectedDataset();
  const { data: datasetsResponse, isLoading } = useDatasets({ enabled: isAuthenticated });

  // Don't render if not authenticated, not hydrated, or dataset is already selected
  if (!isAuthenticated || !isHydrated || !needsDatasetSelection) return null;

  const datasets: Dataset[] = datasetsResponse?.items ?? [];

  const handleSelect = (dataset: Dataset) => {
    setSelectedDataset(dataset);
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
    >
      {/* Backdrop overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-800/70 to-teal-900/60" />

      {/* Content container */}
      <div className="relative z-10 w-full max-w-2xl mx-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 shadow-lg shadow-teal-500/30 mb-4">
            <Database className="text-white" size={28} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Selamat Datang di Anotasi.ai
          </h1>
          <p className="text-slate-300 text-sm max-w-md mx-auto">
            Pilih dataset kerja Anda untuk memulai. Semua data di platform akan ditampilkan berdasarkan dataset yang dipilih.
          </p>
        </div>

        {/* Dataset cards */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-teal-400" size={32} />
          </div>
        ) : datasets.length === 0 ? (
          <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10">
            <FolderOpen className="mx-auto text-slate-400 mb-3" size={40} />
            <p className="text-slate-300 text-sm">Belum ada dataset tersedia.</p>
            <p className="text-slate-400 text-xs mt-1">Hubungi admin untuk membuat dataset baru.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {datasets.map((ds, idx) => (
              <button
                key={ds.id}
                onClick={() => handleSelect(ds)}
                className="group relative w-full text-left px-5 py-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-teal-400/40 transition-all duration-300 hover:shadow-lg hover:shadow-teal-500/10"
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-teal-500/20 to-emerald-500/20 border border-teal-500/20 flex items-center justify-center group-hover:from-teal-500/30 group-hover:to-emerald-500/30 transition-colors">
                    <Database className="text-teal-400" size={18} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold text-sm group-hover:text-teal-300 transition-colors truncate">
                      {ds.name}
                    </h3>
                    {ds.description && (
                      <p className="text-slate-400 text-xs mt-0.5 truncate">
                        {ds.description}
                      </p>
                    )}
                  </div>

                  {/* Arrow indicator */}
                  <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-teal-400">
                      <path d="M7 4l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
