'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, Layout, Loader2, AlertCircle } from 'lucide-react';
import { useVideos, useUpdateVideoStatus } from '@/features/classification/hooks/use-classification';
import { VideoStatus } from '@/features/classification/types/classification.types';
import { VideoList } from './video-list';
import { VideoPlayer } from './video-player';
import { CategorizationPanel } from './categorization-panel';

/**
 * Classification page orchestrator.
 * Manages local UI state and delegates rendering to decomposed components.
 */
export function ClassificationPage() {
  // ── Server State ──────────────────────────────────────────────────
  const { data: videos = [], isLoading, isError, error, refetch } = useVideos();

  // ── Local UI State ────────────────────────────────────────────────
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | VideoStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showToast, setShowToast] = useState(false);

  // Derive effective selected video — falls back to first video when nothing is selected
  const effectiveSelectedVideoId = selectedVideoId ?? (videos.length > 0 ? videos[0].id : null);

  // ── Mutation ──────────────────────────────────────────────────────
  const mutation = useUpdateVideoStatus((updatedVideo) => {
    // Show toast
    setShowToast(true);
    setTimeout(() => setShowToast(false), 1500);

    // Auto-advance to next uncategorized video
    const currentIndex = videos.findIndex((v) => v.id === updatedVideo.id);
    const nextVideo = videos.find(
      (v, idx) => idx > currentIndex && v.status === 'uncategorized',
    );
    if (nextVideo) {
      setSelectedVideoId(nextVideo.id);
    }
  });

  // ── Handlers ──────────────────────────────────────────────────────
  const handleCategorize = useCallback(
    (status: VideoStatus) => {
      if (!effectiveSelectedVideoId || mutation.isPending) return;
      mutation.mutate({ id: effectiveSelectedVideoId, status });
    },
    [effectiveSelectedVideoId, mutation],
  );

  // ── Keyboard Shortcuts ────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (mutation.isPending) return;

      if (e.key === '1') handleCategorize('sibi');
      if (e.key === '2') handleCategorize('bisindo');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCategorize, mutation.isPending]);

  // ── Derived State ─────────────────────────────────────────────────
  const selectedVideo = videos.find((v) => v.id === effectiveSelectedVideoId);

  const stats = {
    total: videos.length,
    completed: videos.filter((v) => v.status !== 'uncategorized').length,
  };
  const progress = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;

  // ── Loading State ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gray-50 text-slate-500">
        <Loader2 className="animate-spin mb-4 text-teal-500" size={48} />
        <p>Memuat playlist video...</p>
      </div>
    );
  }

  // ── Error State ───────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gray-50 text-red-500">
        <AlertCircle size={64} className="mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Gagal Memuat Data</h2>
        <p className="mb-6 text-slate-600">{(error as Error).message}</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Klasifikasi Tipe JBI</h1>
          <p className="text-xs text-slate-500">
            Tentukan apakah Juru Bahasa Isyarat menggunakan SIBI atau BISINDO
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <div className="text-xs font-medium text-slate-600 mb-1">
              Progress: {stats.completed}/{stats.total} Video
            </div>
            <div className="w-48 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Video List */}
        <VideoList
          videos={videos}
          selectedVideoId={effectiveSelectedVideoId}
          filter={filter}
          searchQuery={searchQuery}
          onSelectVideo={setSelectedVideoId}
          onFilterChange={setFilter}
          onSearchChange={setSearchQuery}
        />

        {/* Right Panel: Player & Action */}
        <div className="flex-1 bg-gray-50 flex flex-col overflow-y-auto relative">
          {selectedVideo ? (
            <div className="p-6 max-w-5xl mx-auto w-full">
              <VideoPlayer video={selectedVideo} />
              <CategorizationPanel
                video={selectedVideo}
                isPending={mutation.isPending}
                onCategorize={handleCategorize}
              />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <Layout size={64} className="mb-4 opacity-20" />
              <p>Pilih video dari daftar di sebelah kiri untuk memulai.</p>
            </div>
          )}

          {/* Toast notification */}
          {showToast && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-3 animate-bounce z-50">
              <CheckCircle className="text-green-400" size={20} />
              <span className="font-medium">Tersimpan!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
