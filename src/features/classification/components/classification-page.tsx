'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, Layout, Loader2, AlertCircle } from 'lucide-react';
import { useVideos, useUpdateVideoStatus } from '@/features/classification/hooks/use-classification';
import { VideoStatus } from '@/features/classification/types/classification.types';
import { useTour } from '@/shared/components/tour';
import { classificationTour } from '../classification.tour';
import { VideoList } from './video-list';
import { VideoPlayer } from './video-player';
import { CategorizationPanel } from './categorization-panel';

/**
 * Classification page — main orchestrator.
 *
 * Manages local UI state (selected video, filter, search) and delegates
 * rendering to decomposed child components.
 */
export function ClassificationPage() {
  const { data: videos = [], isLoading, isError, refetch } = useVideos();
  const { mutate: updateStatus, isPending } = useUpdateVideoStatus();

  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | VideoStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showToast, setShowToast] = useState(false);
  const { startTour, activeTour, hasCompletedTour } = useTour();

  // ── Tour Trigger ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoading && videos.length > 0 && !activeTour && !hasCompletedTour(classificationTour.id)) {
      const timer = setTimeout(() => {
        startTour(classificationTour);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, videos.length, activeTour, hasCompletedTour, startTour]);

  // Derive effective selected video — falls back to first video when nothing is selected
  const effectiveSelectedVideoId = selectedVideoId ?? (videos.length > 0 ? videos[0].id : null);
  const selectedVideo = videos.find((v) => v.id === effectiveSelectedVideoId) ?? null;

  // Filtered + searched list
  const filteredVideos = videos.filter((v) => {
    const matchesFilter = filter === 'all' || v.status === filter;
    const matchesSearch =
      !searchQuery || v.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Count categorised videos for progress display
  const categorisedCount = videos.filter(
    (v) => v.status === 'sibi' || v.status === 'bisindo',
  ).length;

  // Handle keyboard shortcuts (1 = SIBI, 2 = BISINDO)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!selectedVideo || isPending) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '1') handleCategorize('sibi');
      if (e.key === '2') handleCategorize('bisindo');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVideo, isPending]);

  // ── Handlers ────────────────────────────────────────────────────────
  function handleCategorize(status: VideoStatus) {
    if (!selectedVideo) return;
    updateStatus(
      { id: selectedVideo.id, status },
      {
        onSuccess: () => {
          setShowToast(true);
          setTimeout(() => setShowToast(false), 2000);
          // Auto-advance to next uncategorized video
          const nextVideo = videos.find(
            (v) => v.id !== selectedVideo.id && v.status === 'uncategorized',
          );
          if (nextVideo) setSelectedVideoId(nextVideo.id);
        },
      },
    );
  }

  // ── Loading / Error states ─────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-teal-500" size={32} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 gap-3">
        <AlertCircle className="text-red-400" size={40} />
        <p className="text-gray-600">Gagal memuat data video.</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Top Progress Bar */}
      <div className="px-6 py-4 bg-white border-b border-gray-200 flex-shrink-0 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Layout size={20} className="text-teal-600" />
            Klasifikasi Tipe JBI
          </h1>
          <p className="text-sm text-gray-500">
            Tentukan apakah Juru Bahasa Isyarat menggunakan SIBI atau BISINDO
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-gray-700">
            Progress: {categorisedCount}/{videos.length} Video
          </p>
          <div className="w-48 h-2 bg-gray-200 rounded-full mt-1 overflow-hidden">
            <div
              className="h-full bg-teal-500 rounded-full transition-all duration-300"
              style={{
                width: `${videos.length > 0 ? (categorisedCount / videos.length) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel — Video List */}
        <VideoList
          videos={filteredVideos}
          selectedVideoId={effectiveSelectedVideoId}
          filter={filter}
          searchQuery={searchQuery}
          onSelectVideo={setSelectedVideoId}
          onFilterChange={setFilter}
          onSearchChange={setSearchQuery}
        />

        {/* Right Panel — Player + Categorisation */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-gray-50">
          {selectedVideo ? (
            <>
              <VideoPlayer video={selectedVideo} />
              <CategorizationPanel
                video={selectedVideo}
                isPending={isPending}
                onCategorize={handleCategorize}
              />
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <p>Pilih video dari daftar di samping untuk mulai mengkategorikan.</p>
            </div>
          )}
        </div>
      </div>

      {/* Toast notification */}
      {showToast && (
        <div className="fixed bottom-6 right-6 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom-5 z-50">
          <CheckCircle size={18} />
          <span className="text-sm font-medium">Status berhasil diperbarui!</span>
        </div>
      )}
    </>
  );
}
