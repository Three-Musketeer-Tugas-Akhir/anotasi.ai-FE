'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Combobox } from '@/components/ui/combobox';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
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
} from 'lucide-react';
import { annotationApi } from '../annotation-api';
import type { QueueItemResponse, ReviewStatusResponse } from '../annotation-types';
import { QUEUE_STATUS } from '../annotation-types';

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

// ── Props ──────────────────────────────────────────────────────────

interface AnnotationQueueProps {
  onSelectSegment: (segmentId: string, editId?: string | null) => void;
  selectedSegmentId: string | null;
}

type TabView = 'queue' | 'submissions';

// ── Component ──────────────────────────────────────────────────────

export function AnnotationQueue({ onSelectSegment, selectedSegmentId }: AnnotationQueueProps) {
  const [tab, setTab] = useState<TabView>('queue');

  // Queue state
  const [items, setItems] = useState<QueueItemResponse[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Submissions state
  const [submissions, setSubmissions] = useState<ReviewStatusResponse[]>([]);
  const [subsTotal, setSubsTotal] = useState(0);
  const [subsLoading, setSubsLoading] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Derived counts
  const draftCount = items.filter((i) => i.edit_status === 'DRAFT').length;
  const newCount = items.filter((i) => !i.has_active_work).length;

  // ── Fetch Queue ───────────────────────────────────────────────

  const fetchQueue = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const data = await annotationApi.getQueue({
          page,
          page_size: 20,
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

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="w-80 min-w-[320px] bg-white border-r border-gray-200 flex flex-col">
      {/* Tab Switcher */}
      <div className="flex border-b border-gray-200">
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
        <>
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
          {!loading && !error && items.length > 0 && (draftCount > 0 || newCount > 0) && (
            <div className="px-3 py-1.5 border-b border-gray-100 flex items-center gap-2 text-[10px]">
              {newCount > 0 && (
                <span className="flex items-center gap-1 text-emerald-600">
                  <Sparkles size={9} /> {newCount} baru
                </span>
              )}
              {draftCount > 0 && (
                <span className="flex items-center gap-1 text-amber-600">
                  <PenLine size={9} /> {draftCount} draft
                </span>
              )}
            </div>
          )}

          {/* Queue Items */}
          <ScrollArea className="flex-1">
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
              items.map((item) => {
                const isSelected = item.segment_id === selectedSegmentId;
                const sBadge = getStatusBadge(item.status);
                const editBadge = getEditStatusBadge(item);
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectSegment(item.segment_id, item.edit_id)}
                    className={`block w-full text-left px-4 py-3.5 border-b border-gray-100 transition-all ${
                      isSelected
                        ? 'bg-teal-50 border-l-[3px] border-l-teal-500'
                        : 'hover:bg-gray-50 border-l-[3px] border-l-transparent'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1.5">
                        <div className={`w-2.5 h-2.5 rounded-full ${getConfidenceColor(item.asr_confidence)} flex-shrink-0`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-medium truncate ${isSelected ? 'text-teal-800' : 'text-gray-700'}`}>
                          {item.original_filename}
                        </p>
                        {item.transcript_text && (
                          <p className="text-[11px] text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                            &ldquo;{item.transcript_text}&rdquo;
                          </p>
                        )}
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          {/* Edit status badge (primary indicator) */}
                          {editBadge && (
                            <Badge variant="outline" className={`text-[9px] px-1.5 py-0 gap-0.5 ${editBadge.color}`}>
                              {editBadge.icon} {editBadge.label}
                            </Badge>
                          )}
                          {/* Queue status badge */}
                          <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${sBadge.color}`}>
                            {sBadge.label}
                          </Badge>
                          {/* ASR confidence */}
                          {item.asr_confidence !== null && (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-gray-50 text-gray-500 border-gray-200">
                              <Shield size={8} className="mr-0.5" />
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
                        {/* Due date */}
                        {!item.last_edited_at && item.due_date && (
                          <p className="text-[9px] text-gray-400 mt-1 flex items-center gap-0.5">
                            <Clock size={8} />
                            {new Date(item.due_date).toLocaleDateString('id-ID')}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </ScrollArea>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between">
              <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="h-7 text-xs">
                <ChevronLeft size={14} />
              </Button>
              <span className="text-[10px] text-gray-400">Hal {page}/{totalPages}</span>
              <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="h-7 text-xs">
                <ChevronRight size={14} />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Submissions Tab */}
      {tab === 'submissions' && (
        <ScrollArea className="flex-1">
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
        </ScrollArea>
      )}
    </div>
  );
}
