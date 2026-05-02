'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Combobox } from '@/components/ui/combobox';
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
} from 'lucide-react';
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
      return { label: 'Antrian', dotColor: 'bg-gray-400', textColor: 'text-gray-500' };
    case JOB_STATUS.DETECTING:
      return { label: 'Deteksi', dotColor: 'bg-amber-500', textColor: 'text-amber-600' };
    case JOB_STATUS.TRANSCRIBING:
      return { label: 'ASR', dotColor: 'bg-blue-500', textColor: 'text-blue-600' };
    case JOB_STATUS.CROPPING:
      return { label: 'Cropping', dotColor: 'bg-indigo-500', textColor: 'text-indigo-600' };
    case JOB_STATUS.READY_FOR_ANNOTATION:
      return { label: 'Siap Anotasi', dotColor: 'bg-emerald-500', textColor: 'text-emerald-600' };
    case JOB_STATUS.FAILED:
      return { label: 'Gagal', dotColor: 'bg-red-500', textColor: 'text-red-600' };
    case JOB_STATUS.CANCELLED:
      return { label: 'Dibatalkan', dotColor: 'bg-gray-300', textColor: 'text-gray-400' };
    default:
      return { label: status, dotColor: 'bg-gray-400', textColor: 'text-gray-500' };
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

  const listPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch Job List ────────────────────────────────────────────

  const fetchJobs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params: JobListParams = { page, page_size: pageSize };
      if (statusFilter) params.status = statusFilter;

      const data = await pipelineApi.listJobs(params);
      setJobs(data.items);
      setTotalJobs(data.total);
      setTotalPages(data.total_pages);
      setError(null);
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
    } catch (err) {
      console.error(err);
      alert('Gagal memulai pemrosesan batch.');
    } finally {
      setStartingBatch(false);
    }
  };

  // ── Computed ──────────────────────────────────────────────────

  const processingCount = jobs.filter((j) => PROCESSING_STATUSES.has(j.status)).length;
  const completedCount = jobs.filter((j) => j.status === JOB_STATUS.READY_FOR_ANNOTATION).length;

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
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
            
            {classifiedReady.length > 0 && (
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

      <div className="flex-1 flex overflow-hidden">
        {/* ──── Left: Job List ──── */}
        <div className="w-80 min-w-[320px] bg-white border-r border-gray-200 flex flex-col">
          {/* Filter Bar */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex-shrink-0">
              Jobs ({totalJobs})
            </p>
            <div className="flex items-center gap-2">
              <Combobox
                options={[
                  { value: "ALL", label: "Semua" },
                  { value: "QUEUED", label: "Antrian" },
                  { value: "DETECTING", label: "Deteksi" },
                  { value: "TRANSCRIBING", label: "ASR" },
                  { value: "CROPPING", label: "Cropping" },
                  { value: "READY_FOR_ANNOTATION", label: "Selesai" },
                  { value: "FAILED", label: "Gagal" },
                  { value: "CANCELLED", label: "Dibatalkan" }
                ]}
                value={statusFilter || "ALL"}
                placeholder="Semua"
                onChange={(v) => { setStatusFilter(v === 'ALL' ? '' : v); setPage(1); }}
                className="h-8 text-xs w-[120px]"
              />
              <button
                onClick={() => fetchJobs()}
                className="p-1 rounded text-gray-400 hover:text-teal-600 hover:bg-gray-100 transition-colors"
                title="Refresh"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {/* Job List */}
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={20} className="text-teal-600 animate-spin" />
              </div>
            ) : error ? (
              <div className="p-4 text-center">
                <AlertTriangle size={20} className="text-red-400 mx-auto mb-2" />
                <p className="text-xs text-red-600">{error}</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => fetchJobs()}>
                  Coba Lagi
                </Button>
              </div>
            ) : jobs.length === 0 ? (
              <div className="p-8 text-center">
                <Video size={32} className="text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-500">Belum ada video</p>
                <p className="text-xs text-gray-400 mt-1">Lakukan klasifikasi video di halaman Klasifikasi untuk memulai pipeline</p>
              </div>
            ) : (
              <div className="w-max min-w-full flex flex-col">
                {jobs.map((job) => {
                  const sd = getStatusDisplay(job.status);
                  const isSelected = job.id === selectedJobId;
                  const isProcessing = PROCESSING_STATUSES.has(job.status);
                  return (
                    <button
                      key={job.id}
                      onClick={() => setSelectedJobId(job.id)}
                      className={`block w-full text-left px-4 py-3.5 border-b border-gray-100 transition-all ${
                        isSelected
                          ? 'bg-teal-50 border-l-[3px] border-l-teal-500'
                          : 'hover:bg-gray-50 border-l-[3px] border-l-transparent'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          <div className={`w-2.5 h-2.5 rounded-full ${sd.dotColor} flex-shrink-0 ${
                            isProcessing ? 'animate-pulse' : ''
                          }`} />
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-medium whitespace-nowrap ${isSelected ? 'text-teal-800' : 'text-gray-800'}`} title={job.original_filename || `Job #${job.id.slice(0, 8)}`}>
                            {job.original_filename || `Job #${job.id.slice(0, 8)}`}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 whitespace-nowrap">
                            <span className={`text-[10px] font-medium ${sd.textColor}`}>{sd.label}</span>
                            <span className="text-[10px] text-gray-300">•</span>
                            <span className="text-[10px] text-gray-400 font-mono">#{job.id.slice(0, 8)}</span>
                            {job.category && (
                              <>
                                <span className="text-[10px] text-gray-300">•</span>
                                <span className="text-[10px] text-gray-400">{job.category}</span>
                              </>
                            )}
                            {job.created_at && (
                              <>
                                <span className="text-[10px] text-gray-300">•</span>
                                <span className="text-[10px] text-gray-400">{formatRelativeTime(job.created_at)}</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-2 w-full max-w-xs">
                            <Progress value={job.progress} className="flex-1 h-1.5" />
                            <span className="text-[10px] font-mono text-gray-400">{job.progress}%</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
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

        {/* ──── Right: Job Detail Panel ──── */}
        {selectedJobId ? (
          <JobDetailPanel 
              jobId={selectedJobId} 
              onJobChanged={() => {
                fetchJobs(true);
                fetchClassifiedReady();
              }} 
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <Cog size={48} className="mb-4 text-gray-200" />
              <p>Pilih job dari panel kiri untuk melihat detail</p>
            </div>
          )}
      </div>
    </div>
  );
}
