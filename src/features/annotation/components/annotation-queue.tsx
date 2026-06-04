'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Inbox,
  ListChecks,
  Send,
  PenLine,
  Sparkles,
  Newspaper,
  List,
} from 'lucide-react';
import { annotationApi } from '../annotation-api';
import { useSelectedDataset } from '@/features/dataset/context/dataset-context';
import type { QueueItemResponse } from '../annotation-types';
import { QUEUE_STATUS } from '../annotation-types';

// ── Types ──────────────────────────────────────────────────────────

/** Queue items grouped by job_id for the segment-centric layout. */
interface JobGroup {
  jobId: string;
  originalFilename: string;
  segments: QueueItemResponse[];
  /** Derived stats */
  totalSegments: number;
  completedSegments: number;
  draftSegments: number;
  newSegments: number;
}

// ── Helpers ────────────────────────────────────────────────────────

/** Group flat queue items into job-based groups with segment deduplication. */
function groupByJob(items: QueueItemResponse[]): JobGroup[] {
  const map = new Map<string, JobGroup>();
  // Track seen (segment_id + transcript_text) to deduplicate
  const seen = new Set<string>();

  for (const item of items) {
    // Deduplicate: skip if same segment_id with identical transcript text
    const dedupeKey = `${item.segment_id}::${item.transcript_text ?? ''}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    let group = map.get(item.job_id);
    if (!group) {
      group = {
        jobId: item.job_id,
        originalFilename: item.original_filename,
        segments: [],
        totalSegments: 0,
        completedSegments: 0,
        draftSegments: 0,
        newSegments: 0,
      };
      map.set(item.job_id, group);
    }
    group.segments.push(item);
    group.totalSegments++;
    if (item.status === QUEUE_STATUS.COMPLETED) group.completedSegments++;
    if (item.edit_status === 'DRAFT') group.draftSegments++;
    if (!item.has_active_work) group.newSegments++;
  }

  return Array.from(map.values());
}

function getJobProgressColor(completed: number, total: number): string {
  const pct = total > 0 ? completed / total : 0;
  if (pct >= 1) return 'bg-emerald-500';
  if (pct >= 0.5) return 'bg-teal-500';
  if (pct > 0) return 'bg-amber-500';
  return 'bg-gray-300';
}

// ── Props ──────────────────────────────────────────────────────────

interface AnnotationQueueProps {
  onSelectJob: (jobId: string) => void;
  selectedJobId: string | null;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

type TabView = 'queue' | 'submissions';

// ── Component ──────────────────────────────────────────────────────

export function AnnotationQueue({ onSelectJob, selectedJobId, isCollapsed, onToggleCollapse }: AnnotationQueueProps) {
  const { selectedDataset } = useSelectedDataset();
  const [tab, setTab] = useState<TabView>('queue');

  // Queue state (active = unfinished). Status filter is fixed now that the
  // dropdown was removed; completed work lives in the Submission tab.
  const [items, setItems] = useState<QueueItemResponse[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const statusFilter = 'ASSIGNED,IN_PROGRESS';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Submissions state — reuses queue items (status COMPLETED) so the cards are
  // identical to the queue cards and clicking always passes a correct job_id.
  const [submissionItems, setSubmissionItems] = useState<QueueItemResponse[]>([]);
  const [subsTotal, setSubsTotal] = useState(0);
  const [subsLoading, setSubsLoading] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Derived Data ──────────────────────────────────────────────

  const jobGroups = useMemo(() => groupByJob(items), [items]);
  const submissionGroups = useMemo(() => groupByJob(submissionItems), [submissionItems]);

  const totalStats = useMemo(() => {
    const draftCount = items.filter((i) => i.edit_status === 'DRAFT').length;
    const newCount = items.filter((i) => !i.has_active_work).length;
    const completedCount = items.filter((i) => i.status === QUEUE_STATUS.COMPLETED).length;
    return { draftCount, newCount, completedCount };
  }, [items]);

  // ── Fetch Queue ───────────────────────────────────────────────

  const fetchQueue = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const data = await annotationApi.getQueue({
          page,
          page_size: 50, // Fetch more to build proper groups
          status: statusFilter,
          dataset_id: selectedDataset?.id,
        });
        setItems(data.items);
        setTotalItems(data.total);
        setTotalPages(data.pages);
        setError(null);
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
          'Gagal memuat antrian';
        setError(typeof msg === 'string' ? msg : 'Gagal memuat antrian');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [page, statusFilter, selectedDataset?.id],
  );

  const fetchSubmissions = useCallback(async () => {
    setSubsLoading(true);
    try {
      // Submissions = COMPLETED queue items. Admins get all annotators' (the
      // backend applies is_admin); annotators get only their own.
      const data = await annotationApi.getQueue({
        page: 1,
        page_size: 100,
        status: 'COMPLETED',
        dataset_id: selectedDataset?.id,
      });
      setSubmissionItems(data.items);
      setSubsTotal(data.total);
    } catch {
      // Silently fail for submissions tab
    } finally {
      setSubsLoading(false);
    }
  }, [selectedDataset?.id]);

  // Load BOTH on mount (and on dataset change) so the Submission count badge is
  // correct immediately without having to open the tab first.
  useEffect(() => {
    fetchQueue();
    fetchSubmissions();
  }, [fetchQueue, fetchSubmissions]);

  // Polling every 10s (queue only)
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (tab === 'queue') {
      pollRef.current = setInterval(() => fetchQueue(true), 10000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchQueue, tab]);

  // ── Handlers ──────────────────────────────────────────────────

  // ── Render ────────────────────────────────────────────────────

  // ── Collapsed view ────────────────────────────────────────────

  if (isCollapsed) {
    return (
      <div className="w-12 min-w-12 h-full bg-white border-r border-gray-200 flex flex-col items-center py-3 gap-3 transition-all duration-300">
        <button
          onClick={onToggleCollapse}
          className="w-9 h-9 rounded-lg bg-teal-50 text-teal-600 hover:bg-teal-100 flex items-center justify-center transition-colors"
          title="Buka antrian"
        >
          <List size={18} />
        </button>
        {/* Compact progress */}
        <div className="flex flex-col items-center gap-1 text-[9px] text-gray-400">
          <span className="font-bold text-teal-600">{totalStats.completedCount}</span>
          <span>/</span>
          <span>{totalItems}</span>
        </div>
        {/* Mini vertical dots showing item statuses */}
        <div className="flex flex-col gap-0.5 mt-1">
          {items.slice(0, 12).map((item) => (
            <div
              key={item.id}
              className={`w-2 h-2 rounded-full ${
                item.job_id === selectedJobId ? 'bg-teal-500 ring-1 ring-teal-300' :
                item.status === 'COMPLETED' ? 'bg-emerald-400' :
                item.has_active_work ? 'bg-amber-400' : 'bg-gray-200'
              }`}
            />
          ))}
          {items.length > 12 && (
            <span className="text-[8px] text-gray-300 mt-0.5">+{items.length - 12}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-[340px] min-w-[340px] h-full overflow-hidden bg-white border-r border-gray-200 flex flex-col transition-all duration-300">
      {/* Tab Switcher */}
      <div className="flex border-b border-gray-200 flex-shrink-0">
        <button
          onClick={() => setTab('queue')}
          className={`flex-1 px-3 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
            tab === 'queue'
              ? 'text-teal-700 border-b-2 border-teal-600 bg-teal-50/50'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Inbox size={13} />
          Antrian ({totalItems})
        </button>
        <button
          onClick={() => setTab('submissions')}
          className={`flex-1 px-3 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
            tab === 'submissions'
              ? 'text-teal-700 border-b-2 border-teal-600 bg-teal-50/50'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Send size={13} />
          Submission ({subsTotal})
        </button>
      </div>

      {/* Queue Tab */}
      {tab === 'queue' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Quick Stats */}
          {!loading && !error && items.length > 0 && (totalStats.draftCount > 0 || totalStats.newCount > 0 || totalStats.completedCount > 0) && (
            <div className="px-3 py-1.5 border-b border-gray-100 flex items-center gap-3 text-[10px]">
              {totalStats.newCount > 0 && (
                <span className="flex items-center gap-1 text-emerald-600">
                  <Sparkles size={9} /> {totalStats.newCount} baru
                </span>
              )}
              {totalStats.draftCount > 0 && (
                <span className="flex items-center gap-1 text-amber-600">
                  <PenLine size={9} /> {totalStats.draftCount} draft
                </span>
              )}
              {totalStats.completedCount > 0 && (
                <span className="flex items-center gap-1 text-teal-600">
                  <CheckCircle2 size={9} /> {totalStats.completedCount} selesai
                </span>
              )}
            </div>
          )}

          {/* Queue Items — Grouped by Job */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {loading ? (
              <div className="p-2 space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="rounded-xl border border-gray-100 overflow-hidden p-3.5 bg-white">
                    <div className="flex items-start gap-3">
                      <Skeleton className="w-9 h-9 rounded-lg flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Skeleton className="h-4 w-16 rounded-md" />
                          <Skeleton className="h-4 w-14 rounded-md" />
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Skeleton className="flex-1 h-1.5 rounded-full" />
                          <Skeleton className="h-3 w-12" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="p-4 text-center">
                <AlertTriangle size={20} className="text-red-400 mx-auto mb-2" />
                <p className="text-xs text-red-600 mb-2">{error}</p>
                <Button variant="outline" size="sm" onClick={() => fetchQueue()}>Coba Lagi</Button>
              </div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center">
                <ListChecks size={32} className="text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-500">Antrian kosong</p>
                <p className="text-xs text-gray-400 mt-1">Belum ada segmen yang di-assign</p>
              </div>
            ) : (
              <div className="p-2 space-y-2">
                {jobGroups.map((group) => (
                  <JobCard
                    key={group.jobId}
                    group={group}
                    isSelected={group.jobId === selectedJobId}
                    onSelectJob={onSelectJob}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
              <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="h-7 text-xs">
                <ChevronLeft size={14} />
              </Button>
              <span className="text-[10px] text-gray-400">Hal {page}/{totalPages}</span>
              <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="h-7 text-xs">
                <ChevronRight size={14} />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Submissions Tab — same card layout as the queue */}
      {tab === 'submissions' && (
        <div className="flex-1 min-h-0 overflow-y-auto">
          {subsLoading ? (
            <div className="p-2 space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded-xl border border-gray-100 overflow-hidden p-3.5 bg-white">
                  <div className="flex items-start gap-3">
                    <Skeleton className="w-9 h-9 rounded-lg shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/3" />
                      <Skeleton className="h-1.5 w-full rounded-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : submissionGroups.length === 0 ? (
            <div className="p-8 text-center">
              <Send size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500">Belum ada submission</p>
              <p className="text-xs text-gray-400 mt-1">Submit anotasi untuk melihat di sini</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {submissionGroups.map((group) => (
                <JobCard
                  key={group.jobId}
                  group={group}
                  isSelected={group.jobId === selectedJobId}
                  onSelectJob={onSelectJob}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Job Card (Collapsible) — groups segments under one video/job
// ═══════════════════════════════════════════════════════════════════

function JobCard({
  group,
  isSelected,
  onSelectJob,
}: {
  group: JobGroup;
  isSelected: boolean;
  onSelectJob: (jobId: string) => void;
}) {
  // Progress is counted in "kalimat" (utterances), not segments. A COMPLETED
  // (submitted) segment contributes all of its utterances as done — so a fully
  // submitted job reads e.g. "20/20 kalimat".
  const totalKalimat = group.segments.reduce((sum, seg) => sum + (seg.utterance_count || 0), 0);
  const doneKalimat = group.segments.reduce(
    (sum, seg) => sum + (seg.status === QUEUE_STATUS.COMPLETED ? (seg.utterance_count || 0) : 0),
    0,
  );
  const progressPct = totalKalimat > 0 ? (doneKalimat / totalKalimat) * 100 : 0;

  return (
    <div
      className={`rounded-xl border overflow-hidden transition-all ${
        isSelected
          ? 'border-teal-300 shadow-sm ring-1 ring-teal-200'
          : 'border-gray-200 shadow-sm hover:border-teal-200'
      }`}
    >
      <button
        onClick={() => onSelectJob(group.jobId)}
        className={`w-full flex items-start gap-3 px-3.5 py-3 text-left transition-colors ${
          isSelected
            ? 'bg-teal-50/60'
            : 'bg-white hover:bg-gray-50/80'
        }`}
      >
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
            isSelected
              ? 'bg-teal-100 text-teal-600'
              : 'bg-slate-100 text-slate-500'
          }`}
        >
          <Newspaper size={16} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Full title — no truncation */}
          <p
            className={`text-[13px] font-semibold leading-snug break-words ${
              isSelected ? 'text-teal-800' : 'text-gray-800'
            }`}
            title={group.originalFilename}
          >
            {group.originalFilename}
          </p>

          {/* Job ID — to distinguish jobs that share the same filename */}
          <p className="text-[10px] font-mono text-gray-400 mt-1 break-all">
            Job: {group.jobId}
          </p>

          {/* Progress bar in kalimat (X/Y) */}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getJobProgressColor(doneKalimat, totalKalimat)}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-[10px] text-gray-500 font-mono whitespace-nowrap shrink-0">
              {doneKalimat}/{totalKalimat} kalimat
            </span>
          </div>
        </div>
      </button>
    </div>
  );
}
