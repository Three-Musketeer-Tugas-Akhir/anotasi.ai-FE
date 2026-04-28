'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { Combobox } from '@/components/ui/combobox';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  Shield,
  ChevronLeft,
  ChevronRight,
  Inbox,
  ListChecks,
  Send,
  PenLine,
  Sparkles,
  Timer,
  ChevronDown,
  Video,
  Layers,
  Newspaper,
  List,
} from 'lucide-react';
import { annotationApi } from '../annotation-api';
import type { QueueItemResponse, ReviewStatusResponse } from '../annotation-types';
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

function getStatusBadge(status: string): { label: string; color: string } {
  switch (status) {
    case QUEUE_STATUS.ASSIGNED:
      return { label: 'Menunggu', color: 'bg-gray-100 text-gray-600 border-gray-200' };
    case QUEUE_STATUS.IN_PROGRESS:
      return { label: 'Dikerjakan', color: 'bg-blue-50 text-blue-600 border-blue-200' };
    case QUEUE_STATUS.COMPLETED:
      return { label: 'Selesai', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' };
    default:
      return { label: status, color: 'bg-gray-100 text-gray-600 border-gray-200' };
  }
}

function getEditStatusBadge(item: QueueItemResponse): { label: string; color: string; icon: React.ReactNode } | null {
  if (!item.has_active_work) {
    return { label: 'Baru', color: 'bg-emerald-50 text-emerald-600 border-emerald-200', icon: <Sparkles size={8} /> };
  }

  switch (item.edit_status) {
    case 'DRAFT':
      return { label: 'Draft', color: 'bg-amber-50 text-amber-600 border-amber-200', icon: <PenLine size={8} /> };
    case 'PENDING':
      return { label: 'Pending', color: 'bg-orange-50 text-orange-600 border-orange-200', icon: <Timer size={8} /> };
    case 'SUBMITTED':
      return { label: 'Submitted', color: 'bg-blue-50 text-blue-600 border-blue-200', icon: <Send size={8} /> };
    default:
      return null;
  }
}

function getConfidenceColor(score: number | null): string {
  if (score === null) return 'bg-gray-400';
  if (score >= 0.9) return 'bg-emerald-500';
  if (score >= 0.5) return 'bg-amber-500';
  return 'bg-red-500';
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Baru saja';
  if (mins < 60) return `${mins}m lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}j lalu`;
  const days = Math.floor(hrs / 24);
  return `${days}h lalu`;
}

/** Strip file extension and truncate long filenames for display. */
function formatFilename(name: string, maxLen = 40): string {
  const base = name.replace(/\.[^/.]+$/, '');
  if (base.length <= maxLen) return base;
  return base.slice(0, maxLen - 3) + '…';
}

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
  onSelectSegment: (segmentId: string, editId?: string | null) => void;
  selectedSegmentId: string | null;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

type TabView = 'queue' | 'submissions';

// ── Component ──────────────────────────────────────────────────────

export function AnnotationQueue({ onSelectSegment, selectedSegmentId, isCollapsed, onToggleCollapse }: AnnotationQueueProps) {
  const [tab, setTab] = useState<TabView>('queue');

  // Queue state
  const [items, setItems] = useState<QueueItemResponse[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Expanded state (which jobs are expanded)
  const [expandedJobs, setExpandedJobs] = useState<Record<string, boolean>>({});

  // Submissions state
  const [submissions, setSubmissions] = useState<ReviewStatusResponse[]>([]);
  const [subsTotal, setSubsTotal] = useState(0);
  const [subsLoading, setSubsLoading] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Derived Data ──────────────────────────────────────────────

  const jobGroups = useMemo(() => groupByJob(items), [items]);

  const totalStats = useMemo(() => {
    const draftCount = items.filter((i) => i.edit_status === 'DRAFT').length;
    const newCount = items.filter((i) => !i.has_active_work).length;
    const completedCount = items.filter((i) => i.status === QUEUE_STATUS.COMPLETED).length;
    return { draftCount, newCount, completedCount };
  }, [items]);

  // Auto-expand the job group that contains the selected segment
  useEffect(() => {
    if (selectedSegmentId) {
      const parentJob = items.find((i) => i.segment_id === selectedSegmentId);
      if (parentJob) {
        setExpandedJobs((prev) => ({ ...prev, [parentJob.job_id]: true }));
      }
    }
  }, [selectedSegmentId, items]);

  // ── Fetch Queue ───────────────────────────────────────────────

  const fetchQueue = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const data = await annotationApi.getQueue({
          page,
          page_size: 50, // Fetch more to build proper groups
          status: statusFilter === 'all' ? undefined : statusFilter,
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
    [page, statusFilter],
  );

  const fetchSubmissions = useCallback(async () => {
    setSubsLoading(true);
    try {
      const data = await annotationApi.getMySubmissions({ page: 1, page_size: 50 });
      setSubmissions(data.items);
      setSubsTotal(data.total);
    } catch {
      // Silently fail for submissions tab
    } finally {
      setSubsLoading(false);
    }
  }, []);

  // Load on mount + filter change
  useEffect(() => {
    if (tab === 'queue') fetchQueue();
    else fetchSubmissions();
  }, [fetchQueue, fetchSubmissions, tab]);

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

  const toggleJob = (jobId: string) => {
    setExpandedJobs((prev) => ({ ...prev, [jobId]: !prev[jobId] }));
  };

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
                item.segment_id === selectedSegmentId ? 'bg-teal-500 ring-1 ring-teal-300' :
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
          {/* Filter Bar */}
          <div className="px-3 py-2.5 border-b border-gray-100 flex items-center gap-2">
            <Combobox
              options={[
                { value: "all", label: "Semua Status" },
                { value: "ASSIGNED", label: "Menunggu" },
                { value: "IN_PROGRESS", label: "Dikerjakan" },
                { value: "COMPLETED", label: "Selesai" }
              ]}
              value={statusFilter || ''}
              onChange={(v) => { setStatusFilter(v); setPage(1); }}
              placeholder="Filter status..."
              className="flex-1 h-8 text-xs bg-white text-slate-700"
            />
            <button
              onClick={() => fetchQueue()}
              className="p-1.5 rounded text-gray-400 hover:text-teal-600 hover:bg-gray-100 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={13} />
            </button>
          </div>

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
              <div className="flex items-center justify-center py-12">
                <Loader2 size={20} className="text-teal-600 animate-spin" />
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
                    isExpanded={!!expandedJobs[group.jobId]}
                    onToggle={() => toggleJob(group.jobId)}
                    selectedSegmentId={selectedSegmentId}
                    onSelectSegment={onSelectSegment}
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

      {/* Submissions Tab */}
      {tab === 'submissions' && (
        <div className="flex-1 min-h-0 overflow-y-auto">
          {subsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="text-teal-600 animate-spin" />
            </div>
          ) : submissions.length === 0 ? (
            <div className="p-8 text-center">
              <Send size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500">Belum ada submission</p>
              <p className="text-xs text-gray-400 mt-1">Submit anotasi untuk melihat status review</p>
            </div>
          ) : (
            submissions.map((sub) => {
              const statusColor =
                sub.status === 'APPROVED'
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  : sub.status === 'REJECTED'
                    ? 'bg-red-50 text-red-600 border-red-200'
                    : 'bg-amber-50 text-amber-600 border-amber-200';
              return (
                <button
                  key={sub.review_id}
                  onClick={() => onSelectSegment(sub.segment_id)}
                  className="block w-full text-left px-4 py-3.5 border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-gray-400 font-mono">
                      #{sub.segment_id.slice(0, 8)}
                    </span>
                    <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${statusColor}`}>
                      {sub.status}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-gray-500">
                    Submitted: {new Date(sub.submitted_at).toLocaleString('id-ID')}
                  </p>
                  {sub.feedback && (
                    <p className="text-[10px] text-red-500 mt-1 line-clamp-1">
                      Feedback: {sub.feedback}
                    </p>
                  )}
                </button>
              );
            })
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
  isExpanded,
  onToggle,
  selectedSegmentId,
  onSelectSegment,
}: {
  group: JobGroup;
  isExpanded: boolean;
  onToggle: () => void;
  selectedSegmentId: string | null;
  onSelectSegment: (segmentId: string, editId?: string | null) => void;
}) {
  const progressPct = group.totalSegments > 0 ? (group.completedSegments / group.totalSegments) * 100 : 0;
  const hasSelectedChild = group.segments.some((s) => s.segment_id === selectedSegmentId);

  return (
    <div
      className={`rounded-xl border overflow-hidden transition-all ${
        hasSelectedChild
          ? 'border-teal-300 shadow-sm ring-1 ring-teal-200'
          : 'border-gray-200 shadow-sm'
      }`}
    >
      {/* ── Job Header (collapsible) ── */}
      <button
        onClick={onToggle}
        className={`w-full flex items-start gap-3 px-3.5 py-3 text-left transition-colors ${
          hasSelectedChild
            ? 'bg-teal-50/60 hover:bg-teal-50'
            : 'bg-white hover:bg-gray-50/80'
        }`}
      >
        {/* Icon */}
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
            hasSelectedChild
              ? 'bg-teal-100 text-teal-600'
              : 'bg-slate-100 text-slate-500'
          }`}
        >
          <Newspaper size={16} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          {/* Title — News filename */}
          <p
            className={`text-[13px] font-semibold leading-snug ${
              hasSelectedChild ? 'text-teal-800' : 'text-gray-800'
            }`}
            title={group.originalFilename}
          >
            {formatFilename(group.originalFilename)}
          </p>

          {/* Meta badges */}
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-gray-50 text-gray-500 border-gray-200">
              <Layers size={8} className="mr-0.5" />
              {group.totalSegments} segmen
            </Badge>
            {group.newSegments > 0 && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-emerald-50 text-emerald-600 border-emerald-200">
                <Sparkles size={8} className="mr-0.5" />
                {group.newSegments} baru
              </Badge>
            )}
            {group.draftSegments > 0 && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-amber-50 text-amber-600 border-amber-200">
                <PenLine size={8} className="mr-0.5" />
                {group.draftSegments} draft
              </Badge>
            )}
          </div>

          {/* Progress bar */}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getJobProgressColor(group.completedSegments, group.totalSegments)}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-[9px] text-gray-400 font-mono w-12 text-right flex-shrink-0">
              {group.completedSegments}/{group.totalSegments}
            </span>
          </div>
        </div>

        {/* Expand/Collapse chevron */}
        <div className={`text-gray-400 flex-shrink-0 mt-1 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
          <ChevronDown size={16} />
        </div>
      </button>

      {/* ── Expanded: Segment (Transcript) Cards ── */}
      {isExpanded && (
        <div className="border-t border-gray-100 bg-gray-50/40">
          {/* Breadcrumb-style context bar */}
          <div className="px-3.5 py-1.5 flex items-center gap-1.5 text-[10px] text-gray-400 border-b border-gray-100 bg-white/60">
            <Video size={10} className="text-teal-500" />
            <span className="font-medium text-gray-500 truncate" title={group.originalFilename}>
              {formatFilename(group.originalFilename, 30)}
            </span>
            <span className="text-gray-300">·</span>
            <span>{group.totalSegments} transkrip</span>
          </div>

          {/* Transcript cards */}
          <div className="p-2 space-y-1">
            {group.segments.map((item, idx) => {
              const isSelected = item.segment_id === selectedSegmentId;
              const sBadge = getStatusBadge(item.status);
              const editBadge = getEditStatusBadge(item);

              return (
                <button
                  key={item.id}
                  onClick={() => onSelectSegment(item.segment_id, item.edit_id)}
                  className={`block w-full text-left rounded-lg px-3 py-2.5 transition-all ${
                    isSelected
                      ? 'bg-teal-50 border border-teal-300 shadow-sm'
                      : 'bg-white border border-gray-100 hover:border-gray-200 hover:bg-gray-50/80'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {/* Segment index pill */}
                    <div
                      className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5 ${
                        isSelected
                          ? 'bg-teal-600 text-white'
                          : item.status === QUEUE_STATUS.COMPLETED
                            ? 'bg-emerald-100 text-emerald-600'
                            : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {idx + 1}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      {/* Transcript preview text */}
                      {item.transcript_text ? (
                        <p className={`text-[11px] leading-relaxed line-clamp-2 ${isSelected ? 'text-teal-900' : 'text-gray-700'}`}>
                          &ldquo;{item.transcript_text}&rdquo;
                        </p>
                      ) : (
                        <p className="text-[11px] text-gray-400 italic">
                          (tidak ada transkripsi)
                        </p>
                      )}

                      {/* Badges row */}
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        {/* Edit status badge */}
                        {editBadge && (
                          <Badge variant="outline" className={`text-[8px] px-1 py-0 gap-0.5 ${editBadge.color}`}>
                            {editBadge.icon} {editBadge.label}
                          </Badge>
                        )}
                        {/* Queue status badge */}
                        <Badge variant="outline" className={`text-[8px] px-1 py-0 ${sBadge.color}`}>
                          {sBadge.label}
                        </Badge>
                        {/* Utterance count */}
                        {item.utterance_count > 0 && (
                          <Badge variant="outline" className="text-[8px] px-1 py-0 bg-gray-50 text-gray-500 border-gray-200">
                            <List size={7} className="mr-0.5" />
                            {item.utterance_count}
                          </Badge>
                        )}
                        {/* ASR confidence */}
                        {item.asr_confidence !== null && (
                          <Badge variant="outline" className="text-[8px] px-1 py-0 bg-gray-50 text-gray-500 border-gray-200">
                            <Shield size={7} className="mr-0.5" />
                            {Math.round(item.asr_confidence * 100)}%
                          </Badge>
                        )}
                      </div>

                      {/* Last edited info */}
                      {item.last_edited_at && (
                        <p className="text-[9px] text-gray-400 mt-1 flex items-center gap-0.5">
                          <Clock size={8} />
                          Diedit {formatTimeAgo(item.last_edited_at)}
                        </p>
                      )}
                    </div>

                    {/* Confidence dot */}
                    <div className="mt-1.5 flex-shrink-0">
                      <div className={`w-2 h-2 rounded-full ${getConfidenceColor(item.asr_confidence)}`} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
