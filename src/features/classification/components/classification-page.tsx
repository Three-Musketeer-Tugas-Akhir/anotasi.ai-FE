'use client';

import { useState, useEffect } from 'react';
import { Layout, AlertCircle } from 'lucide-react';
import { useSelectedDataset } from '@/features/dataset';
import { useJobs, useUpdateCategory } from '@/features/classification/hooks/use-classification';
import type { CategoryStatus, JobListParams } from '@/features/classification/types/classification.types';
import { useTour } from '@/shared/components/tour';
import { classificationTour } from '../classification.tour';
import { VideoList } from './video-list';
import { VideoPlayer } from './video-player';
import { CategorizationPanel } from './categorization-panel';
import { VideoUploadModal } from './video-upload-modal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

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
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [page, setPage] = useState(0); // offset-based pagination
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, targetCategory: 'SIBI' | 'BISINDO' | null}>({ isOpen: false, targetCategory: null });
  const PAGE_SIZE = 20;
  const isSearching = searchQuery.trim().length > 0;

  // ── Dataset context ──────────────────────────────────────────────────
  const { selectedDataset } = useSelectedDataset();

  // ── Build query params ───────────────────────────────────────────────
  const params: JobListParams = {
    limit: isSearching ? 100 : PAGE_SIZE,
    offset: isSearching ? 0 : page * PAGE_SIZE,
  };
  if (selectedDataset?.id) {
    params.dataset_id = selectedDataset.id;
  }
  // Map filter to API category param (only for SIBI/BISINDO, not 'all'/'uncategorized')
  if (filter === 'SIBI' || filter === 'BISINDO') {
    params.category = filter;
  }

  // ── Data fetching ────────────────────────────────────────────────────
  const { data, isLoading, isError, refetch } = useJobs(params);
  const jobs = data?.jobs || [];
  const totalJobs = data?.total || 0;
  const totalPages = Math.ceil(totalJobs / PAGE_SIZE);

  // ── Global progress stats (independent of current filter/page) ───────
  // Fetch minimal (limit:1) queries so we always have the true totals.
  const statsParamsBase: JobListParams = { limit: 1 };
  if (selectedDataset?.id) {
    statsParamsBase.dataset_id = selectedDataset.id;
  }
  const { data: allStatsData } = useJobs(statsParamsBase);
  const { data: sibiStatsData } = useJobs({ ...statsParamsBase, category: 'SIBI' });
  const { data: bisindoStatsData } = useJobs({ ...statsParamsBase, category: 'BISINDO' });

  const totalAll = allStatsData?.total ?? 0;
  const sibiTotal = sibiStatsData?.total ?? 0;
  const bisindoTotal = bisindoStatsData?.total ?? 0;
  const categorisedCount = sibiTotal + bisindoTotal;

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

  // Filtered + searched list (client-side search; API handles category filter)
  const allFilteredJobs = jobs.filter((j) => {
    // For 'uncategorized' filter, do client-side filtering since API doesn't support null category filter
    const matchesFilter =
      filter === 'all' || filter === 'SIBI' || filter === 'BISINDO'
        ? true
        : j.category === 'uncategorized';
    const matchesSearch =
      !searchQuery || (j.video_title || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  let displayJobs = allFilteredJobs;
  let displayTotalPages = totalPages;

  if (isSearching) {
    displayTotalPages = Math.max(1, Math.ceil(allFilteredJobs.length / PAGE_SIZE));
    displayJobs = allFilteredJobs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  }

  // Derive effective selected job — falls back to first job when nothing is selected
  const effectiveSelectedJobId = selectedJobId ?? (displayJobs.length > 0 ? displayJobs[0].job_id : null);
  const selectedJob = jobs.find((j) => j.job_id === effectiveSelectedJobId) ?? null;

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

  // Handle cross-component upload completion
  const [highlightedJobId, setHighlightedJobId] = useState<string | null>(null);

  useEffect(() => {
    const handleJobUploaded = (e: Event) => {
      const customEvent = e as CustomEvent<{ jobId: string }>;
      const { jobId } = customEvent.detail;
      if (jobId) {
        refetch();
        setSelectedJobId(jobId);
        setHighlightedJobId(jobId);
        // Clear highlight after 3 seconds
        setTimeout(() => {
          setHighlightedJobId((prev) => (prev === jobId ? null : prev));
        }, 3000);
      }
    };

    window.addEventListener('JOB_UPLOADED', handleJobUploaded);
    return () => window.removeEventListener('JOB_UPLOADED', handleJobUploaded);
  }, [refetch]);

  // ── Handlers ────────────────────────────────────────────────────────
  function handleCategorize(category: 'SIBI' | 'BISINDO') {
    if (!selectedJob) return;

    // Show confirmation modal if changing an already categorized job to a different category
    if (
      selectedJob.category !== 'uncategorized' &&
      selectedJob.category !== null &&
      selectedJob.category !== category
    ) {
      setConfirmModal({ isOpen: true, targetCategory: category });
      return;
    }

    executeCategorize(category);
  }

  function executeCategorize(category: 'SIBI' | 'BISINDO') {
    if (!selectedJob) return;
    updateCategory(
      { jobId: selectedJob.job_id, category },
      {
        onSuccess: () => {
          toast("Berhasil Disimpan", {
            description: `Video telah berhasil diklasifikasikan sebagai ${category}`,
          });
          setConfirmModal({ isOpen: false, targetCategory: null });
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
      <div className="flex-1 flex flex-col bg-gray-50">
        {/* Header skeleton */}
        <div className="px-6 py-4 bg-white border-b border-gray-200 flex-shrink-0 flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>

        {/* Main content skeleton */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left panel skeleton — video list sidebar */}
          <div className="w-[420px] border-r border-gray-200 bg-white flex flex-col">
            {/* Search + filter tabs skeleton */}
            <div className="p-4 border-b border-gray-200 space-y-3">
              <Skeleton className="h-9 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-7 w-14" />
                <Skeleton className="h-7 w-14" />
                <Skeleton className="h-7 w-14" />
                <Skeleton className="h-7 w-14" />
              </div>
            </div>
            {/* List item skeletons */}
            <div className="flex-1 p-4 space-y-3 overflow-hidden">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex gap-3 p-3 border border-gray-100 rounded-lg">
                  <Skeleton className="h-16 w-24 rounded-md flex-shrink-0" />
                  <div className="flex-1 space-y-2 py-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
            {/* Pagination skeleton */}
            <div className="p-4 border-t border-gray-200 flex justify-between items-center">
              <Skeleton className="h-4 w-24" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
              </div>
            </div>
          </div>

          {/* Right panel skeleton — player + categorization */}
          <div className="flex-1 p-6 space-y-4 bg-gray-50">
            {/* Video player placeholder */}
            <Skeleton className="aspect-video w-full rounded-lg" />
            {/* Categorization panel skeleton */}
            <div className="space-y-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <div className="flex gap-3 pt-2">
              <Skeleton className="h-10 w-28" />
              <Skeleton className="h-10 w-28" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 gap-3">
        <AlertCircle className="text-red-400" size={40} />
        <p className="text-gray-600">Gagal memuat data video.</p>
        <Button
          onClick={() => refetch()}
          className="bg-teal-600 hover:bg-teal-700 text-white"
        >
          Coba Lagi
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Top Header */}
      <div className="px-6 py-3 lg:py-4 bg-white border-b border-gray-200 flex-shrink-0 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Layout size={20} className="text-teal-600" />
            Klasifikasi Tipe JBI
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-gray-500">
              Tentukan apakah Juru Bahasa Isyarat menggunakan SIBI atau BISINDO
            </p>
            {selectedDataset && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-xs font-semibold border border-teal-200">
                {selectedDataset.name}
              </span>
            )}
          </div>
        </div>
        <Button
          onClick={() => setIsUploadModalOpen(true)}
          size="sm"
          variant="secondary"
          className="text-teal-700 bg-teal-100 hover:bg-teal-200"
        >
          + Upload Video Baru
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel — Video List */}
        <VideoList
          jobs={displayJobs}
          selectedJobId={effectiveSelectedJobId}
          highlightedJobId={highlightedJobId}
          filter={filter}
          searchQuery={searchQuery}
          onSelectJob={setSelectedJobId}
          onFilterChange={(f) => { setFilter(f); setPage(0); }}
          onSearchChange={(q) => { setSearchQuery(q); setPage(0); }}
          categorisedCount={categorisedCount}
          totalAll={totalAll}
          page={page}
          totalPages={displayTotalPages}
          onPageChange={setPage}
        />

        {/* Right Panel — Player + Categorisation */}
        <div id="tour-video-area" className="flex-1 flex flex-col p-3 lg:p-4 gap-2 lg:gap-3 bg-gray-50 relative z-10 overflow-hidden">
          {selectedJob ? (
            <>
              <div className="flex-shrink-0">
                <VideoPlayer job={selectedJob} />
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                <CategorizationPanel
                  job={selectedJob}
                  isPending={isPending}
                  onCategorize={handleCategorize}
                />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <p>Pilih video dari daftar di samping untuk mulai mengklasifikasikan.</p>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      <VideoUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={(jobId) => {
          refetch();
          setSelectedJobId(jobId);
        }}
        datasetId={selectedDataset?.id}
      />

      {/* Confirmation Modal for changing category */}
      <Dialog 
        open={confirmModal.isOpen} 
        onOpenChange={(isOpen) => {
          if (!isOpen) setConfirmModal({ isOpen: false, targetCategory: null });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Perubahan Klasifikasi</DialogTitle>
            <DialogDescription>
              Video ini sebelumnya sudah diklasifikasikan sebagai <strong>{selectedJob?.category}</strong>. 
              Apakah Anda yakin ingin mengubah klasifikasinya menjadi <strong>{confirmModal.targetCategory}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button 
              variant="outline" 
              onClick={() => setConfirmModal({ isOpen: false, targetCategory: null })}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button 
              className="bg-teal-600 hover:bg-teal-700 text-white"
              onClick={() => {
                if (confirmModal.targetCategory) {
                  executeCategorize(confirmModal.targetCategory);
                }
              }}
              disabled={isPending}
            >
              {isPending ? 'Menyimpan...' : 'Ya, Ubah Klasifikasi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
