'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Volume2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Edit3,
  Flag,
  Loader2,
  RefreshCw,
  Shield,
  ChevronLeft,
  ChevronRight,
  FileText,
  Video,
  Filter,
} from 'lucide-react';
import { asrReviewApi } from '../asr-review-api';
import type { ASRReviewQueueItem } from '../asr-review-types';
import { ASR_REVIEW_STATUS } from '../asr-review-types';
import { AsrReviewDetailPanel } from './asr-review-detail-panel';

// ── Helpers ────────────────────────────────────────────────────────

function formatTime(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function getConfidenceColor(score: number | null): string {
  if (score === null) return 'bg-gray-400';
  if (score >= 0.9) return 'bg-emerald-500';
  if (score >= 0.5) return 'bg-amber-500';
  return 'bg-red-500';
}

function getConfidenceLabel(score: number | null): string {
  if (score === null) return 'N/A';
  return `${Math.round(score * 100)}%`;
}

// ── Component ──────────────────────────────────────────────────────

export function AsrReviewPage() {
  // ── State ─────────────────────────────────────────────────────
  const [items, setItems] = useState<ASRReviewQueueItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [lowConfidenceCount, setLowConfidenceCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [lowConfidenceOnly, setLowConfidenceOnly] = useState(false);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch Queue ───────────────────────────────────────────────

  const fetchQueue = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const data = await asrReviewApi.getQueue({
          page,
          page_size: pageSize,
          low_confidence_only: lowConfidenceOnly,
        });
        setItems(data.items);
        setTotalItems(data.total);
        setTotalPages(data.pages);
        setLowConfidenceCount(data.low_confidence_count);
        setError(null);
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
          'Gagal memuat antrian review';
        setError(typeof msg === 'string' ? msg : 'Gagal memuat antrian review');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [page, pageSize, lowConfidenceOnly],
  );

  // Load on mount + filter change
  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Polling every 10s
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => fetchQueue(true), 10000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchQueue]);

  // Auto-select first item
  useEffect(() => {
    if (items.length > 0 && !selectedReviewId) {
      setSelectedReviewId(items[0].review_id);
    }
  }, [items, selectedReviewId]);

  // ── Handlers ──────────────────────────────────────────────────

  const handleActionCompleted = () => {
    // Refresh the queue after an action + move to next item
    fetchQueue(true);
    const currentIdx = items.findIndex((i) => i.review_id === selectedReviewId);
    // Try selecting next item
    if (currentIdx >= 0 && currentIdx < items.length - 1) {
      setSelectedReviewId(items[currentIdx + 1].review_id);
    } else if (items.length > 1) {
      setSelectedReviewId(items[0].review_id);
    } else {
      setSelectedReviewId(null);
    }
  };

  const handleFilterToggle = (checked: boolean) => {
    setLowConfidenceOnly(checked);
    setPage(1);
    setSelectedReviewId(null);
  };

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Volume2 size={22} className="text-teal-600" />
              ASR Review Workspace
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Review dan validasi hasil transkripsi otomatis (Whisper ASR)
            </p>
          </div>
          <div className="flex gap-3 items-center">
            {/* Stats */}
            <div className="flex gap-2 text-xs">
              <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                <Clock size={10} className="mr-1" />
                {totalItems} Pending
              </Badge>
              {lowConfidenceCount > 0 && (
                <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
                  <AlertTriangle size={10} className="mr-1" />
                  {lowConfidenceCount} Low Confidence
                </Badge>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* ──── Left: Queue List ──── */}
        <div className="w-80 min-w-[320px] bg-white border-r border-gray-200 flex flex-col">
          {/* Filter Bar */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Filter size={12} className="text-gray-400" />
              <Label htmlFor="low-conf-toggle" className="text-[10px] font-medium text-gray-500 uppercase tracking-wider cursor-pointer">
                Low Confidence
              </Label>
              <Switch
                id="low-conf-toggle"
                checked={lowConfidenceOnly}
                onCheckedChange={handleFilterToggle}
                className="scale-75"
              />
            </div>
            <button
              onClick={() => fetchQueue()}
              className="p-1 rounded text-gray-400 hover:text-teal-600 hover:bg-gray-100 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={14} />
            </button>
          </div>

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
                <Button variant="outline" size="sm" onClick={() => fetchQueue()}>
                  Coba Lagi
                </Button>
              </div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircle2 size={32} className="text-emerald-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-500">
                  {lowConfidenceOnly ? 'Tidak ada segmen low confidence' : 'Antrian review kosong'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {lowConfidenceOnly
                    ? 'Coba matikan filter untuk melihat semua segmen'
                    : 'Semua segmen telah di-review atau belum ada yang diproses'}
                </p>
              </div>
            ) : (
              <>
                {items.map((item) => {
                  const isSelected = item.review_id === selectedReviewId;
                  const confColor = getConfidenceColor(item.confidence_score);
                  return (
                    <button
                      key={item.review_id}
                      onClick={() => setSelectedReviewId(item.review_id)}
                      className={`block w-full text-left px-4 py-3.5 border-b border-gray-100 transition-all ${
                        isSelected
                          ? 'bg-teal-50 border-l-[3px] border-l-teal-500'
                          : 'hover:bg-gray-50 border-l-[3px] border-l-transparent'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Confidence dot */}
                        <div className="mt-1.5">
                          <div className={`w-2.5 h-2.5 rounded-full ${confColor} flex-shrink-0`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          {/* Filename */}
                          <p className={`text-xs font-medium truncate ${isSelected ? 'text-teal-800' : 'text-gray-700'}`}>
                            {item.original_filename}
                          </p>

                          {/* ASR text preview */}
                          <p className="text-[11px] text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                            &ldquo;{item.asr_text}&rdquo;
                          </p>

                          {/* Meta row */}
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="text-[10px] font-mono text-gray-400">
                              {formatTime(item.asr_start)} → {formatTime(item.asr_end)}
                            </span>
                            <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${
                              item.is_low_confidence
                                ? 'bg-red-50 text-red-600 border-red-200'
                                : 'bg-gray-50 text-gray-500 border-gray-200'
                            }`}>
                              <Shield size={8} className="mr-0.5" />
                              {getConfidenceLabel(item.confidence_score)}
                            </Badge>
                            {item.requires_attention && (
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-amber-50 text-amber-600 border-amber-200">
                                <AlertTriangle size={8} className="mr-0.5" />
                                Perhatian
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </>
            )}
          </ScrollArea>

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

        {/* ──── Right: Detail Panel ──── */}
        {selectedReviewId ? (
          <AsrReviewDetailPanel
            key={selectedReviewId}
            reviewId={selectedReviewId}
            onActionCompleted={handleActionCompleted}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <Volume2 size={48} className="text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Pilih segmen dari daftar di kiri</p>
              <p className="text-xs text-gray-400 mt-1">untuk me-review hasil transkripsi ASR</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
