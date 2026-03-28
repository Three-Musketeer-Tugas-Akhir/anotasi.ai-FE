'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, Layout, Loader2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useJobs, useUpdateCategory } from '@/features/classification/hooks/use-classification';
import type { CategoryStatus, JobListParams } from '@/features/classification/types/classification.types';
import { useTour } from '@/shared/components/tour';
import { classificationTour } from '../classification.tour';
import { VideoList } from './video-list';
import { VideoPlayer } from './video-player';
import { CategorizationPanel } from './categorization-panel';
import { VideoUploadModal } from './video-upload-modal';

type FilterValue = 'all' | CategoryStatus;

/**
 * Classification page — main orchestrator.
 *
 * Manages local UI state (selected job, filter, search, pagination) and delegates
 * rendering to decomposed child components.
 */
export function ClassificationPage() {
  // ── State ────────────────────────────────────────────────────────────
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterValue>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [page, setPage] = useState(0); // offset-based pagination
  const PAGE_SIZE = 20;

  // ── Build query params ───────────────────────────────────────────────
  const params: JobListParams = {
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  };
  // Map filter to API category param (only for SIBI/BISINDO, not 'all'/'uncategorized')
  if (filter === 'SIBI' || filter === 'BISINDO') {
    params.category = filter;
  }

  // ── Data fetching ────────────────────────────────────────────────────
  const { data, isLoading, isError, refetch } = useJobs(params);
  const jobs = data?.jobs || [];
  const totalJobs = data?.total || 0;
  const totalPages = Math.ceil(totalJobs / PAGE_SIZE);

  const { mutate: updateCategory, isPending } = useUpdateCategory();

  const { startTour, activeTour, hasCompletedTour } = useTour();

  // ── Tour Trigger ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoading && jobs.length > 0 && !activeTour && !hasCompletedTour(classificationTour.id)) {
      const timer = setTimeout(() => {
        startTour(classificationTour);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, jobs.length, activeTour, hasCompletedTour, startTour]);

  // Derive effective selected job — falls back to first job when nothing is selected
  const effectiveSelectedJobId = selectedJobId ?? (jobs.length > 0 ? jobs[0].job_id : null);
  const selectedJob = jobs.find((j) => j.job_id === effectiveSelectedJobId) ?? null;

  // Filtered + searched list (client-side search; API handles category filter)
  const filteredJobs = jobs.filter((j) => {
    // For 'uncategorized' filter, do client-side filtering since API doesn't support null category filter
    const matchesFilter =
      filter === 'all' || filter === 'SIBI' || filter === 'BISINDO'
        ? true
        : j.category === 'uncategorized';
    const matchesSearch =
      !searchQuery || (j.video_title || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Count categorised jobs for progress display
  const categorisedCount = jobs.filter(
    (j) => j.category === 'SIBI' || j.category === 'BISINDO',
  ).length;

  // Handle keyboard shortcuts (1 = SIBI, 2 = BISINDO)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!selectedJob || isPending) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '1') handleCategorize('SIBI');
      if (e.key === '2') handleCategorize('BISINDO');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedJob, isPending]);

  // ── Handlers ────────────────────────────────────────────────────────
  function handleCategorize(category: 'SIBI' | 'BISINDO') {
    if (!selectedJob) return;
    updateCategory(
      { jobId: selectedJob.job_id, category },
      {
        onSuccess: () => {
          setShowToast(true);
          setTimeout(() => setShowToast(false), 2000);
          // Auto-advance to next uncategorized job
          const nextJob = jobs.find(
            (j) => j.job_id !== selectedJob.job_id && j.category === 'uncategorized',
          );
          if (nextJob) setSelectedJobId(nextJob.job_id);
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
          <p className="text-sm text-gray-500 mt-1">
            Tentukan apakah Juru Bahasa Isyarat menggunakan SIBI atau BISINDO
          </p>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="mt-3 px-3 py-1.5 text-sm font-medium text-teal-700 bg-teal-100 rounded-md hover:bg-teal-200 transition-colors"
          >
            + Upload Video Baru
          </button>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-gray-700">
            Progress: {categorisedCount}/{totalJobs} Video
          </p>
          <div className="w-48 h-2 bg-gray-200 rounded-full mt-1 overflow-hidden">
            <div
              className="h-full bg-teal-500 rounded-full transition-all duration-300"
              style={{
                width: `${totalJobs > 0 ? (categorisedCount / totalJobs) * 100 : 0}%`,
              }}
            />
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 mt-2">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs text-gray-500">
                {page + 1} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-40 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel — Video List */}
        <VideoList
          jobs={filteredJobs}
          selectedJobId={effectiveSelectedJobId}
          filter={filter}
          searchQuery={searchQuery}
          onSelectJob={setSelectedJobId}
          onFilterChange={setFilter}
          onSearchChange={setSearchQuery}
        />

        {/* Right Panel — Player + Categorisation */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-gray-50">
          {selectedJob ? (
            <>
              <VideoPlayer job={selectedJob} />
              <CategorizationPanel
                job={selectedJob}
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

      {/* Upload Modal */}
      <VideoUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={(jobId) => {
          refetch();
          setSelectedJobId(jobId);
        }}
      />
    </>
  );
}
