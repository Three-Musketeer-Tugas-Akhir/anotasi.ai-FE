'use client';

import { useState } from 'react';
import { useSelectedDataset } from '@/features/dataset/context/dataset-context';
import { useDatasets, useCreateDataset } from '@/features/dataset/hooks/use-dataset';
import { useAuth } from '@/features/auth';
import { Database, Loader2, FolderOpen, Plus, ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import type { Dataset } from '@/features/dataset/types/dataset.types';

export function DatasetGate() {
  const { isAuthenticated } = useAuth();
  const { needsDatasetSelection, setSelectedDataset, isHydrated } = useSelectedDataset();
  const { data: datasetsResponse, isLoading } = useDatasets({ enabled: isAuthenticated });

  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const { mutateAsync: createDataset, isPending: isCreatingDataset } = useCreateDataset();

  // Don't render if not authenticated, not hydrated, or dataset is already selected
  if (!isAuthenticated || !isHydrated || !needsDatasetSelection) return null;

  const datasets: Dataset[] = datasetsResponse?.items ?? [];

  const handleSelect = (dataset: Dataset) => {
    setSelectedDataset(dataset);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const newDataset = await createDataset({ name, description });
      toast.success('Dataset berhasil dibuat', {
        description: `Dataset "${newDataset.name}" kini tersedia.`,
        position: 'top-center'
      });
      setName('');
      setDescription('');
      setIsCreating(false);
    } catch (err: any) {
      toast.error('Gagal membuat dataset', {
        description: err?.response?.data?.detail || err?.message || 'Terjadi kesalahan',
        position: 'top-center'
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
      style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
    >
      {/* Backdrop overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-800/70 to-teal-900/60" />

      {/* Content container */}
      <div className="relative z-10 w-full max-w-xl mx-4 overflow-hidden rounded-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header */}
        <div className="text-center mb-6 relative z-20 pt-8 px-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 shadow-lg shadow-teal-500/30 mb-4">
            <Database className="text-white" size={28} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Selamat Datang di Anotasi.ai
          </h1>
          <p className="text-slate-300 text-sm max-w-md mx-auto transition-all duration-500 h-10">
            {isCreating 
              ? 'Tambahkan dataset baru untuk keperluan anotasi. Pastikan nama mudah dikenali.'
              : 'Pilih dataset kerja Anda untuk memulai. Semua data akan menyesuaikan pilihan ini.'}
          </p>
        </div>

        <div className="relative w-full pb-8">
          {/* Sliding Track */}
          <div 
            className="flex w-[200%] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
            style={{ transform: isCreating ? 'translateX(-50%)' : 'translateX(0)' }}
          >
            {/* PANEL 1: Dataset List */}
            <div className="w-1/2 flex-shrink-0 px-8">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 px-5 py-4 rounded-xl border border-white/10 bg-white/5"
                    >
                      <Skeleton className="h-11 w-11 rounded-xl flex-shrink-0" />
                      <div className="flex-1 min-w-0 space-y-2">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                      <Skeleton className="h-5 w-5 rounded-full flex-shrink-0" />
                    </div>
                  ))}
                  <Skeleton className="h-12 w-full rounded-xl" />
                </div>
              ) : (
                <div className="space-y-3">
                  {datasets.length === 0 ? (
                    <div className="text-center py-8 bg-white/5 rounded-xl border border-white/10">
                      <FolderOpen className="mx-auto text-slate-400 mb-3" size={32} />
                      <p className="text-slate-300 text-sm">Belum ada dataset tersedia.</p>
                    </div>
                  ) : (
                    <div className="grid gap-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                      {datasets.map((ds, idx) => (
                        <button
                          key={ds.id}
                          onClick={() => handleSelect(ds)}
                          className="group relative w-full text-left px-5 py-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-teal-400/40 transition-all duration-300 hover:shadow-lg hover:shadow-teal-500/10"
                          style={{ animationDelay: `${idx * 80}ms` }}
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-teal-500/20 to-emerald-500/20 border border-teal-500/20 flex items-center justify-center group-hover:from-teal-500/30 group-hover:to-emerald-500/30 transition-colors">
                              <Database className="text-teal-400" size={18} />
                            </div>
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

                  <button
                    onClick={() => setIsCreating(true)}
                    className="w-full mt-2 flex items-center justify-center gap-2 px-5 py-4 rounded-xl border border-dashed border-white/20 text-white/70 hover:text-white hover:bg-white/10 hover:border-white/40 transition-all"
                  >
                    <Plus size={18} />
                    <span className="text-sm font-medium">Buat Dataset Baru</span>
                  </button>
                </div>
              )}
            </div>

            {/* PANEL 2: Create Dataset Form */}
            <div className="w-1/2 flex-shrink-0 px-8">
              <form onSubmit={handleCreate} className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-5">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Nama Dataset <span className="text-red-400">*</span></label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Contoh: SIBI Berita 2026"
                    className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Deskripsi (Opsional)</label>
                  <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tulis deskripsi singkat..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 resize-none transition-all"
                  />
                </div>
                
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
                  >
                    <ArrowLeft size={16} />
                    Kembali
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingDataset || !name.trim()}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 transition-all shadow-lg shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreatingDataset ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />}
                    Simpan Dataset
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
