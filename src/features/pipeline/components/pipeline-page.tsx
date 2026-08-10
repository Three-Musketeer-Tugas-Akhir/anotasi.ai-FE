'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Cog,
  Upload,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Ban,
  RefreshCw,
  Video,
  ChevronLeft,
  ChevronRight,
  Play,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { useDatasetMode, ProcessedDatasetNotice } from '@/features/dataset';
import { pipelineApi } from '../pipeline-api';
import type {
  JobListItemResponse,
  JobListParams,
} from '../types';
import { JOB_STATUS, PROCESSING_STATUSES, TERMINAL_STATUSES } from '../types';
import { JobDetailPanel } from './job-detail-panel';

// ── Status display helpers ──────────────────────────────────────────

function getStatusDisplay(status: string): { label: string; dotColor: string; textColor: string } {
  switch (status) {
    case JOB_STATUS.UPLOADED:
    case JOB_STATUS.QUEUED:
      return { label: 'Antrian', dotColor: 'bg-slate-300', textColor: 'text-slate-500' };
    case JOB_STATUS.DETECTING:
      return { label: 'Deteksi CV', dotColor: 'bg-amber-500', textColor: 'text-amber-600' };
    case JOB_STATUS.TRANSCRIBING:
      return { label: 'ASR Processing', dotColor: 'bg-blue-500', textColor: 'text-blue-600' };
    case JOB_STATUS.ASR_COMPLETED:
      return { label: 'ASR Selesai', dotColor: 'bg-sky-500', textColor: 'text-sky-600' };
    case JOB_STATUS.CROPPING:
    case JOB_STATUS.CROPPING_IN_PROGRESS:
      return { label: 'Video Cropping', dotColor: 'bg-indigo-500', textColor: 'text-indigo-600' };
    case JOB_STATUS.READY_FOR_ANNOTATION:
      return { label: 'Siap Anotasi', dotColor: 'bg-emerald-500', textColor: 'text-emerald-600' };
    case JOB_STATUS.CROPPING_FAILED:
    case JOB_STATUS.FAILED:
      return { label: 'Gagal', dotColor: 'bg-rose-500', textColor: 'text-rose-600' };
    case JOB_STATUS.CANCELLED:
      return { label: 'Dibatalkan', dotColor: 'bg-slate-300', textColor: 'text-slate-400' };
    default:
      return { label: status, dotColor: 'bg-slate-400', textColor: 'text-slate-500' };
  }
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'baru saja';
    if (diffMin < 60) return `${diffMin}m lalu`;
    if (diffHrs < 24) return `${diffHrs}j lalu`;
    if (diffDays < 7) return `${diffDays}h lalu`;
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
  } catch {
    return '';
  }
}

// ── Main Component ──────────────────────────────────────────────────

export function PipelinePage() {
  // ── Dataset mode ──────────────────────────────────────────────
  // Dataset non-iNews sudah selesai diolah, jadi canvas pipeline diganti keterangan.
  const { selectedDataset, isProcessed } = useDatasetMode();

  // ── State ─────────────────────────────────────────────────────
  const [jobs, setJobs] = useState<JobListItemResponse[]>([]);
  const [totalJobs, setTotalJobs] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [classifiedReady, setClassifiedReady] = useState<JobListItemResponse[]>([]);
  const [startingBatch, setStartingBatch] = useState(false);
  const [listRefreshTrigger, setListRefreshTrigger] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [allSearchJobs, setAllSearchJobs] = useState<JobListItemResponse[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchAborter = useRef<AbortController | null>(null);
  
  const [listWidth, setListWidth] = useState(360);
  const [isResizing, setIsResizing] = useState(false);

  const listPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Drag to resize logic
  const startResizing = useCallback(() => setIsResizing(true), []);
  const stopResizing = useCallback(() => setIsResizing(false), []);
  const resize = useCallback((mouseMoveEvent: MouseEvent) => {
    if (isResizing) {
      const newWidth = mouseMoveEvent.clientX - 240; // Approx sidebar width
      if (newWidth >= 280 && newWidth <= 600) {
        setListWidth(newWidth);
      }
    }
  }, [isResizing]);

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  // ── Fetch Job List ────────────────────────────────────────────

  const fetchJobs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      if (statusFilter === '__PROCESSING__') {
        const processingStatuses = [
          JOB_STATUS.DETECTING,
          JOB_STATUS.TRANSCRIBING,
          JOB_STATUS.ASR_COMPLETED,
          JOB_STATUS.CROPPING,
          JOB_STATUS.CROPPING_IN_PROGRESS,
          JOB_STATUS.VOICE_ANNOTATION_IN_PROGRESS,
        ];
        const results = await Promise.all(
          processingStatuses.map((s) => pipelineApi.listJobs({ page: 1, page_size: 100, status: s }))
        );
        const combined = results.flatMap((r) => r.items);
        combined.sort(
          (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        );
        setJobs(combined);
        setTotalJobs(combined.length);
        setTotalPages(1);
      } else if (statusFilter === '__ANTREAN__') {
        const antreanStatuses = [JOB_STATUS.UPLOADED, JOB_STATUS.QUEUED];
        const results = await Promise.all(
          antreanStatuses.map((s) => pipelineApi.listJobs({ page: 1, page_size: 100, status: s }))
        );
        const combined = results.flatMap((r) => r.items);
        combined.sort(
          (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        );
        setJobs(combined);
        setTotalJobs(combined.length);
        setTotalPages(1);
      } else {
        const params: JobListParams = { page, page_size: pageSize };
        if (statusFilter) params.status = statusFilter;
        const data = await pipelineApi.listJobs(params);
        setJobs(data.items);
        setTotalJobs(data.total);
        setTotalPages(data.total_pages);
      }
      setError(null);
      setListRefreshTrigger(Date.now());
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Gagal memuat daftar job';
      setError(typeof msg === 'string' ? msg : 'Gagal memuat daftar job');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [page, pageSize, statusFilter]);

  const fetchClassifiedReady = useCallback(async () => {
    try {
      // Fetch all UPLOADED jobs and filter locally for those with category
      const data = await pipelineApi.listJobs({ status: JOB_STATUS.UPLOADED, page_size: 100 });
      const ready = data.items.filter((j) => j.category && j.category !== 'uncategorized');
      setClassifiedReady(ready);
    } catch (err) {
      console.error('Failed to fetch ready jobs', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchJobs();
    fetchClassifiedReady();
  }, [fetchJobs, fetchClassifiedReady]);

  // Global Search Effect
  useEffect(() => {
    if (!searchQuery.trim()) {
      setAllSearchJobs([]);
      setIsSearching(false);
      return;
    }

    if (searchAborter.current) {
      searchAborter.current.abort();
    }
    const aborter = new AbortController();
    searchAborter.current = aborter;

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        let all: JobListItemResponse[] = [];

        const fetchAllPages = async (filterStatus?: string) => {
          let items: JobListItemResponse[] = [];
          let p = 1;
          let t = 1;
          do {
            const params: JobListParams = { page: p, page_size: 100 };
            if (filterStatus) params.status = filterStatus;
            const data = await pipelineApi.listJobs(params);
            if (aborter.signal.aborted) return [];
            items = [...items, ...data.items];
            t = data.total_pages;
            p++;
          } while (p <= t);
          return items;
        };

        if (statusFilter === '__PROCESSING__') {
          const processingStatuses = [
            JOB_STATUS.DETECTING,
            JOB_STATUS.TRANSCRIBING,
            JOB_STATUS.ASR_COMPLETED,
            JOB_STATUS.CROPPING,
            JOB_STATUS.CROPPING_IN_PROGRESS,
            JOB_STATUS.VOICE_ANNOTATION_IN_PROGRESS,
          ];
          const results = await Promise.all(processingStatuses.map((s) => fetchAllPages(s)));
          all = results.flatMap((r) => r);
        } else if (statusFilter === '__ANTREAN__') {
          const antreanStatuses = [JOB_STATUS.UPLOADED, JOB_STATUS.QUEUED];
          const results = await Promise.all(antreanStatuses.map((s) => fetchAllPages(s)));
          all = results.flatMap((r) => r);
        } else {
          all = await fetchAllPages(statusFilter || undefined);
        }

        if (aborter.signal.aborted) return;
        setAllSearchJobs(all);
      } catch (err) {
        if (!aborter.signal.aborted) console.error("Search fetch error", err);
      } finally {
        if (!aborter.signal.aborted) setIsSearching(false);
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      if (searchAborter.current) searchAborter.current.abort();
    };
  }, [searchQuery, statusFilter]);

  // Poll list for updates (every 5 seconds if any job is processing)
  useEffect(() => {
    if (listPollRef.current) {
      clearInterval(listPollRef.current);
      listPollRef.current = null;
    }

    const hasProcessingJobs = jobs.some((j) => PROCESSING_STATUSES.has(j.status));
    if (hasProcessingJobs) {
      listPollRef.current = setInterval(() => {
        fetchJobs(true);
      }, 5000);
    }

    return () => {
      if (listPollRef.current) clearInterval(listPollRef.current);
    };
  }, [jobs, fetchJobs]);

  // Auto-select first job
  useEffect(() => {
    if (jobs.length > 0 && !selectedJobId) {
      setSelectedJobId(jobs[0].id);
    }
  }, [jobs, selectedJobId]);

  const handleStartAll = async () => {
    setStartingBatch(true);
    try {
      await pipelineApi.startAllClassified();
      await fetchJobs();
      await fetchClassifiedReady();
      toast.success('Batch dimulai', {
        description: 'Semua job yang sudah diklasifikasikan sedang diproses.',
        position: 'top-center',
      });
    } catch (err) {
      console.error(err);
      toast.error('Gagal memulai batch', {
        description: 'Terjadi kesalahan saat memulai pemrosesan batch.',
        position: 'top-center',
      });
    } finally {
      setStartingBatch(false);
    }
  };

  // ── Computed ──────────────────────────────────────────────────

  const processingCount = jobs.filter((j) => PROCESSING_STATUSES.has(j.status)).length;
  const completedCount = jobs.filter((j) => j.status === JOB_STATUS.READY_FOR_ANNOTATION).length;
  const displayedJobs = searchQuery.trim()
    ? allSearchJobs.filter((j) => (j.original_filename || '').toLowerCase().includes(searchQuery.toLowerCase()))
    : jobs;

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ cursor: isResizing ? 'col-resize' : 'default' }}>
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0 z-10 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Cog size={22} className="text-teal-600" />
              Pipeline Control & Monitoring
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Pantau progres dan telusuri output setiap tahap pemrosesan video
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <div className="flex gap-2 text-xs mr-3">
              {processingCount > 0 && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  <Loader2 size={10} className="animate-spin mr-1" />
                  {processingCount} Diproses
                </Badge>
              )}
              {completedCount > 0 && (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                  <CheckCircle2 size={10} className="mr-1" />
                  {completedCount} Siap
                </Badge>
              )}
            </div>
            
            {!isProcessed && classifiedReady.length > 0 && (
              <div className="flex items-center gap-3 bg-teal-50 border border-teal-200 rounded-lg px-3 py-1.5 shadow-sm">
                <span className="text-sm font-medium text-teal-800">
                  {classifiedReady.length} Video Siap Diproses
                </span>
                <Button
                  onClick={handleStartAll}
                  disabled={startingBatch}
                  size="sm"
                  className="bg-teal-600 hover:bg-teal-700 text-white h-7 text-xs px-3"
                >
                  {startingBatch ? (
                    <Loader2 size={12} className="mr-1.5 animate-spin" />
                  ) : (
                    <Play size={12} className="mr-1.5" />
                  )}
                  Proses Semua
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative bg-slate-50/50" style={{ userSelect: isResizing ? 'none' : 'auto' }}>
        {/* ──── Left: Job List ──── */}
        <div 
          className="bg-white flex flex-col flex-shrink-0 z-10 border-r border-slate-200 shadow-[2px_0_10px_rgba(0,0,0,0.02)]"
          style={{ width: listWidth }}
        >
          {/* Filter Bar */}
          <div className="p-3 border-b border-slate-100 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
                Daftar Job ({totalJobs})
              </p>
              <div className="flex items-center gap-2">
                <select
                  value={statusFilter || ""}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                  className="h-8 text-xs w-40 bg-white border border-slate-200 rounded-md px-2 text-slate-700 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all cursor-pointer"
                >
                  <option value="">Semua Status</option>
                  <option value="__ANTREAN__">Antrian</option>
                  <option value="__PROCESSING__">Sedang Diproses</option>
                  <option value="READY_FOR_ANNOTATION">Selesai</option>
                  <option value="NEEDS_VOICE_ANNOTATION">Perlu Anotasi Suara</option>
                  <option value="FAILED">Gagal</option>
                  <option value="CANCELLED">Dibatalkan</option>
                </select>
                <button
                  onClick={() => fetchJobs()}
                  className="p-1.5 rounded-md text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                  title="Refresh"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>
            <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    placeholder="Cari nama file..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
            </div>
          </div>

          {/* Job List */}
          <div className="flex-1 overflow-auto custom-scrollbar">
            {loading || isSearching ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="p-4 border-b border-slate-100">
                    <div className="flex items-start gap-3">
                      <Skeleton className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0 space-y-2">
                        <Skeleton className="h-4 w-[85%]" />
                        <div className="flex items-center gap-2 flex-wrap">
                          <Skeleton className="h-3 w-10" />
                          <Skeleton className="h-3 w-1.5" />
                          <Skeleton className="h-3 w-12" />
                          <Skeleton className="h-3 w-1.5" />
                          <Skeleton className="h-3 w-14" />
                        </div>
                        <Skeleton className="h-1.5 w-full mt-2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="p-4 text-center">
                <AlertTriangle size={20} className="text-red-400 mx-auto mb-2" />
                <p className="text-xs text-red-600">{error}</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => fetchJobs()}>
                  Coba Lagi
                </Button>
              </div>
            ) : displayedJobs.length === 0 ? (
              <div className="p-8 text-center">
                <Video size={32} className="text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-500">Belum ada video</p>
                <p className="text-xs text-slate-400 mt-1">Lakukan klasifikasi video di halaman Klasifikasi untuk memulai pipeline</p>
              </div>
            ) : (
              <div className="w-full flex flex-col">
                {displayedJobs.map((job) => {
                  const sd = getStatusDisplay(job.status);
                  const isSelected = job.id === selectedJobId;
                  const isProcessing = PROCESSING_STATUSES.has(job.status);
                  return (
                    <button
                      key={job.id}
                      onClick={() => setSelectedJobId(job.id)}
                      className={`block w-full text-left p-4 border-b border-slate-100 transition-all group ${
                        isSelected
                          ? 'bg-teal-50/60 relative'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-teal-500 rounded-r-full" />}
                      <div className="flex items-start gap-3">
                        <div className="mt-1 flex-shrink-0">
                          <div className={`w-2.5 h-2.5 rounded-full ${sd.dotColor} shadow-sm ${
                            isProcessing ? 'animate-pulse ring-2 ring-offset-1 ring-amber-200' : ''
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm leading-snug line-clamp-2 ${isSelected ? 'font-bold text-teal-900' : 'font-semibold text-slate-700 group-hover:text-slate-900'}`} title={job.original_filename || `Job #${job.id.slice(0, 8)}`}>
                            {job.original_filename || `Job #${job.id.slice(0, 8)}`}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className={`text-[10px] font-bold tracking-wide uppercase ${sd.textColor}`}>{sd.label}</span>
                            <span className="text-[10px] text-slate-300">•</span>
                            <span className="text-[10px] font-mono text-slate-400">#{job.id.slice(0, 8)}</span>
                            {job.category && (
                              <>
                                <span className="text-[10px] text-slate-300">•</span>
                                <Badge className="text-[9px] px-1.5 py-0 bg-slate-100 text-slate-600 border border-slate-200">{job.category}</Badge>
                              </>
                            )}
                            {job.created_at && (
                              <>
                                <span className="text-[10px] text-slate-300">•</span>
                                <span className="text-[10px] text-slate-400">{formatRelativeTime(job.created_at)}</span>
                              </>
                            )}
                          </div>
                          {(isProcessing || job.progress > 0) && (
                            <div className="flex items-center gap-3 mt-2.5">
                              <Progress value={job.progress} className="flex-1 h-1.5" />
                              <span className="text-[10px] font-mono font-medium text-slate-400">{job.progress}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pagination */}
          {!searchQuery.trim() && totalPages > 1 && (
            <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-7 text-xs"
              >
                <ChevronLeft size={14} />
              </Button>
              <span className="text-[10px] text-gray-400">
                Hal {page}/{totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="h-7 text-xs"
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          )}
        </div>

        {/* DRAG HANDLE */}
        <div
            className="w-1.5 bg-transparent hover:bg-teal-400 active:bg-teal-600 flex-shrink-0 cursor-col-resize z-20 transition-colors group relative flex items-center justify-center"
            onMouseDown={startResizing}
        >
            <div className="w-[1px] h-12 bg-slate-200 group-hover:bg-transparent rounded-full" />
        </div>

        {/* ──── Right: Job Detail Panel ──── */}
        <div className="flex-1 overflow-hidden">
          {isProcessed ? (
            <ProcessedDatasetNotice
              datasetName={selectedDataset?.name}
              title="Video sudah melewati tahap pengolahan dataset"
              description="Dataset ini bukan iNews, sehingga seluruh videonya sudah selesai diproses end-to-end melalui pipeline. Kanvas pemantauan tahap pemrosesan tidak ditampilkan. Lanjutkan ke halaman Anotasi JBI untuk melihat atau memperbaiki hasilnya."
            />
          ) : selectedJobId ? (
            <JobDetailPanel 
                jobId={selectedJobId} 
                listRefreshTrigger={listRefreshTrigger}
                onJobChanged={() => {
                  fetchJobs(true);
                  fetchClassifiedReady();
                }} 
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8">
                <Cog size={48} className="mb-4 text-slate-200" />
                <p>Pilih job dari panel kiri untuk melihat detail</p>
              </div>
            )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}
